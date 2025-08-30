// File: api-services/src/plugins/datasources/cloud_databases/athena.ts
import AWS from 'aws-sdk';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const athenaPlugin: DataSourcePlugin = {
  name: 'athena',
  displayName: 'AWS Athena',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key' },
      database: { type: 'string', title: 'Database' },
      outputLocation: { type: 'string', title: 'S3 Output Location', description: 'S3 path for query results' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey', 'database', 'outputLocation'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    AWS.config.update({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });

    const athena = new AWS.Athena();

    return {
      id: `athena-${Date.now()}`,
      config,
      client: athena,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const result = await this.executeQuery(connection, 'SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    const params = {
      QueryString: query,
      QueryExecutionContext: {
        Database: connection.config.database
      },
      ResultConfiguration: {
        OutputLocation: connection.config.outputLocation
      }
    };

    const startQueryExecution = await connection.client.startQueryExecution(params).promise();
    const queryExecutionId = startQueryExecution.QueryExecutionId;

    // Wait for query completion
    let queryStatus = 'RUNNING';
    while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResult = await connection.client.getQueryExecution({
        QueryExecutionId: queryExecutionId
      }).promise();
      queryStatus = statusResult.QueryExecution.Status.State;
    }

    if (queryStatus !== 'SUCCEEDED') {
      throw new Error(`Query failed with status: ${queryStatus}`);
    }

    // Get query results
    const results = await connection.client.getQueryResults({
      QueryExecutionId: queryExecutionId
    }).promise();

    const executionTimeMs = Date.now() - startTime;
    const rows = results.ResultSet.Rows?.slice(1).map(row => {
      const obj: any = {};
      row.Data.forEach((cell, index) => {
        const columnName = results.ResultSet.ResultSetMetadata.ColumnInfo[index].Name;
        obj[columnName] = cell.VarCharValue;
      });
      return obj;
    }) || [];

    const columns = results.ResultSet.ResultSetMetadata?.ColumnInfo?.map(col => ({
      name: col.Name,
      type: col.Type,
      nullable: true
    })) || [];

    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const result = await this.executeQuery(connection, 'SHOW TABLES');
    
    const tables = result.rows.map((row: any) => ({
      name: row.tab_name,
      schema: connection.config.database,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(): Promise<void> {
    // AWS Athena doesn't require explicit disconnection
  }
};