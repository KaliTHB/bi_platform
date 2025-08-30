// File: api-services/src/plugins/datasources/cloud_databases/snowflake.ts
import snowflake from 'snowflake-sdk';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const snowflakePlugin: DataSourcePlugin = {
  name: 'snowflake',
  displayName: 'Snowflake Data Warehouse',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      account: { type: 'string', title: 'Account', description: 'Snowflake account identifier' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' },
      database: { type: 'string', title: 'Database' },
      schema: { type: 'string', title: 'Schema', default: 'PUBLIC' },
      warehouse: { type: 'string', title: 'Warehouse' },
      role: { type: 'string', title: 'Role', default: 'PUBLIC' }
    },
    required: ['account', 'username', 'password', 'database', 'warehouse'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connection = snowflake.createConnection({
        account: config.account,
        username: config.username,
        password: config.password,
        database: config.database,
        schema: config.schema || 'PUBLIC',
        warehouse: config.warehouse,
        role: config.role || 'PUBLIC'
      });

      connection.connect((err) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: `snowflake-${Date.now()}`,
            config,
            client: connection,
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
      const result = await this.executeQuery(connection, 'SELECT 1 as test');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      connection.client.execute({
        sqlText: query,
        complete: (err: any, stmt: any, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const executionTimeMs = Date.now() - startTime;
            const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
              name: key,
              type: 'variant',
              nullable: true
            })) : [];

            resolve({
              rows: rows || [],
              columns,
              rowCount: rows?.length || 0,
              executionTimeMs
            });
          }
        }
      });
    });
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const result = await this.executeQuery(connection, 
      'SHOW TABLES IN DATABASE ' + connection.config.database
    );

    const tables = result.rows.map((row: any) => ({
      name: row.name,
      schema: row.database_name,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      connection.client.destroy();
      connection.isConnected = false;
    }
  }
};