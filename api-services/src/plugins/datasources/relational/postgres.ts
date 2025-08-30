/ File: api-services/src/plugins/datasources/relational/postgres.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { Pool } from 'pg';

export const postgresPlugin: DataSourcePlugin = {
  name: 'postgres',
  displayName: 'PostgreSQL',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to PostgreSQL databases',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 5432, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      ssl: { type: 'boolean', title: 'Use SSL', default: false },
      connectionTimeout: { type: 'number', title: 'Connection Timeout (ms)', default: 30000 }
    },
    required: ['host', 'port', 'database', 'username', 'password'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 100
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.connectionTimeout || 30000
    });

    // Test the connection
    const client = await pool.connect();
    client.release();

    return {
      id: `postgres-${Date.now()}`,
      config,
      pool,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    const client = await connection.pool.connect();
    
    try {
      const result = await client.query(query, params);
      const executionTimeMs = Date.now() - startTime;
      
      const columns = result.fields.map(field => ({
        name: field.name,
        type: this.mapPostgresType(field.dataTypeID),
        nullable: true,
        defaultValue: null
      }));

      connection.lastActivity = new Date();
      
      return {
        rows: result.rows,
        columns,
        rowCount: result.rowCount || 0,
        executionTimeMs,
        queryId: `pg-${Date.now()}`
      };
    } finally {
      client.release();
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT schemaname, tablename, tableowner 
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename
    `;
    
    const viewsQuery = `
      SELECT schemaname, viewname, viewowner, definition
      FROM pg_views 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, viewname
    `;

    const tablesResult = await this.executeQuery(connection, tablesQuery);
    const viewsResult = await this.executeQuery(connection, viewsQuery);
    
    const tables = await Promise.all(
      tablesResult.rows.map(async (row) => {
        const columns = await this.getTableColumns(connection, row.tablename, row.schemaname);
        return {
          name: row.tablename,
          schema: row.schemaname,
          columns,
          primaryKey: await this.getPrimaryKey(connection, row.tablename, row.schemaname)
        };
      })
    );

    const views = viewsResult.rows.map(row => ({
      name: row.viewname,
      schema: row.schemaname,
      columns: [],
      definition: row.definition
    }));

    return { tables, views };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
    }
    connection.isConnected = false;
  },

  // Helper methods
  private mapPostgresType(typeId: number): string {
    const typeMap: Record<number, string> = {
      20: 'bigint', 21: 'smallint', 23: 'integer', 25: 'text',
      1042: 'char', 1043: 'varchar', 1114: 'timestamp', 1082: 'date',
      700: 'real', 701: 'double precision', 16: 'boolean', 17: 'bytea'
    };
    return typeMap[typeId] || 'unknown';
  },

  private async getTableColumns(connection: Connection, tableName: string, schemaName: string): Promise<any[]> {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = $2
      ORDER BY ordinal_position
    `;
    
    const result = await this.executeQuery(connection, query, [tableName, schemaName]);
    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default
    }));
  },

  private async getPrimaryKey(connection: Connection, tableName: string, schemaName: string): Promise<string[]> {
    const query = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `;
    
    const result = await this.executeQuery(connection, query, [`${schemaName}.${tableName}`]);
    return result.rows.map(row => row.attname);
  }
};