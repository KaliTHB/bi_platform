// File: web-application/src/types/dataset.types.ts

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
  last_refreshed?: string;
  refresh_status: 'pending' | 'running' | 'completed' | 'failed';
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
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
}

export interface Measure {
  id: string;
  name: string;
  display_name: string;
  expression: string;
  format_string?: string;
  aggregation_type: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
  description?: string;
}

export interface DatasetRelationship {
  id: string;
  from_dataset_id: string;
  to_dataset_id: string;
  from_column: string;
  to_column: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  is_active: boolean;
}

export interface RefreshSchedule {
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  next_run: string;
}