// File: api-services/src/plugins/datasources/relational/mysql.ts
import mysql from 'mysql2/promise';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

class MySQLConnection implements Connection {
  id: string;
  config: ConnectionConfig;
  client: mysql.Pool;
  isConnected: boolean;
  lastActivity: Date;

  constructor(config: ConnectionConfig) {
    this.id = `mysql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    this.client = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionLimit: 5,
      acquireTimeout: 60000,
      timeout: 60000,
    });
    this.isConnected = false;
    this.lastActivity = new Date();
  }
}

export const MySQLPlugin: DataSourcePlugin = {
  name: 'mysql',
  displayName: 'MySQL',
  category: 'relational',
  version: '1.0.0',
  description: 'MySQL database connector with full SQL support',
  
  configSchema: {
    type: 'object',
    properties: {
      host: {
        type: 'string',
        required: true,
        title: 'Host',
        description: 'Database server hostname or IP address',
        default: 'localhost'
      },
      port: {
        type: 'number',
        title: 'Port',
        description: 'Database server port',
        default: 3306,
        minimum: 1,
        maximum: 65535
      },
      database: {
        type: 'string',
        required: true,
        title: 'Database Name',
        description: 'Name of the database to connect to'
      },
      username: {
        type: 'string',
        required: true,
        title: 'Username',
        description: 'Database username'
      },
      password: {
        type: 'password',
        required: true,
        title: 'Password',
        description: 'Database password'
      }
    },
    required: ['host', 'database', 'username', 'password']
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const connection = new MySQLConnection(config);
    
    try {
      // Test the connection
      const [rows] = await connection.client.execute('SELECT 1 as test');
      
      connection.isConnected = true;
      connection.lastActivity = new Date();
      
      return connection;
    } catch (error) {
      await connection.client.end();
      throw new Error(`Failed to connect to MySQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    const testPool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionLimit: 1,
      acquireTimeout: 5000,
    });

    try {
      const [rows] = await testPool.execute('SELECT 1 as test');
      return true;
    } catch (error) {
      return false;
    } finally {
      await testPool.end();
    }
  },

  async executeQuery(connection: Connection, query: string, params: any[] = []): Promise<QueryResult> {
    if (!connection.isConnected) {
      throw new Error('Connection is not established');
    }

    const startTime = Date.now();
    
    try {
      const [rows, fields] = await connection.client.execute(query, params);
      const executionTime = Date.now() - startTime;
      
      connection.lastActivity = new Date();
      
      return {
        rows: rows as any[],
        fields: Array.isArray(fields) ? fields.map(field => ({
          name: field.name,
          type: field.type?.toString() || 'unknown'
        })) : undefined,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT 
        TABLE_SCHEMA as schema_name,
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const result = await this.executeQuery(connection, tablesQuery, [connection.config.database]);
    
    const tables = result.rows.filter(row => row.table_type === 'BASE TABLE').map(row => ({
      name: row.table_name,
      schema: row.schema_name,
      type: 'table' as const
    }));

    const views = result.rows.filter(row => row.table_type === 'VIEW').map(row => ({
      name: row.table_name,
      schema: row.schema_name,
      type: 'view' as const
    }));

    return { tables, views };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    const dbName = database || connection.config.database;
    const query = `
      SELECT 
        TABLE_SCHEMA as schema_name,
        TABLE_NAME as table_name,
        'table' as type
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    const result = await this.executeQuery(connection, query, [dbName]);
    
    return result.rows.map(row => ({
      name: row.table_name,
      schema: row.schema_name,
      type: 'table' as const
    }));
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    const [schema, tableName] = table.includes('.') ? table.split('.') : [connection.config.database, table];
    
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const result = await this.executeQuery(connection, query, [schema, tableName]);
    
    return result.rows.map(row => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      isPrimaryKey: row.COLUMN_KEY === 'PRI'
    }));
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      await connection.client.end();
      connection.isConnected = false;
    }
  }
};