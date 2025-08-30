// File: api-services/src/plugins/datasources/relational/postgres.ts
import { Pool, PoolClient } from 'pg';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces';

export const PostgreSQLPlugin: DataSourcePlugin = {
  name: 'postgres',
  displayName: 'PostgreSQL Database',
  category: 'relational',
  version: '1.0.0',
  configSchema: {
    properties: {
      host: {
        type: 'string',
        title: 'Host',
        description: 'PostgreSQL server hostname',
        default: 'localhost'
      },
      port: {
        type: 'integer',
        title: 'Port',
        description: 'PostgreSQL server port',
        default: 5432,
        minimum: 1,
        maximum: 65535
      },
      database: {
        type: 'string',
        title: 'Database',
        description: 'Database name'
      },
      username: {
        type: 'string',
        title: 'Username',
        description: 'Database username'
      },
      password: {
        type: 'string',
        title: 'Password',
        description: 'Database password',
        format: 'password'
      },
      ssl: {
        type: 'boolean',
        title: 'SSL',
        description: 'Enable SSL connection',
        default: false
      },
      connectionLimit: {
        type: 'integer',
        title: 'Connection Limit',
        description: 'Maximum number of connections',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['host', 'database', 'username', 'password']
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.options?.connectionLimit || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test the connection
    const client = await pool.connect();
    client.release();

    return {
      id: `postgres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      client: pool,
      isConnected: true,
      lastUsed: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await this.disconnect(connection);
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const pool = connection.client as Pool;
      const result = await pool.query(query);
      
      const executionTime = Date.now() - startTime;
      
      // Extract column information
      const columns = result.fields.map(field => ({
        name: field.name,
        type: this.mapPostgreSQLType(field.dataTypeID),
        nullable: true, // PostgreSQL doesn't provide this easily
        defaultValue: null
      }));

      return {
        rows: result.rows,
        columns,
        rowCount: result.rowCount || 0,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const pool = connection.client as Pool;
    
    // Get tables
    const tablesQuery = `
      SELECT 
        t.table_schema,
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY t.table_schema, t.table_name, c.ordinal_position
    `;

    const tablesResult = await pool.query(tablesQuery);
    
    // Group by table
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
          defaultValue: row.column_default,
          maxLength: row.character_maximum_length
        });
      }
    });

    // Get views
    const viewsQuery = `
      SELECT 
        v.table_schema,
        v.table_name,
        v.view_definition,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.views v
      LEFT JOIN information_schema.columns c ON v.table_name = c.table_name AND v.table_schema = c.table_schema
      WHERE v.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY v.table_schema, v.table_name, c.ordinal_position
    `;

    const viewsResult = await pool.query(viewsQuery);
    
    const viewsMap = new Map();
    viewsResult.rows.forEach(row => {
      const viewKey = `${row.table_schema}.${row.table_name}`;
      if (!viewsMap.has(viewKey)) {
        viewsMap.set(viewKey, {
          name: row.table_name,
          schema: row.table_schema,
          columns: [],
          definition: row.view_definition
        });
      }
      
      if (row.column_name) {
        viewsMap.get(viewKey).columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES'
        });
      }
    });

    return {
      tables: Array.from(tablesMap.values()),
      views: Array.from(viewsMap.values())
    };
  },

  async disconnect(connection: Connection): Promise<void> {
    try {
      const pool = connection.client as Pool;
      await pool.end();
      connection.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from PostgreSQL:', error);
    }
  },

  mapPostgreSQLType(dataTypeID: number): string {
    // Common PostgreSQL data type OIDs
    const typeMap: Record<number, string> = {
      16: 'boolean',
      17: 'bytea',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      1700: 'numeric'
    };
    
    return typeMap[dataTypeID] || 'unknown';
  }
};