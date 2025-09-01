// =============================================================================
// Chart System Type Definitions - Deduplicated and Consolidated
// =============================================================================

import React from 'react';

// =============================================================================
// Main Chart Entity Interface
// =============================================================================

export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  tab_id?: string;
  dataset_ids: readonly string[];
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
  calculated_fields?: readonly CalculatedField[];
  conditional_formatting?: readonly ConditionalFormat[];
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
  series: readonly ChartSeries[];
  axes: ChartAxes;
  legend: ChartLegend;
  colors: readonly string[];
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

export interface ChartQuery {
  filters: readonly QueryFilter[];
  sort: readonly QuerySort[];
  limit?: number;
  offset?: number;
  group_by?: readonly string[];
  having?: readonly QueryCondition[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
}

export interface DrilldownConfig {
  enabled: boolean;
  levels: readonly DrilldownLevel[];
  auto_drill?: boolean;
  maintain_filters?: boolean;
}

export interface DrilldownLevel {
  field: string;
  display_name: string;
  chart_type?: string;
  aggregation?: string;
}

export interface CalculatedField {
  id: string;
  name: string;
  expression: string;
  data_type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
}

export interface ConditionalFormat {
  id: string;
  field: string;
  condition: string;
  style: {
    color?: string;
    background_color?: string;
    font_weight?: string;
    font_style?: string;
  };
}

export interface ExportConfig {
  formats: readonly string[];
  default_format: string;
  include_data: boolean;
  include_styling: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  refresh_on_filter: boolean;
  invalidation_keys?: readonly string[];
}

// =============================================================================
// Core Data Interfaces
// =============================================================================

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

// =============================================================================
// Chart Configuration Interfaces (Alternative/Legacy)
// =============================================================================

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

// =============================================================================
// Chart Theme Interface
// =============================================================================

export interface ChartTheme {
  name?: string;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  colors?: readonly string[];
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  opacity?: number;
}

// =============================================================================
// Chart Interaction Interfaces
// =============================================================================

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan';
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
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

// =============================================================================
// Chart Props Interfaces (React Component Props)
// =============================================================================

// Main ChartProps interface - Primary interface for chart components
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

// Chart configuration props interface (for chart config forms/editors)
export interface ChartConfigProps {
  config: any;
  data?: any[];
  availableColumns?: ColumnInfo[];
  chartType?: string;
  chartLibrary?: string;
  onConfigChange: (newConfig: any) => void;
  onValidate?: (isValid: boolean, errors?: ValidationError[]) => void;
  showPreview?: boolean;
  previewDimensions?: { width: number; height: number };
}

// =============================================================================
// Plugin System Interfaces
// =============================================================================

export interface ChartConfigSchema {
  type: string; // More flexible - accepts any string, not just 'object'
  properties: {
    [key: string]: {
      type: string; // More flexible - accepts any string, not just specific literals
      required?: boolean;
      default?: any;
      title?: string;
      description?: string;
      options?: ReadonlyArray<{ label: string; value: any }>; // No readonly requirement
      minimum?: number;
      maximum?: number;
      items?: {
        type: string;
        title?: string;
      };
      enum?: readonly any[]; // No readonly requirement
      format?: string;
      minItems?: number;
      maxItems?: number;
    };
  };
  required?: string[]; // No readonly requirement
}

// Alternative: Make the whole interface more permissive
export interface ChartConfigSchemaFlexible {
  type: string; // ✅ Just use string instead of literal type
  properties: Record<string, any>; // ✅ More flexible properties
  required?: string[]; // ✅ Allow mutable arrays too
}

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string; // ✅ Change from union to string
  library: string;  // ✅ Change from union to string 
  version: string;
  description?: string;
  tags?: string[]; // ✅ Simplified from readonly string[]
  
  configSchema: ChartConfigSchema;
  dataRequirements: DataRequirements;
  exportFormats: ExportFormat[]; // ✅ Not readonly - this fixes the casting error
  component: React.ComponentType<ChartProps>;
  configComponent?: React.ComponentType<ChartConfigProps>;
  previewComponent?: React.ComponentType<ChartPreviewProps>; // ✅ Added missing property
  interactionSupport?: {
    zoom?: boolean;
    pan?: boolean;
    selection?: boolean;
    brush?: boolean;
    drilldown?: boolean;
    tooltip?: boolean;
    crossFilter?: boolean;
  };
}

