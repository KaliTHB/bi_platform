// Chart Data Utilities
// File: web-application/src/plugins/charts/utils/chartDataUtils.ts

import { ChartData } from '@/types/chart.types';

/**
 * Type guard to check if data is ChartData format
 */
export const isChartData = (data: any[] | ChartData | undefined): data is ChartData => {
  return data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows);
};

/**
 * Extract data array from either format (any[] or ChartData)
 */
export const getDataArray = (data: any[] | ChartData | undefined): any[] => {
  if (!data) return [];
  if (isChartData(data)) {
    return data.rows;
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