// File: ./src/utils/datasetUtils.ts
// Utility functions for working with datasets and API responses

import { ColumnDefinition } from '@/types/dataset.types';
import { ColumnInfo } from '@/types/chart.types';

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert API column response to ColumnDefinition
 */
export const convertApiColumnToColumnDefinition = (apiColumn: any): ColumnDefinition => {
  return {
    name: apiColumn.name || apiColumn.column_name || apiColumn.field || '',
    display_name: apiColumn.display_name || apiColumn.name || apiColumn.column_name || apiColumn.field || '',
    data_type: apiColumn.data_type || apiColumn.type || 'string',
    is_nullable: apiColumn.is_nullable || false,
    description: apiColumn.description || apiColumn.comment || undefined,
    format_string: apiColumn.format_string || undefined,
    is_calculated: apiColumn.is_calculated || false,
    calculation_expression: apiColumn.calculation_expression || undefined,
    sort_order: apiColumn.sort_order || 0,
    is_visible: apiColumn.is_visible !== false, // Default to true
    column_width: apiColumn.column_width || undefined,
    aggregation_type: apiColumn.aggregation_type || 'none'
  };
};

/**
 * Convert array of API columns to ColumnDefinition array
 */
export const convertApiColumnsToColumnDefinitions = (apiColumns: any[]): ColumnDefinition[] => {
  if (!Array.isArray(apiColumns)) {
    return [];
  }
  
  return apiColumns.map(convertApiColumnToColumnDefinition);
};

/**
 * Normalize dataset API response structure
 */
export const normalizeDatasetApiResponse = (response: any) => {
  // Handle different response structures from API
  if (response?.success === false) {
    throw new Error(response.message || 'API request failed');
  }
  
  // If response has success property and it's true
  if (response?.success === true) {
    return {
      data: response.data || [],
      columns: convertApiColumnsToColumnDefinitions(response.columns || []),
      totalRows: response.total_rows || response.data?.length || 0,
      executionTime: response.execution_time || 0,
      cached: response.cached || false
    };
  }
  
  // Handle direct data response
  if (Array.isArray(response)) {
    return {
      data: response,
      columns: [],
      totalRows: response.length,
      executionTime: 0,
      cached: false
    };
  }
  
  // Handle response with data property
  if (response?.data) {
    return {
      data: response.data || [],
      columns: convertApiColumnsToColumnDefinitions(response.columns || []),
      totalRows: response.total_rows || response.data?.length || 0,
      executionTime: response.execution_time || 0,
      cached: response.cached || false
    };
  }
  
  // Fallback
  return {
    data: [],
    columns: [],
    totalRows: 0,
    executionTime: 0,
    cached: false
  };
};

/**
 * Validate dataset query options
 */
