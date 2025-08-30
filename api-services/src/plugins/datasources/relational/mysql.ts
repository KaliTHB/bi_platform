// File: api-services/src/plugins/datasources/relational/mysql.ts
import mysql from 'mysql2/promise';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const mysqlPlugin: DataSourcePlugin = {
  name: 'mysql',
  displayName: 'MySQL Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'integer', title: 'Port', default: 3306, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' },
      ssl: { type: 'boolean', title: 'SSL', default: false },
      connectionLimit: { type: 'integer', title: 'Connection Limit', default: 10, minimum: 1 }
    },
    required: ['host', 'database', 'username', 'password'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: config.connectionLimit || 10,
      acquireTimeout: 60000,
      timeout: 60000
    });

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
      const result = await this.executeQuery(connection, 'SELECT VERSION() as version');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    const [rows, fields] = await connection.pool.execute(query, params || []);
    const executionTimeMs = Date.now() - startTime;
    
    const columns = Array.isArray(fields) ? fields.map((field: any) => ({
      name: field.name,
      type: field.type.toString(),
      nullable: (field.flags & 1) === 0
    })) : [];

    return {
      rows: Array.isArray(rows) ? rows : [],
      columns,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, 
      `SELECT TABLE_NAME, TABLE_SCHEMA FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, 
      [connection.config.database]
    );

    const tables = await Promise.all(
      tablesResult.rows.map(async (row: any) => {
        const columnsResult = await this.executeQuery(connection, `
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [connection.config.database, row.TABLE_NAME]);

        return {
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          columns: columnsResult.rows.map((col: any) => ({
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE,
            nullable: col.IS_NULLABLE === 'YES'
          }))
        };
      })
    );

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
      connection.isConnected = false;
    }
  }
};