// Chart Data Utilities
// File: web-application/src/plugins/charts/utils/chartDataUtils.ts

import { ChartData, ChartConfigSchema , SchemaProperty } from '@/types/chart.types';

/**
 * Type guard to check if data is ChartData format
 */
export const isChartData = (data: any[] | ChartData | undefined): data is ChartData => {
  return !!(data && typeof data === 'object' && 'data' in data && Array.isArray(data.data));
};

/**
 * Extract data array from either format (any[] or ChartData)
 */
export const getDataArray = (data: any[] | ChartData | undefined): any[] => {
  if (!data) return [];
  if (isChartData(data)) {
    return data.data; // ✅ Fixed: was data.rows
  }
  return Array.isArray(data) ? data : [];
};

/**
 * Check if data has content (works for both data formats)
 */
export const hasDataContent = (data: any[] | ChartData | undefined): boolean => {
  const dataArray = getDataArray(data);
  return dataArray.length > 0;
};

/**
 * Get data length safely
 */
export const getDataLength = (data: any[] | ChartData | undefined): number => {
  const dataArray = getDataArray(data);
  return dataArray.length;
};

/**
 * Get columns information from data
 */
export const getDataColumns = (data: any[] | ChartData | undefined): string[] => {
  if (!data) return [];
  
  if (isChartData(data)) {
    return data.columns.map(col => col.name);
  }
  
  const dataArray = getDataArray(data);
  if (dataArray.length === 0) return [];
  
  return Object.keys(dataArray[0]);
};

/**
 * Validate data format and throw helpful errors
 */
export const validateChartData = (data: any[] | ChartData | undefined, componentName: string): void => {
  if (!data) {
    throw new Error(`${componentName}: No data provided`);
  }
  
  const dataArray = getDataArray(data);
  if (dataArray.length === 0) {
    throw new Error(`${componentName}: Data array is empty`);
  }
};

/**
 * Normalizes chart data to array format regardless of input type
 */
export const normalizeChartData = (data: any[] | ChartData): any[] => {
  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }
  
  // If it's ChartData format, return the data array
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as ChartData).data; // ✅ Fixed: was data.rows
  }
  
  // Fallback to empty array
  return [];
};

/**
 * Checks if chart data is empty regardless of input type
 */
export const isChartDataEmpty = (data: any[] | ChartData | null | undefined): boolean => {
  if (!data) return true;
  
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  
  if (typeof data === 'object' && 'data' in data) {
    return !data.data || data.data.length === 0; // ✅ Fixed: was data.rows
  }
  
  return true;
};

/**
 * Gets the length of chart data regardless of input type
 */
export const getChartDataLength = (data: any[] | ChartData | null | undefined): number => {
  if (!data) return 0;
  
  if (Array.isArray(data)) {
    return data.length;
  }
  
  if (typeof data === 'object' && 'data' in data) {
    return data.data ? data.data.length : 0; // ✅ Fixed: was data.rows
  }
  
  return 0;
};

/**
 * Gets column definitions from data (useful for ChartData format)
 */
export const getChartColumns = (data: any[] | ChartData): string[] => {
  if (Array.isArray(data)) {
    // For array data, get keys from first object
    if (data.length > 0 && typeof data[0] === 'object') {
      return Object.keys(data[0]);
    }
    return [];
  }
  
  if (data && typeof data === 'object' && 'columns' in data) {
    const chartData = data as ChartData;
    return chartData.columns ? chartData.columns.map(col => col.name) : [];
  }
  
  return [];
};

/**
 * Safely extracts field values from normalized data
 */
export const extractFieldValues = (
  data: any[], 
  fieldName: string, 
  defaultValue: any = null
): any[] => {
  return data.map(item => {
    if (item && typeof item === 'object' && fieldName in item) {
      return item[fieldName];
    }
    return defaultValue;
  });
};

/**
 * Safely extracts numeric field values with conversion
 */
export const extractNumericValues = (
  data: any[], 
  fieldName: string, 
  defaultValue: number = 0
): number[] => {
  return data.map(item => {
    if (item && typeof item === 'object' && fieldName in item) {
      const value = Number(item[fieldName]);
      return isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  });
};

/**
 * Creates a safe chart configuration with defaults
 */
export const createChartConfig = (
  config: any = {}, 
  defaults: Record<string, any> = {}
): Record<string, any> => {
  return {
    ...defaults,
    ...config
  };
};

/**
 * Type guard to check if data is in ChartData format
 */
export const isChartDataFormat = (data: any): data is ChartData => {
  return data && 
         typeof data === 'object' && 
         'data' in data && // ✅ Fixed: was 'rows'
         Array.isArray(data.data); // ✅ Fixed: was data.rows
};

/**
 * Formats large numbers for display
 */
export const formatNumber = (value: number, precision: number = 1): string => {
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

/**
 * Generates color palette for multiple series
 */
export const generateColorPalette = (count: number): string[] => {
  const defaultColors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#d4a76a'
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(defaultColors[i % defaultColors.length]);
  }
  return colors;
};

// Utility function to ensure readonly arrays
export function ensureReadonly<T>(arr: T[] | readonly T[] | undefined): readonly T[] {
  return (arr as readonly T[]) || ([] as const);
}

// Add a mutable version
export function ensureMutable<T>(arr: T[] | readonly T[] | undefined): T[] {
  return (arr ? [...arr] : []) as T[];
}

/**
 * Validate and ensure schema is properly formatted
 */
export function ensureValidSchema(schema: ChartConfigSchema): ChartConfigSchema {
  const validatedProperties: Record<string, SchemaProperty> = {}; // Keep original type
  
  for (const [key, prop] of Object.entries(schema.properties)) {
    validatedProperties[key] = {
      ...prop,
      title: prop.title || key,
    };
  }
  
  return {
    ...schema,
    properties: validatedProperties as any // ✅ Use type assertion here instead
  };
}