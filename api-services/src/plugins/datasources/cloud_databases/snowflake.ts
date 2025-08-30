// File: api-services/src/plugins/datasources/cloud_databases/snowflake.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import * as snowflake from 'snowflake-sdk';

export const snowflakePlugin: DataSourcePlugin = {
  name: 'snowflake',
  displayName: 'Snowflake',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to Snowflake data warehouse',
  
  configSchema: {
    type: 'object',
    properties: {
      account: { type: 'string', title: 'Account Identifier' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      warehouse: { type: 'string', title: 'Warehouse' },
      database: { type: 'string', title: 'Database' },
      schema: { type: 'string', title: 'Schema', default: 'PUBLIC' },
      role: { type: 'string', title: 'Role' },
      region: { type: 'string', title: 'Region', default: 'us-west-2' }
    },
    required: ['account', 'username', 'password', 'warehouse', 'database'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connection = snowflake.createConnection({
        account: config.account,
        username: config.username,
        password: config.password,
        warehouse: config.warehouse,
        database: config.database,
        schema: config.schema || 'PUBLIC',
        role: config.role
      });

      connection.connect((err: any, conn: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: `snowflake-${Date.now()}`,
            config,
            client: conn,
            isConnected: true,
            lastActivity: new Date()
          });
        }
      });
    });
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
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      connection.client.execute({
        sqlText: query,
        binds: params,
        complete: (err: any, stmt: any, rows: any) => {
          if (err) {
            reject(err);
          } else {
            const executionTimeMs = Date.now() - startTime;
            const columns = stmt.getColumns().map((col: any) => ({
              name: col.getName(),
              type: col.getType(),
              nullable: col.isNullable(),
              defaultValue: null
            }));

            connection.lastActivity = new Date();
            
            resolve({
              rows: rows || [],
              columns,
              rowCount: rows?.length || 0,
              executionTimeMs,
              queryId: stmt.getStatementId()
            });
          }
        }
      });
    });
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT table_name, table_schema, table_type 
      FROM information_schema.tables 
      WHERE table_schema = UPPER('${connection.config.schema || 'PUBLIC'}')
      ORDER BY table_name
    `;
    
    const result = await this.executeQuery(connection, tablesQuery);
    
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
    return new Promise((resolve) => {
      if (connection.client) {
        connection.client.destroy(() => {
          connection.isConnected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
};