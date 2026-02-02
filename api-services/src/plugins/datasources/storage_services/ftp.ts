// File: api-services/src/plugins/datasources/storage_services/ftp.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces';
import * as Client from 'ssh2-sftp-client';
import * as FtpClient from 'ftp';

export const ftpPlugin: DataSourcePlugin = {
  name: 'ftp',
  displayName: 'FTP/SFTP',
  category: 'storage_services',
  version: '1.0.0',
  description: 'Connect to FTP and SFTP servers',
  
  configSchema: {
    type: 'object',
    properties: {
      protocol: {
        type: 'string',
        title: 'Protocol',
        default: 'sftp',
        enum: ['ftp', 'sftp'],
        description: 'Connection protocol (FTP or SFTP)'
      },
      host: { 
        type: 'string', 
        title: 'Host',
        required: true,
        description: 'FTP/SFTP server hostname or IP address'
      },
      port: { 
        type: 'number', 
        title: 'Port',
        default: 22,
        description: 'Server port (21 for FTP, 22 for SFTP)'
      },
      username: { 
        type: 'string', 
        title: 'Username',
        required: true,
        description: 'FTP/SFTP username'
      },
      password: { 
        type: 'string', 
        title: 'Password', 
        format: 'password',
        description: 'FTP/SFTP password (required if no private key)'
      },
      privateKey: {
        type: 'string',
        title: 'Private Key',
        format: 'password',
        description: 'SSH private key for SFTP (alternative to password)'
      },
      passphrase: {
        type: 'string',
        title: 'Passphrase',
        format: 'password',
        description: 'Private key passphrase if encrypted'
      },
      secure: {
        type: 'boolean',
        title: 'Use TLS/SSL',
        default: false,
        description: 'Use secure connection (FTPS)'
      },
      connTimeout: {
        type: 'number',
        title: 'Connection Timeout (ms)',
        default: 30000,
        description: 'Connection timeout in milliseconds'
      }
    },
    required: ['protocol', 'host', 'username'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: false,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 5
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    try {
      const protocol = config.protocol as string || 'sftp';
      
      if (protocol === 'sftp') {
        const sftp = new Client();
        const connectConfig: any = {
          host: config.host,
          port: config.port || 22,
          username: config.username,
          readyTimeout: config.connTimeout || 30000
        };

        if (config.privateKey) {
          connectConfig.privateKey = config.privateKey;
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        } else if (config.password) {
          connectConfig.password = config.password;
        } else {
          throw new Error('Either password or privateKey is required');
        }

        await sftp.connect(connectConfig);

        return {
          id: `sftp-${Date.now()}`,
          config,
          client: { sftp, protocol: 'sftp' },
          isConnected: true,
          lastUsed: new Date()
        };
      } else {
        // FTP connection
        const ftp = new FtpClient();
        
        await new Promise<void>((resolve, reject) => {
          ftp.connect({
            host: config.host as string,
            port: config.port as number || 21,
            user: config.username as string,
            password: config.password as string,
            secure: config.secure as boolean || false,
            connTimeout: config.connTimeout as number || 30000
          });

          ftp.on('ready', () => resolve());
          ftp.on('error', (err) => reject(err));
        });

        return {
          id: `ftp-${Date.now()}`,
          config,
          client: { ftp, protocol: 'ftp' },
          isConnected: true,
          lastUsed: new Date()
        };
      }
    } catch (error) {
      throw new Error(`Failed to connect to ${config.protocol?.toUpperCase()}: ${error}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      
      // Test by listing root directory
      if (connection.client.protocol === 'sftp') {
        await connection.client.sftp.list('/');
      } else {
        await new Promise<void>((resolve, reject) => {
          connection.client.ftp.list('/', (err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
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
          const path = operation.path || '/';
          let files: any[] = [];
          
          if (connection.client.protocol === 'sftp') {
            files = await connection.client.sftp.list(path);
          } else {
            files = await new Promise<any[]>((resolve, reject) => {
              connection.client.ftp.list(path, (err: any, list: any[]) => {
                if (err) reject(err);
                else resolve(list || []);
              });
            });
          }
          
          const processedFiles = files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type === 'd' ? 'directory' : 'file',
            date: file.date || file.modifyTime,
            permissions: file.rights?.user || file.permissions,
            owner: file.owner,
            group: file.group
          }));
          
          const executionTime = Date.now() - startTime;
          const columns: ColumnInfo[] = [
            { name: 'name', type: 'string', nullable: false, defaultValue: null },
            { name: 'size', type: 'number', nullable: true, defaultValue: null },
            { name: 'type', type: 'string', nullable: true, defaultValue: null },
            { name: 'date', type: 'date', nullable: true, defaultValue: null },
            { name: 'permissions', type: 'string', nullable: true, defaultValue: null },
            { name: 'owner', type: 'string', nullable: true, defaultValue: null },
            { name: 'group', type: 'string', nullable: true, defaultValue: null }
          ];

          connection.lastUsed = new Date();
          
          return {
            rows: processedFiles,
            columns,
            rowCount: processedFiles.length,
            executionTime,
            queryId: `ftp-list-${Date.now()}`
          };
          
        case 'get':
          const filePath = operation.filePath;
          let content = '';
          
          if (connection.client.protocol === 'sftp') {
            const buffer = await connection.client.sftp.get(filePath);
            content = buffer.toString('utf-8');
          } else {
            content = await new Promise<string>((resolve, reject) => {
              let data = '';
              connection.client.ftp.get(filePath, (err: any, stream: any) => {
                if (err) reject(err);
                else {
                  stream.on('data', (chunk: Buffer) => {
                    data += chunk.toString('utf-8');
                  });
                  stream.on('end', () => resolve(data));
                  stream.on('error', reject);
                }
              });
            });
          }
          
          connection.lastUsed = new Date();
          
          return {
            rows: [{ filePath, content, size: content.length }],
            columns: [
              { name: 'filePath', type: 'string', nullable: false, defaultValue: null },
              { name: 'content', type: 'string', nullable: false, defaultValue: null },
              { name: 'size', type: 'number', nullable: true, defaultValue: null }
            ],
            rowCount: 1,
            executionTime: Date.now() - startTime,
            queryId: `ftp-get-${Date.now()}`
          };
          
        default:
          throw new Error(`Unsupported operation: ${operation.operation}`);
      }
    } catch (error) {
      throw new Error(`FTP query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tables = await this.getTables(connection);
    return { tables, views: [] };
  },

  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      let files: any[] = [];
      
      if (connection.client.protocol === 'sftp') {
        files = await connection.client.sftp.list('/');
      } else {
        files = await new Promise<any[]>((resolve, reject) => {
          connection.client.ftp.list('/', (err: any, list: any[]) => {
            if (err) reject(err);
            else resolve(list || []);
          });
        });
      }
      
      const directories = files.filter(file => file.type === 'd');
      
      const tables: TableInfo[] = [{
        name: 'root',
        schema: 'ftp',
        type: 'table'
      }];

      directories.forEach(dir => {
        tables.push({
          name: dir.name,
          schema: 'ftp',
          type: 'table'
        });
      });

      return tables;
    } catch (error) {
      console.warn('Failed to get tables for FTP:', error);
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
          name: 'type',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'date',
          type: 'date',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        },
        {
          name: 'permissions',
          type: 'string',
          nullable: true,
          defaultValue: null,
          isPrimaryKey: false
        }
      ];
    } catch (error) {
      console.warn('Failed to get columns for FTP:', error);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    try {
      if (connection.client.protocol === 'sftp') {
        await connection.client.sftp.end();
      } else {
        connection.client.ftp.end();
      }
    } catch (error) {
      console.warn('Error disconnecting FTP:', error);
    } finally {
      connection.isConnected = false;
    }
  }
};