// File: api-services/src/plugins/datasources/interfaces.ts
export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  configSchema: ConfigurationSchema;
  
  connect(config: ConnectionConfig): Promise<Connection>;
  testConnection(config: ConnectionConfig): Promise<boolean>;
  executeQuery(connection: Connection, query: string): Promise<QueryResult>;
  getSchema(connection: Connection): Promise<SchemaInfo>;
  disconnect(connection: Connection): Promise<void>;
  
  // Optional methods
  generateOptimizedQuery?(query: string, context: QueryContext): Promise<string>;
  estimateQueryCost?(query: string, context: QueryContext): Promise<QueryCost>;
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
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}