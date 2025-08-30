// File: api-services/src/plugins/datasources/storage_services/s3.ts
import AWS from 'aws-sdk';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const s3Plugin: DataSourcePlugin = {
  name: 's3',
  displayName: 'Amazon S3',
  category: 'storage_services',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key' },
      bucketName: { type: 'string', title: 'Bucket Name' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey', 'bucketName'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    AWS.config.update({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });

    const s3 = new AWS.S3();

    return {
      id: `s3-${Date.now()}`,
      config,
      client: s3,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.headBucket({ Bucket: config.bucketName }).promise();
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const queryObj = JSON.parse(query);
      const { operation, key, prefix } = queryObj;
      
      let result;
      switch (operation) {
        case 'listObjects':
          result = await connection.client.listObjectsV2({
            Bucket: connection.config.bucketName,
            Prefix: prefix
          }).promise();
          
          const objects = result.Contents?.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag
          })) || [];
          
          return {
            rows: objects,
            columns: [
              { name: 'key', type: 'string', nullable: false },
              { name: 'size', type: 'number', nullable: true },
              { name: 'lastModified', type: 'date', nullable: true },
              { name: 'etag', type: 'string', nullable: true }
            ],
            rowCount: objects.length,
            executionTimeMs: Date.now() - startTime
          };
          
        case 'getObject':
          const obj = await connection.client.getObject({
            Bucket: connection.config.bucketName,
            Key: key
          }).promise();
          
          return {
            rows: [{ key, content: obj.Body?.toString() }],
            columns: [
              { name: 'key', type: 'string', nullable: false },
              { name: 'content', type: 'text', nullable: true }
            ],
            rowCount: 1,
            executionTimeMs: Date.now() - startTime
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(): Promise<SchemaInfo> {
    return {
      tables: [
        {
          name: 'objects',
          schema: 's3',
          columns: [
            { name: 'key', type: 'string', nullable: false },
            { name: 'size', type: 'number', nullable: true },
            { name: 'lastModified', type: 'date', nullable: true },
            { name: 'etag', type: 'string', nullable: true }
          ]
        }
      ],
      views: []
    };
  },

  async disconnect(): Promise<void> {
    // S3 doesn't require explicit disconnection
  }
};
