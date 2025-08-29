// File: web-application/src/types/chart.types.ts

export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  tab_id?: string;
  dataset_ids: string[];
  plugin_id?: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_category: string;
  chart_library: string;
  config_json: ChartConfig;
  position_json: ChartPosition;
  styling_config?: ChartStyling;
  interaction_config?: ChartInteraction;
  query_config?: ChartQuery;
  drilldown_config?: DrilldownConfig;
  calculated_fields?: CalculatedField[];
  conditional_formatting?: ConditionalFormat[];
  export_config?: ExportConfig;
  cache_config?: CacheConfig;
  is_active: boolean;
  order_index: number;
  last_rendered?: string;
  render_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChartConfig {
  dimensions: ChartDimensions;
  series: ChartSeries[];
  axes: ChartAxes;
  legend: ChartLegend;
  colors: string[];
  animations: boolean;
  interactivity: boolean;
  [key: string]: any; // For chart-library-specific configs
}

export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  resizeHandles?: string[];
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface ChartSeries {
  id: string;
  name: string;
  type: string;
  data_field: string;
  aggregation?: string;
  color?: string;
  visible: boolean;
  order_index: number;
}

export interface ChartAxes {
  x: ChartAxis;
  y: ChartAxis;
  y2?: ChartAxis;
}

export interface ChartAxis {
  field: string;
  title: string;
  type: 'category' | 'time' | 'value';
  scale: 'linear' | 'log' | 'time';
  min?: number;
  max?: number;
  format?: string;
  grid: boolean;
  labels: boolean;
}

export interface ChartLegend {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
  orientation: 'horizontal' | 'vertical';
}

export interface ChartStyling {
  background_color?: string;
  border?: { width: number; color: string; style: string };
  border_radius?: number;
  shadow?: boolean;
  opacity?: number;
  font_family?: string;
  font_size?: number;
}

export interface ChartInteraction {
  zoom: boolean;
  pan: boolean;
  select: boolean;
  brush: boolean;
  tooltip: boolean;
  crossfilter: boolean;
  click_action?: 'drill_down' | 'filter' | 'navigate' | 'custom';
}

export interface ChartQuery {
  filters: QueryFilter[];
  sort: QuerySort[];
  limit?: number;
  offset?: number;
  group_by?: string[];
  having?: QueryFilter[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'between';
  value: any;
  data_type: string;
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DrilldownConfig {
  enabled: boolean;
  levels: DrilldownLevel[];
  breadcrumbs: boolean;
  navigation_type: 'modal' | 'inline' | 'page';
}

export interface DrilldownLevel {
  level: number;
  field: string;
  chart_type?: string;
  title_template: string;
}

export interface CalculatedField {
  id: string;
  name: string;
  expression: string;
  data_type: string;
  format?: string;
}

export interface ConditionalFormat {
  id: string;
  condition: string;
  format: {
    background_color?: string;
    text_color?: string;
    font_weight?: 'normal' | 'bold';
    icon?: string;
  };
}

export interface ExportConfig {
  enabled: boolean;
  formats: ('png' | 'svg' | 'pdf' | 'csv' | 'excel')[];
  default_format: string;
  include_data: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  invalidation_rules: string[];
}