export const validateQueryOptions = (options: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (options.limit && (typeof options.limit !== 'number' || options.limit <= 0)) {
    errors.push('Limit must be a positive number');
  }
  
  if (options.offset && (typeof options.offset !== 'number' || options.offset < 0)) {
    errors.push('Offset must be a non-negative number');
  }
  
  if (options.sortDirection && !['asc', 'desc'].includes(options.sortDirection)) {
    errors.push('Sort direction must be "asc" or "desc"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Build safe query parameters with defaults
 */
export const buildSafeQueryOptions = (options: any = {}) => {
  const safeOptions = {
    limit: Math.min(options.limit || 1000, 10000), // Max 10k records
    offset: Math.max(options.offset || 0, 0),
    ...options
  };
  
  // Remove undefined values
  Object.keys(safeOptions).forEach(key => {
    if (safeOptions[key] === undefined) {
      delete safeOptions[key];
    }
  });
  
  return safeOptions;
};

/**
 * Format dataset data for chart consumption
 */
export const formatDatasetForChart = (data: any[], columns: ColumnDefinition[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { data: [], columns: [] };
  }
  
  // Ensure all rows have consistent structure
  const formattedData = data.map(row => {
    const formattedRow: any = {};
    
    columns.forEach(column => {
      const value = row[column.name];
      
      // Apply basic type conversion based on column data type
      switch (column.data_type) {
        case 'number':
        case 'integer':
        case 'decimal':
        case 'float':
          formattedRow[column.name] = value ? Number(value) : 0;
          break;
          
        case 'boolean':
          formattedRow[column.name] = Boolean(value);
          break;
          
        case 'date':
        case 'datetime':
        case 'timestamp':
          formattedRow[column.name] = value ? new Date(value) : null;
          break;
          
        default:
          formattedRow[column.name] = value ? String(value) : '';
      }
    });
    
    return formattedRow;
  });
  
  return {
    data: formattedData,
    columns: columns.filter(col => col.is_visible !== false)
  };
};

/**
 * Extract unique values from a column for filter options
 */
export const extractUniqueColumnValues = (data: any[], columnName: string): any[] => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  const values = data
    .map(row => row[columnName])
    .filter((value, index, array) => {
      // Remove null/undefined and duplicates
      return value !== null && 
             value !== undefined && 
             array.indexOf(value) === index;
    });
    
  return values.sort();
};

/**
 * Generate column statistics for data profiling
 */
export const generateColumnStats = (data: any[], column: ColumnDefinition) => {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const values = data.map(row => row[column.name]).filter(v => v !== null && v !== undefined);
  const totalCount = data.length;
  const nonNullCount = values.length;
  const nullCount = totalCount - nonNullCount;
  
  const stats = {
    column_name: column.name,
    total_count: totalCount,
    non_null_count: nonNullCount,
    null_count: nullCount,
    null_percentage: totalCount > 0 ? (nullCount / totalCount) * 100 : 0,
    unique_count: new Set(values).size,
    data_type: column.data_type
  };
  
  // Add numeric statistics if column is numeric
  if (['number', 'integer', 'decimal', 'float'].includes(column.data_type)) {
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    
    if (numericValues.length > 0) {
      const sorted = numericValues.sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      
      Object.assign(stats, {
        min_value: sorted[0],
        max_value: sorted[sorted.length - 1],
        avg_value: sum / numericValues.length,
        median_value: sorted[Math.floor(sorted.length / 2)],
        sum_value: sum
      });
    }
  }
  
  return stats;
};

// ============================================================================
// SQL Query Utilities
// ============================================================================

/**
 * Validate basic SQL query structure
 */
export const validateBasicSQLQuery = (query: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const cleanQuery = query.trim().toLowerCase();
  
  if (!cleanQuery) {
    errors.push('Query cannot be empty');
    return { isValid: false, errors };
  }
  
  // Basic SQL injection prevention
  const dangerousPatterns = [
    /;\s*(drop|delete|truncate|alter|create|insert|update)\s+/i,
    /union\s+select/i,
    /--/,
    /\/\*/
  ];
  
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(query)) {
      errors.push('Query contains potentially dangerous SQL patterns');
    }
  });
  
  // Must start with SELECT
  if (!cleanQuery.startsWith('select')) {
    errors.push('Query must start with SELECT statement');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Add LIMIT clause to query if not present
 */
export const addSafeLimitToQuery = (query: string, maxLimit: number = 10000): string => {
  const cleanQuery = query.trim();
  
  if (cleanQuery.toLowerCase().includes('limit')) {
    return cleanQuery;
  }
  
  return `${cleanQuery} LIMIT ${maxLimit}`;
};


export const generateChartColumnsFromData = (data: any[]): ColumnInfo[] => {
  if (!data || data.length === 0) return [];
  
  const firstRow = data[0];
  return Object.keys(firstRow).map(key => {
    const value = firstRow[key];
    
    // Determine type matching your exact union type
    let type: 'string' | 'number' | 'date' | 'boolean';
    if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      type = 'date';
    } else {
      type = 'string';
    }
    
    return {
      name: key,
      type: type,
      displayName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      nullable: true,
      unique: false,
      sampleValues: []
    };
  });
};

export default {
  convertApiColumnToColumnDefinition,
  convertApiColumnsToColumnDefinitions,
  normalizeDatasetApiResponse,
  validateQueryOptions,
  buildSafeQueryOptions,
  formatDatasetForChart,
  extractUniqueColumnValues,
  generateColumnStats,
  validateBasicSQLQuery,
  addSafeLimitToQuery,
  generateChartColumnsFromData
};