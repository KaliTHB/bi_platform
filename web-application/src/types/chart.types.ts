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
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'not_like';
  value: any;
  data_type: string;
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DrilldownConfig {
  levels: DrilldownLevel[];
  current_level: number;
  breadcrumb_enabled: boolean;
  auto_expand: boolean;
}

export interface DrilldownLevel {
  level: number;
  field: string;
  chart_type?: string;
  title?: string;
  description?: string;
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
  field: string;
  condition: {
    operator: string;
    value: any;
  };
  format: {
    color?: string;
    background_color?: string;
    font_weight?: string;
    font_style?: string;
  };
}

export interface ExportConfig {
  enabled: boolean;
  formats: ('png' | 'jpg' | 'svg' | 'pdf')[];
  quality?: number;
  resolution?: number;
  include_data?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  invalidation_keys: string[];
}

// ======= CHART PLUGIN INTERFACES (consolidated from all plugin interface files) =======

export interface ChartPlugin {
  name: string;
  displayName?: string;
  category?: string;
  component?: any;
  configSchema?: ChartConfigSchema;
}

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: 'basic' | 'advanced' | 'statistical' | 'geographic' | 'financial' | 'custom';
  library: 'echarts' | 'd3js' | 'plotly' | 'chartjs' | 'nvd3js' | 'drilldown';
  version: string;
  description?: string;
  tags?: string[];
  configSchema: ChartConfigurationSchema;
  dataRequirements: DataRequirements;
  exportFormats: string[];
  component: React.ComponentType<ChartProps>;
}

export interface ChartConfigSchema {
  type: 'object';
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'color';
      required?: boolean;
      default?: any;
      title?: string;
      description?: string;
      options?: Array<{ label: string; value: any }>;
    };
  };
  required?: string[];
}

export interface SchemaProperty {
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  properties?: Record<string, SchemaProperty>;
}

// Chart Component Props Interface (primary interface for React components)
// Supports both simplified and detailed data formats
export interface ChartProps {
  data: any[] | ChartData;
  config: any | ChartConfiguration;
  dimensions?: {
    width: number;
    height: number;
  };
  width?: number;
  height?: number;
  theme?: ChartTheme;
  filters?: any[];
  onInteraction?: (event: ChartInteractionEvent | ChartInteraction) => void;
  onError?: (error: Error) => void;
  isLoading?: boolean;
  error?: string;
}

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan';
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
}

export interface ChartTheme {
  name?: string;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  colors?: string[];
}

export interface ChartData {
  rows: Record<string, any>[];
  columns: ColumnDefinition[];
  metadata?: Record<string, any>;
}

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  displayName?: string;
  format?: string;
}

export interface ChartConfiguration {
  title?: string;
  subtitle?: string;
  xAxis?: AxisConfiguration;
  yAxis?: AxisConfiguration;
  series?: SeriesConfiguration[];
  colors?: string[];
  legend?: LegendConfiguration;
  tooltip?: TooltipConfiguration;
  animation?: AnimationConfiguration;
  interactions?: InteractionConfiguration;
  [key: string]: any;
}

export interface AxisConfiguration {
  title?: string;
  type?: 'category' | 'value' | 'time' | 'log';
  min?: number;
  max?: number;
  interval?: number;
  format?: string;
  show?: boolean;
}

export interface SeriesConfiguration {
  name: string;
  type: string;
  dataKey: string;
  color?: string;
  stack?: string;
  smooth?: boolean;
  symbol?: string;
  symbolSize?: number;
}

export interface LegendConfiguration {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
}

export interface TooltipConfiguration {
  show?: boolean;
  trigger?: 'item' | 'axis';
  formatter?: string;
}

export interface AnimationConfiguration {
  enabled?: boolean;
  duration?: number;
  easing?: string;
}

export interface InteractionConfiguration {
  zoom?: boolean;
  pan?: boolean;
  brush?: boolean;
  dataZoom?: boolean;
}

export interface ChartInteraction {
  type: 'click' | 'hover' | 'brush' | 'zoom' | 'pan';
  data?: any;
  event?: any;
}

export interface DataRequirements {
  minColumns?: number;
  maxColumns?: number;
  requiredColumnTypes?: string[];
  supportedAggregations?: string[];
}

export interface ChartConfigurationSchema {
  properties: Record<string, SchemaProperty>;
  required?: string[];
  groups?: ConfigurationGroup[];
}

export interface ConfigurationGroup {
  title: string;
  properties: string[];
  collapsible?: boolean;
}

export interface ChartFilter {
  field: string;
  operator: string;
  value: any;
}

export interface ChartError {
  message: string;
  code?: string;
  details?: any;
}

export interface DataRequest {
  filters?: ChartFilter[];
  aggregation?: string;
  groupBy?: string[];
  limit?: number;
  offset?: number;
}