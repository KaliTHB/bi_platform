// File: web-application/src/types/plugin.types.ts

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
}

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string;
  library: string;
  version: string;
  configSchema: ConfigurationSchema;
  dataRequirements: DataRequirements;
  exportFormats: string[];
  component: React.ComponentType<ChartProps>;
}

export interface ConfigurationSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  [key: string]: any;
}

export interface Connection {
  id: string;
  isConnected: boolean;
  config: ConnectionConfig;
  [key: string]: any;
}

export interface QueryResult {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  total_rows: number;
  execution_time_ms: number;
  cached: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  row_count?: number;
}

export interface ViewInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  definition: string;
}

export interface DataRequirements {
  min_columns: number;
  max_columns?: number;
  required_column_types: string[];
  supports_grouping: boolean;
  supports_time_series: boolean;
  supports_multiple_series: boolean;
}
