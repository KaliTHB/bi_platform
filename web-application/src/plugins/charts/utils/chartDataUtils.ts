// web-application/src/plugins/charts/utils/chartDataUtils.ts
// Complete Chart Data Utilities

import { ChartData, ChartConfigSchema, SchemaProperty } from '@/types/chart.types';

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
    return data.data;
  }
  return Array.isArray(data) ? data : [];
};

/**
 * Check if data has meaningful content
 */
export const hasDataContent = (data: any[] | ChartData | undefined): boolean => {
  const dataArray = getDataArray(data);
  return dataArray.length > 0;
};

/**
 * Get column names from data
 */
export const getColumnNames = (data: any[] | ChartData): string[] => {
  const dataArray = getDataArray(data);
  if (dataArray.length === 0) return [];
  
  // If it's ChartData format, try to get columns from schema
  if (isChartData(data) && data.columns) {
    return data.columns.map(col => col.name || col.field || '');
  }
  
  // Otherwise extract from first row
  const firstRow = dataArray[0];
  if (typeof firstRow === 'object' && firstRow !== null) {
    return Object.keys(firstRow);
  }
  
  return [];
};

/**
 * Detect data types for columns
 */
export const detectColumnTypes = (data: any[] | ChartData): Record<string, string> => {
  const dataArray = getDataArray(data);
  if (dataArray.length === 0) return {};
  
  const columnNames = getColumnNames(data);
  const types: Record<string, string> = {};
  
  columnNames.forEach(columnName => {
    const sampleValues = dataArray.slice(0, 10).map(row => row[columnName]).filter(val => val != null);
    
    if (sampleValues.length === 0) {
      types[columnName] = 'unknown';
      return;
    }
    
    // Check if all values are numbers
    if (sampleValues.every(val => typeof val === 'number' || !isNaN(Number(val)))) {
      types[columnName] = 'number';
    }
    // Check if all values are dates
    else if (sampleValues.every(val => !isNaN(Date.parse(val)))) {
      types[columnName] = 'date';
    }
    // Check if all values are booleans
    else if (sampleValues.every(val => typeof val === 'boolean' || val === 'true' || val === 'false')) {
      types[columnName] = 'boolean';
    }
    // Default to string
    else {
      types[columnName] = 'string';
    }
  });
  
  return types;
};

/**
 * Validate data for chart requirements
 */
export const validateChartData = (data: any[] | ChartData, chartType: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const dataArray = getDataArray(data);
  
  if (dataArray.length === 0) {
    errors.push('Data array is empty');
    return { valid: false, errors };
  }
  
  const columnNames = getColumnNames(data);
  const columnTypes = detectColumnTypes(data);
  
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      if (columnNames.length < 2) {
        errors.push('Pie charts require at least 2 columns (label and value)');
      }
      break;
      
    case 'line':
    case 'area':
    case 'bar':
    case 'column':
      if (columnNames.length < 2) {
        errors.push('Charts require at least 2 columns (X and Y axis)');
      }
      break;
      
    case 'scatter':
    case 'bubble':
      if (columnNames.length < 2) {
        errors.push('Scatter plots require at least 2 numeric columns');
      }
      const numericColumns = Object.entries(columnTypes).filter(([_, type]) => type === 'number');
      if (numericColumns.length < 2) {
        errors.push('Scatter plots require at least 2 numeric columns');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Transform data for specific chart library format
 */
export const transformDataForLibrary = (
  data: any[] | ChartData,
  library: string,
  chartType: string,
  config?: any
): any => {
  const dataArray = getDataArray(data);
  
  switch (library.toLowerCase()) {
    case 'echarts':
      return transformForECharts(dataArray, chartType, config);
    case 'd3':
      return transformForD3(dataArray, chartType, config);
    case 'chartjs':
      return transformForChartJS(dataArray, chartType, config);
    default:
      return dataArray;
  }
};

/**
 * Transform data for ECharts format
 */
const transformForECharts = (data: any[], chartType: string, config?: any): any => {
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return data.map(item => ({
        name: item[Object.keys(item)[0]],
        value: item[Object.keys(item)[1]]
      }));
      
    case 'line':
    case 'area':
    case 'bar':
      const xField = config?.xAxis?.field || Object.keys(data[0] || {})[0];
      const yField = config?.yAxis?.field || Object.keys(data[0] || {})[1];
      
      return {
        xAxis: {
          type: 'category',
          data: data.map(item => item[xField])
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          data: data.map(item => item[yField]),
          type: chartType === 'area' ? 'line' : chartType,
          areaStyle: chartType === 'area' ? {} : undefined
        }]
      };
      
    default:
      return data;
  }
};

/**
 * Transform data for D3 format
 */
const transformForD3 = (data: any[], chartType: string, config?: any): any => {
  // D3 typically works with the raw data array
  return data;
};

/**
 * Transform data for Chart.js format
 */
const transformForChartJS = (data: any[], chartType: string, config?: any): any => {
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return {
        labels: data.map(item => item[Object.keys(item)[0]]),
        datasets: [{
          data: data.map(item => item[Object.keys(item)[1]]),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#FF9F40', '#FF6384'
          ]
        }]
      };
      
    case 'line':
    case 'area':
    case 'bar':
      const xField = config?.xAxis?.field || Object.keys(data[0] || {})[0];
      const yField = config?.yAxis?.field || Object.keys(data[0] || {})[1];
      
      return {
        labels: data.map(item => item[xField]),
        datasets: [{
          label: yField,
          data: data.map(item => item[yField]),
          borderColor: '#36A2EB',
          backgroundColor: chartType === 'area' ? 'rgba(54, 162, 235, 0.2)' : '#36A2EB',
          fill: chartType === 'area'
        }]
      };
      
    default:
      return { labels: [], datasets: [] };
  }
};

/**
 * Sample data for chart preview
 */
export const generateSampleData = (chartType: string, size: number = 5): any[] => {
  const sampleData: Record<string, () => any[]> = {
    pie: () => [
      { category: 'A', value: 30 },
      { category: 'B', value: 25 },
      { category: 'C', value: 20 },
      { category: 'D', value: 15 },
      { category: 'E', value: 10 }
    ],
    
    bar: () => Array.from({ length: size }, (_, i) => ({
      category: `Category ${i + 1}`,
      value: Math.floor(Math.random() * 100) + 10
    })),
    
    line: () => Array.from({ length: size }, (_, i) => ({
      date: `2024-0${i + 1}-01`,
      value: Math.floor(Math.random() * 100) + 10
    })),
    
    scatter: () => Array.from({ length: size }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100
    }))
  };
  
  return sampleData[chartType]?.() || sampleData.bar();
};

/**
 * Data aggregation utilities
 */
export const aggregateData = (
  data: any[],
  groupBy: string,
  aggregateField: string,
  aggregationType: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'
): any[] => {
  const groups = new Map<string, number[]>();
  
  data.forEach(item => {
    const groupKey = item[groupBy];
    const value = Number(item[aggregateField]) || 0;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(value);
  });
  
  const result: any[] = [];
  
  groups.forEach((values, groupKey) => {
    let aggregatedValue: number;
    
    switch (aggregationType) {
      case 'sum':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      default:
        aggregatedValue = values.reduce((sum, val) => sum + val, 0);
    }
    
    result.push({
      [groupBy]: groupKey,
      [aggregateField]: aggregatedValue
    });
  });
  
  return result;
};

export default {
  isChartData,
  getDataArray,
  hasDataContent,
  getColumnNames,
  detectColumnTypes,
  validateChartData,
  transformDataForLibrary,
  generateSampleData,
  aggregateData
};