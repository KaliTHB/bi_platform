// File: api-services/src/plugins/datasources/cloud_databases/dynamodb.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { DynamoDBClient, ScanCommand, QueryCommand, DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const dynamodbPlugin: DataSourcePlugin = {
  name: 'dynamodb',
  displayName: 'AWS DynamoDB',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to AWS DynamoDB',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password' },
      endpoint: { type: 'string', title: 'Custom Endpoint (for local DynamoDB)' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new DynamoDBClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId as string,
        secretAccessKey: config.secretAccessKey as string
      },
      ...(config.endpoint && { endpoint: config.endpoint as string })
    });

    const docClient = DynamoDBDocumentClient.from(client);

    return {
      id: `dynamodb-${Date.now()}`,
      config,
      client: { dynamodb: client, doc: docClient },
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.dynamodb.send(new ListTablesCommand({}));
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Parse DynamoDB operation (simplified - you'd need a more robust parser)
      const operation = JSON.parse(query);
      let result: any;
      
      switch (operation.type) {
        case 'scan':
          const scanCommand = new ScanCommand({
            TableName: operation.tableName,
            ...operation.params
          });
          result = await connection.client.doc.send(scanCommand);
          break;
          
        case 'query':
          const queryCommand = new QueryCommand({
            TableName: operation.tableName,
            ...operation.params
          });
          result = await connection.client.doc.send(queryCommand);
          break;
          
        default:
          throw new Error(`Unsupported operation: ${operation.type}`);
      }
      
      const executionTimeMs = Date.now() - startTime;
      const items = result.Items || [];
      
      // Infer columns from items
      const columns: any[] = [];
      if (items.length > 0) {
        Object.keys(items[0]).forEach(key => {
          columns.push({
            name: key,
            type: typeof items[0][key],
            nullable: true,
            defaultValue: null
          });
        });
      }

      connection.lastActivity = new Date();
      
      return {
        rows: items,
        columns,
        rowCount: items.length,
        executionTimeMs,
        queryId: `dynamodb-${Date.now()}`
      };
    } catch (error) {
      throw new Error(`DynamoDB query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const command = new ListTablesCommand({});
    const result = await connection.client.dynamodb.send(command);
    
    const tables = await Promise.all(
      (result.TableNames || []).map(async (tableName) => {
        try {
          const describeCommand = new DescribeTableCommand({ TableName: tableName });
          const tableDescription = await connection.client.dynamodb.send(describeCommand);
          
          const columns = tableDescription.Table?.AttributeDefinitions?.map(attr => ({
            name: attr.AttributeName!,
            type: this.mapDynamoDBType(attr.AttributeType!),
            nullable: true,
            defaultValue: null
          })) || [];
          
          return {
            name: tableName,
            schema: 'dynamodb',
            columns
          };
        } catch (error) {
          return {
            name: tableName,
            schema: 'dynamodb',
            columns: []
          };
        }
      })
    );

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  },

  private mapDynamoDBType(dynamoType: string): string {
    const typeMap: Record<string, string> = {
      'S': 'string',
      'N': 'number',
      'B': 'binary',
      'SS': 'string_set',
      'NS': 'number_set',
      'BS': 'binary_set',
      'BOOL': 'boolean',
      'NULL': 'null',
      'L': 'list',
      'M': 'map'
    };
    return typeMap[dynamoType] || 'unknown';
  }
};