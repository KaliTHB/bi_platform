// web-application/src/types/chart.types.ts
// Complete Chart Types with Fixed Schema Support

import React from 'react';

// =============================================================================
// Core Chart Interfaces
// =============================================================================

export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  name: string;
  display_name?: string;
  description?: string;
  chart_type: string;
  chart_category: string;
  chart_library: string;
  dataset_ids: string[];
  config_json: ChartConfiguration;
  position_json: ChartPosition;
  styling_config?: ChartStyling;
  interaction_config?: InteractionConfiguration;
  drilldown_config?: DrilldownConfig;
  calculated_fields?: CalculatedField[];
  conditional_formatting?: ConditionalFormat[];
  export_config?: ExportConfig;
  cache_config?: CacheConfig;
  tab_id?: string;
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin?: {
    top?: number;
    right?: number;               // ← Added optional margin
    bottom?: number;
    left?: number;
  };
   padding?: {                   // ← Added optional padding
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
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

export interface ChartConfig {
  dimensions: ChartDimensions;
  series: readonly ChartSeries[];
  axes: ChartAxes;
  legend: ChartLegend;
  colors?: string[] | readonly string[] | ColorConfiguration;
  animations: boolean;
  interactivity: boolean;
  [key: string]: any; // For chart-library-specific configs
}


export interface ChartLegend {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
  orient?: 'horizontal' | 'vertical';  // Make this optional
}
// =============================================================================
// Chart Configuration - Core Interface
// =============================================================================

export interface ChartConfiguration {
  // Basic settings
  title?: ChartTitle;
  subtitle?: string;
  description?: string;
  
  // Data configuration
  dataConfig?: DataConfiguration;
  
  // Visual configuration
  colors?: string[] | ColorConfiguration;
   theme?: ChartTheme; 
  
  // Axes configuration
  xAxis?: ChartAxis;
  yAxis?: ChartAxis;
  axes?: ChartAxes;
  
  // Series configuration
  series?: SeriesConfiguration[];
  
  // Interactive elements
  legend?: LegendConfiguration;
  tooltip?: TooltipConfiguration;
  
  // Behavior
  animation?: boolean | AnimationConfiguration;
  interactions?: InteractionConfiguration;
  
  // Data processing
  filters?: ChartFilter[];
  sorting?: SortConfiguration;
  aggregation?: AggregationConfiguration;
  
  // Chart-specific options
  [key: string]: any;
}

export interface DataConfiguration {
  xField?: string;
  yField?: string;
  seriesField?: string;
  valueField?: string;
  categoryField?: string;
  timeField?: string;
  groupField?: string;
  sizeField?: string;
  colorField?: string;
  labelField?: string;
  
  // Data processing
  dataTransform?: DataTransform[];
  dataLimit?: number;
  dataOffset?: number;
}

export interface ColorConfiguration {
  primary?: string[];
  positive?: string;
  negative?: string;
  neutral?: string;
  total?: string;
  connector?: string;
  background?: string;
  text?: string;
  grid?: string;
  axis?: string;
}

// =============================================================================
// Chart Axes Configuration
// =============================================================================

export interface ChartAxis {
  field?: string;
  title?: string;
  type?: 'category' | 'value' | 'time' | 'log';
  scale?: 'linear' | 'log' | 'time' | 'pow';
  min?: number | string;
  max?: number | string;
  interval?: number;
  format?: string;
  show?: boolean;
  grid?: boolean;
  labels?: boolean | AxisLabelsConfig;
  ticks?: AxisTicksConfig;
  line?: AxisLineConfig;
}

export interface ChartAxes {
  x?: ChartAxis;
  y?: ChartAxis;
  x2?: ChartAxis;
  y2?: ChartAxis;
}

export interface AxisLabelsConfig {
  show?: boolean;
  rotation?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  formatter?: string | ((value: any) => string);
}

export interface AxisTicksConfig {
  show?: boolean;
  length?: number;
  color?: string;
  width?: number;
}

export interface AxisLineConfig {
  show?: boolean;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

// =============================================================================
// Series Configuration
// =============================================================================

export interface SeriesConfiguration {
  id?: string;
  name: string;
  type?: string;
  dataKey?: string;
  data_field?: string;
  color?: string;
  colors?: string[];
  style?: SeriesStyle;
  animation?: boolean | AnimationConfiguration;
  interactions?: boolean;
  visible?: boolean;
  stack?: string;
  yAxisIndex?: number;
  smooth?: boolean;
  step?: boolean | 'start' | 'middle' | 'end';
  connectNulls?: boolean;
  showSymbol?: boolean;
  symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow';
  symbolSize?: number | number[];
  lineWidth?: number;
  areaStyle?: SeriesAreaStyle;
  itemStyle?: SeriesItemStyle;
  label?: SeriesLabelConfig;
  emphasis?: SeriesEmphasisConfig;
}

export interface SeriesStyle {
  strokeWidth?: number;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeDashArray?: string;
}

export interface SeriesAreaStyle {
  opacity?: number;
  color?: string;
  origin?: 'auto' | 'start' | 'end';
}

export interface SeriesItemStyle {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderType?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface SeriesLabelConfig {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'inside' | 'insideTop' | 'insideBottom' | 'insideLeft' | 'insideRight';
  color?: string;
  fontSize?: number;
  fontWeight?: string | number;
  formatter?: string | ((params: any) => string);
  rotate?: number;
  offset?: [number, number];
}

export interface SeriesEmphasisConfig {
  disabled?: boolean;
  scale?: number;
  focus?: 'none' | 'self' | 'series';
  blurScope?: 'coordinateSystem' | 'series' | 'global';
  itemStyle?: SeriesItemStyle;
  label?: SeriesLabelConfig;
}

// =============================================================================
// Legend and Tooltip Configuration
// =============================================================================

export interface LegendConfiguration {
  show?: boolean;
  type?: 'plain' | 'scroll';
  orient?: 'horizontal' | 'vertical';
  align?: 'auto' | 'left' | 'center' | 'right';
  verticalAlign?: 'auto' | 'top' | 'middle' | 'bottom';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  padding?: number | number[];
  margin?: number | number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number | number[];
  textStyle?: TextStyle;
  itemGap?: number;
  itemWidth?: number;
  itemHeight?: number;
  selectedMode?: boolean | 'single' | 'multiple';
  selected?: { [key: string]: boolean };
  formatter?: string | ((name: string) => string);
}

export interface TooltipConfiguration {
  show?: boolean;
  trigger?: 'item' | 'axis' | 'none';
  axisPointer?: AxisPointerConfig;
  showContent?: boolean;
  alwaysShowContent?: boolean;
  triggerOn?: 'mousemove' | 'click' | 'mousemove|click' | 'none';
  showDelay?: number;
  hideDelay?: number;
  enterable?: boolean;
  renderMode?: 'html' | 'richText';
  confine?: boolean;
  appendToBody?: boolean;
  position?: TooltipPosition;
  formatter?: string | ((params: any) => string);
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number | number[];
  textStyle?: TextStyle;
  extraCssText?: string;
}

export interface AxisPointerConfig {
  type?: 'line' | 'shadow' | 'none' | 'cross';
  axis?: 'auto' | 'x' | 'y' | 'angle' | 'radius';
  snap?: boolean;
  z?: number;
  label?: AxisPointerLabelConfig;
  lineStyle?: LineStyle;
  shadowStyle?: ShadowStyle;
  crossStyle?: LineStyle;
}

export interface AxisPointerLabelConfig {
  show?: boolean;
  precision?: number | 'auto';
  formatter?: string | ((params: any) => string);
  margin?: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number | number[];
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export type TooltipPosition = 
  | 'inside' | 'top' | 'left' | 'right' | 'bottom'
  | [number, number] | [string, string]
  | ((point: [number, number], params: any, dom: HTMLElement, rect: any, size: any) => [number, number]);

// =============================================================================
// Animation Configuration
// =============================================================================

export interface AnimationConfiguration {
  enabled?: boolean;
  duration?: number;
  delay?: number | ((index: number) => number);
  easing?: 'linear' | 'quadraticIn' | 'quadraticOut' | 'quadraticInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'quarticIn' | 'quarticOut' | 'quarticInOut' | 'quinticIn' | 'quinticOut' | 'quinticInOut' | 'sinusoidalIn' | 'sinusoidalOut' | 'sinusoidalInOut' | 'exponentialIn' | 'exponentialOut' | 'exponentialInOut' | 'circularIn' | 'circularOut' | 'circularInOut' | 'elasticIn' | 'elasticOut' | 'elasticInOut' | 'backIn' | 'backOut' | 'backInOut' | 'bounceIn' | 'bounceOut' | 'bounceInOut';
  animationThreshold?: number;
  animationDurationUpdate?: number;
  animationDelayUpdate?: number | ((index: number) => number);
  animationEasingUpdate?: string;
}

// =============================================================================
// Interaction Configuration
// =============================================================================

export interface InteractionConfiguration {
  enabled?: boolean;
  zoom?: boolean | ZoomConfiguration;
  pan?: boolean | PanConfiguration;
  selection?: boolean | SelectionConfiguration;
  brush?: boolean | BrushConfiguration;
  drilldown?: boolean | DrilldownConfiguration;
  tooltip?: boolean;
  crossFilter?: boolean;
  dataPointClick?: boolean;
  dataPointHover?: boolean;
  legendClick?: boolean;
  legendHover?: boolean;
}

export interface ZoomConfiguration {
  enabled: boolean;
  type?: 'x' | 'y' | 'xy';
  zoomOnMouseWheel?: boolean;
  moveOnMouseMove?: boolean;
  moveOnMouseWheel?: boolean;
  preventDefaultMouseMove?: boolean;
}

export interface PanConfiguration {
  enabled: boolean;
  type?: 'x' | 'y' | 'xy';
  panOnDrag?: boolean;
  preventDefaultMouseMove?: boolean;
}

export interface SelectionConfiguration {
  enabled: boolean;
  mode?: 'single' | 'multiple';
  type?: 'point' | 'area';
}

export interface BrushConfiguration {
  enabled: boolean;
  toolbox?: string[];
  xAxisIndex?: number | number[] | 'all' | 'none';
  yAxisIndex?: number | number[] | 'all' | 'none';
  brushType?: 'rect' | 'polygon' | 'lineX' | 'lineY';
  brushMode?: 'single' | 'multiple';
  transformable?: boolean;
  brushStyle?: BrushStyle;
  throttleType?: 'debounce' | 'fixRate';
  throttleDelay?: number;
}

export interface DrilldownConfiguration {
  enabled: boolean;
  levels: DrilldownLevel[];
  autoOpen?: boolean;
  breadcrumb?: boolean;
}

export interface BrushStyle {
  borderWidth?: number;
  color?: string;
  borderColor?: string;
}

// =============================================================================
// Data Processing Configuration
// =============================================================================

export interface ChartFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'between' | 'not_between' | 'is_null' | 'is_not_null';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface SortConfiguration {
  field: string;
  direction: 'asc' | 'desc';
  priority?: number;
}

export interface AggregationConfiguration {
  groupBy?: string[];
  measures?: AggregationMeasure[];
}

export interface AggregationMeasure {
  field: string;
  function: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'mode' | 'stddev' | 'variance';
  alias?: string;
}

export interface DataTransform {
  type: 'filter' | 'sort' | 'aggregate' | 'pivot' | 'unpivot' | 'join' | 'union' | 'formula';
  config: any;
}

// =============================================================================
// Styling Interfaces
// =============================================================================

export interface ChartStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number | number[];
  margin?: number | number[];
  boxShadow?: string;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
}

export interface TextStyle {
  color?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  width?: number;
  height?: number;
  textBorderColor?: string;
  textBorderWidth?: number;
  textBorderType?: 'solid' | 'dashed' | 'dotted';
  textShadowColor?: string;
  textShadowBlur?: number;
  textShadowOffsetX?: number;
  textShadowOffsetY?: number;
  overflow?: 'none' | 'truncate' | 'break' | 'breakAll';
  ellipsis?: string;
  placeholder?: string;
}

export interface LineStyle {
  color?: string;
  width?: number;
  type?: 'solid' | 'dashed' | 'dotted';
  dashOffset?: number;
  cap?: 'butt' | 'round' | 'square';
  join?: 'bevel' | 'round' | 'miter';
  miterLimit?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
}

export interface ShadowStyle {
  color?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
}

// =============================================================================
// Chart Data Interfaces
// =============================================================================

export interface ChartData {
  chartId: string;
  data: any[];
  columns: ColumnInfo[];
  metadata: ChartDataMetadata;
}

export interface ChartDataMetadata {
  totalRows: number;
  executionTime: number;
  chartType: string;
  chartLibrary: string;
  datasetsUsed: number;
  filtersApplied: number;
  cached: boolean;
  lastUpdated: string;
  error?: string;
  errorDetails?: string;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  displayName?: string;
  format?: string;
  nullable?: boolean;
  unique?: boolean;
  sampleValues?: any[];
}

// =============================================================================
// Chart Events and Interactions
// =============================================================================

export interface ChartInteraction {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan' | 'filter' | 'brush';
  chartId: string;
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
  timestamp?: number;
  position?: { x: number; y: number };
  target?: string;
}

export interface ChartInteractionEvent extends ChartInteraction {
  timestamp: number;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface ChartError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  recoverable?: boolean;
}

// =============================================================================
// Chart Theme Interface
// =============================================================================

export interface ChartTheme {
  name: string;
  darkMode?: boolean;
  backgroundColor?: string;   // ← Add this if you use it
  textColor?: string;        // ← Add this if you use it
  gridColor?: string;        // ← Add this if you use it
  axisColor?: string;        // ← Add this if you use it
  colorPalette?: string[];   // ← Add this if you use it
  colors: {
    primary: string[];
    background: string;
    text: string;
    grid: string;
    axis: string;
    border: string;
    emphasis: string;
  };
  fonts: {
    family: string;
    sizes: {
      title: number;
      subtitle: number;
      axis: number;
      legend: number;
      tooltip: number;
      label: number;
    };
    weights: {
      normal: string | number;
      bold: string | number;
    };
  };
  spacing: {
    padding: number;
    margin: number;
    gap: number;
  };
  borders: {
    width: number;
    radius: number;
    style: string;
  };
  shadows: {
    enabled: boolean;
    blur: number;
    color: string;
    offset: { x: number; y: number };
  };
}

// =============================================================================
// Plugin System Interfaces - FIXED SCHEMA SUPPORT
// =============================================================================

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string;
  library: string;
  version: string;
  description?: string;
  tags?: string[];
  
  // FIXED: Now supports nested objects properly
  configSchema: ChartConfigSchema;
  dataRequirements: DataRequirements;
  exportFormats: ExportFormat[];
  
  // React Components
  component: React.ComponentType<ChartProps>;
  configComponent?: React.ComponentType<ChartConfigProps>;
  previewComponent?: React.ComponentType<ChartPreviewProps>;
  
  // Feature support
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

// ENHANCED SCHEMA INTERFACES - FIXES THE ERROR
export interface ChartConfigSchema {
  type: string;
  title?: string;
  description?: string;
  properties: {
    [key: string]: SchemaProperty;
  };
  required?: string[];
  additionalProperties?: boolean;
}

// RECURSIVE SCHEMA PROPERTY - SUPPORTS NESTED OBJECTS
export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  
  // Primitive type properties
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: readonly any[];
  
  // Select/multiselect properties
  options?: ReadonlyArray<{ label: string; value: any } | string>;
  
  // Array properties
  items?: SchemaProperty;
  minItems?: number;
  maxItems?: number;
  
  // OBJECT PROPERTIES - THIS FIXES THE ERROR
  properties?: {
    [key: string]: SchemaProperty;
  };
  additionalProperties?: boolean;
  
  // UI and behavior
  group?: string;
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'in' | 'not_in';
  };
  
  // Validation
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => boolean | string;
  };
  
  // UI hints
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  hidden?: boolean;
  readonly?: boolean;
}

