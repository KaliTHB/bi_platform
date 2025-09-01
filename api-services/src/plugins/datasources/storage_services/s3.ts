// File: api-services/src/plugins/datasources/storage_services/s3.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as csv from 'csv-parser';

export const s3Plugin: DataSourcePlugin = {
  name: 's3',
  displayName: 'Amazon S3',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Amazon S3 storage',
  
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
      accessKeyId: { type: 'string', title: 'Access Key ID' },
      secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password' },
      bucket: { type: 'string', title: 'Bucket Name' },
      prefix: { type: 'string', title: 'Object Prefix (Optional)' },
      endpoint: { type: 'string', title: 'Custom Endpoint (for S3-compatible services)' }
    },
    required: ['region', 'accessKeyId', 'secretAccessKey', 'bucket'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 20
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId as string,
        secretAccessKey: config.secretAccessKey as string
      },
      ...(config.endpoint && { endpoint: config.endpoint as string })
    });

    return {
      id: `s3-${Date.now()}`,
      config,
      client,
      isConnected: true,
      lastActivity: Date.now()
    };
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
      // Parse S3 query (simplified - format: { "operation": "list|read", "key": "path/to/file.csv" })
      const operation = JSON.parse(query);
      
      switch (operation.operation) {
        case 'list':
          return await this.listObjects(connection, operation, startTime);
        case 'read':
          return await this.readObject(connection, operation, startTime);
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`S3 query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const command = new ListObjectsV2Command({
      Bucket: connection.config.bucket as string,
      Prefix: connection.config.prefix as string,
      MaxKeys: 1000
    });
    
    const result = await connection.client.send(command);
    
    const tables = (result.Contents || []).map(obj => ({
      name: obj.Key!.replace(/^.*\//, '').replace(/\.[^.]+$/, ''), // Remove path and extension
      schema: 's3',
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  },

  private async listObjects(connection: Connection, operation: any, startTime: number): Promise<QueryResult> {
    const command = new ListObjectsV2Command({
      Bucket: connection.config.bucket as string,
      Prefix: operation.prefix || connection.config.prefix,
      MaxKeys: operation.maxKeys || 1000
    });
    
    const result = await connection.client.send(command);
    const executionTimeMs = Date.now() - startTime;
    
    const rows = (result.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag,
      storageClass: obj.StorageClass
    }));
    
    const columns = [
      { name: 'key', type: 'string', nullable: false, defaultValue: null },
      { name: 'size', type: 'number', nullable: true, defaultValue: null },
      { name: 'lastModified', type: 'date', nullable: true, defaultValue: null },
      { name: 'etag', type: 'string', nullable: true, defaultValue: null },
      { name: 'storageClass', type: 'string', nullable: true, defaultValue: null }
    ];

    connection.lastActivity = Date.now();
    
    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs,
      queryId: `s3-list-${Date.now()}`
    };
  },

  private async readObject(connection: Connection, operation: any, startTime: number): Promise<QueryResult> {
    const command = new GetObjectCommand({
      Bucket: connection.config.bucket as string,
      Key: operation.key
    });
    
    const result = await connection.client.send(command);
    
    if (!result.Body) {
      throw new Error('Object body is empty');
    }
    
    // Convert stream to string
    const chunks: Uint8Array[] = [];
    const reader = result.Body as any;
    
    for await (const chunk of reader) {
      chunks.push(chunk);
    }
    
    const content = Buffer.concat(chunks).toString('utf-8');
    const executionTimeMs = Date.now() - startTime;
    
    // Try to parse as CSV
    if (operation.key.endsWith('.csv')) {
      return await this.parseCSV(content, executionTimeMs, connection);
    }
    
    // For other formats, return as single row
    const rows = [{ content, key: operation.key }];
    const columns = [
      { name: 'key', type: 'string', nullable: false, defaultValue: null },
      { name: 'content', type: 'string', nullable: false, defaultValue: null }
    ];

    connection.lastActivity = Date.now();
    
    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs,
      queryId: `s3-read-${Date.now()}`
    };
  },

  private async parseCSV(content: string, executionTimeMs: number, connection: Connection): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      const lines = content.split('\n');
      
      if (lines.length === 0) {
        resolve({
          rows: [],
          columns: [],
          rowCount: 0,
          executionTimeMs,
          queryId: `s3-csv-${Date.now()}`
        });
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const columns = headers.map(header => ({
        name: header,
        type: 'string',
        nullable: true,
        defaultValue: null
      }));
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || null;
          });
          rows.push(row);
        }
      }

      connection.lastActivity = Date.now();
      
      resolve({
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs,
        queryId: `s3-csv-${Date.now()}`
      });
    });
  }
};