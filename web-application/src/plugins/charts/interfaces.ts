// File: /web-application/src/plugins/charts/interfaces.ts

import React from 'react';

import {ChartConfigSchema} from '@/types/chart.types'
// Base chart props interface - matches what's expected by chart components
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

// Chart plugin configuration interface
export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: 'basic' | 'advanced' | 'statistical' | 'geographic' | 'financial' | 'custom';
  library: 'echarts' | 'd3js' | 'plotly' | 'chartjs' | 'nvd3js' | 'drilldown';
  version: string;
  description?: string;
  tags?: readonly string[];
  
  configSchema: ChartConfigSchema;
  dataRequirements: DataRequirements;
  exportFormats: readonly ExportFormat[];
  component: React.ComponentType<ChartProps>;
  interactionSupport?: {           // ✅ Added
    zoom?: boolean;
    pan?: boolean;
    selection?: boolean;
    brush?: boolean;
    drilldown?: boolean;
    tooltip?: boolean;
    crossFilter?: boolean;
  };
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color';
  title: string;
  description?: string;
  default?: any;
  options?: readonly { label: string; value: any }[];
  minimum?: number;
  maximum?: number;
}

export interface DataRequirements {
  minColumns: number;
  maxColumns?: number;
  requiredFields: readonly string[];
  optionalFields?: readonly string[];
  supportedTypes: readonly ('string' | 'number' | 'date' | 'boolean')[];
  aggregationSupport?: boolean;
  pivotSupport?: boolean;
}

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'jpg' | 'html';

// Update ChartPluginConfig to accept readonly arrays
export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: 'basic' | 'advanced' | 'statistical' | 'geographic' | 'financial' | 'custom';
  library: 'echarts' | 'd3js' | 'plotly' | 'chartjs' | 'nvd3js' | 'drilldown';
  version: string;
  description?: string;
  tags?: readonly string[];
  
  configSchema: ChartConfigSchema;
  dataRequirements: DataRequirements;
  exportFormats: readonly ExportFormat[];
  component: React.ComponentType<ChartProps>;
}