// File: api-services/src/plugins/datasources/storage_services/one_drive.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';

export const oneDrivePlugin: DataSourcePlugin = {
  name: 'one_drive',
  displayName: 'Microsoft OneDrive',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to Microsoft OneDrive files and folders',
  
  configSchema: {
    type: 'object',
    properties: {
      clientId: { 
        type: 'string', 
        title: 'Application (Client) ID',
        required: true,
        description: 'Azure AD application client ID'
      },
      clientSecret: { 
        type: 'string', 
        title: 'Client Secret', 
        format: 'password',
        required: true,
        description: 'Azure AD application client secret'
      },
      tenantId: { 
        type: 'string', 
        title: 'Directory (Tenant) ID',
        required: true,
        description: 'Azure AD tenant ID'
      },
      userId: {
        type: 'string',
        title: 'User ID or UPN',
        description: 'Target user ID or User Principal Name (email). If not provided, uses application context.'
      },
      scope: {
        type: 'string',
        title: 'Microsoft Graph Scope',
        default: 'https://graph.microsoft.com/.default',
        description: 'Microsoft Graph API scope'
      }
    },
    required: ['clientId', 'clientSecret', 'tenantId'],
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
      const msalConfig = {
        auth: {
          clientId: config.clientId as string,
          clientSecret: config.clientSecret as string,
          authority: `https://login.microsoftonline.com/${config.tenantId}`
        }
      };

      const cca = new ConfidentialClientApplication(msalConfig);
      
      // Get access token using client credentials flow
      const clientCredentialRequest = {
        scopes: [config.scope as string || 'https://graph.microsoft.com/.default']
      };

      const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
      
      if (!response?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      const graphClient = axios.create({
        baseURL: 'https://graph.microsoft.com/v1.0',
        headers: {
          'Authorization': `Bearer ${response.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: `onedrive-${Date.now()}`,
        config,
        client: { graphClient, accessToken: response.accessToken },
        isConnected: true,
        lastUsed: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to connect to OneDrive: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      const endpoint = config.userId 
        ? `/users/${config.userId}/drive`
        : '/me/drive';
      
      await connection.client.graphClient.get(endpoint);
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
      const baseEndpoint = connection.config.userId 
        ? `/users/${connection.config.userId}/drive`
        : '/me/drive';
      
      switch (operation.operation) {
        case 'list':
          const path = operation.path || '/root/children';
          const endpoint = `${baseEndpoint}${path}`;
          const top = operation.top || 100;
          
          const response = await connection.client.graphClient.get(`${endpoint}?$top=${top}`);
          const items = response.data.value?.map((item: any) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            createdDateTime: item.createdDateTime,
            lastModifiedDateTime: item.lastModifiedDateTime,
            webUrl: item.webUrl,
            mimeType: item.file?.mimeType || 'folder',
            isFolder: !!item.folder,
            parentPath: item.parentReference?.path
          })) || [];
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'id', type: 'string', nullable: false, defaultValue: null },
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'createdDateTime', type: 'date', nullable: true, defaultValue: null },
            { name: 'lastModifiedDateTime', type: 'date', nullable: true, defaultValue: null },
            { name: 'webUrl', type: 'string', nullable: true, defaultValue: null },
            { name: 'mimeType', type: 'string', nullable: true, defaultValue: null },
            { name: 'isFolder', type: 'boolean', nullable: false, defaultValue: null },
            { name: 'parentPath', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: items,
            columns,
            rowCount: items.length,
            executionTime,
            queryId: `onedrive-list-${Date.now()}`
          };
          
        case 'get':
          const itemEndpoint = `${baseEndpoint}/items/${operation.itemId}`;
          const itemResponse = await connection.client.graphClient.get(itemEndpoint);
          
          let content = '';
          if (operation.includeContent && itemResponse.data.file) {
            try {
              const contentResponse = await connection.client.graphClient.get(`${itemEndpoint}/content`);
              content = contentResponse.data;
            } catch (error) {
              console.warn('Could not fetch file content:', error);
            }
          }
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{
              ...itemResponse.data,
              content,
              isFolder: !!itemResponse.data.folder
            }],
            columns: [
              { name: 'id', type: 'string', nullable: false, defaultValue: null },
              { name: 'name', type: 'string', nullable: false, defaultValue: null },
              { name: 'size', type: 'number', nullable: true, defaultValue: null },
              { name: 'createdDateTime', type: 'date', nullable: true, defaultValue: null },
              { name: 'lastModifiedDateTime', type: 'date', nullable: true, defaultValue: null },
              { name: 'webUrl', type: 'string', nullable: true, defaultValue: null },
              { name: 'isFolder', type: 'boolean', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: true, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `onedrive-get-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`OneDrive query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      // Return basic folder structure
      return [
        {
          name: 'root',
          schema: 'onedrive',
          type: 'table'
        },
        {
          name: 'documents',
          schema: 'onedrive', 
          type: 'table'
        },
        {
          name: 'pictures',
          schema: 'onedrive',
          type: 'table'
        },
        {
          name: 'recent',
          schema: 'onedrive',
          type: 'table'
        },
        {
          name: 'shared',
          schema: 'onedrive',
          type: 'table'
        }
      ];
    } catch (error) {
      console.warn('Failed to get tables for OneDrive:', error);
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
          name: 'size',
          type: 'number',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'createdDateTime',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'lastModifiedDateTime',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'webUrl',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        }
      ];
    } catch (error) {
      console.warn('Failed to get columns for OneDrive:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  }
};