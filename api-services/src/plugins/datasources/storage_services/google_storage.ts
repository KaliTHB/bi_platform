// File: api-services/src/plugins/datasources/storage_services/google_storage.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import { Storage } from '@google-cloud/storage';

export const googleStoragePlugin: DataSourcePlugin = {
  name: 'google_storage',
  displayName: 'Google Cloud Storage',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Google Cloud Storage buckets and objects',
  
  configSchema: {
    type: 'object',
    properties: {
      projectId: { 
        type: 'string', 
        title: 'Project ID',
        required: true,
        description: 'Google Cloud Project ID'
      },
      bucketName: { 
        type: 'string', 
        title: 'Bucket Name',
        required: true,
        description: 'Google Cloud Storage bucket name'
      },
      keyFilename: { 
        type: 'string', 
        title: 'Service Account Key File Path',
        description: 'Path to service account JSON key file'
      },
      credentials: { 
        type: 'string', 
        title: 'Service Account JSON',
        format: 'password',
        description: 'Service account JSON content (alternative to key file)'
      }
    },
    required: ['projectId', 'bucketName'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 30
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    try {
      const storageConfig: any = { 
        projectId: config.projectId 
      };
      
      if (config.keyFilename) {
        storageConfig.keyFilename = config.keyFilename;
      } else if (config.credentials) {
        storageConfig.credentials = JSON.parse(config.credentials as string);
      }

      const storage = new Storage(storageConfig);
      const bucket = storage.bucket(config.bucketName as string);

      return {
        id: `google-storage-${Date.now()}`,
        config,
        client: { storage, bucket },
        isConnected: true,
        lastUsed: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to connect to Google Cloud Storage: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.bucket.exists();
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
      const { bucket } = connection.client;
      
      switch (operation.operation) {
        case 'list':
          const [files] = await bucket.getFiles({
            prefix: operation.prefix,
            maxResults: operation.maxResults || 1000
          });
          
          const objects = files.map(file => ({
            name: file.name,
            size: file.metadata.size,
            updated: file.metadata.updated,
            contentType: file.metadata.contentType,
            etag: file.metadata.etag,
            generation: file.metadata.generation
          }));
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'updated', type: 'date', nullable: true, defaultValue: null },
            { name: 'contentType', type: 'string', nullable: true, defaultValue: null },
            { name: 'etag', type: 'string', nullable: true, defaultValue: null },
            { name: 'generation', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: objects,
            columns,
            rowCount: objects.length,
            executionTime,
            queryId: `gcs-list-${Date.now()}`
          };
          
        case 'read':
          const file = bucket.file(operation.fileName);
          const [content] = await file.download();
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{ 
              name: operation.fileName, 
              content: content.toString('utf-8'),
              size: content.length
            }],
            columns: [
              { name: 'name', type: 'string', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: false, defaultValue: null },
              { name: 'size', type: 'number', nullable: true, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `gcs-read-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`Google Cloud Storage query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      const [files] = await connection.client.bucket.getFiles({ maxResults: 1000 });
      const prefixes = new Set<string>();

      files.forEach(file => {
        let prefix: string;
        
        if (file.name.includes('/')) {
          prefix = file.name.substring(0, file.name.lastIndexOf('/'));
        } else {
          // Group by file extension
          const extension = file.name.includes('.') 
            ? file.name.substring(file.name.lastIndexOf('.') + 1)
            : 'files';
          prefix = extension;
        }
        
        prefixes.add(prefix);
      });

      const tables: TableInfo[] = [];
      prefixes.forEach(prefix => {
        tables.push({
          name: prefix || 'root',
          schema: connection.config.bucketName as string,
          type: 'table'
        });
      });

      return tables;
    } catch (error) {
      console.warn('Failed to get tables for Google Storage:', error);
      return [];
    }
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      return [
        {
          name: 'name',
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
          name: 'updated',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'contentType',
          type: 'string',
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
        }
      ];
    } catch (error) {
      console.warn('Failed to get columns for Google Storage:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  }
};