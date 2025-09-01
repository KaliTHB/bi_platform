// File: ./src/types/datasource.types.ts

export interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  last_tested?: string | Date;
  is_active: boolean;
  created_by?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface Plugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'nosql' | 'files' | 'apis';
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: PluginConfigSchema;
  capabilities?: DataSourceCapabilities;
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'password' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: Array<{ label: string; value: any } | string>;
  enum?: readonly any[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  group?: string;
  conditional?: {
    field: string;
    value: any;
  };
}

export interface DataSourceCapabilities {
  supportsBulkInsert?: boolean;
  supportsTransactions?: boolean;
  supportsStoredProcedures?: boolean;
  supportsCustomFunctions?: boolean;
  maxConcurrentConnections?: number;
  supportsStreaming?: boolean;
  supportsPagination?: boolean;
  supportsAggregation?: boolean;
  supportsJoins?: boolean;
  supportsSubqueries?: boolean;
  supportsCTE?: boolean; // Common Table Expressions
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
  maxConnections?: number;
  options?: Record<string, any>;
  [key: string]: any;
}

export interface Connection {
  id: string;
  config: ConnectionConfig;
  client: any;
  isConnected: boolean;
  lastActivity: Date;
  lastUsed?: Date;
}

export interface ConnectionTestResult {
  success: boolean;
  connection_valid: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
  error_message?: string;
  details?: Record<string, any>;
  tested_at?: string | Date;
}

export interface QueryResult {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  rowCount: number;
  executionTime: number;
  queryId?: string;
  cached?: boolean;
  totalRows?: number; // For paginated results
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isIndex?: boolean;
  precision?: number;
  scale?: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
  functions?: FunctionInfo[];
  schemas?: string[];
  databases?: string[];
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view';
  columns: ColumnInfo[];
  primaryKey?: string[];
  indexes?: IndexInfo[];
  rowCount?: number;
  description?: string;
}

export interface ViewInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  definition: string;
  description?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface FunctionInfo {
  name: string;
  schema: string;
  parameters: ParameterInfo[];
  returnType: string;
  description?: string;
  definition?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

// Request and response types for API
export interface CreateDataSourceRequest {
  name: string;
  display_name?: string;
  description?: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  workspace_id?: string;
}

export interface UpdateDataSourceRequest {
  name?: string;
  display_name?: string;
  description?: string;
  connection_config?: Record<string, any>;
  is_active?: boolean;
}

export interface TestConnectionRequest {
  connection_config: Record<string, any>;
  plugin_name: string;
}

export interface QueryRequest {
  query: string;
  parameters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

// Data source management types
export interface DataSourceUsage {
  datasource_id: string;
  dataset_count: number;
  chart_count: number;
  dashboard_count: number;
  last_used: string | Date;
  total_queries: number;
  avg_response_time: number;
}

export interface DataSourceHealth {
  datasource_id: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  last_checked: string | Date;
  response_time: number;
  error_count: number;
  uptime_percentage: number;
  details?: {
    connection_errors: number;
    query_errors: number;
    timeout_errors: number;
    last_error?: string;
  };
}

// Plugin system types
export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'nosql' | 'files' | 'apis';
  version: string;
  description?: string;
  configSchema: PluginConfigSchema;
  capabilities?: DataSourceCapabilities;
  
  // Plugin methods (would be implemented by actual plugin)
  connect?(config: ConnectionConfig): Promise<Connection>;
  testConnection?(config: ConnectionConfig): Promise<ConnectionTestResult>;
  executeQuery?(connection: Connection, query: string, params?: any[]): Promise<QueryResult>;
  getSchema?(connection: Connection): Promise<SchemaInfo>;
  getTables?(connection: Connection, database?: string): Promise<TableInfo[]>;
  getColumns?(connection: Connection, table: string): Promise<ColumnInfo[]>;
  disconnect?(connection: Connection): Promise<void>;
}

export interface PluginRegistry {
  datasources: Record<string, DataSourcePlugin>;
}

// Query context and optimization
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

// Error types
export interface DataSourceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retry_possible: boolean;
  category: 'connection' | 'authentication' | 'query' | 'timeout' | 'network' | 'configuration';
}

// Monitoring and analytics
export interface DataSourceMetrics {
  datasource_id: string;
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    query_count: number;
    avg_response_time: number;
    error_rate: number;
    data_transfer_bytes: number;
    connection_count: number;
    cache_hit_rate?: number;
  };
  timestamp: string | Date;
}

// Access control
export interface DataSourceAccess {
  id: string;
  datasource_id: string;
  user_id?: string;
  group_id?: string;
  role_id?: string;
  permissions: DataSourcePermission[];
  granted_by: string;
  granted_at: string | Date;
  expires_at?: string | Date;
  is_active: boolean;
}

export type DataSourcePermission = 
  | 'can_read'
  | 'can_write'
  | 'can_delete'
  | 'can_test'
  | 'can_configure'
  | 'can_share'
  | 'can_monitor';

// Export configuration
export interface ExportConfig {
  format: 'csv' | 'excel' | 'json' | 'parquet' | 'sql';
  include_schema: boolean;
  include_indexes: boolean;
  compression?: 'none' | 'gzip' | 'zip';
  max_rows?: number;
}

export interface ExportResult {
  success: boolean;
  file_path?: string;
  download_url?: string;
  file_size_bytes?: number;
  rows_exported?: number;
  error_message?: string;
}