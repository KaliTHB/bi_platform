// 🚀 NEW INTERFACES FOR CACHE & FILTER OPERATIONS

export interface DashboardDataParams {
  refresh?: boolean;
  filters?: any[];
  limit?: number;
  offset?: number;
  [key: string]: any;
}

export interface DashboardDataResponse {
  success: boolean;
  data: {
    charts: DashboardChartData[];
    metadata: DashboardDataMetadata;
  };
  message?: string;
}

export interface DashboardChartData {
  dashboard_chart_id: string;
  chart_id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  title?: string;
  data?: any[];
  columns?: Array<{ name: string; type: string }>;
  metadata?: {
    row_count: number;
    execution_time_ms: number;
    cache_hit: boolean;
    query_hash: string;
    generated_sql?: string;
  };
  cached?: boolean;
  error?: string;
}

export interface DashboardDataMetadata {
  dashboard_id: string;
  chart_count: number;
  last_updated: Date;
  cached: boolean;
  execution_time_ms?: number;
}

export interface RefreshDashboardResponse {
  success: boolean;
  refresh_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  estimated_completion_time?: Date;
  charts_to_refresh: number;
  message?: string;
}

export interface GlobalFilterRequest {
  filter_id: string;
  filter_value: any;
}

export interface GlobalFilterResponse {
  success: boolean;
  results: FilterApplicationResult[];
  filter_id: string;
  applied_value: any;
  affected_charts: number;
  message?: string;
}

export interface FilterApplicationResult {
  chart_id: string;
  success: boolean;
  data?: any;
  error?: string;
  cache_invalidated?: boolean;
}

export interface ExportDashboardOptions {
  format: 'pdf' | 'png' | 'svg' | 'xlsx' | 'json';
  include_filters?: boolean;
  page_size?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  width?: number;
  height?: number;
  quality?: number;
  [key: string]: any;
}

export interface ExportDashboardResponse {
  success: boolean;
  export: {
    export_id: string;
    format: string;
    file_path?: string;
    download_url?: string;
    file_size_bytes?: number;
    status: 'processing' | 'completed' | 'failed';
    created_at: Date;
  };
  message?: string;
}

export interface DashboardCacheStatus {
  dashboard_cached: boolean;
  charts_cached: number;
  total_charts: number;
  last_cache_update?: Date;
  cache_size_mb?: number;
}

export interface DashboardCacheStatusResponse {
  success: boolean;
  cache_status: DashboardCacheStatus;
  message?: string;
}

export interface ClearCacheResponse {
  success: boolean;
  cache_cleared: boolean;
  affected_charts: number;
  message?: string;
}

export interface UpdateLayoutRequest {
  layout: any; // Dashboard layout configuration
}

export interface UpdateLayoutResponse {
  success: boolean;
  layout: any;
  message: string;
}

export interface UpdateFiltersRequest {
  filters: GlobalFilter[];
}

export interface UpdateFiltersResponse {
  success: boolean;
  filters: GlobalFilter[];
  message: string;
}

// 🔧 EXTENDED GLOBAL FILTER INTERFACES

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
  validation_rules?: {
    min_value?: number;
    max_value?: number;
    allowed_values?: any[];
    regex_pattern?: string;
  };
}

export interface FilterConnection {
  filter_id: string;
  chart_id: string;
  target_column: string;
  connection_type: 'direct' | 'parameter' | 'calculated';
  transformation?: string; // JavaScript expression for value transformation
}

// 📊 ANALYTICS & PERFORMANCE INTERFACES

export interface DashboardAnalytics {
  dashboard_id: string;
  views: {
    total: number;
    unique_users: number;
    daily_average: number;
  };
  charts: {
    total_interactions: number;
    most_viewed_chart: string;
    average_time_spent: number;
  };
  filters: {
    most_used_filter: string;
    filter_usage_count: number;
  };
  performance: {
    average_load_time: number;
    cache_hit_rate: number;
  };
}

export interface DashboardPerformanceMetrics {
  load_time_ms: number;
  render_time_ms: number;
  data_fetch_time_ms: number;
  cache_hit_rate: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

// 🎯 DASHBOARD SHARING INTERFACES

export interface ShareDashboardRequest {
  share_type: 'public' | 'password' | 'private';
  expires_at?: Date | string;
  password?: string;
}

export interface SharingConfig {
  id: string;
  dashboard_id: string;
  share_type: 'public' | 'password' | 'private';
  share_token: string;
  expires_at?: Date;
  password_hash?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  access_count: number;
  last_accessed_at?: Date;
}

// 🔄 REFRESH JOB TRACKING

export interface RefreshJob {
  refresh_id: string;
  dashboard_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  estimated_completion_time?: Date;
  charts_to_refresh: number;
  charts_completed: number;
  error_message?: string;
  created_by: string;
}

export interface RefreshJobStatus {
  refresh_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_step?: string;
  estimated_time_remaining?: number;
  error_details?: string;
}

// 📈 CHART-SPECIFIC DASHBOARD INTERFACES

export interface DashboardChart {
  id: string;
  chart_id: string;
  dashboard_id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  title?: string;
  description?: string;
  order_index: number;
  is_visible: boolean;
  responsive_settings?: {
    mobile: { width: number; height: number };
    tablet: { width: number; height: number };
    desktop: { width: number; height: number };
  };
  chart?: {
    id: string;
    name: string;
    type: string;
    dataset_id: string;
  };
}

// 🎨 THEME & STYLING INTERFACES

export interface DashboardTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  border_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  font_family: string;
  font_size: {
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  };
}

// 📱 RESPONSIVE LAYOUT INTERFACES

export interface ResponsiveSettings {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
  };
  grid_settings: {
    mobile: { columns: number; margin: number; gutter: number };
    tablet: { columns: number; margin: number; gutter: number };
    desktop: { columns: number; margin: number; gutter: number };
  };
  auto_resize: boolean;
  maintain_aspect_ratio: boolean;
}

export interface LayoutConfiguration {
  type: 'grid' | 'freeform' | 'tabs';
  grid?: {
    columns: number;
    rows?: number;
    cell_height: number;
    margin: number;
    container_padding: number;
  };
  freeform?: {
    canvas_width: number;
    canvas_height: number;
    snap_to_grid: boolean;
    grid_size: number;
  };
  tabs?: {
    position: 'top' | 'bottom' | 'left' | 'right';
    scrollable: boolean;
    closable: boolean;
  };
}