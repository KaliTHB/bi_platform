// File: api-services/src/plugins/datasources/relational/sqlite.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import * as sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

export const sqlitePlugin: DataSourcePlugin = {
  name: 'sqlite',
  displayName: 'SQLite',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to SQLite database files',
  
  configSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', title: 'Database File Path' },
      mode: { 
        type: 'string', 
        title: 'Open Mode',
        enum: ['readonly', 'readwrite', 'create'],
        default: 'readwrite'
      },
      timeout: { type: 'number', title: 'Timeout (ms)', default: 5000 }
    },
    required: ['filename'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 1
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const db = await open({
      filename: config.filename as string,
      driver: sqlite3.Database
    });

    // Configure SQLite settings
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA journal_mode = WAL');

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
      await this.executeQuery(connection, 'SELECT 1');
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    let result;
    if (query.trim().toLowerCase().startsWith('select')) {
      result = await connection.client.all(query, params);
    } else {
      const info = await connection.client.run(query, params);
      result = { changes: info.changes, lastID: info.lastID };
    }
    
    const executionTimeMs = Date.now() - startTime;

    // Get column info for SELECT queries
    const columns: any[] = [];
    if (Array.isArray(result) && result.length > 0) {
      Object.keys(result[0]).forEach(key => {
        columns.push({
          name: key,
          type: typeof result[0][key],
          nullable: true,
          defaultValue: null
        });
      });
    }

    connection.lastActivity = new Date();
    
    return {
      rows: Array.isArray(result) ? result : [],
      columns,
      rowCount: Array.isArray(result) ? result.length : (result.changes || 0),
      executionTimeMs,
      queryId: `sqlite-${Date.now()}`
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT name, type 
      FROM sqlite_master 
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    
    const result = await this.executeQuery(connection, tablesQuery);
    
    const tables = result.rows
      .filter(row => row.type === 'table')
      .map(row => ({
        name: row.name,
        schema: 'main',
        columns: []
      }));

    const views = result.rows
      .filter(row => row.type === 'view')
      .map(row => ({
        name: row.name,
        schema: 'main',
        columns: [],
        definition: ''
      }));

    return { tables, views };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      await connection.client.close();
    }
    connection.isConnected = false;
  }
};