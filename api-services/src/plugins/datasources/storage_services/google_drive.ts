// File: api-services/src/plugins/datasources/storage_services/google_drive.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import { google } from 'googleapis';

export const googleDrivePlugin: DataSourcePlugin = {
  name: 'google_drive',
  displayName: 'Google Drive',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Google Drive files and folders',
  
  configSchema: {
    type: 'object',
    properties: {
      clientEmail: { 
        type: 'string', 
        title: 'Service Account Email',
        required: true,
        description: 'Service account email address'
      },
      privateKey: { 
        type: 'string', 
        title: 'Private Key', 
        format: 'password',
        required: true,
        description: 'Service account private key'
      },
      keyFilename: { 
        type: 'string', 
        title: 'Service Account Key File Path',
        description: 'Path to service account JSON key file (alternative)'
      },
      scopes: {
        type: 'string',
        title: 'OAuth Scopes',
        default: 'https://www.googleapis.com/auth/drive.readonly',
        description: 'Google Drive API scopes'
      },
      impersonateUser: {
        type: 'string',
        title: 'Impersonate User Email',
        description: 'Email of user to impersonate (for domain-wide delegation)'
      }
    },
    required: ['clientEmail', 'privateKey'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 10
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    try {
      let auth;
      
      if (config.keyFilename) {
        auth = new google.auth.GoogleAuth({
          keyFile: config.keyFilename as string,
          scopes: [config.scopes as string || 'https://www.googleapis.com/auth/drive.readonly']
        });
      } else {
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: config.clientEmail,
            private_key: (config.privateKey as string).replace(/\\n/g, '\n')
          },
          scopes: [config.scopes as string || 'https://www.googleapis.com/auth/drive.readonly']
        });
      }

      if (config.impersonateUser) {
        auth = auth.createDelegatedCredential(config.impersonateUser as string);
      }

      const drive = google.drive({ version: 'v3', auth });

      return {
        id: `google-drive-${Date.now()}`,
        config,
        client: drive,
        isConnected: true,
        lastUsed: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to connect to Google Drive: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.files.list({ pageSize: 1 });
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
          const listQuery = operation.query || '';
          const response = await connection.client.files.list({
            q: listQuery,
            pageSize: operation.pageSize || 100,
            fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink)'
          });
          
          const files = response.data.files?.map(file => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: parseInt(file.size || '0'),
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            parents: file.parents?.join(','),
            webViewLink: file.webViewLink
          })) || [];
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'id', type: 'string', nullable: false, defaultValue: null },
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'mimeType', type: 'string', nullable: true, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'createdTime', type: 'date', nullable: true, defaultValue: null },
            { name: 'modifiedTime', type: 'date', nullable: true, defaultValue: null },
            { name: 'parents', type: 'string', nullable: true, defaultValue: null },
            { name: 'webViewLink', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: files,
            columns,
            rowCount: files.length,
            executionTime,
            queryId: `gdrive-list-${Date.now()}`
          };
          
        case 'get':
          const fileResponse = await connection.client.files.get({
            fileId: operation.fileId,
            fields: 'id, name, mimeType, size, createdTime, modifiedTime, description'
          });
          
          let content = '';
          if (operation.includeContent) {
            try {
              const mediaResponse = await connection.client.files.get({
                fileId: operation.fileId,
                alt: 'media'
              });
              content = mediaResponse.data as string;
            } catch (error) {
              console.warn('Could not fetch file content:', error);
            }
          }
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{
              ...fileResponse.data,
              content,
              size: parseInt(fileResponse.data.size || '0')
            }],
            columns: [
              { name: 'id', type: 'string', nullable: false, defaultValue: null },
              { name: 'name', type: 'string', nullable: false, defaultValue: null },
              { name: 'mimeType', type: 'string', nullable: true, defaultValue: null },
              { name: 'size', type: 'number', nullable: true, defaultValue: null },
              { name: 'createdTime', type: 'date', nullable: true, defaultValue: null },
              { name: 'modifiedTime', type: 'date', nullable: true, defaultValue: null },
              { name: 'description', type: 'string', nullable: true, defaultValue: null },
              { name: 'content', type: 'string', nullable: true, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `gdrive-get-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`Google Drive query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      // List folders as "tables" 
      const response = await connection.client.files.list({
        q: "mimeType='application/vnd.google-apps.folder'",
        pageSize: 100,
        fields: 'files(id, name)'
      });

      const tables: TableInfo[] = [{
        name: 'root',
        schema: 'google_drive',
        type: 'table'
      }];

      response.data.files?.forEach(folder => {
        tables.push({
          name: folder.name || folder.id || 'unnamed',
          schema: 'google_drive',
          type: 'table'
        });
      });

      return tables;
    } catch (error) {
      console.warn('Failed to get tables for Google Drive:', error);
      return [];
    }
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      return [
        {
          name: 'id',
          type: 'string',
          nullable: false,
          defaultValue: null,
          isPrimaryKey: true
        },
        {
          name: 'name',
          type: 'string',
          nullable: false,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'mimeType',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'size',
          type: 'number',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'createdTime',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'modifiedTime',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        }
      ];
    } catch (error) {
      console.warn('Failed to get columns for Google Drive:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  }
};