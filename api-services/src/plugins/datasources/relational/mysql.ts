// File: api-services/src/plugins/datasources/relational/mysql.ts
import mysql from 'mysql2/promise';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces';

export const MySQLPlugin: DataSourcePlugin = {
  name: 'mysql',
  displayName: 'MySQL Database',
  category: 'relational',
  version: '1.0.0',
  configSchema: {
    properties: {
      host: {
        type: 'string',
        title: 'Host',
        description: 'MySQL server hostname',
        default: 'localhost'
      },
      port: {
        type: 'integer',
        title: 'Port',
        description: 'MySQL server port',
        default: 3306,
        minimum: 1,
        maximum: 65535
      },
      database: {
        type: 'string',
        title: 'Database',
        description: 'Database name'
      },
      username: {
        type: 'string',
        title: 'Username',
        description: 'Database username'
      },
      password: {
        type: 'string',
        title: 'Password',
        description: 'Database password',
        format: 'password'
      },
      ssl: {
        type: 'boolean',
        title: 'SSL',
        description: 'Enable SSL connection',
        default: false
      },
      connectionLimit: {
        type: 'integer',
        title: 'Connection Limit',
        description: 'Maximum number of connections',
        default: 10,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['host', 'database', 'username', 'password']
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: config.options?.connectionLimit || 10,
      acquireTimeout: 60000,
      timeout: 60000,
    });

    // Test the connection
    const testConnection = await pool.getConnection();
    testConnection.release();

    return {
      id: `mysql_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      client: pool,
      isConnected: true,
      lastUsed: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await this.disconnect(connection);
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const pool = connection.client;
      const [rows, fields] = await pool.execute(query);
      
      const executionTime = Date.now() - startTime;
      
      const columns = fields.map((field: any) => ({
        name: field.name,
        type: field.type,
        nullable: (field.flags & 1) === 0, // NOT_NULL flag
        defaultValue: field.default || null,
        maxLength: field.length
      }));

      return {
        rows: Array.isArray(rows) ? rows : [],
        columns,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const pool = connection.client;
    
    // Get tables and columns
    const tablesQuery = `
      SELECT 
        t.TABLE_SCHEMA,
        t.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
      WHERE t.TABLE_SCHEMA = ? AND t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
    `;

    const [tablesRows] = await pool.execute(tablesQuery, [connection.config.database]);
    
    // Group by table
    const tablesMap = new Map();
    (tablesRows as any[]).forEach(row => {
      const tableKey = row.TABLE_NAME;
      if (!tablesMap.has(tableKey)) {
        tablesMap.set(tableKey, {
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          columns: []
        });
      }
      
      if (row.COLUMN_NAME) {
        tablesMap.get(tableKey).columns.push({
          name: row.COLUMN_NAME,
          type: row.DATA_TYPE,
          nullable: row.IS_NULLABLE === 'YES',
          defaultValue: row.COLUMN_DEFAULT,
          maxLength: row.CHARACTER_MAXIMUM_LENGTH
        });
      }
    });

    // Get views
    const viewsQuery = `
      SELECT 
        v.TABLE_SCHEMA,
        v.TABLE_NAME,
        v.VIEW_DEFINITION,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE
      FROM INFORMATION_SCHEMA.VIEWS v
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON v.TABLE_NAME = c.TABLE_NAME AND v.TABLE_SCHEMA = c.TABLE_SCHEMA
      WHERE v.TABLE_SCHEMA = ?
      ORDER BY v.TABLE_NAME, c.ORDINAL_POSITION
    `;

    const [viewsRows] = await pool.execute(viewsQuery, [connection.config.database]);
    
    const viewsMap = new Map();
    (viewsRows as any[]).forEach(row => {
      const viewKey = row.TABLE_NAME;
      if (!viewsMap.has(viewKey)) {
        viewsMap.set(viewKey, {
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          columns: [],
          definition: row.VIEW_DEFINITION
        });
      }
      
      if (row.COLUMN_NAME) {
        viewsMap.get(viewKey).columns.push({
          name: row.COLUMN_NAME,
          type: row.DATA_TYPE,
          nullable: row.IS_NULLABLE === 'YES'
        });
      }
    });

    return {
      tables: Array.from(tablesMap.values()),
      views: Array.from(viewsMap.values())
    };
  },

  async disconnect(connection: Connection): Promise<void> {
    try {
      const pool = connection.client;
      await pool.end();
      connection.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from MySQL:', error);
    }
  }
};