// File: api-services/src/plugins/datasources/relational/oracle.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces';
import * as oracledb from 'oracledb';

export const oraclePlugin: DataSourcePlugin = {
  name: 'oracle',
  displayName: 'Oracle Database',
  category: 'relational',
  version: '1.0.0',
  description: 'Connect to Oracle databases',
  
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 1521, minimum: 1, maximum: 65535 },
      serviceName: { type: 'string', title: 'Service Name' },
      sid: { type: 'string', title: 'SID (Alternative to Service Name)' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      connectString: { type: 'string', title: 'Connect String (Optional)' }
    },
    required: ['host', 'user', 'password'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 100
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const connectString = config.connectString || 
      `${config.host}:${config.port || 1521}/${config.serviceName || config.sid}`;

    const pool = await oracledb.createPool({
      user: config.user || config.username,
      password: config.password,
      connectString,
      poolMin: 1,
      poolMax: 20,
      poolIncrement: 1
    });

    return {
      id: `oracle-${Date.now()}`,
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
    const conn = await connection.pool.getConnection();
    
    try {
      const result = await conn.execute(query, params || [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const executionTimeMs = Date.now() - startTime;
      
      const columns = result.metaData?.map(col => ({
        name: col.name,
        type: this.mapOracleType(col.dbType),
        nullable: col.nullable,
        defaultValue: null
      })) || [];

      connection.lastActivity = Date.now();
      
      return {
        rows: result.rows || [],
        columns,
        rowCount: result.rowsAffected || (result.rows ? result.rows.length : 0),
        executionTimeMs,
        queryId: `oracle-${Date.now()}`
      };
    } finally {
      await conn.close();
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT table_name, owner, tablespace_name
      FROM all_tables
      WHERE owner NOT IN ('SYS', 'SYSTEM', 'INFORMATION_SCHEMA')
      ORDER BY owner, table_name
    `;
    
    const viewsQuery = `
      SELECT view_name, owner
      FROM all_views
      WHERE owner NOT IN ('SYS', 'SYSTEM', 'INFORMATION_SCHEMA')
      ORDER BY owner, view_name
    `;

    const tablesResult = await this.executeQuery(connection, tablesQuery);
    const viewsResult = await this.executeQuery(connection, viewsQuery);
    
    const tables = tablesResult.rows.map(row => ({
      name: row.TABLE_NAME,
      schema: row.OWNER,
      columns: []
    }));

    const views = viewsResult.rows.map(row => ({
      name: row.VIEW_NAME,
      schema: row.OWNER,
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

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
  try {
    const query = `
      SELECT 
        table_name as name,
        owner as schema,
        'table' as type
      FROM all_tables 
      WHERE owner = UPPER(:schema)
      UNION ALL
      SELECT 
        view_name as name,
        owner as schema,
        'view' as type
      FROM all_views
      WHERE owner = UPPER(:schema)
      ORDER BY name
    `;

    const schema = (connection.config.user || connection.config.username)?.toUpperCase();
    const result = await connection.pool.getConnection().then(async (conn: any) => {
      const res = await conn.execute(query, { schema }, { outFormat: 4 }); // 4 = OBJECT format
      conn.release();
      return res;
    });

    return result.rows?.map((row: any) => ({
      name: row.NAME,
      schema: row.SCHEMA,
      type: row.TYPE.toLowerCase(),
      columns: []
    })) || [];
  } catch (error) {
    console.warn('Failed to get tables for Oracle:', error);
    return [];
  }
},

async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
  try {
    const query = `
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.nullable = 'Y' as nullable,
        c.data_default as defaultValue,
        CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as isPrimaryKey
      FROM all_tab_columns c
      LEFT JOIN (
        SELECT acc.column_name
        FROM all_constraints ac
        JOIN all_cons_columns acc ON ac.constraint_name = acc.constraint_name
        WHERE ac.constraint_type = 'P' AND ac.table_name = UPPER(:tableName)
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = UPPER(:tableName)
      ORDER BY c.column_id
    `;

    const result = await connection.pool.getConnection().then(async (conn: any) => {
      const res = await conn.execute(query, { tableName: table }, { outFormat: 4 });
      conn.release();
      return res;
    });

    return result.rows?.map((row: any) => ({
      name: row.NAME,
      type: row.TYPE,
      nullable: row.NULLABLE,
      defaultValue: row.DEFAULTVALUE,
      isPrimaryKey: Boolean(row.ISPRIMARYKEY)
    })) || [];
  } catch (error) {
    console.warn('Failed to get columns for Oracle:', error);
    return [];
  }
},

  private mapOracleType(dbType: number): string {
    const typeMap: Record<number, string> = {
      [oracledb.DB_TYPE_VARCHAR]: 'varchar2',
      [oracledb.DB_TYPE_NVARCHAR]: 'nvarchar2',
      [oracledb.DB_TYPE_CHAR]: 'char',
      [oracledb.DB_TYPE_NCHAR]: 'nchar',
      [oracledb.DB_TYPE_NUMBER]: 'number',
      [oracledb.DB_TYPE_DATE]: 'date',
      [oracledb.DB_TYPE_TIMESTAMP]: 'timestamp',
      [oracledb.DB_TYPE_CLOB]: 'clob',
      [oracledb.DB_TYPE_BLOB]: 'blob'
    };
    return typeMap[dbType] || 'unknown';
  }
};
