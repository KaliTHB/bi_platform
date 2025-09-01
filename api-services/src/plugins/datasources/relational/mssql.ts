// File: api-services/src/plugins/datasources/relational/mssql.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import * as sql from 'mssql';

export const mssqlPlugin: DataSourcePlugin = {
  name: 'mssql',
  displayName: 'SQL Server',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to Microsoft SQL Server databases',
  
  configSchema: {
    type: 'object',
    properties: {
      server: { type: 'string', title: 'Server', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 1433, minimum: 1, maximum: 65535 },
      database: { type: 'string', title: 'Database' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      encrypt: { type: 'boolean', title: 'Encrypt Connection', default: true },
      trustServerCertificate: { type: 'boolean', title: 'Trust Server Certificate', default: false }
    },
    required: ['server', 'database', 'user', 'password'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 100
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new sql.ConnectionPool({
      server: config.server || config.host,
      port: config.port,
      database: config.database,
      user: config.user || config.username,
      password: config.password,
      options: {
        encrypt: config.encrypt !== false,
        trustServerCertificate: config.trustServerCertificate === true
      },
      pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
      }
    });

    await pool.connect();

    return {
      id: `mssql-${Date.now()}`,
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
    const request = connection.pool.request();
    
    // Add parameters if provided
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }
    
    const result = await request.query(query);
    const executionTimeMs = Date.now() - startTime;
    
    const columns = result.recordset?.columns ? Object.values(result.recordset.columns).map((col: any) => ({
      name: col.name,
      type: this.mapSQLServerType(col.type),
      nullable: col.nullable,
      defaultValue: null
    })) : [];

    connection.lastActivity = Date.now();
    
    return {
      rows: result.recordset || [],
      columns,
      rowCount: result.rowsAffected?.[0] || result.recordset?.length || 0,
      executionTimeMs,
      queryId: `mssql-${Date.now()}`
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT t.TABLE_NAME, t.TABLE_SCHEMA, t.TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
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
    if (connection.pool) {
      await connection.pool.close();
    }
    connection.isConnected = false;
  },

  private mapSQLServerType(sqlType: any): string {
    const typeMap: Record<string, string> = {
      'Int': 'int', 'BigInt': 'bigint', 'SmallInt': 'smallint', 'TinyInt': 'tinyint',
      'Float': 'float', 'Real': 'real', 'Decimal': 'decimal', 'Money': 'money',
      'VarChar': 'varchar', 'NVarChar': 'nvarchar', 'Char': 'char', 'NChar': 'nchar',
      'Text': 'text', 'NText': 'ntext',
      'DateTime': 'datetime', 'SmallDateTime': 'smalldatetime', 'Date': 'date',
      'Time': 'time', 'DateTime2': 'datetime2',
      'Bit': 'bit', 'UniqueIdentifier': 'uniqueidentifier'
    };
    return typeMap[sqlType?.name] || 'unknown';
  }
};
