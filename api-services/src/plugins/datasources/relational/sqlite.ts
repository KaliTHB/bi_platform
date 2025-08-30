// File: api-services/src/plugins/datasources/relational/sqlite.ts
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const sqlitePlugin: DataSourcePlugin = {
  name: 'sqlite',
  displayName: 'SQLite Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', title: 'Database File Path', description: 'Path to SQLite database file' },
      mode: { 
        type: 'string', 
        title: 'Mode', 
        default: 'readonly',
        enum: ['readonly', 'readwrite', 'memory']
      }
    },
    required: ['filename'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const db = await open({
      filename: config.filename,
      driver: sqlite3.Database,
      mode: config.mode === 'readwrite' ? sqlite3.OPEN_READWRITE : sqlite3.OPEN_READONLY
    });

    return {
      id: `sqlite-${Date.now()}`,
      config,
      client: db,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const result = await this.executeQuery(connection, 'SELECT 1 as test');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    const rows = await connection.client.all(query, params || []);
    const executionTimeMs = Date.now() - startTime;

    const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
      name: key,
      type: 'TEXT',
      nullable: true
    })) : [];

    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, `
      SELECT name FROM sqlite_master WHERE type='table'
    `);

    const tables = tablesResult.rows.map((row: any) => ({
      name: row.name,
      schema: 'main',
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      await connection.client.close();
      connection.isConnected = false;
    }
  }
};
