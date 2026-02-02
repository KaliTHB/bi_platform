// File: api-services/src/plugins/datasources/interfaces.ts

export interface QueryContext {
  datasource_id: string;
  user_id: string;
  workspace_id: string;
  dataset_id?: string;
  timeout?: number;
  cache_ttl?: number;
  optimize?: boolean;
}

export interface QueryCost {
  estimated_execution_time: number;
  estimated_rows: number;
  estimated_data_size: number;
  complexity_score: number;
  recommendations?: string[];
}

export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  description?: string; // Added optional description property
  configSchema: ConfigurationSchema;
  
  connect(config: ConnectionConfig): Promise<Connection>;
  testConnection(config: ConnectionConfig): Promise<boolean>;
  executeQuery(connection: Connection, query: string): Promise<QueryResult>;
  getSchema(connection: Connection): Promise<SchemaInfo>;
  disconnect(connection: Connection): Promise<void>;
  
  // Optional methods
  generateOptimizedQuery?(query: string, context: QueryContext): Promise<string>;
  estimateQueryCost?(query: string, context: QueryContext): Promise<QueryCost>;
  getTables?(connection: Connection, database?: string): Promise<TableInfo[]>;
  getColumns?(connection: Connection, table: string): Promise<ColumnInfo[]>;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  options?: Record<string, any>;
}

export interface Connection {
  id: string;
  config: ConnectionConfig;
  client: any;
  isConnected: boolean;
  lastUsed: Date;
}

export interface QueryResult {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  rowCount: number;
  executionTime: number;
  queryId?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
  functions?: FunctionInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  indexes?: IndexInfo[];
}

export interface ViewInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  definition: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface FunctionInfo {
  name: string;
  schema: string;
  parameters: ParameterInfo[];
  returnType: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
}

export interface ConfigurationSchema {
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties?: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object';
  title: string;
  description?: string;
  default?: any;
  enum?: readonly any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}