// ===================================================================
// api-services/src/plugins/datasources/relational/mysql.ts

import mysql from 'mysql2/promise';
import { DataSourcePlugin, ConnectionConfig, Connection, TestResult, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';

const mysqlPlugin: DataSourcePlugin = {
  name: 'mysql',
  displayName: 'MySQL',
  category: 'relational',
  version: '1.0.0',
  description: 'MySQL database connector',
  author: 'BI Platform Team',
  license: 'MIT',
  
  configSchema: {
    host: {
      type: 'string',
      required: true,
      description: 'Database host address',
      placeholder: 'localhost',
      group: 'connection'
    },
    port: {
      type: 'number',
      default: 3306,
      validation: { min: 1, max: 65535 },
      description: 'Database port number',
      group: 'connection'
    },
    database: {
      type: 'string',
      required: true,
      description: 'Database name to connect to',
      group: 'connection'
    },
    user: {
      type: 'string',
      required: true,
      description: 'Database username',
      group: 'authentication'
    },
    password: {
      type: 'password',
      required: true,
      description: 'Database password',
      group: 'authentication'
    },
    ssl: {
      type: 'boolean',
      default: false,
      description: 'Enable SSL/TLS connection',
      group: 'security'
    }
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    supportsCustomFunctions: true,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? {} : false
    });

    return {
      id: `mysql_${Date.now()}`,
      plugin: 'mysql',
      config,
      connected_at: new Date(),
      client: connection
    };
  },

  async testConnection(config: ConnectionConfig): Promise<TestResult> {
    const start = Date.now();
    try {
      const connection = await this.connect(config);
      await this.disconnect(connection);
      
      return {
        success: true,
        message: 'Connection successful',
        response_time: Date.now() - start
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error_code: error.code,
        response_time: Date.now() - start
      };
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const [rows, fields] = await connection.client.execute(query, params);
      
      return {
        data: Array.isArray(rows) ? rows : [],
        columns: Array.isArray(fields) ? fields.map((field: any) => ({
          name: field.name,
          type: field.type
        })) : [],
        total_rows: Array.isArray(rows) ? rows.length : 0,
        execution_time: Date.now() - start
      };
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const query = 'SHOW DATABASES';
    const [rows] = await connection.client.execute(query);
    const databases: any[] = [];
    
    for (const row of rows as any[]) {
      if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(row.Database)) {
        continue;
      }
      
      const tables = await this.getTables(connection, row.Database);
      databases.push({
        name: row.Database,
        tables
      });
    }

    return { databases };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
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
      const columns = await this.getColumns(connection, row.name);
      tables.push({
        name: row.name,
        schema: row.schema,
        type: row.type === 'VIEW' ? 'view' : 'table',
        columns
      });
    }

    return tables;
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
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
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client && typeof connection.client.end === 'function') {
      await connection.client.end();
    }
  }
};

export default mysqlPlugin;
export { mysqlPlugin };