// Data Requirements Interface
export interface DataRequirements {
  minColumns?: number;
  maxColumns?: number;
  requiredFields?: string[];
  optionalFields?: string[];
  supportedTypes?: string[];
  aggregationSupport?: boolean;
  pivotSupport?: boolean;
  timeSeriesSupport?: boolean;
  categoricalSupport?: boolean;
  numericalSupport?: boolean;
  specialRequirements?: string[];
}

// Export Format Type
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'jpg' | 'html' | 'json' | 'csv' | 'excel';

// ============================================================================
// Chart Title Configuration
// ============================================================================

export interface ChartTitle {
  text?: string;
  subtitle?: string;
  position?: 'left' | 'center' | 'right';
  textStyle?: ChartTextStyle;
  subtitleStyle?: ChartTextStyle;
  padding?: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}


export interface ChartTextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
}

// =============================================================================
// Component Props Interfaces
// =============================================================================

export interface ChartProps {
  chart: Chart;
  data: any[];
  columns: ColumnInfo[];
  config: ChartConfiguration;
  dimensions: ChartDimensions;
  theme?: ChartTheme;
  filters?: ChartFilter[];
  loading?: boolean;
  error?: ChartError;
  
  // Event handlers
  onInteraction?: (event: ChartInteractionEvent) => void;
  onError?: (error: ChartError) => void;
  onDataRequest?: (request: DataRequest) => void;
  onConfigChange?: (config: ChartConfiguration) => void;
  onResize?: (dimensions: ChartDimensions) => void;
}

