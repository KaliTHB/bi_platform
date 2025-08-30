// File: ./src/types/plugin.ts

export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: PluginConfigSchema;
  plugin_type: 'datasource';
  capabilities?: DataSourceCapabilities;
}

export interface ChartPlugin {
  name: string;
  displayName: string;
  category: 'basic' | 'statistical' | 'geographic' | 'specialized' | 'custom';
  version: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: PluginConfigSchema;
  plugin_type: 'chart';
  dataRequirements?: DataRequirements;
  exportFormats?: string[];
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object';
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
}

export interface DataRequirements {
  min_columns: number;
  max_columns?: number;
  required_column_types: string[];
  supports_grouping: boolean;
  supports_time_series: boolean;
  supports_multiple_series: boolean;
}

export interface PluginConfiguration {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  configuration: Record<string, any>;
  is_enabled: boolean;
  usage_count?: number;
  workspace_id: string;
  enabled_by?: string;
  enabled_at?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionTestResult {
  success: boolean;
  connection_valid: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
  details?: Record<string, any>;
}

// Plugin registry types
export interface PluginRegistry {
  datasources: Record<string, DataSourcePlugin>;
  charts: Record<string, ChartPlugin>;
}

// Plugin installation/management
export interface PluginManifest {
  name: string;
  version: string;
  type: 'datasource' | 'chart';
  main: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  metadata: {
    displayName: string;
    description?: string;
    author?: string;
    license?: string;
    homepage?: string;
    repository?: string;
  };
}