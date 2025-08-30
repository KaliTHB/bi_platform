// File: api-services/src/plugins/datasources/relational/mysql.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import * as mysql from 'mysql2/promise';

export const mysqlPlugin: DataSourcePlugin = {
  name: 'mysql',
  displayName: 'MySQL',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to MySQL databases',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 3306, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      ssl: { type: 'boolean', title: 'Use SSL', default: false },
      charset: { type: 'string', title: 'Charset', default: 'utf8mb4' }
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
    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      charset: config.charset || 'utf8mb4',
      connectionLimit: 20,
      acquireTimeout: 30000,
      timeout: 30000
    });

    // Test the connection
    const connection = await pool.getConnection();
    connection.release();

    return {
      id: `mysql-${Date.now()}`,
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
    const [rows, fields] = await connection.pool.execute(query, params || []);
    const executionTimeMs = Date.now() - startTime;
    
    const columns = (fields as any[]).map(field => ({
      name: field.name,
      type: this.mapMySQLType(field.type),
      nullable: (field.flags & 1) === 0,
      defaultValue: null
    }));

    connection.lastActivity = new Date();
    
    return {
      rows: rows as Record<string, any>[],
      columns,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTimeMs,
      queryId: `mysql-${Date.now()}`
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE, TABLE_ROWS
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;
    
    const tablesResult = await this.executeQuery(connection, tablesQuery, [connection.config.database]);
    
    const tables = await Promise.all(
      tablesResult.rows
        .filter(row => row.TABLE_TYPE === 'BASE TABLE')
        .map(async (row) => {
          const columns = await this.getTableColumns(connection, row.TABLE_NAME);
          return {
            name: row.TABLE_NAME,
            schema: row.TABLE_SCHEMA,
            columns,
            rowCount: row.TABLE_ROWS
          };
        })
    );

    const views = tablesResult.rows
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

  private mapMySQLType(type: number): string {
    const typeMap: Record<number, string> = {
      1: 'tinyint', 2: 'smallint', 3: 'int', 8: 'bigint',
      4: 'float', 5: 'double', 246: 'decimal',
      253: 'varchar', 254: 'char', 252: 'text',
      10: 'date', 11: 'time', 12: 'datetime', 13: 'year'
    };
    return typeMap[type] || 'unknown';
  },

  private async getTableColumns(connection: Connection, tableName: string): Promise<any[]> {
    const query = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await this.executeQuery(connection, query, [tableName, connection.config.database]);
    return result.rows.map(row => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      primaryKey: row.COLUMN_KEY === 'PRI'
    }));
  }
};