export interface ChartConfigProps {
  config: ChartConfiguration;
  schema: ChartConfigSchema;
  data?: any[];
  columns?: ColumnInfo[];
  onChange: (config: ChartConfiguration) => void;
  onValidate?: (errors: ValidationError[]) => void;
}

export interface ChartPreviewProps {
  config: ChartConfiguration;
  sampleData: any[];
  dimensions?: ChartDimensions;
  theme?: ChartTheme;
}

export interface DataRequest {
  chartId: string;
  filters?: ChartFilter[];
  refresh?: boolean;
  limit?: number;
  offset?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// =============================================================================
// Additional Configuration Interfaces
// =============================================================================

export interface DrilldownConfig {
  enabled: boolean;
  levels: DrilldownLevel[];
  autoOpen?: boolean;
  breadcrumb?: boolean;
  maintainFilters?: boolean;
}

export interface DrilldownLevel {
  field: string;
  displayName: string;
  chartType?: string;
  aggregation?: string;
  filters?: ChartFilter[];
}

export interface CalculatedField {
  id: string;
  name: string;
  displayName?: string;
  expression: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  description?: string;
  dependencies: string[];
  isActive: boolean;
}

export interface ConditionalFormat {
  id: string;
  field: string;
  condition: string;
  operator: string;
  value: any;
  style: {
    color?: string;
    backgroundColor?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: string;
  };
  priority?: number;
  isActive: boolean;
}

export interface ExportConfig {
  formats: readonly ExportFormat[];
  defaultFormat: ExportFormat;
  includeData: boolean;
  includeStyling: boolean;
  includeInteractions: boolean;
  filename?: string;
  quality?: number;
  resolution?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  refreshOnFilter: boolean;
  refreshOnResize: boolean;
  invalidationKeys?: readonly string[];
  cacheKey?: string;
}

// =============================================================================
// Utility Types and Enums
// =============================================================================

export type ChartType = 
  | 'line' | 'area' | 'bar' | 'column' | 'pie' | 'doughnut' | 'scatter' | 'bubble'
  | 'candlestick' | 'radar' | 'polar' | 'gauge' | 'funnel' | 'treemap' | 'sunburst'
  | 'sankey' | 'heatmap' | 'calendar' | 'graph' | 'tree' | 'parallel' | 'waterfall'
  | 'box-plot' | 'violin' | 'histogram' | 'density' | 'ridge' | 'table' | 'metric'
  | 'progress' | 'bullet' | 'sparkline' | 'timeline' | 'gantt' | 'network'
  | 'choropleth' | 'symbol-map' | 'flow-map' | 'custom';

export type ChartLibrary = 
  | 'echarts' | 'd3' | 'plotly' | 'chartjs' | 'recharts' | 'nivo' | 'victory'
  | 'visx' | 'observablehq' | 'custom';

export type ChartCategory = 
  | 'basic' | 'statistical' | 'financial' | 'geographic' | 'scientific'
  | 'business' | 'social' | 'custom' | 'specialized';

// =============================================================================
// Error and Status Types
// =============================================================================

export interface ChartLoadingState {
  chartId: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  progress?: number;
  error?: ChartError;
  lastUpdated?: string;
}

export interface ChartValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// =============================================================================
// Default Exports and Utility Functions
// =============================================================================

export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 400,
  height: 300
};

export const DEFAULT_CHART_POSITION: ChartPosition = {
  x: 0,
  y: 0,
  width: 6,
  height: 4,
  minWidth: 2,
  minHeight: 2
};

export const DEFAULT_CHART_CONFIG: Partial<ChartConfiguration> = {
  animation: true,
  interactions: {
    enabled: true,
    tooltip: true
  },
  legend: {
    show: true,
    position: 'bottom'
  }
};

// Utility type guards
export const isChartError = (error: any): error is ChartError => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

export const isValidChartType = (type: string): type is ChartType => {
  const validTypes: ChartType[] = [
    'line', 'area', 'bar', 'column', 'pie', 'doughnut', 'scatter', 'bubble',
    'candlestick', 'radar', 'polar', 'gauge', 'funnel', 'treemap', 'sunburst',
    'sankey', 'heatmap', 'calendar', 'graph', 'tree', 'parallel', 'waterfall',
    'box-plot', 'violin', 'histogram', 'density', 'ridge', 'table', 'metric',
    'progress', 'bullet', 'sparkline', 'timeline', 'gantt', 'network',
    'choropleth', 'symbol-map', 'flow-map', 'custom'
  ];
  return validTypes.includes(type as ChartType);
};