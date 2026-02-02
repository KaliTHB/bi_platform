
// web-application/src/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import {ChartData,ChartMetadata} from '@/types/chart.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Create chart metadata function
export const createChartMetadata = (
  chart: any,
  chartData?: ChartData,
  executionTime?: number
): ChartMetadata => {
  return {
    chartId: chart.id || chart.chart_id || '',
    chartName: chart.name || chart.display_name || 'Untitled Chart',
    chartType: chart.chart_type || 'unknown',
    datasetId: chart.dataset_id || '',
    rowCount: chartData?.data?.length || 0,
    columnCount: chartData?.columns?.length || 0,
    executionTime: executionTime || 0,
    lastUpdated: new Date().toISOString(),
    pluginKey: generatePluginKey(chart),
    version: chart.version || 1
  };
};

// Helper function to generate plugin key
const generatePluginKey = (chart: any): string => {
  if (!chart?.chart_type) return 'unknown';
  
  const library = chart.chart_library || 'echarts';
  const type = chart.chart_type;
  
  return `${library}/${type}`;
};

// Data empty check function
export const isChartDataEmpty = (data: any[] | ChartData | null | undefined): boolean => {
  if (!data) return true;
  
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  
  if (typeof data === 'object' && 'data' in data) {
    return !data.data || data.data.length === 0;
  }
  
  return true;
};

// Generate plugin key from chart
export const generatePluginKeyFromChart = (chart: any) => {
  if (!chart) {
    return {
      primaryKey: 'echarts/bar',
      library: 'echarts',
      type: 'bar',
      valid: false
    };
  }

  const library = chart.chart_library || 'echarts';
  const type = chart.chart_type || 'bar';
  const primaryKey = `${library}/${type}`;

  return {
    primaryKey,
    library,
    type,
    valid: !!chart.chart_type
  };
};

// Format query execution time
export const formatQueryTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

// Format large numbers
export const formatLargeNumber = (value: number, precision: number = 1): string => {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(precision) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(precision) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(precision) + 'K';
  }
  return value.toString();
};

// Merge chart configurations
export const mergeChartConfigurations = (
  baseConfig: any = {},
  userConfig: any = {},
  overrides: any = {}
): any => {
  return {
    ...baseConfig,
    ...userConfig,
    ...overrides
  };
};

// Create default dimensions (already exists, but ensuring it's exported)
export const createDefaultDimensions = (
  width: number = 400,
  height: number = 300
): ChartDimensions => ({
  width,
  height,
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  padding: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
});

// Add missing ChartDimensions type if not defined
interface ChartDimensions {
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}