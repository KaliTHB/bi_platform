// web-application/src/plugins/charts/utils/chartDataUtils.ts
// Chart data utility functions for processing and normalizing chart data

import { ChartConfiguration } from '@/types/chart.types';

// ============================================================================
// DATA NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize any data format to array format
 */
export const normalizeChartData = (data: any): any[] => {
  if (!data) return [];
  
  // Already an array
  if (Array.isArray(data)) {
    return data;
  }
  
  // Object with data property
  if (typeof data === 'object' && data.data && Array.isArray(data.data)) {
    return data.data;
  }
  
  // Object with rows property
  if (typeof data === 'object' && data.rows && Array.isArray(data.rows)) {
    return data.rows;
  }
  
  // Single object, wrap in array
  if (typeof data === 'object') {
    return [data];
  }
  
  // Fallback to empty array
  return [];
};

/**
 * Check if chart data is empty or invalid
 */
export const isChartDataEmpty = (data: any): boolean => {
  const normalizedData = normalizeChartData(data);
  return !normalizedData || normalizedData.length === 0;
};

/**
 * Get the length of chart data safely
 */
export const getChartDataLength = (data: any): number => {
  const normalizedData = normalizeChartData(data);
  return normalizedData.length;
};

/**
 * Check if data has meaningful content
 */
export const hasDataContent = (data: any): boolean => {
  const normalizedData = normalizeChartData(data);
  if (normalizedData.length === 0) return false;
  
  // Check if at least one item has properties
  return normalizedData.some(item => 
    item && typeof item === 'object' && Object.keys(item).length > 0
  );
};

/**
 * Get data as array (alias for normalizeChartData for compatibility)
 */
export const getDataArray = (data: any): any[] => {
  return normalizeChartData(data);
};

// ============================================================================
// FIELD EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract field values from data with fallback
 */
export const extractFieldValues = (
  data: any[], 
  fieldName: string, 
  fallbackValue: any = null
): any[] => {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return fallbackValue;
    }
    
    // Try exact field name first
    if (item.hasOwnProperty(fieldName)) {
      return item[fieldName];
    }
    
    // Try case-insensitive match
    const lowerFieldName = fieldName.toLowerCase();
    const matchingKey = Object.keys(item).find(key => 
      key.toLowerCase() === lowerFieldName
    );
    
    if (matchingKey) {
      return item[matchingKey];
    }
    
    return fallbackValue;
  });
};

/**
 * Extract numeric values from data with fallback
 */
export const extractNumericValues = (
  data: any[], 
  fieldName: string, 
  fallbackValue: number = 0
): number[] => {
  const values = extractFieldValues(data, fieldName, fallbackValue);
  
  return values.map(value => {
    // Already a number
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    
    // Try to convert string to number
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return !isNaN(parsed) ? parsed : fallbackValue;
    }
    
    // Boolean to number
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    return fallbackValue;
  });
};

/**
 * Extract date values from data with fallback
 */
export const extractDateValues = (
  data: any[], 
  fieldName: string, 
  fallbackValue: Date = new Date()
): Date[] => {
  const values = extractFieldValues(data, fieldName, fallbackValue);
  
  return values.map(value => {
    // Already a Date
    if (value instanceof Date) {
      return value;
    }
    
    // Try to parse string/number as date
    if (value) {
      const parsed = new Date(value);
      return !isNaN(parsed.getTime()) ? parsed : fallbackValue;
    }
    
    return fallbackValue;
  });
};

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

/**
 * Group data by field value
 */
export const groupDataByField = (data: any[], fieldName: string): Record<string, any[]> => {
  const normalizedData = normalizeChartData(data);
  const grouped: Record<string, any[]> = {};
  
  normalizedData.forEach(item => {
    if (!item || typeof item !== 'object') return;
    
    const groupKey = String(item[fieldName] || 'Unknown');
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
  });
  
  return grouped;
};

/**
 * Sort data by field value
 */
