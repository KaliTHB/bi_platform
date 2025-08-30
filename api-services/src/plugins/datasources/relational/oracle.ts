// File: api-services/src/plugins/datasources/relational/oracle.ts
import oracledb from 'oracledb';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const oraclePlugin: DataSourcePlugin = {
  name: 'oracle',
  displayName: 'Oracle Database',
  category: 'relational',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      connectString: { type: 'string', title: 'Connect String', description: 'Oracle connection string' },
      user: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' },
      poolMin: { type: 'integer', title: 'Min Pool Size', default: 1 },
      poolMax: { type: 'integer', title: 'Max Pool Size', default: 10 },
      poolIncrement: { type: 'integer', title: 'Pool Increment', default: 1 }
    },
    required: ['connectString', 'user', 'password'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const pool = await oracledb.createPool({
      connectString: config.connectString,
      user: config.user || config.username,
      password: config.password,
      poolMin: config.poolMin || 1,
      poolMax: config.poolMax || 10,
      poolIncrement: config.poolIncrement || 1
    });

    return {
      id: `oracle-${Date.now()}`,
      config,
      pool,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const result = await this.executeQuery(connection, 'SELECT * FROM dual');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    let oracleConnection;
    try {
      oracleConnection = await connection.pool.getConnection();
      const startTime = Date.now();
      const result = await oracleConnection.execute(query, params || [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const executionTimeMs = Date.now() - startTime;

      const columns = result.metaData?.map((col: any) => ({
        name: col.name,
        type: col.fetchType?.toString() || 'unknown',
        nullable: col.nullable || false
      })) || [];

      return {
        rows: result.rows || [],
        columns,
        rowCount: result.rows?.length || 0,
        executionTimeMs
      };
    } finally {
      if (oracleConnection) {
        await oracleConnection.close();
      }
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tablesResult = await this.executeQuery(connection, `
      SELECT table_name, owner 
      FROM all_tables 
      WHERE owner = USER
    `);

    const tables = tablesResult.rows.map((row: any) => ({
      name: row.TABLE_NAME,
      schema: row.OWNER,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.pool) {
      await connection.pool.close(0);
      connection.isConnected = false;
    }
  }
};