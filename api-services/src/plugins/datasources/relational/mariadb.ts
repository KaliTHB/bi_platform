// File: api-services/src/plugins/datasources/relational/mariadb.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces';
import * as mariadb from 'mariadb';

export const mariadbPlugin: DataSourcePlugin = {
  name: 'mariadb',
  displayName: 'MariaDB',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to MariaDB databases',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 3306, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      ssl: { type: 'boolean', title: 'Use SSL', default: false },
      charset: { type: 'string', title: 'Charset', default: 'utf8mb4' }
    },
    required: ['host', 'port', 'database', 'user', 'password'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 100
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = mariadb.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: 20,
      acquireTimeout: 30000
    });

    return {
      id: `mariadb-${Date.now()}`,
      config,
      pool,
      isConnected: true,
      lastActivity: Date.now()
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
    const conn = await connection.pool.getConnection();
    
    try {
      const result = await conn.query(query, params);
      const executionTimeMs = Date.now() - startTime;
      
      const columns = result.meta?.map((field: any) => ({
        name: field.name(),
        type: field.type,
        nullable: true,
        defaultValue: null
      })) || [];

      connection.lastActivity = Date.now();
      
      return {
        rows: Array.isArray(result) ? result : [result],
        columns,
        rowCount: Array.isArray(result) ? result.length : 1,
        executionTimeMs,
        queryId: `mariadb-${Date.now()}`
      };
    } finally {
      conn.release();
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `;
    
    const result = await this.executeQuery(connection, tablesQuery, [connection.config.database]);
    
    const tables = result.rows
      .filter(row => row.TABLE_TYPE === 'BASE TABLE')
      .map(row => ({
        name: row.TABLE_NAME,
        schema: row.TABLE_SCHEMA,
        columns: []
      }));

    const views = result.rows
      .filter(row => row.TABLE_TYPE === 'VIEW')
      .map(row => ({
        name: row.TABLE_NAME,
        schema: row.TABLE_SCHEMA,
        columns: [],
        definition: ''
      }));

    return { tables, views };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
    }
    connection.isConnected = false;
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
  try {
    const dbName = database || connection.config.database;
    const query = `
      SELECT 
        TABLE_NAME as name,
        TABLE_SCHEMA as schema,
        TABLE_TYPE as type
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const [rows] = await connection.client.execute(query, [dbName]);
    const tables: TableInfo[] = [];

    for (const row of rows as any[]) {
      tables.push({
        name: row.name,
        schema: row.schema || dbName,
        type: row.type === 'VIEW' ? 'view' : 'table',
        columns: [] // Populate if needed
      });
    }

    return tables;
  } catch (error) {
    console.warn('Failed to get tables for MariaDB:', error);
    return [];
  }
},

async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
  try {
    const query = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        IS_NULLABLE = 'YES' as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY = 'PRI' as isPrimaryKey
      FROM information_schema.COLUMNS 
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `;

    const [rows] = await connection.client.execute(query, [table, connection.config.database]);
    return rows as ColumnInfo[];
  } catch (error) {
    console.warn('Failed to get columns for MariaDB:', error);
    return [];
  }
}

};
