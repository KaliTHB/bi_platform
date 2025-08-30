// File: api-services/src/plugins/datasources/relational/postgres.ts
import { Pool, PoolClient } from 'pg';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ViewInfo, ColumnDefinition } from '../interfaces/DataSourcePlugin';

export const postgresPlugin: DataSourcePlugin = {
  name: 'postgres',
  displayName: 'PostgreSQL Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      host: {
        type: 'string',
        title: 'Host',
        description: 'PostgreSQL server hostname',
        default: 'localhost'
      },
      port: {
        type: 'integer',
        title: 'Port',
        description: 'PostgreSQL server port',
        default: 5432,
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
        description: 'Database password'
      },
      ssl: {
        type: 'boolean',
        title: 'SSL',
        description: 'Enable SSL connection',
        default: false
      },
      maxConnections: {
        type: 'integer',
        title: 'Max Connections',
        description: 'Maximum number of connections in pool',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['host', 'database', 'username', 'password'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    return {
      id: `postgres-${Date.now()}`,
      config,
      pool,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const result = await this.executeQuery(connection, 'SELECT version() as version');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const client: PoolClient = await connection.pool.connect();
    
    try {
      const startTime = Date.now();
      const result = await client.query(query, params);
      const executionTimeMs = Date.now() - startTime;
      
      const columns: ColumnDefinition[] = result.fields?.map((field: any) => ({
        name: field.name,
        type: field.dataTypeID.toString(),
        nullable: true
      })) || [];

      return {
        rows: result.rows,
        columns,
        rowCount: result.rowCount || 0,
        executionTimeMs
      };
    } finally {
      client.release();
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, `
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
    `);

    const viewsResult = await this.executeQuery(connection, `
      SELECT schemaname, viewname, definition
      FROM pg_views 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
    `);

    const tables: TableInfo[] = await Promise.all(
      tablesResult.rows.map(async (row: any) => {
        const columnsResult = await this.executeQuery(connection, `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
        `, [row.schemaname, row.tablename]);

        return {
          name: row.tablename,
          schema: row.schemaname,
          columns: columnsResult.rows.map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES'
          }))
        };
      })
    );

    const views: ViewInfo[] = viewsResult.rows.map((row: any) => ({
      name: row.viewname,
      schema: row.schemaname,
      definition: row.definition,
      columns: []
    }));

    return { tables, views };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.end();
      connection.isConnected = false;
    }
  }
};