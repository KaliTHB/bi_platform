// File: api-services/src/plugins/datasources/relational/mssql.ts
import sql from 'mssql';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const mssqlPlugin: DataSourcePlugin = {
  name: 'mssql',
  displayName: 'SQL Server Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      server: { type: 'string', title: 'Server', description: 'SQL Server instance' },
      port: { type: 'integer', title: 'Port', default: 1433 },
      database: { type: 'string', title: 'Database' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' },
      encrypt: { type: 'boolean', title: 'Encrypt', default: true },
      trustServerCertificate: { type: 'boolean', title: 'Trust Server Certificate', default: false }
    },
    required: ['server', 'database', 'user', 'password'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new sql.ConnectionPool({
      server: config.server || config.host,
      port: config.port || 1433,
      database: config.database,
      user: config.user || config.username,
      password: config.password,
      options: {
        encrypt: config.encrypt !== false,
        trustServerCertificate: config.trustServerCertificate === true
      }
    });

    await pool.connect();

    return {
      id: `mssql-${Date.now()}`,
      config,
      pool,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const result = await this.executeQuery(connection, 'SELECT @@VERSION as version');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const request = connection.pool.request();
    
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }

    const startTime = Date.now();
    const result = await request.query(query);
    const executionTimeMs = Date.now() - startTime;

    const columns = result.recordset?.columns ? Object.values(result.recordset.columns).map((col: any) => ({
      name: col.name,
      type: col.type.name,
      nullable: col.nullable
    })) : [];

    return {
      rows: result.recordset || [],
      columns,
      rowCount: result.recordset?.length || 0,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, `
      SELECT TABLE_NAME, TABLE_SCHEMA 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    const tables = tablesResult.rows.map((row: any) => ({
      name: row.TABLE_NAME,
      schema: row.TABLE_SCHEMA,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.close();
      connection.isConnected = false;
    }
  }
};
