// File: api-services/src/plugins/datasources/cloud_databases/dynamodb.ts
import AWS from 'aws-sdk';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const dynamodbPlugin: DataSourcePlugin = {
  name: 'dynamodb',
  displayName: 'AWS DynamoDB',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key' },
      endpoint: { type: 'string', title: 'Custom Endpoint', description: 'Optional custom DynamoDB endpoint' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    AWS.config.update({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });

    const docClient = new AWS.DynamoDB.DocumentClient({
      endpoint: config.endpoint
    });

    return {
      id: `dynamodb-${Date.now()}`,
      config,
      client: docClient,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      // Test by listing tables
      const dynamodb = new AWS.DynamoDB({ region: config.region });
      await dynamodb.listTables({ Limit: 1 }).promise();
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const queryObj = JSON.parse(query);
      const { operation, params } = queryObj;
      
      let result;
      switch (operation) {
        case 'scan':
          result = await connection.client.scan(params).promise();
          break;
        case 'query':
          result = await connection.client.query(params).promise();
          break;
        case 'get':
          result = await connection.client.get(params).promise();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const executionTimeMs = Date.now() - startTime;
      const rows = result.Items || (result.Item ? [result.Item] : []);
      
      const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
        name: key,
        type: 'mixed',
        nullable: true
      })) : [];

      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const dynamodb = new AWS.DynamoDB({ 
      region: connection.config.region,
      accessKeyId: connection.config.accessKeyId,
      secretAccessKey: connection.config.secretAccessKey
    });
    
    const result = await dynamodb.listTables().promise();
    
    const tables = result.TableNames?.map(tableName => ({
      name: tableName,
      schema: 'dynamodb',
      columns: []
    })) || [];

    return { tables, views: [] };
  },

  async disconnect(): Promise<void> {
    // DynamoDB doesn't require explicit disconnection
  }
};