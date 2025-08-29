// File: api-services/src/plugins/interfaces/DataSourcePlugin.ts

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  [key: string]: any;
}

export interface QueryResult {
  rows: any[];
  columns: ColumnDefinition[];
  rowCount: number;
  executionTimeMs: number;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  foreignKey?: boolean;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnDefinition[];
  rowCount?: number;
}

export interface ViewInfo {
  name: string;
  schema: string;
  definition: string;
  columns: ColumnDefinition[];
}

export interface Connection {
  id: string;
  config: ConnectionConfig;
  pool?: any;
  client?: any;
  isConnected: boolean;
  lastActivity: Date;
}

export interface ConfigurationSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  configSchema: ConfigurationSchema;
  
  // Core methods
  connect(config: ConnectionConfig): Promise<Connection>;
  testConnection(config: ConnectionConfig): Promise<boolean>;
  executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult>;
  getSchema(connection: Connection): Promise<SchemaInfo>;
  disconnect(connection: Connection): Promise<void>;
  
  // Optional methods
  generateOptimizedQuery?(query: string, context?: any): Promise<string>;
  estimateQueryCost?(query: string, connection: Connection): Promise<number>;
  validateQuery?(query: string): Promise<{ valid: boolean; errors: string[] }>;
}