// File: ./src/types/dashboard.types.ts

export interface Dashboard {
  id: string;
  workspace_id: string;
  category_id?: string;
  name: string;
  display_name?: string;
  description?: string;
  slug: string;
  config_json?: DashboardConfiguration;
  tabs?: DashboardTab[];
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  theme_config?: DashboardTheme;
  layout_config?: LayoutConfiguration;
  responsive_settings?: ResponsiveSettings;
  thumbnail_url?: string;
  owner_id?: string;
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  is_featured: boolean;
  sort_order?: number;
  tags?: string[];
  version?: number;
  published_at?: Date | string;
  view_count?: number;
  last_viewed?: Date | string;
  rls_policies_json?: RLSPolicy[];
  created_by?: string;
  created_at: Date | string;
  updated_at: Date | string;
  
  // Legacy properties for backward compatibility
  layout?: DashboardLayout;
  filters?: DashboardFilter[];
  is_published?: boolean;
}

export interface DashboardConfiguration {
  auto_refresh?: {
    enabled: boolean;
    interval: number; // seconds
  };
  export_settings?: {
    include_filters: boolean;
    page_size: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
  };
  interaction_settings?: {
    enable_cross_filtering: boolean;
    enable_drill_through: boolean;
    click_behavior: 'filter' | 'drill' | 'none';
  };
  performance_settings?: {
    lazy_loading: boolean;
    concurrent_chart_loads: number;
    cache_duration: number;
  };
}


// Add these interfaces to your ./src/types/dashboard.types.ts file

// Extended dashboard interface with related data
export interface DashboardWithCharts extends Dashboard {
  charts: Chart[];
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  created_by_name?: string;
}

// Request interfaces for dashboard operations
export interface CreateDashboardRequest {
  name: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  slug?: string;
  config_json?: DashboardConfiguration;
  tabs?: DashboardTab[];
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  theme_config?: DashboardTheme;
  layout_config?: LayoutConfiguration;
  responsive_settings?: ResponsiveSettings;
  status?: 'draft' | 'published' | 'archived';
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  
  // Legacy support
  layout?: DashboardLayout;
  filter_config?: any;
}

export interface UpdateDashboardRequest {
  name?: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  slug?: string;
  config_json?: DashboardConfiguration;
  tabs?: DashboardTab[];
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  theme_config?: DashboardTheme;
  layout_config?: LayoutConfiguration;
  responsive_settings?: ResponsiveSettings;
  status?: 'draft' | 'published' | 'archived';
  is_public?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  tags?: string[];
  
  // Legacy support
  layout?: DashboardLayout;
  filter_config?: any;
}

export interface DuplicateDashboardRequest {
  name: string;
  description?: string;
  target_workspace_id?: string;
  copy_charts?: boolean;
  copy_permissions?: boolean;
  category_id?: string;
  status?: 'draft' | 'published';
  is_public?: boolean;
  tags?: string[];
}

// Additional missing types that are exported from index.ts
export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'scatter' 
  | 'area' 
  | 'column' 
  | 'donut' 
  | 'gauge' 
  | 'funnel' 
  | 'treemap' 
  | 'heatmap' 
  | 'histogram' 
  | 'boxplot' 
  | 'radar' 
  | 'sankey' 
  | 'waterfall' 
  | 'candlestick'
  | 'table'
  | 'metric'
  | 'text'
  | 'custom';

// Alias for ColumnInfo to match index.ts exports
export type DatasetColumn = ColumnInfo;

// SQL Query related interfaces
export interface SqlQuery {
  id: string;
  name?: string;
  query: string;
  parameters?: Record<string, any>;
  datasource_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QueryExecution {
  id: string;
  query_id?: string;
  query_text: string;
  parameters?: Record<string, any>;
  datasource_id: string;
  executed_by: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
  rows_returned?: number;
  error_message?: string;
  result_data?: QueryResult;
}
export interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  layout: ChartLayout[];
  is_visible: boolean;
  sort_order: number;
}

export interface ChartLayout {
  chart_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  max_width?: number;
  max_height?: number;
  is_resizable: boolean;
  is_draggable: boolean;
}

export interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  data_source: {
    type: 'dataset' | 'static' | 'query';
    source: string; // dataset_id or static values or query
    value_column: string;
    label_column?: string;
  };
  default_value?: any;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

export interface FilterConnection {
  filter_id: string;
  chart_id: string;
  target_column: string;
  connection_type: 'direct' | 'parameter' | 'calculated';
  transformation?: string; // JavaScript expression for value transformation
}

export interface DashboardTheme {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
  accent_color?: string;
}

export interface LayoutConfiguration {
  type: 'grid' | 'freeform';
  columns?: number;
  row_height?: number;
  margin?: number;
  padding?: number;
}

export interface ResponsiveSettings {
  breakpoints?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  hide_on_mobile?: string[];
  mobile_layout?: LayoutConfiguration;
}

export interface RLSPolicy {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
}

// Legacy interfaces for backward compatibility
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
  options?: ReadonlyArray<{ label: string; value: any }>;
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
  config_json: any;
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