export const sortDataByField = (
  data: any[], 
  fieldName: string, 
  direction: 'asc' | 'desc' = 'asc'
): any[] => {
  const normalizedData = normalizeChartData(data);
  
  return [...normalizedData].sort((a, b) => {
    const valueA = a?.[fieldName];
    const valueB = b?.[fieldName];
    
    // Handle null/undefined values
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return direction === 'asc' ? 1 : -1;
    if (valueB == null) return direction === 'asc' ? -1 : 1;
    
    // Numeric comparison
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    // String comparison
    const stringA = String(valueA).toLowerCase();
    const stringB = String(valueB).toLowerCase();
    
    if (stringA < stringB) return direction === 'asc' ? -1 : 1;
    if (stringA > stringB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Create chart configuration with defaults
 */
export const createChartConfig = (
  userConfig: any, 
  defaultConfig: any
): any => {
  return {
    ...defaultConfig,
    ...userConfig
  };
};

/**
 * Generate color palette for charts
 */
export const generateColorPalette = (count: number = 8): string[] => {
  const defaultColors = [
    '#1976d2', '#dc004e', '#388e3c', '#f57c00',
    '#7b1fa2', '#00796b', '#f44336', '#ff9800',
    '#3f51b5', '#e91e63', '#4caf50', '#ff5722',
    '#9c27b0', '#009688', '#2196f3', '#ffc107'
  ];
  
  if (count <= defaultColors.length) {
    return defaultColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...defaultColors];
  while (colors.length < count) {
    const hue = (colors.length * 137.508) % 360; // Golden angle
    colors.push(`hsl(${hue}, 60%, 50%)`);
  }
  
  return colors.slice(0, count);
};

/**
 * Validate chart data structure
 */
export const validateChartData = (data: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors, warnings };
  }
  
  const normalizedData = normalizeChartData(data);
  
  if (normalizedData.length === 0) {
    errors.push('Data array is empty');
    return { valid: false, errors, warnings };
  }
  
  // Check data structure consistency
  const firstItem = normalizedData[0];
  if (!firstItem || typeof firstItem !== 'object') {
    errors.push('Data items must be objects');
    return { valid: false, errors, warnings };
  }
  
  const expectedKeys = Object.keys(firstItem);
  let inconsistentStructure = false;
  
  normalizedData.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      warnings.push(`Item at index ${index} is not an object`);
      return;
    }
    
    const itemKeys = Object.keys(item);
    if (itemKeys.length !== expectedKeys.length || 
        !itemKeys.every(key => expectedKeys.includes(key))) {
      inconsistentStructure = true;
    }
  });
  
  if (inconsistentStructure) {
    warnings.push('Data structure is inconsistent across items');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// UTILITY FUNCTIONS FOR ARRAY MUTABILITY
// ============================================================================

/**
 * Ensure array is mutable (not readonly)
 */
export const ensureMutable = <T>(arr: readonly T[] | T[] | undefined): T[] => {
  if (!arr) return [];
  return Array.isArray(arr) ? [...arr] : [];
};

/**
 * Ensure array is readonly
 */
export const ensureReadonly = <T>(arr: T[] | readonly T[] | undefined): readonly T[] => {
  if (!arr) return [];
  return arr;
};

/**
 * Ensure valid schema object
 */
export const ensureValidSchema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') {
    return {};
  }
  return { ...schema };
};

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Calculate sum of numeric field
 */
export const sumByField = (data: any[], fieldName: string): number => {
  const values = extractNumericValues(data, fieldName, 0);
  return values.reduce((sum, value) => sum + value, 0);
};

/**
 * Calculate average of numeric field
 */
export const averageByField = (data: any[], fieldName: string): number => {
  const values = extractNumericValues(data, fieldName, 0);
  if (values.length === 0) return 0;
  return sumByField(data, fieldName) / values.length;
};

/**
 * Find minimum value in numeric field
 */
export const minByField = (data: any[], fieldName: string): number => {
  const values = extractNumericValues(data, fieldName, 0);
  return values.length > 0 ? Math.min(...values) : 0;
};

/**
 * Find maximum value in numeric field
 */
export const maxByField = (data: any[], fieldName: string): number => {
  const values = extractNumericValues(data, fieldName, 0);
  return values.length > 0 ? Math.max(...values) : 0;
};

/**
 * Count unique values in field
 */
export const countUniqueByField = (data: any[], fieldName: string): number => {
  const values = extractFieldValues(data, fieldName, '');
  const uniqueValues = new Set(values);
  return uniqueValues.size;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Data normalization
  normalizeChartData,
  isChartDataEmpty,
  getChartDataLength,
  hasDataContent,
  getDataArray,
  
  // Field extraction
  extractFieldValues,
  extractNumericValues,
  extractDateValues,
  
  // Data processing
  groupDataByField,
  sortDataByField,
  
  // Configuration
  createChartConfig,
  generateColorPalette,
  validateChartData,
  
  // Utility functions
  ensureMutable,
  ensureReadonly,
  ensureValidSchema,
  
  // Aggregation
  sumByField,
  averageByField,
  minByField,
  maxByField,
  countUniqueByField
};