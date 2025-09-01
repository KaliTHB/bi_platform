/ File: api-services/src/plugins/datasources/storage_services/azure_storage.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

export const azureStoragePlugin: DataSourcePlugin = {
  name: 'azure_storage',
  displayName: 'Azure Blob Storage',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Azure Blob Storage',
  
  configSchema: {
    type: 'object',
    properties: {
      accountName: { type: 'string', title: 'Storage Account Name' },
      accountKey: { type: 'string', title: 'Account Key', format: 'password' },
      containerName: { type: 'string', title: 'Container Name' },
      endpoint: { type: 'string', title: 'Custom Endpoint' }
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
      lastActivity: Date.now()
    };
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
          
          const executionTimeMs = Date.now() - startTime;
          const columns = [
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'lastModified', type: 'date', nullable: true, defaultValue: null },
            { name: 'contentType', type: 'string', nullable: true, defaultValue: null },
            { name: 'etag', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastActivity = Date.now();
          
          return {
            rows: blobs,
            columns,
            rowCount: blobs.length,
            executionTimeMs,
            queryId: `azure-storage-${Date.now()}`
          };
          
        case 'read':
          const blobClient = containerClient.getBlobClient(operation.blobName);
          const downloadResponse = await blobClient.download();
          const content = await this.streamToBuffer(downloadResponse.readableStreamBody!);
          
          connection.lastActivity = Date.now();
          
          return {
            rows: [{ name: operation.blobName, content: content.toString('utf-8') }],
            columns: [
              { name: 'name', type: 'string', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: false, defaultValue: null }
            ],
            rowCount: 1,
            executionTimeMs: Date.now() - startTime,
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
    const containerClient = connection.client.getContainerClient(connection.config.containerName as string);
    const tables = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      tables.push({
        name: blob.name.replace(/^.*\//, '').replace(/\.[^.]+$/, ''),
        schema: 'azure_storage',
        columns: []
      });
      
      if (tables.length >= 100) break; // Limit for performance
    }

    return { tables, views: [] };
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