// File: api-services/src/plugins/datasources/cloud_databases/athena.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { AthenaClient, StartQueryExecutionCommand, GetQueryResultsCommand, GetQueryExecutionCommand } from '@aws-sdk/client-athena';

export const athenaPlugin: DataSourcePlugin = {
  name: 'athena',
  displayName: 'AWS Athena',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to AWS Athena',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password' },
      database: { type: 'string', title: 'Database' },
      workgroup: { type: 'string', title: 'Workgroup', default: 'primary' },
      outputLocation: { type: 'string', title: 'S3 Output Location' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey', 'database', 'outputLocation'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 20
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new AthenaClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId as string,
        secretAccessKey: config.secretAccessKey as string
      }
    });

    return {
      id: `athena-${Date.now()}`,
      config,
      client,
      isConnected: true,
      lastActivity: Date.now()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await this.executeQuery(connection, 'SELECT 1');
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    // Start query execution
    const startCommand = new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: {
        Database: connection.config.database as string
      },
      ResultConfiguration: {
        OutputLocation: connection.config.outputLocation as string
      },
      WorkGroup: connection.config.workgroup as string || 'primary'
    });
    
    const startResult = await connection.client.send(startCommand);
    const queryExecutionId = startResult.QueryExecutionId!;
    
    // Wait for query to complete
    await this.waitForQueryCompletion(connection, queryExecutionId);
    
    // Get results
    const resultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId
    });
    
    const results = await connection.client.send(resultsCommand);
    const executionTimeMs = Date.now() - startTime;
    
    // Process results
    const rows: any[] = [];
    const columns: any[] = [];
    
    if (results.ResultSet?.Rows) {
      const headerRow = results.ResultSet.Rows[0];
      if (headerRow?.Data) {
        headerRow.Data.forEach((col, index) => {
          columns.push({
            name: col.VarCharValue || `column_${index}`,
            type: 'string',
            nullable: true,
            defaultValue: null
          });
        });
      }
      
      results.ResultSet.Rows.slice(1).forEach(row => {
        if (row.Data) {
          const rowData: any = {};
          row.Data.forEach((cell, index) => {
            rowData[columns[index]?.name || `column_${index}`] = cell.VarCharValue;
          });
          rows.push(rowData);
        }
      });
    }

    connection.lastActivity = Date.now();
    
    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs,
      queryId: queryExecutionId
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const query = `SHOW TABLES IN ${connection.config.database}`;
    const result = await this.executeQuery(connection, query);
    
    const tables = result.rows.map(row => ({
      name: Object.values(row)[0] as string,
      schema: connection.config.database as string,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  },

  private async waitForQueryCompletion(connection: Connection, queryExecutionId: string): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const command = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
      const result = await connection.client.send(command);
      
      const status = result.QueryExecution?.Status?.State;
      
      if (status === 'SUCCEEDED') {
        return;
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        throw new Error(`Query ${status}: ${result.QueryExecution?.Status?.StateChangeReason}`);
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Query execution timeout');
  }
};