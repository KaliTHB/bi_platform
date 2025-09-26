import { ChartData, ChartConfiguration, FieldAssignments } from '@/types/chart.types';
import ConfigMappingService from './ConfigMappingService';

/**
 * Enhanced service for handling chart plugin operations, data processing, and validation
 */
export class ChartPluginService {
  
  /**
   * Process chart data with field assignments for proper axis mapping
   */
  static processChartData(
    data: Record<string, any>[],
    assignments: FieldAssignments,
    chartType: string
  ): { processedData: ChartData[]; fieldMapping: Record<string, string>; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldMapping = ConfigMappingService.createFieldMapping(assignments);
    
    console.log('Processing chart data:', {
      dataLength: data?.length,
      assignments,
      fieldMapping,
      chartType
    });

    // Input validation
    if (!data || data.length === 0) {
      errors.push('No data provided for chart processing');
      return { processedData: [], fieldMapping, errors, warnings };
    }

    if (!assignments || Object.keys(assignments).length === 0) {
      errors.push('No field assignments provided');
      return { processedData: [], fieldMapping, errors, warnings };
    }

    if (!chartType) {
      errors.push('Chart type not specified');
      return { processedData: [], fieldMapping, errors, warnings };
    }

    try {
      // Validate data structure
      const dataValidation = this.validateDataStructure(data);
      if (!dataValidation.valid) {
        errors.push(...dataValidation.errors);
        warnings.push(...dataValidation.warnings);
      }

      // Validate field assignments against data
      const fieldValidation = this.validateFieldAssignments(data, fieldMapping);
      if (!fieldValidation.valid) {
        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);
      }

      // Stop processing if critical errors found
      if (errors.length > 0) {
        return { processedData: [], fieldMapping, errors, warnings };
      }

      // Process data based on chart type
      let processedData: ChartData[];

      switch (chartType.toLowerCase()) {
        case 'pie':
        case 'donut':
        case 'doughnut':
          processedData = this.processPieChartData(data, fieldMapping);
          break;
        
        case 'scatter':
        case 'bubble':
          processedData = this.processScatterData(data, fieldMapping);
          break;
        
        case 'bar':
        case 'column':
          processedData = this.processBarChartData(data, fieldMapping);
          break;
        
        case 'line':
        case 'area':
        case 'spline':
          processedData = this.processLineChartData(data, fieldMapping);
          break;
        
        default:
          processedData = this.processStandardChartData(data, fieldMapping);
          break;
      }

      // Validate processed data
      if (processedData.length === 0) {
        warnings.push('No data points generated after processing');
      }

      console.log('Processed data sample:', {
        original: data.slice(0, 2),
        processed: processedData.slice(0, 2),
        fieldMapping,
        totalProcessed: processedData.length
      });

      return { processedData, fieldMapping, errors, warnings };

    } catch (error) {
      console.error('Error processing chart data:', error);
      errors.push(`Data processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { processedData: [], fieldMapping, errors, warnings };
    }
  }

  /**
   * Validate data structure and quality
   */
  private static validateDataStructure(data: Record<string, any>[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors, warnings };
    }

    if (data.length === 0) {
      errors.push('Data array is empty');
      return { valid: false, errors, warnings };
    }

    // Check for consistent structure
    const firstRowKeys = Object.keys(data[0] || {});
    if (firstRowKeys.length === 0) {
      errors.push('First data row is empty or invalid');
      return { valid: false, errors, warnings };
    }

    // Check for inconsistent row structures
    let inconsistentRows = 0;
    for (let i = 1; i < Math.min(data.length, 10); i++) {
      const currentRowKeys = Object.keys(data[i] || {});
      if (currentRowKeys.length !== firstRowKeys.length || 
          !firstRowKeys.every(key => currentRowKeys.includes(key))) {
        inconsistentRows++;
      }
    }

    if (inconsistentRows > 0) {
      warnings.push(`Found ${inconsistentRows} rows with inconsistent structure in first 10 rows`);
    }

    // Check for excessive null values
    firstRowKeys.forEach(key => {
      const nullCount = data.slice(0, 100).filter(row => row[key] == null).length;
      const nullPercentage = (nullCount / Math.min(data.length, 100)) * 100;
      
      if (nullPercentage > 50) {
        warnings.push(`Column '${key}' has ${nullPercentage.toFixed(1)}% null values`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate field assignments against actual data columns
   */
  private static validateFieldAssignments(
    data: Record<string, any>[], 
    fieldMapping: Record<string, string>
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const dataColumns = Object.keys(data[0] || {});
    const missingFields: string[] = [];

    // Check if assigned fields exist in data
    Object.entries(fieldMapping).forEach(([assignmentKey, fieldName]) => {
      if (!dataColumns.includes(fieldName)) {
        missingFields.push(`${assignmentKey}: '${fieldName}'`);
      }
    });

    if (missingFields.length > 0) {
      errors.push(`Missing fields in data: ${missingFields.join(', ')}. Available columns: ${dataColumns.join(', ')}`);
    }

    // Check field data quality for numeric fields
    if (fieldMapping['y-axis'] && dataColumns.includes(fieldMapping['y-axis'])) {
      const yField = fieldMapping['y-axis'];
      const numericValues = data.slice(0, 100).filter(row => {
        const value = row[yField];
        return value != null && (typeof value === 'number' || !isNaN(Number(value)));
      }).length;
      
      const numericPercentage = (numericValues / Math.min(data.length, 100)) * 100;
      
      if (numericPercentage < 80) {
        warnings.push(`Y-axis field '${yField}' has only ${numericPercentage.toFixed(1)}% numeric values`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Process data for standard chart types (bar, line, area) - enhanced
   */
  private static processStandardChartData(data: Record<string, any>[], fieldMapping: Record<string, string>): ChartData[] {
    const xField = fieldMapping['x-axis'];
    const yField = fieldMapping['y-axis'];
    const seriesField = fieldMapping['series'];

    if (!xField || !yField) {
      console.warn('Missing required fields for standard chart:', { xField, yField });
      return [];
    }

    return data
      .filter(item => item[xField] != null && item[yField] != null) // Filter out null values
      .map((item, index) => ({
        x: this.normalizeValue(item[xField], 'x'),
        y: this.normalizeValue(item[yField], 'y'),
        series: seriesField ? String(item[seriesField]) : 'Series 1',
        originalData: item,
        index
      }));
  }

  /**
   * Process data for bar charts with enhanced categorical handling
   */
  private static processBarChartData(data: Record<string, any>[], fieldMapping: Record<string, string>): ChartData[] {
    const xField = fieldMapping['x-axis'];
    const yField = fieldMapping['y-axis'];
    const seriesField = fieldMapping['series'];

    if (!xField || !yField) {
      console.warn('Missing required fields for bar chart:', { xField, yField });
      return [];
    }

    return data
      .filter(item => item[xField] != null && item[yField] != null)
      .map((item, index) => ({
        x: String(item[xField]), // Ensure categorical data is string
        y: Number(item[yField]) || 0, // Ensure numeric data
        series: seriesField ? String(item[seriesField]) : 'Series 1',
        originalData: item,
        index
      }));
  }

  /**
   * Process data for line charts with time series support
   */
  private static processLineChartData(data: Record<string, any>[], fieldMapping: Record<string, string>): ChartData[] {
    const xField = fieldMapping['x-axis'];
    const yField = fieldMapping['y-axis'];
    const seriesField = fieldMapping['series'];

    if (!xField || !yField) {
      console.warn('Missing required fields for line chart:', { xField, yField });
      return [];
    }

    return data
      .filter(item => item[xField] != null && item[yField] != null)
      .map((item, index) => {
        let xValue = item[xField];
        
        // Handle date values for time series
        if (typeof xValue === 'string' && !isNaN(Date.parse(xValue))) {
          xValue = new Date(xValue);
        }
        
        return {
          x: xValue,
          y: Number(item[yField]) || 0,
          series: seriesField ? String(item[seriesField]) : 'Series 1',
          originalData: item,
          index
        };
      })
      .sort((a, b) => {
        // Sort by x-value for line charts (especially important for time series)
        if (a.x instanceof Date && b.x instanceof Date) {
          return a.x.getTime() - b.x.getTime();
        }
        if (typeof a.x === 'number' && typeof b.x === 'number') {
          return a.x - b.x;
        }
        return 0;
      });
  }

  /**
   * Process data for pie charts with enhanced value handling
   */
  private static processPieChartData(data: Record<string, any>[], fieldMapping: Record<string, string>): ChartData[] {
    const categoryField = fieldMapping['category'] || fieldMapping['x-axis'];
    const valueField = fieldMapping['value'] || fieldMapping['y-axis'];

    if (!categoryField || !valueField) {
      console.warn('Missing required fields for pie chart:', { categoryField, valueField });
      return [];
    }

    // Group by category and sum values if there are duplicates
    const grouped = data.reduce((acc, item) => {
      const category = String(item[categoryField]);
      const value = Number(item[valueField]) || 0;
      
      if (category && value > 0) { // Only include positive values
        acc[category] = (acc[category] || 0) + value;
      }
      
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      originalData: { [categoryField]: name, [valueField]: value },
      index
    }));
  }

  /**
   * Process data for scatter/bubble charts with enhanced numeric handling
   */
  private static processScatterData(data: Record<string, any>[], fieldMapping: Record<string, string>): ChartData[] {
    const xField = fieldMapping['x-axis'];
    const yField = fieldMapping['y-axis'];
    const sizeField = fieldMapping['size'];
    const colorField = fieldMapping['color'] || fieldMapping['series'];

    if (!xField || !yField) {
      console.warn('Missing required fields for scatter chart:', { xField, yField });
      return [];
    }

    return data
      .filter(item => {
        const xVal = Number(item[xField]);
        const yVal = Number(item[yField]);
        return !isNaN(xVal) && !isNaN(yVal); // Only include numeric points
      })
      .map((item, index) => ({
        x: Number(item[xField]),
        y: Number(item[yField]),
        size: sizeField && item[sizeField] != null ? Number(item[sizeField]) : undefined,
        color: colorField ? String(item[colorField]) : undefined,
        originalData: item,
        index
      }));
  }

  /**
   * Normalize values based on context
   */
  private static normalizeValue(value: any, context: 'x' | 'y'): any {
    if (value == null) return context === 'y' ? 0 : '';
    
    if (context === 'y') {
      // Y-axis values should typically be numeric
      const numValue = Number(value);
      return isNaN(numValue) ? 0 : numValue;
    } else {
      // X-axis values can be string, number, or date
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return new Date(value);
      }
      return value;
    }
  }

  /**
   * Enhanced chart configuration validation
   */
  static validateChartConfiguration(
    config: ChartConfiguration,
    assignments: FieldAssignments,
    data: Record<string, any>[]
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('Validating chart configuration:', {
      config,
      assignments,
      dataLength: data?.length
    });

    // Basic validation
    if (!data || data.length === 0) {
      errors.push('No data provided');
      return { valid: false, errors, warnings };
    }

    if (!assignments || Object.keys(assignments).length === 0) {
      errors.push('No field assignments provided');
      return { valid: false, errors, warnings };
    }

    if (!config.chartType) {
      errors.push('Chart type not specified');
      return { valid: false, errors, warnings };
    }

    // Enhanced field assignment validation
    const fieldMapping = ConfigMappingService.createFieldMapping(assignments);
    
    if (Object.keys(fieldMapping).length === 0) {
      errors.push('No valid field assignments found');
      return { valid: false, errors, warnings };
    }

    // Chart-specific validation
    const chartType = config.chartType.toLowerCase();
    const validationResult = this.validateChartSpecificRequirements(chartType, fieldMapping, data);
    
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);

    // Data quality validation
    const dataQuality = this.validateDataQuality(data, fieldMapping, chartType);
    warnings.push(...dataQuality.warnings);

    // Configuration completeness checks
    if (!config.title && !config.customConfig?.title) {
      warnings.push('Chart title is not set');
    }

    if (!config.dimensions && !config.customConfig?.width && !config.customConfig?.height) {
      warnings.push('Chart dimensions not specified, using defaults');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate chart-specific requirements
   */
  private static validateChartSpecificRequirements(
    chartType: string,
    fieldMapping: Record<string, string>,
    data: Record<string, any>[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (chartType) {
      case 'pie':
      case 'donut':
      case 'doughnut':
        if (!fieldMapping['category'] && !fieldMapping['x-axis']) {
          errors.push('Pie charts require a category field');
        }
        if (!fieldMapping['value'] && !fieldMapping['y-axis']) {
          errors.push('Pie charts require a value field');
        }
        break;

      case 'scatter':
      case 'bubble':
        if (!fieldMapping['x-axis'] || !fieldMapping['y-axis']) {
          errors.push('Scatter charts require both X-axis and Y-axis numeric fields');
        } else {
          // Check if fields contain numeric data
          const xField = fieldMapping['x-axis'];
          const yField = fieldMapping['y-axis'];
          const sampleSize = Math.min(data.length, 10);
          
          const xNumeric = data.slice(0, sampleSize).every(row => !isNaN(Number(row[xField])));
          const yNumeric = data.slice(0, sampleSize).every(row => !isNaN(Number(row[yField])));
          
          if (!xNumeric) warnings.push('X-axis field should contain numeric data for scatter plots');
          if (!yNumeric) warnings.push('Y-axis field should contain numeric data for scatter plots');
        }
        break;

      case 'line':
      case 'area':
        if (!fieldMapping['x-axis'] || !fieldMapping['y-axis']) {
          errors.push('Line charts require both X-axis and Y-axis fields');
        }
        break;

      case 'bar':
      case 'column':
        if (!fieldMapping['x-axis'] || !fieldMapping['y-axis']) {
          errors.push('Bar charts require both X-axis and Y-axis fields');
        }
        break;

      default:
        if (!fieldMapping['x-axis'] || !fieldMapping['y-axis']) {
          errors.push('Most chart types require both X-axis and Y-axis fields');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate data quality for specific chart types
   */
  private static validateDataQuality(
    data: Record<string, any>[],
    fieldMapping: Record<string, string>,
    chartType: string
  ): { warnings: string[] } {
    const warnings: string[] = [];

    // Check Y-axis data quality for numeric charts
    if (fieldMapping['y-axis'] && !this.isPieChart(chartType)) {
      const yField = fieldMapping['y-axis'];
      const numericCount = data.slice(0, 100).filter(row => {
        const value = row[yField];
        return value != null && !isNaN(Number(value));
      }).length;
      
      const numericPercentage = (numericCount / Math.min(data.length, 100)) * 100;
      
      if (numericPercentage < 90) {
        warnings.push(`Y-axis field '${yField}' contains ${(100 - numericPercentage).toFixed(1)}% non-numeric values`);
      }
    }

    // Check for sufficient data points
    if (data.length < 2) {
      warnings.push('Chart may not render well with fewer than 2 data points');
    } else if (data.length > 1000) {
      warnings.push('Large datasets (>1000 points) may impact performance');
    }

    return { warnings };
  }

  /**
   * Helper method to check if chart is a pie chart variant
   */
  private static isPieChart(chartType?: string): boolean {
    if (!chartType) return false;
    const pieTypes = ['pie', 'pie-chart', 'donut', 'doughnut', 'ring'];
    return pieTypes.some(type => chartType.toLowerCase().includes(type));
  }

  /**
   * Create intelligent default field assignments from data columns
   */
  static createDefaultAssignments(data: Record<string, any>[]): FieldAssignments {
    if (!data || data.length === 0) return {};

    const columns = Object.keys(data[0]);
    const assignments: FieldAssignments = {};

    // Analyze columns to make smart assignments
    const columnAnalysis = this.analyzeColumns(data, columns);

    // Smart X-axis assignment (prefer categorical or date fields)
    const xAxisCandidate = columnAnalysis.find(col => 
      col.type === 'date' || (col.type === 'string' && col.uniqueValueRatio > 0.1)
    ) || columnAnalysis[0];

    if (xAxisCandidate) {
      assignments['x-axis'] = {
        name: xAxisCandidate.name,
        type: xAxisCandidate.type
      };
    }

    // Smart Y-axis assignment (prefer numeric fields)
    const yAxisCandidate = columnAnalysis.find(col => 
      col.type === 'number' && col.name !== xAxisCandidate?.name
    ) || columnAnalysis.find(col => col.name !== xAxisCandidate?.name);

    if (yAxisCandidate) {
      assignments['y-axis'] = {
        name: yAxisCandidate.name,
        type: yAxisCandidate.type
      };
    }

    console.log('Created intelligent default assignments:', assignments);
    return assignments;
  }

  /**
   * Analyze columns to understand their characteristics
   */
  private static analyzeColumns(data: Record<string, any>[], columns: string[]): Array<{
    name: string;
    type: string;
    uniqueValues: number;
    uniqueValueRatio: number;
    nullCount: number;
  }> {
    const sampleSize = Math.min(data.length, 100);
    
    return columns.map(column => {
      const values = data.slice(0, sampleSize).map(row => row[column]);
      const nonNullValues = values.filter(val => val != null);
      const uniqueValues = new Set(nonNullValues).size;
      
      return {
        name: column,
        type: this.inferColumnType(data, column),
        uniqueValues,
        uniqueValueRatio: uniqueValues / Math.max(nonNullValues.length, 1),
        nullCount: values.length - nonNullValues.length
      };
    });
  }

  /**
   * Enhanced column type inference
   */
  private static inferColumnType(data: Record<string, any>[], columnName: string): string {
    const samples = data.slice(0, 20).map(row => row[columnName]).filter(val => val != null);
    
    if (samples.length === 0) return 'string';

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const sample of samples) {
      if (typeof sample === 'number') {
        numberCount++;
      } else if (typeof sample === 'boolean') {
        booleanCount++;
      } else if (sample instanceof Date) {
        dateCount++;
      } else if (typeof sample === 'string') {
        if (!isNaN(Date.parse(sample))) {
          dateCount++;
        } else if (!isNaN(Number(sample)) && sample.trim() !== '') {
          numberCount++;
        }
      }
    }

    const total = samples.length;
    
    if (booleanCount / total > 0.8) return 'boolean';
    if (numberCount / total > 0.8) return 'number';
    if (dateCount / total > 0.8) return 'date';
    
    return 'string';
  }

  /**
   * Get chart type specific recommendations
   */
  static getChartTypeRecommendations(data: Record<string, any>[]): string[] {
    if (!data || data.length === 0) return [];

    const recommendations: string[] = [];
    const columns = Object.keys(data[0]);
    const columnAnalysis = this.analyzeColumns(data, columns);
    
    const numericColumns = columnAnalysis.filter(col => col.type === 'number');
    const dateColumns = columnAnalysis.filter(col => col.type === 'date');
    const categoricalColumns = columnAnalysis.filter(col => 
      col.type === 'string' && col.uniqueValueRatio < 0.5
    );

    if (dateColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push('Line chart recommended for time series data');
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push('Bar chart recommended for categorical data comparison');
    }

    if (numericColumns.length >= 2) {
      recommendations.push('Scatter plot recommended for exploring relationships between numeric variables');
    }

    if (categoricalColumns.length > 0 && numericColumns.length === 1 && data.length <= 10) {
      recommendations.push('Pie chart recommended for showing parts of a whole');
    }

    return recommendations;
  }
}

export default ChartPluginService;