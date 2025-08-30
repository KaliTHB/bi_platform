// File: ./src/types/dashboard.ts

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  filters: DashboardFilter[];
  is_published: boolean;
  category_id?: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  components: DashboardComponent[];
}

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'text' | 'filter' | 'spacer';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  configuration: Record<string, any>;
  chart_id?: string;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  field: string;
  default_value?: any;
  options?: Array<{ label: string; value: any }>;
  required: boolean;
}

export interface Chart {
  id: string;
  name: string;
  description?: string;
  chart_type: string;
  configuration: ChartConfiguration;
  dataset_id: string;
  dashboard_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChartConfiguration {
  visualization: {
    type: string;
    library: string;
    settings: Record<string, any>;
  };
  data: {
    x_axis?: string;
    y_axis?: string | string[];
    groupBy?: string;
    aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  };
  styling: {
    colors?: string[];
    theme?: string;
    showLegend?: boolean;
    showTooltip?: boolean;
  };
  filters?: QueryFilter[];
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  query: string;
  data_source_id: string;
  transformation_config?: TransformationConfig;
  cache_ttl: number;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TransformationConfig {
  steps: TransformationStep[];
  output_schema?: ColumnInfo[];
}

export interface TransformationStep {
  type: 'filter' | 'aggregate' | 'join' | 'pivot' | 'calculated_field' | 'sort';
  configuration: Record<string, any>;
  order: number;
}

export interface DataSource {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  last_tested?: string;
  is_active: boolean;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// Query and data types
export interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in';
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface QueryResult {
  data: any[];
  columns: ColumnInfo[];
  total_rows: number;
  execution_time_ms: number;
  cached: boolean;
  query_id?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  format?: string;
}