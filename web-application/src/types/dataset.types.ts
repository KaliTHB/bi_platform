// File: ./src/types/dataset.types.ts

export type DatasetType = 
  | 'table' | 'query' | 'transformation'    // Database values
  | 'sql' | 'calculated' | 'imported';  // App-specific values


// Main Dataset interface using database types
export interface Dataset {
  id: string;
  workspace_id: string;
  datasource_ids: string[];
  name: string;
  display_name: string;
  description?: string;
  type: DatasetType;
  base_query: string;
  parent_dataset_ids?: string[];
  transformation_stages: TransformationStage[];
  calculated_columns: CalculatedColumn[];
  measures: Measure[];
  relationships: DatasetRelationship[];
  schema_json: DatasetSchema;
  metadata_json: Record<string, any>;
  cache_ttl: number;
  row_count?: number;
  is_active: boolean;
  created_by: string;
  created_at: string | Date; // Allow both types
  updated_at: string | Date;
  last_refreshed?: string | Date;
  version: number;
  status: 'active' | 'inactive' | 'draft' | 'error';
  owner_id: string;
}

export interface DatasetSchema {
  columns: ColumnDefinition[];
  primary_keys: string[];
  indexes: IndexDefinition[];
  relationships: DatasetRelationship[];
}

export interface ColumnDefinition {
  name: string;
  display_name: string;
  data_type: string;
  is_nullable: boolean;
  description?: string;
  format_string?: string;
  is_calculated?: boolean;
  calculation_expression?: string;
  sort_order?: number;
  is_visible?: boolean;
  column_width?: number;
  aggregation_type?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
}

export interface TransformationStage {
  id: string;
  type: 'filter' | 'aggregate' | 'join' | 'pivot' | 'sort' | 'limit' | 'union' | 'custom';
  configuration: Record<string, any>;
  order_index: number;
  is_active: boolean;
}

export interface CalculatedColumn {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  expression: string;
  data_type: string;
  format_string?: string;
  dependencies: string[];
  is_active: boolean;
}

export interface Measure {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  expression: string;
  aggregation_type: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count' | 'custom';
  format_string?: string;
  folder?: string;
  is_visible: boolean;
}

export interface DatasetRelationship {
  id: string;
  name: string;
  from_dataset_id: string;
  to_dataset_id: string;
  from_column: string;
  to_column: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  is_active: boolean;
}

// API Request/Response Types
export interface CreateDatasetRequest {
  workspace_id: string;
  datasource_ids: string[];
  name: string;
  display_name: string;
  description?: string;
  type: DatasetType;
  base_query: string;
  parent_dataset_ids?: string[];
  transformation_stages?: TransformationStage[];
  calculated_columns?: CalculatedColumn[];
  measures?: Measure[];
  relationships?: DatasetRelationship[];
  schema_json?: DatasetSchema;
  metadata_json?: Record<string, any>;
  cache_ttl?: number;
}

export interface UpdateDatasetRequest {
  display_name?: string;
  description?: string;
  base_query?: string;
  parent_dataset_ids?: string[];
  transformation_stages?: TransformationStage[];
  calculated_columns?: CalculatedColumn[];
  measures?: Measure[];
  relationships?: DatasetRelationship[];
  cache_ttl?: number;
  is_active?: boolean;
}

export interface DatasetQueryOptions {
  filters?: QueryFilter[];
  pagination?: PaginationConfig;
  sorting?: SortConfig[];
  includeCalculatedColumns?: boolean;
  includeMetadata?: boolean;
  limit?: number;
  offset?: number;
}

export interface DatasetQueryResult {
  data: any[];
  columns: ColumnDefinition[];
  total_rows?: number;
  execution_time_ms: number;
  cache_hit: boolean;
  dataset_info: {
    id: string;
    name: string;
    type: DatasetType;
    last_refreshed?: Date;
  };
  metadata?: Record<string, any>;
}

// Query and Filter Types
export interface QueryFilter {
  column: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'not_like' | 'is_null' | 'is_not_null' | 'between';
  value: any;
  value2?: any; // For BETWEEN operations
  logical_operator?: 'AND' | 'OR';
}

export interface PaginationConfig {
  page: number;
  page_size: number;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}