// File: api-services/src/plugins/datasources/relational/mariadb.ts
import mariadb from 'mariadb';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const mariadbPlugin: DataSourcePlugin = {
  name: 'mariadb',
  displayName: 'MariaDB Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'integer', title: 'Port', default: 3306, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' },
      ssl: { type: 'boolean', title: 'SSL', default: false },
      connectionLimit: { type: 'integer', title: 'Connection Limit', default: 5, minimum: 1 }
    },
    required: ['host', 'database', 'user', 'password'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = mariadb.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user || config.username,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: config.connectionLimit || 5,
      acquireTimeout: 1000,
      timeout: 1000
    });

    return {
      id: `mariadb-${Date.now()}`,
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
    let conn;
    try {
      conn = await connection.pool.getConnection();
      const startTime = Date.now();
      const rows = await conn.query(query, params || []);
      const executionTimeMs = Date.now() - startTime;

      return {
        rows: Array.isArray(rows) ? rows : [rows],
        columns: [],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        executionTimeMs
      };
    } finally {
      if (conn) conn.release();
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, 
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, 
      [connection.config.database]
    );

    const tables = tablesResult.rows.map((row: any) => ({
      name: row.TABLE_NAME,
      schema: connection.config.database,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
      connection.isConnected = false;
    }
  }
};