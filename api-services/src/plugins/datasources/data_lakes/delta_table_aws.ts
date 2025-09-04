// File: api-services/src/plugins/datasources/data_lakes/delta_table_aws.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

export const deltaTableAWSPlugin: DataSourcePlugin = {
  name: 'delta_table_aws',
  displayName: 'Delta Lake (AWS)',
  category: 'data_lakes',
  version: '1.0.0',
  description: 'Connect to Delta Lake tables stored on Amazon S3',
  
  configSchema: {
    type: 'object',
    properties: {
      s3Path: { 
        type: 'string', 
        title: 'S3 Path to Delta Table',
        description: 'Full S3 path to the Delta Lake table (e.g., s3://my-bucket/path/to/table)'
      },
      region: { 
        type: 'string', 
        title: 'AWS Region', 
        default: 'us-east-1',
        description: 'AWS region where the S3 bucket is located'
      },
      accessKeyId: { 
        type: 'string', 
        title: 'Access Key ID',
        description: 'AWS Access Key ID for authentication'
      },
      secretAccessKey: { 
        type: 'string', 
        title: 'Secret Access Key',
        format: 'password',
        description: 'AWS Secret Access Key for authentication'
      }
    },
    required: ['s3Path', 'region', 'accessKeyId', 'secretAccessKey'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: false,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 10
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    // Delta Lake connection typically requires Spark or compatible runtime
    // This is a simplified implementation for plugin validation
    return {
      id: `delta-aws-${Date.now()}`,
      config,
      client: { 
        s3Path: config.s3Path,
        region: config.region
      },
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      // Basic validation - in real implementation would check S3 access and Delta table existence
      if (!config.s3Path || !config.s3Path.startsWith('s3://')) {
        return false;
      }
      if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Delta Lake AWS connection test failed:', error);
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    // In a real implementation, this would use Spark or Delta-RS to query the table
    throw new Error('Delta Lake queries require a Spark runtime or Delta-RS engine. Please use a compatible query engine.');
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const tableName = this.extractTableNameFromPath(connection.config.s3Path);
    
    return {
      tables: [
        {
          name: tableName,
          schema: 'delta_aws',
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
      const tableName = this.extractTableNameFromPath(connection.config.s3Path);
      
      return [
        {
          name: tableName,
          schema: database || 'delta_aws',
          type: 'table',
          rowCount: undefined
        }
      ];
    } catch (error) {
      console.warn(`Failed to get tables for Delta Lake AWS: ${error}`);
      return [];
    }
  },

  // ✅ REQUIRED METHOD: getColumns
  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    try {
      // In a real implementation, you would:
      // 1. Connect to S3 using AWS SDK
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
    // No explicit disconnection needed for S3/Delta Lake
    connection.isConnected = false;
  },

  // Helper method to extract table name from S3 path
  private extractTableNameFromPath(s3Path: string): string {
    if (!s3Path) return 'delta_table';
    
    try {
      // Extract table name from path like "s3://bucket/path/to/my_table" -> "my_table"
      const url = new URL(s3Path);
      const pathSegments = url.pathname.split('/').filter(seg => seg.length > 0);
      return pathSegments[pathSegments.length - 1] || 'delta_table';
    } catch (error) {
      // Fallback if URL parsing fails
      const segments = s3Path.split('/').filter(seg => seg.length > 0);
      return segments[segments.length - 1] || 'delta_table';
    }
  }
};