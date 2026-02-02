// File: api-services/src/plugins/datasources/storage_services/azure_storage.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

export const azureStoragePlugin: DataSourcePlugin = {
  name: 'azure_storage',
  displayName: 'Azure Blob Storage',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Azure Blob Storage containers and blobs',
  
  configSchema: {
    type: 'object',
    properties: {
      accountName: { 
        type: 'string', 
        title: 'Storage Account Name',
        required: true,
        description: 'Azure Storage Account name'
      },
      accountKey: { 
        type: 'string', 
        title: 'Account Key', 
        format: 'password',
        required: true,
        description: 'Azure Storage Account access key'
      },
      containerName: { 
        type: 'string', 
        title: 'Container Name',
        required: true,
        description: 'Blob container name to connect to'
      },
      endpoint: { 
        type: 'string', 
        title: 'Custom Endpoint',
        description: 'Custom blob service endpoint (optional)'
      }
    },
    required: ['accountName', 'accountKey', 'containerName'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 20
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    try {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        config.accountName as string,
        config.accountKey as string
      );
      
      const blobServiceClient = new BlobServiceClient(
        config.endpoint as string || `https://${config.accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );

      return {
        id: `azure-storage-${Date.now()}`,
        config,
        client: blobServiceClient,
        isConnected: true,
        lastUsed: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to connect to Azure Storage: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const containerClient = connection.client.getContainerClient(config.containerName as string);
      await containerClient.listBlobsFlat({ maxPageSize: 1 }).next();
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
      const containerClient = connection.client.getContainerClient(connection.config.containerName as string);
      
      switch (operation.operation) {
        case 'list':
          const blobs = [];
          for await (const blob of containerClient.listBlobsFlat()) {
            blobs.push({
              name: blob.name,
              size: blob.properties.contentLength,
              lastModified: blob.properties.lastModified,
              contentType: blob.properties.contentType,
              etag: blob.properties.etag
            });
            
            if (blobs.length >= (operation.maxItems || 1000)) break;
          }
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'lastModified', type: 'date', nullable: true, defaultValue: null },
            { name: 'contentType', type: 'string', nullable: true, defaultValue: null },
            { name: 'etag', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: blobs,
            columns,
            rowCount: blobs.length,
            executionTime,
            queryId: `azure-storage-${Date.now()}`
          };
          
        case 'read':
          const blobClient = containerClient.getBlobClient(operation.blobName);
          const downloadResponse = await blobClient.download();
          const content = await this.streamToBuffer(downloadResponse.readableStreamBody!);
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{ name: operation.blobName, content: content.toString('utf-8') }],
            columns: [
              { name: 'name', type: 'string', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: false, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `azure-storage-read-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`Azure Storage query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      const containerClient = connection.client.getContainerClient(connection.config.containerName as string);
      const tables: TableInfo[] = [];
      const prefixes = new Set<string>();
      
      // List blobs and group by prefix/directory structure
      for await (const blob of containerClient.listBlobsFlat()) {
        const fileName = blob.name;
        let tableName: string;
        
        if (fileName.includes('/')) {
          // Use directory structure as table name
          tableName = fileName.substring(0, fileName.lastIndexOf('/'));
        } else {
          // Use file extension as table grouping
          const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
          tableName = extension || 'files';
        }
        
        prefixes.add(tableName);
        
        if (tables.length >= 100) break; // Limit for performance
      }

      prefixes.forEach(prefix => {
        tables.push({
          name: prefix,
          schema: connection.config.containerName as string,
          type: 'table'
        });
      });

      return tables;
    } catch (error) {
      console.warn('Failed to get tables for Azure Storage:', error);
      return [];
    }
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      // For blob storage, return generic blob metadata columns
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
          name: 'lastModified',
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
      console.warn('Failed to get columns for Azure Storage:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  },

  private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
};