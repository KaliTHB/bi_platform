// File: api-services/src/plugins/datasources/data_lakes/delta_table_azure.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

export const deltaTableAzurePlugin: DataSourcePlugin = {
  name: 'delta_table_azure',
  displayName: 'Delta Lake (Azure)',
  category: 'data_lakes',
  version: '1.0.0',
  description: 'Connect to Delta Lake tables stored on Azure Blob Storage',
  
  configSchema: {
    type: 'object',
    properties: {
      storageAccount: { 
        type: 'string', 
        title: 'Storage Account Name',
        description: 'Azure Storage Account name'
      },
      containerName: { 
        type: 'string', 
        title: 'Container Name',
        description: 'Azure Blob Storage container containing the Delta table'
      },
      deltaTablePath: { 
        type: 'string', 
        title: 'Path to Delta Table',
        description: 'Path within the container to the Delta table directory'
      },
      accountKey: { 
        type: 'string', 
        title: 'Account Key', 
        format: 'password',
        description: 'Azure Storage Account Key for authentication'
      },
      sasToken: { 
        type: 'string', 
        title: 'SAS Token (Alternative to Account Key)',
        format: 'password',
        description: 'Shared Access Signature token as alternative authentication method'
      }
    },
    required: ['storageAccount', 'containerName', 'deltaTablePath'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 10
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    // In a real implementation, this would set up Azure Blob Storage connection
    return {
      id: `delta-azure-${Date.now()}`,
      config,
      client: { 
        deltaPath: config.deltaTablePath,
        storageAccount: config.storageAccount,
        container: config.containerName
      },
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      // Basic validation - in real implementation would test Azure Blob Storage access
      if (!config.storageAccount || !config.containerName || !config.deltaTablePath) {
        return false;
      }
      
      // Must have either account key or SAS token
      if (!config.accountKey && !config.sasToken) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Delta Lake Azure connection test failed:', error);
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    // In a real implementation, this would use Spark or Delta-RS to query the table
    throw new Error('Delta Lake queries require a Spark runtime or Delta-RS engine. Please use a compatible query engine.');
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tableName = this.extractTableNameFromPath(connection.config.deltaTablePath);
    
    return {
      tables: [
        {
          name: tableName,
          schema: 'delta_azure',
          type: 'table',
          rowCount: undefined
        }
      ],
      views: []
    };
  },

  // ✅ REQUIRED METHOD: getTables
  async getTables(connection: Connection, database?: string): Promise<TableInfo[]> {
    try {
      const tableName = this.extractTableNameFromPath(connection.config.deltaTablePath);
      
      return [
        {
          name: tableName,
          schema: database || 'delta_azure',
          type: 'table',
          rowCount: undefined
        }
      ];
    } catch (error) {
      console.warn(`Failed to get tables for Delta Lake Azure: ${error}`);
      return [];
    }
  },

  // ✅ REQUIRED METHOD: getColumns
  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      // In a real implementation, you would:
      // 1. Connect to Azure Blob Storage using Azure SDK
      // 2. Read the Delta table metadata (_delta_log directory)
      // 3. Parse the schema from the transaction log
      // For now, return empty array since this requires Delta-RS or Spark
      console.warn('Delta Lake column introspection requires Delta-RS or Spark engine');
      return [];
    } catch (error) {
      console.warn(`Failed to get columns for table ${table}: ${error}`);
      return [];
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    // No explicit disconnection needed for Azure Blob Storage
    connection.isConnected = false;
  },

  // Helper method to extract table name from path
  private extractTableNameFromPath(deltaPath: string): string {
    if (!deltaPath) return 'delta_table';
    
    // Extract table name from path like "/data/tables/my_table" -> "my_table"
    const segments = deltaPath.split('/').filter(seg => seg.length > 0);
    return segments[segments.length - 1] || 'delta_table';
  }
};