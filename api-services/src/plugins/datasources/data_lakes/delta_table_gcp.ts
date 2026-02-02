// File: api-services/src/plugins/datasources/data_lakes/delta_table_gcp.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

export const deltaTableGCPPlugin: DataSourcePlugin = {
  name: 'delta_table_gcp',
  displayName: 'Delta Lake (GCP)',
  category: 'data_lakes',
  version: '1.0.0',
  description: 'Connect to Delta Lake tables stored on Google Cloud Storage',
  
  configSchema: {
    type: 'object',
    properties: {
      projectId: { 
        type: 'string', 
        title: 'Project ID',
        description: 'Google Cloud Project ID'
      },
      bucketName: { 
        type: 'string', 
        title: 'GCS Bucket Name',
        description: 'Google Cloud Storage bucket containing the Delta table'
      },
      deltaTablePath: { 
        type: 'string', 
        title: 'Path to Delta Table',
        description: 'Path within the bucket to the Delta table directory'
      },
      serviceAccountKey: { 
        type: 'string', 
        title: 'Service Account JSON Key', 
        format: 'password',
        description: 'Service Account JSON key content for authentication'
      },
      keyFilePath: { 
        type: 'string', 
        title: 'Service Account Key File Path',
        description: 'Alternative: path to service account key file on server'
      }
    },
    required: ['projectId', 'bucketName', 'deltaTablePath'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 10
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    // In a real implementation, this would set up GCS connection with authentication
    return {
      id: `delta-gcp-${Date.now()}`,
      config,
      client: { 
        deltaPath: config.deltaTablePath,
        projectId: config.projectId,
        bucket: config.bucketName
      },
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      // Basic validation - in real implementation would test GCS access and authentication
      if (!config.projectId || !config.bucketName || !config.deltaTablePath) {
        return false;
      }
      
      // Must have either service account key or key file path
      if (!config.serviceAccountKey && !config.keyFilePath) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Delta Lake GCP connection test failed:', error);
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
          schema: 'delta_gcp',
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
          schema: database || 'delta_gcp',
          type: 'table',
          rowCount: undefined
        }
      ];
    } catch (error) {
      console.warn(`Failed to get tables for Delta Lake GCP: ${error}`);
      return [];
    }
  },

  // ✅ REQUIRED METHOD: getColumns
  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      // In a real implementation, you would:
      // 1. Connect to Google Cloud Storage using GCS client
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
    // No explicit disconnection needed for Google Cloud Storage
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