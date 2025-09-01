// File: api-services/src/plugins/datasources/relational/postgresql.ts
import { Pool, PoolClient } from 'pg';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

class PostgreSQLConnection implements Connection {
  id: string;
  config: ConnectionConfig;
  client: Pool;
  isConnected: boolean;
  lastActivity: Date;

  constructor(config: ConnectionConfig) {
    this.id = `pg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.client = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 5,
      idleTimeoutMillis: 30000,
    });
    this.isConnected = false;
    this.lastActivity = Date.now();
  }
}

export const PostgreSQLPlugin: DataSourcePlugin = {
  name: 'postgresql',
  displayName: 'PostgreSQL',
  category: 'relational',
  version: '1.0.0',
  description: 'PostgreSQL database connector with full SQL support',
  
  configSchema: {
    type: 'object',
    properties: {
      host: {
        type: 'string',
        required: true,
        title: 'Host',
        description: 'Database server hostname or IP address',
        default: 'localhost'
      },
      port: {
        type: 'number',
        title: 'Port',
        description: 'Database server port',
        default: 5432,
        minimum: 1,
        maximum: 65535
      },
      database: {
        type: 'string',
        required: true,
        title: 'Database Name',
        description: 'Name of the database to connect to'
      },
      username: {
        type: 'string',
        required: true,
        title: 'Username',
        description: 'Database username'
      },
      password: {
        type: 'password',
        required: true,
        title: 'Password',
        description: 'Database password'
      }
    },
    required: ['host', 'database', 'username', 'password']
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const connection = new PostgreSQLConnection(config);
    
    try {
      // Test the connection
      const client = await connection.client.connect();
      await client.query('SELECT 1');
      client.release();
      
      connection.isConnected = true;
      connection.lastActivity = Date.now();
      
      return connection;
    } catch (error) {
      await connection.client.end();
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    const testPool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      return false;
    } finally {
      await testPool.end();
    }
  },

  async executeQuery(connection: Connection, query: string, params: any[] = []): Promise<QueryResult> {
    if (!connection.isConnected) {
      throw new Error('Connection is not established');
    }

    const startTime = Date.now();
    
    try {
      const result = await connection.client.query(query, params);
      const executionTime = Date.now() - startTime;
      
      connection.lastActivity = Date.now();
      
      return {
        rows: result.rows,
        fields: result.fields?.map(field => ({
          name: field.name,
          type: this.mapPostgreSQLType(field.dataTypeID)
        })),
        rowCount: result.rowCount || 0,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT 
        schemaname as schema,
        tablename as name,
        'table' as type
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      UNION ALL
      SELECT 
        schemaname as schema,
        viewname as name,
        'view' as type  
      FROM pg_views
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schema, name
    `;

    const result = await this.executeQuery(connection, tablesQuery);
    
    const tables = result.rows.filter(row => row.type === 'table').map(row => ({
      name: row.name,
      schema: row.schema,
      type: 'table' as const
    }));

    const views = result.rows.filter(row => row.type === 'view').map(row => ({
      name: row.name,
      schema: row.schema,
      type: 'view' as const
    }));

    return { tables, views };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    const query = `
      SELECT 
        schemaname as schema,
        tablename as name,
        'table' as type
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename
    `;

    const result = await this.executeQuery(connection, query);
    
    return result.rows.map(row => ({
      name: row.name,
      schema: row.schema,
      type: 'table' as const
    }));
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    const [schema, tableName] = table.includes('.') ? table.split('.') : ['public', table];
    
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;

    const result = await this.executeQuery(connection, query, [schema, tableName]);
    
    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key
    }));
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      await connection.client.end();
      connection.isConnected = false;
    }
  },

  // Helper method to map PostgreSQL types to common types
  mapPostgreSQLType(dataTypeID: number): string {
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
      1083: 'time',
      1114: 'timestamp',
      1184: 'timestamp with time zone'
    };

    return typeMap[dataTypeID] || 'unknown';
  }
};