export interface DataRequirements {
  minColumns?: number;
  maxColumns?: number;
  requiredFields?: readonly string[];
  optionalFields?: readonly string[];
  supportedTypes?: readonly string[];
  aggregationSupport?: boolean;
  pivotSupport?: boolean;
}

export interface PluginConfigSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: readonly any[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  options?: ReadonlyArray<{ label: string; value: any }>;
  properties?: Record<string, SchemaProperty>;
}

// =============================================================================
// Validation and Error Handling
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
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

// =============================================================================
// Core Data Interfaces
// =============================================================================

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

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  displayName?: string;
  nullable?: boolean;
  unique?: boolean;
  sampleValues?: any[];
}

// =============================================================================
// Chart Configuration Interfaces
// =============================================================================

export interface ChartConfiguration {
  title?: string;
  subtitle?: string;
  xAxis?: AxisConfiguration;
  yAxis?: AxisConfiguration;
  series?: SeriesConfiguration[];
  colors?: readonly string[];
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

// =============================================================================
// Chart Theme Interface
// =============================================================================

export interface ChartTheme {
  name?: string;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  colors?: readonly string[];
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  opacity?: number;
}

// =============================================================================
// Chart Interaction Interfaces
// =============================================================================

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan';
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
}

export interface ChartInteraction {
  type: 'click' | 'hover' | 'brush' | 'zoom' | 'pan';
  data?: any;
  event?: any;
}

// =============================================================================
// Chart Props Interfaces (React Component Props)
// =============================================================================

// Main ChartProps interface - Primary interface for chart components
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

export interface ChartPreviewProps {
  data?: any[];
  config?: any;
  width?: number;
  height?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  theme?: any;
  isPreview?: boolean;
  showSampleData?: boolean;
  sampleDataCount?: number;
  chartType?: string;
  chartLibrary?: string;
}

// Chart configuration props interface (for chart config forms/editors)
export interface ChartConfigProps {
  config: any;
  data?: any[];
  availableColumns?: ColumnInfo[];
  chartType?: string;
  chartLibrary?: string;
  onConfigChange: (newConfig: any) => void;
  onValidate?: (isValid: boolean, errors?: ValidationError[]) => void;
  showPreview?: boolean;
  previewDimensions?: { width: number; height: number };
}

// =============================================================================
// Plugin System Interfaces
// =============================================================================


export interface PluginConfigSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: readonly any[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  options?: ReadonlyArray<{ label: string; value: any }>;
  properties?: Record<string, SchemaProperty>;
}

// =============================================================================
// Validation and Error Handling
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface DataRequirements {
  minColumns?: number;
  maxColumns?: number;
  requiredFields?: string[]; // No readonly requirement
  optionalFields?: string[]; // No readonly requirement
  supportedTypes?: string[]; // No readonly requirement
  aggregationSupport?: boolean;
  pivotSupport?: boolean;
  specialRequirements?: string[]; // Added for additional requirements
}

export interface SchemaProperty {
  type: string; // More flexible
  title: string;
  description?: string;
  default?: any;
  enum?: readonly any[]; // No readonly requirement
  minimum?: number;
  maximum?: number;
  required?: boolean;
  options?: ReadonlyArray<{ label: string; value: any }>; // No readonly requirement
  properties?: Record<string, SchemaProperty>;
}

// Keep the strict types for validation if needed elsewhere:
export type ChartCategory = 'basic' | 'advanced' | 'statistical' | 'geographic' | 'financial' | 'custom';
export type ChartLibrary = 'echarts' | 'd3js' | 'plotly' | 'chartjs' | 'nvd3js' | 'drilldown';
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'jpg' | 'html';

// Helper function to validate chart configs at runtime if needed:
export function validateChartCategory(category: string): category is ChartCategory {
  return ['basic', 'advanced', 'statistical', 'geographic', 'financial', 'custom'].includes(category);
}

export function validateChartLibrary(library: string): library is ChartLibrary {
  return ['echarts', 'd3js', 'plotly', 'chartjs', 'nvd3js', 'drilldown'].includes(library);
}

export function validateExportFormat(format: string): format is ExportFormat {
  return ['png', 'svg', 'pdf', 'jpg', 'html'].includes(format);
}

export interface ChartProps {
  data: any[];
  config: any;
  width?: number;
  height?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  theme?: any;
  onInteraction?: (event: any) => void;
  onError?: (error: Error) => void;
  isLoading?: boolean;
  error?: string;
}