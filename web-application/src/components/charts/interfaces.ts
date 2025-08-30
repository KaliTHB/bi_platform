// File: web-application/src/components/charts/interfaces.ts
import { ReactNode } from 'react';

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string;
  library: string;
  version: string;
  configSchema: ChartConfigurationSchema;
  dataRequirements: DataRequirements;
  exportFormats: string[];
  component: React.ComponentType<ChartProps>;
}

export interface ChartProps {
  data: ChartData;
  config: ChartConfiguration;
  width?: number;
  height?: number;
  onInteraction?: (interaction: ChartInteraction) => void;
  onError?: (error: Error) => void;
  theme?: ChartTheme;
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

export interface ChartTheme {
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  colors?: string[];
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

export interface SchemaProperty {
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaProperty>;
}