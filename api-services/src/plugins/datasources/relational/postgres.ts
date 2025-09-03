// api-services/src/plugins/datasources/relational/postgres.ts
import { Pool, Client } from 'pg';
import { DataSourcePlugin, ConnectionConfig, Connection, TestResult, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';

const postgresPlugin: DataSourcePlugin = {
  name: 'postgres',
  displayName: 'PostgreSQL',
  category: 'relational',
  version: '1.0.0',
  description: 'PostgreSQL database connector with advanced features',
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
      default: 5432,
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
    username: {
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
    maxConcurrentConnections: 100,
    supportsStreaming: true
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false
    });

    await client.connect();

    return {
      id: `postgres_${Date.now()}`,
      plugin: 'postgres',
      config,
      connected_at: new Date(),
      client
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
      const result = await connection.client.query(query, params);
      
      return {
        data: result.rows,
        columns: result.fields?.map(field => ({
          name: field.name,
          type: this.mapPostgresType(field.dataTypeID)
        })) || [],
        total_rows: result.rowCount || 0,
        execution_time: Date.now() - start
      };
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const query = `
      SELECT schemaname as schema_name 
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      GROUP BY schemaname
      ORDER BY schemaname
    `;
    
    const result = await connection.client.query(query);
    const databases: any[] = [];
    
    for (const row of result.rows) {
      const tables = await this.getTables(connection, row.schema_name);
      databases.push({
        name: row.schema_name,
        tables
      });
    }

    return { databases };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    const schema = database || 'public';
    const query = `
      SELECT 
        t.tablename as name,
        t.schemaname as schema,
        CASE 
          WHEN t.tablename IN (SELECT viewname FROM pg_views WHERE schemaname = $1) THEN 'view'
          ELSE 'table'
        END as type
      FROM pg_tables t
      WHERE t.schemaname = $1
      UNION ALL
      SELECT 
        viewname as name,
        schemaname as schema,
        'view' as type
      FROM pg_views
      WHERE schemaname = $1
      ORDER BY name
    `;

    const result = await connection.client.query(query, [schema]);
    const tables: TableInfo[] = [];

    for (const row of result.rows) {
      const columns = await this.getColumns(connection, row.name);
      tables.push({
        name: row.name,
        schema: row.schema,
        type: row.type,
        columns
      });
    }

    return tables;
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as "defaultValue",
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey"
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `;

    const result = await connection.client.query(query, [table]);
    return result.rows;
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client && typeof connection.client.end === 'function') {
      await connection.client.end();
    }
  },

  mapPostgresType(typeId: number): string {
    const typeMap: { [key: number]: string } = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1114: 'timestamp',
      1184: 'timestamptz'
    };
    return typeMap[typeId] || 'unknown';
  }
};

export default postgresPlugin;
export { postgresPlugin };