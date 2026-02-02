// File: api-services/src/plugins/datasources/cloud_databases/dynamodb.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces';
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
      lastActivity: Date.now()
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

      connection.lastActivity = Date.now();
      
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

  // Add the missing getTables method
async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
  try {
    const command = new ListTablesCommand({});
    const result = await connection.client.dynamodb.send(command);
    
    return (result.TableNames || []).map(tableName => ({
      name: tableName,
      schema: 'dynamodb',
      type: 'table' as const,
      columns: []
    }));
  } catch (error) {
    console.warn('Failed to get tables for DynamoDB:', error);
    return [];
  }
},

// Add the missing getColumns method  
async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
  try {
    const describeCommand = new DescribeTableCommand({ TableName: table });
    const result = await connection.client.dynamodb.send(describeCommand);
    
    const columns: ColumnInfo[] = [];
    
    // Add key attributes
    result.Table?.KeySchema?.forEach(key => {
      const attrDef = result.Table?.AttributeDefinitions?.find(
        attr => attr.AttributeName === key.AttributeName
      );
      
      columns.push({
        name: key.AttributeName!,
        type: this.mapDynamoDBType(attrDef?.AttributeType || 'S'),
        nullable: false,
        defaultValue: null,
        isPrimaryKey: key.KeyType === 'HASH' || key.KeyType === 'RANGE'
      });
    });
    
    // Add other attributes
    result.Table?.AttributeDefinitions?.forEach(attr => {
      if (!columns.find(col => col.name === attr.AttributeName)) {
        columns.push({
          name: attr.AttributeName!,
          type: this.mapDynamoDBType(attr.AttributeType!),
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        });
      }
    });
    
    return columns;
  } catch (error) {
    console.warn('Failed to get columns for DynamoDB:', error);
    return [];
  }
},

// Add this helper method
private mapDynamoDBType(dynamoType: string): string {
  switch (dynamoType) {
    case 'S': return 'string';
    case 'N': return 'number';
    case 'B': return 'binary';
    case 'SS': return 'string[]';
    case 'NS': return 'number[]';
    case 'BS': return 'binary[]';
    case 'M': return 'object';
    case 'L': return 'array';
    case 'NULL': return 'null';
    case 'BOOL': return 'boolean';
    default: return 'string';
  }
}
};