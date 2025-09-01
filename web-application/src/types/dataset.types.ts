// File: ./src/types/dataset.types.ts

export interface Dataset {
  id: string;
  workspace_id: string;
  datasource_ids: string[];
  name: string;
  display_name: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  base_query: string;
  parent_dataset_ids?: string[];
  transformation_stages?: TransformationStage[];
  calculated_columns?: CalculatedColumn[];
  measures?: Measure[];
  relationships?: DatasetRelationship[];
  schema_json?: ColumnDefinition[];
  metadata_json?: Record<string, any>;
  refresh_schedule?: RefreshSchedule;
  cache_ttl: number;
  row_count_estimate: number;
  last_refreshed?: string | Date;
  refresh_status: 'pending' | 'running' | 'completed' | 'failed';
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ColumnDefinition {
  name: string;
  display_name?: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  default_value?: any;
  description?: string;
  format_hint?: string;
}

export interface TransformationStage {
  id: string;
  name: string;
  type: 'filter' | 'join' | 'aggregate' | 'sort' | 'pivot' | 'unpivot' | 'calculated_column';
  configuration: Record<string, any>;
  order_index: number;
  is_active: boolean;
}

export interface CalculatedColumn {
  id: string;
  name: string;
  display_name: string;
  expression: string;
  data_type: string;
  format_string?: string;
  description?: string;
  dependencies?: string[];
  is_active?: boolean;
}

export interface Measure {
  id: string;
  name: string;
  display_name: string;
  expression: string;
  format_string?: string;
  aggregation_type: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
  description?: string;
  folder?: string;
  is_visible?: boolean;
}

export interface DatasetRelationship {
  id: string;
  from_dataset_id: string;
  to_dataset_id: string;
  from_column: string;
  to_column: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  is_active: boolean;
  name?: string;
}

export interface ColumnDefinition {
  name: string;
  display_name?: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  default_value?: any;
  description?: string;
  format_hint?: string;
}

// Add the alias RIGHT AFTER the ColumnDefinition interface
export type DatasetColumn = ColumnDefinition;

// Interface for what Redux state expects
export interface DatasetQueryResult {
  data: any[];
  columns: ColumnDefinition[];
  total_rows: number;
  execution_time: number;
  cached: boolean;
  query_id?: string;
}

// Interface for what API actually returns
export interface DatasetQueryApiResponse {
  data: any[];
  columns: Array<{ name: string; type: string; display_name?: string; }>;
  total_rows: number;
  execution_time: number;
  cached: boolean;
  query_id?: string;
}

// Converter function
export function convertApiResponseToQueryResult(apiResponse: DatasetQueryApiResponse): DatasetQueryResult {
  return {
    data: apiResponse.data,
    columns: apiResponse.columns.map(col => ({
      name: col.name,
      display_name: col.display_name || col.name,
      data_type: col.type,
      is_nullable: true,
      is_primary_key: false,
      default_value: null,
      description: undefined,
      format_hint: undefined
    })),
    total_rows: apiResponse.total_rows,
    execution_time: apiResponse.execution_time,
    cached: apiResponse.cached,
    query_id: apiResponse.query_id
  };
}
export interface RefreshSchedule {
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  next_run: string;
}

// Dataset creation and update request types
export interface CreateDatasetRequest {
  name: string;
  display_name?: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  base_query?: string;
  datasource_ids?: string[];
  parent_dataset_ids?: string[];
  transformation_stages?: TransformationStage[];
  calculated_columns?: CalculatedColumn[];
  measures?: Measure[];
  cache_ttl?: number;
  refresh_schedule?: RefreshSchedule;
}

export interface UpdateDatasetRequest {
  name?: string;
  display_name?: string;
  description?: string;
  base_query?: string;
  transformation_stages?: TransformationStage[];
  calculated_columns?: CalculatedColumn[];
  measures?: Measure[];
  cache_ttl?: number;
  refresh_schedule?: RefreshSchedule;
  is_active?: boolean;
}

// Dataset schema and preview types
export interface DatasetSchema {
  columns: ColumnDefinition[];
  row_count?: number;
  sample_data?: any[];
  primary_keys?: string[];
  foreign_keys?: ForeignKeyInfo[];
}

export interface ForeignKeyInfo {
  column: string;
  referenced_table: string;
  referenced_column: string;
}

export interface DatasetPreview {
  data: any[];
  columns: ColumnDefinition[];
  total_rows: number;
  execution_time_ms: number;
  query_id?: string;
}

// Query testing and validation types
export interface QueryTestResult {
  is_valid: boolean;
  preview_data?: any[];
  columns?: ColumnDefinition[];
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
  warnings?: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'syntax' | 'semantic' | 'permission' | 'dependency';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'deprecation';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

// Dataset refresh and caching types
export interface RefreshResult {
  success: boolean;
  rows_processed?: number;
  execution_time_ms?: number;
  error_message?: string;
  cache_updated?: boolean;
}

export interface CacheInfo {
  is_cached: boolean;
  cache_key?: string;
  cached_at?: string | Date;
  expires_at?: string | Date;
  cache_size_bytes?: number;
}

// Dataset access and permissions
export interface DatasetAccess {
  id: string;
  dataset_id: string;
  user_id?: string;
  group_id?: string;
  role_id?: string;
  permissions: DatasetPermission[];
  granted_by: string;
  granted_at: string | Date;
  expires_at?: string | Date;
  is_active: boolean;
}

export type DatasetPermission = 
  | 'can_read'
  | 'can_write'
  | 'can_delete'
  | 'can_refresh'
  | 'can_share'
  | 'can_export'
  | 'can_create_charts';

// Data source types for datasets
export interface DataSource {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  workspace_id: string;
  created_at: string | Date;
  updated_at: string | Date;
}

// Transformation and calculation types
export interface TransformationConfig {
  steps: TransformationStage[];
  output_schema?: ColumnDefinition[];
  validation_rules?: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'not_null' | 'unique' | 'range' | 'pattern' | 'custom';
  column: string;
  configuration: Record<string, any>;
  error_message: string;
}

// Export types for different formats
export interface ExportConfig {
  format: 'csv' | 'excel' | 'json' | 'parquet';
  include_headers: boolean;
  max_rows?: number;
  compression?: 'none' | 'gzip' | 'zip';
  delimiter?: string; // for CSV
  sheet_name?: string; // for Excel
}

export interface ExportResult {
  success: boolean;
  file_path?: string;
  download_url?: string;
  file_size_bytes?: number;
  rows_exported?: number;
  error_message?: string;
}