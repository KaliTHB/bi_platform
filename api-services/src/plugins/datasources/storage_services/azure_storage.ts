/ File: api-services/src/plugins/datasources/storage_services/azure_storage.ts
import { BlobServiceClient } from '@azure/storage-blob';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const azureStoragePlugin: DataSourcePlugin = {
  name: 'azure_storage',
  displayName: 'Azure Blob Storage',
  category: 'storage_services',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      connectionString: { type: 'string', title: 'Connection String' },
      containerName: { type: 'string', title: 'Container Name' }
    },
    required: ['connectionString', 'containerName'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    
    return {
      id: `azure-storage-${Date.now()}`,
      config,
      client: blobServiceClient,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const containerClient = connection.client.getContainerClient(config.containerName);
      await containerClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const queryObj = JSON.parse(query);
      const { operation, blobName, prefix } = queryObj;
      
      const containerClient = connection.client.getContainerClient(connection.config.containerName);
      
      switch (operation) {
        case 'listBlobs':
          const blobs = [];
          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            blobs.push({
              name: blob.name,
              size: blob.properties.contentLength,
              lastModified: blob.properties.lastModified,
              contentType: blob.properties.contentType
            });
          }
          
          return {
            rows: blobs,
            columns: [
              { name: 'name', type: 'string', nullable: false },
              { name: 'size', type: 'number', nullable: true },
              { name: 'lastModified', type: 'date', nullable: true },
              { name: 'contentType', type: 'string', nullable: true }
            ],
            rowCount: blobs.length,
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
          name: 'blobs',
          schema: 'azure_storage',
          columns: [
            { name: 'name', type: 'string', nullable: false },
            { name: 'size', type: 'number', nullable: true },
            { name: 'lastModified', type: 'date', nullable: true },
            { name: 'contentType', type: 'string', nullable: true }
          ]
        }
      ],
      views: []
    };
  },

  async disconnect(): Promise<void> {
    // Azure Storage doesn't require explicit disconnection
  }
};