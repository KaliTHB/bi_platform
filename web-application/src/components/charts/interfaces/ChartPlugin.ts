// File: web-application/src/components/charts/interfaces/ChartPlugin.ts

import React from 'react';

export interface ChartDataPoint {
  [key: string]: any;
}

export interface ChartConfig {
  title?: string;
  subtitle?: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  colors?: string[];
  theme?: 'light' | 'dark';
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  animation?: AnimationConfig;
  responsive?: boolean;
  [key: string]: any;
}

export interface AxisConfig {
  label?: string;
  type?: 'category' | 'value' | 'time';
  min?: number | string;
  max?: number | string;
  format?: string;
  rotation?: number;
}

export interface LegendConfig {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  orientation?: 'horizontal' | 'vertical';
}

export interface TooltipConfig {
  show?: boolean;
  format?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface AnimationConfig {
  enabled?: boolean;
  duration?: number;
  easing?: string;
}

export interface DataRequirements {
  minColumns: number;
  maxColumns?: number;
  requiredColumnTypes?: string[];
  supportedAggregations?: string[];
  supportsDrilldown?: boolean;
  supportsFiltering?: boolean;
}

export interface ExportOptions {
  png?: boolean;
  svg?: boolean;
  pdf?: boolean;
  csv?: boolean;
}

export interface ChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  width?: number | string;
  height?: number | string;
  onDataPointClick?: (dataPoint: ChartDataPoint, event: MouseEvent) => void;
  onChartReady?: (chartInstance: any) => void;
  loading?: boolean;
  error?: string;
}

export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string;
  library: 'echarts' | 'd3js' | 'plotly' | 'chartjs' | 'nvd3js' | 'drilldown';
  version: string;
  description?: string;
  icon?: string;
  configSchema: any; // JSON schema for configuration
  dataRequirements: DataRequirements;
  exportFormats: (keyof ExportOptions)[];
  component: React.ComponentType<ChartProps>;
  preview?: string; // Base64 preview image
  tags?: string[];
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}