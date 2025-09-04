// File: api-services/src/plugins/datasources/storage_services/s3.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export const s3Plugin: DataSourcePlugin = {
  name: 's3',
  displayName: 'Amazon S3',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Amazon S3 buckets and objects',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { 
        type: 'string', 
        title: 'AWS Region', 
        default: 'us-east-1',
        required: true,
        description: 'AWS region where the S3 bucket is located'
      },
      accessKeyId: { 
        type: 'string', 
        title: 'Access Key ID',
        required: true,
        description: 'AWS Access Key ID'
      },
      secretAccessKey: { 
        type: 'string', 
        title: 'Secret Access Key', 
        format: 'password',
        required: true,
        description: 'AWS Secret Access Key'
      },
      bucket: { 
        type: 'string', 
        title: 'S3 Bucket Name',
        required: true,
        description: 'S3 bucket name to connect to'
      },
      endpoint: { 
        type: 'string', 
        title: 'Custom Endpoint',
        description: 'Custom S3 endpoint (for S3-compatible services)'
      },
      forcePathStyle: {
        type: 'boolean',
        title: 'Force Path Style',
        default: false,
        description: 'Force path-style addressing for S3-compatible services'
      }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey', 'bucket'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    try {
      const s3Config: any = {
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId as string,
          secretAccessKey: config.secretAccessKey as string
        }
      };

      if (config.endpoint) {
        s3Config.endpoint = config.endpoint;
      }

      if (config.forcePathStyle) {
        s3Config.forcePathStyle = true;
      }

      const s3Client = new S3Client(s3Config);

      return {
        id: `s3-${Date.now()}`,
        config,
        client: s3Client,
        isConnected: true,
        lastUsed: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to connect to S3: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      
      const command = new ListObjectsV2Command({
        Bucket: config.bucket as string,
        MaxKeys: 1
      });

      await connection.client.send(command);
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const operation = JSON.parse(query);
      
      switch (operation.operation) {
        case 'list':
          const command = new ListObjectsV2Command({
            Bucket: connection.config.bucket as string,
            Prefix: operation.prefix,
            MaxKeys: operation.maxKeys || 1000
          });

          const response = await connection.client.send(command);
          const objects = response.Contents?.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag,
            storageClass: obj.StorageClass
          })) || [];
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'key', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'lastModified', type: 'date', nullable: true, defaultValue: null },
            { name: 'etag', type: 'string', nullable: true, defaultValue: null },
            { name: 'storageClass', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: objects,
            columns,
            rowCount: objects.length,
            executionTime,
            queryId: `s3-list-${Date.now()}`
          };
          
        case 'get':
          const getCommand = new GetObjectCommand({
            Bucket: connection.config.bucket as string,
            Key: operation.key
          });

          const getResponse = await connection.client.send(getCommand);
          const content = await this.streamToString(getResponse.Body);
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{ 
              key: operation.key, 
              content,
              contentType: getResponse.ContentType,
              contentLength: getResponse.ContentLength 
            }],
            columns: [
              { name: 'key', type: 'string', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: false, defaultValue: null },
              { name: 'contentType', type: 'string', nullable: true, defaultValue: null },
              { name: 'contentLength', type: 'number', nullable: true, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `s3-get-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`S3 query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: connection.config.bucket as string,
        MaxKeys: 1000
      });

      const response = await connection.client.send(command);
      const tables: TableInfo[] = [];
      const prefixes = new Set<string>();

      // Group objects by prefix/directory as tables
      response.Contents?.forEach(obj => {
        if (obj.Key) {
          let prefix: string;
          
          if (obj.Key.includes('/')) {
            prefix = obj.Key.substring(0, obj.Key.lastIndexOf('/'));
          } else {
            // Group by file extension
            const extension = obj.Key.includes('.') 
              ? obj.Key.substring(obj.Key.lastIndexOf('.') + 1)
              : 'files';
            prefix = extension;
          }
          
          prefixes.add(prefix);
        }
      });

      prefixes.forEach(prefix => {
        tables.push({
          name: prefix || 'root',
          schema: connection.config.bucket as string,
          type: 'table'
        });
      });

      return tables;
    } catch (error) {
      console.warn('Failed to get tables for S3:', error);
      return [];
    }
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      // For S3 storage, return generic object metadata columns
      return [
        {
          name: 'key',
          type: 'string',
          nullable: false,
          defaultValue: null,
          isPrimaryKey: true
        },
        {
          name: 'size',
          type: 'number',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'lastModified',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'etag',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'storageClass',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        }
      ];
    } catch (error) {
      console.warn('Failed to get columns for S3:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  },

  private async streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
  }
};