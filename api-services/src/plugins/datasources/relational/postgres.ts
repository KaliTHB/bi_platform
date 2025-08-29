// File: api-services/src/plugins/datasources/relational/postgres.ts

import { Pool, PoolClient } from 'pg';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, ConfigurationSchema } from '../../interfaces/DataSourcePlugin';

export class PostgreSQLPlugin implements DataSourcePlugin {
  name = 'postgres';
  displayName = 'PostgreSQL Database';
  category = 'relational' as const;
  version = '1.0.0';
  
  configSchema: ConfigurationSchema = {
    type: 'object',
    properties: {
      host: { type: 'string', description: 'Database host' },
      port: { type: 'number', default: 5432, description: 'Database port' },
      database: { type: 'string', description: 'Database name' },
      username: { type: 'string', description: 'Username' },
      password: { type: 'string', description: 'Password', format: 'password' },
      ssl: { type: 'boolean', default: false, description: 'Enable SSL' },
      schema: { type: 'string', default: 'public', description: 'Default schema' },
      maxConnections: { type: 'number', default: 20, description: 'Max pool connections' },
      idleTimeout: { type: 'number', default: 30000, description: 'Idle timeout (ms)' }
    },
    required: ['host', 'database', 'username', 'password'],
    additionalProperties: false
  };

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeout || 30000,
      connectionTimeoutMillis: 5000
    });

    // Test connection
    const client = await pool.connect();
    client.release();

    const connection: Connection = {
      id: `postgres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      pool,
      isConnected: true,
      lastActivity: new Date()
    };

    return connection;
  }

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        max: 1,
        connectionTimeoutMillis: 5000
      });

      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    if (!connection.pool) {
      throw new Error('Connection not established');
    }

    const startTime = Date.now();
    const client: PoolClient = await connection.pool.connect();

    try {
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;

      // Update connection activity
      connection.lastActivity = new Date();

      return {
        rows: result.rows,
        columns: result.fields.map(field => ({
          name: field.name,
          type: this.mapPostgresToStandardType(field.dataTypeID),
          nullable: true // PostgreSQL doesn't provide this in query results
        })),
        rowCount: result.rowCount,
        executionTimeMs: executionTime
      };
    } finally {
      client.release();
    }
  }

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    if (!connection.pool) {
      throw new Error('Connection not established');
    }

    const tablesQuery = `
      SELECT 
        t.table_name,
        t.table_schema,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        tc.constraint_type
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      LEFT JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name AND t.table_schema = tc.table_schema
      LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema AND c.column_name = kcu.column_name
      WHERE t.table_type = 'BASE TABLE' AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY t.table_schema, t.table_name, c.ordinal_position
    `;

    const viewsQuery = `
      SELECT 
        table_name,
        table_schema,
        view_definition
      FROM information_schema.views
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `;

    const client = await connection.pool.connect();

    try {
      const [tablesResult, viewsResult] = await Promise.all([
        client.query(tablesQuery),
        client.query(viewsQuery)
      ]);

      // Process tables
      const tablesMap = new Map();
      tablesResult.rows.forEach(row => {
        const tableKey = `${row.table_schema}.${row.table_name}`;
        if (!tablesMap.has(tableKey)) {
          tablesMap.set(tableKey, {
            name: row.table_name,
            schema: row.table_schema,
            columns: []
          });
        }
        
        if (row.column_name) {
          tablesMap.get(tableKey).columns.push({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            primaryKey: row.constraint_type === 'PRIMARY KEY',
            foreignKey: row.constraint_type === 'FOREIGN KEY'
          });
        }
      });

      // Process views
      const views = viewsResult.rows.map(row => ({
        name: row.table_name,
        schema: row.table_schema,
        definition: row.view_definition,
        columns: [] // Would need additional query to get view columns
      }));

      return {
        tables: Array.from(tablesMap.values()),
        views
      };
    } finally {
      client.release();
    }
  }

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
      connection.isConnected = false;
    }
  }

  async generateOptimizedQuery(query: string, context?: any): Promise<string> {
    // Basic query optimization for PostgreSQL
    let optimizedQuery = query.trim();
    
    // Add LIMIT if not present and this is a SELECT without aggregate functions
    if (optimizedQuery.toLowerCase().startsWith('select') && 
        !optimizedQuery.toLowerCase().includes('limit') &&
        !optimizedQuery.toLowerCase().includes('count(') &&
        !optimizedQuery.toLowerCase().includes('sum(') &&
        !optimizedQuery.toLowerCase().includes('avg(') &&
        !optimizedQuery.toLowerCase().includes('group by')) {
      optimizedQuery += ' LIMIT 1000';
    }

    return optimizedQuery;
  }

  async estimateQueryCost(query: string, connection: Connection): Promise<number> {
    if (!connection.pool) {
      throw new Error('Connection not established');
    }

    const client = await connection.pool.connect();
    try {
      const result = await client.query(`EXPLAIN (FORMAT JSON) ${query}`);
      const plan = result.rows[0]['QUERY PLAN'][0];
      return plan['Total Cost'] || 0;
    } finally {
      client.release();
    }
  }

  private mapPostgresToStandardType(dataTypeID: number): string {
    const typeMap: Record<number, string> = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1114: 'timestamp',
      1184: 'timestamptz',
      1082: 'date',
      1083: 'time',
      17: 'bytea',
      114: 'json',
      3802: 'jsonb'
    };
    
    return typeMap[dataTypeID] || 'unknown';
  }
}

// Export the plugin instance
export const postgresPlugin = new PostgreSQLPlugin();