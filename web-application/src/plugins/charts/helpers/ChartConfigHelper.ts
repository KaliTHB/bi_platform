// File: web-application/src/plugins/charts/helpers/ChartConfigHelper.ts

import React from 'react';

// Import from local interfaces file instead of main types
import type { 
  ChartPluginConfig, 
  ChartProps, 
  ChartPreviewProps, 
  ChartConfigProps,
  ChartConfigSchema,
  DataRequirements,
  ChartTheme,
  FilterConfig,
  ChartInteractionEvent,
  ChartError,
  DataRequest
} from '@/types/chart.types';
import { ensureReadonly, ensureMutable, ensureValidSchema } from "../utils/chartDataUtils";

// Define the allowed values as const arrays for runtime validation
export const CHART_CATEGORIES = ['basic', 'advanced', 'statistical', 'geographic', 'financial', 'custom'] as const;
export const CHART_LIBRARIES = ['echarts', 'd3js', 'plotly', 'chartjs', 'nvd3js', 'drilldown'] as const;
export const EXPORT_FORMATS = ['png', 'svg', 'pdf', 'jpg', 'html'] as const;
export const SUPPORTED_DATA_TYPES = ['string', 'number', 'date', 'boolean'] as const;

// Type definitions for validation
export type ChartCategory = typeof CHART_CATEGORIES[number];
export type ChartLibrary = typeof CHART_LIBRARIES[number];
export type ExportFormat = typeof EXPORT_FORMATS[number];
export type SupportedDataType = typeof SUPPORTED_DATA_TYPES[number];

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Validation error class
export class ChartConfigValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public allowedValues?: any[]
  ) {
    super(message);
    this.name = 'ChartConfigValidationError';
  }
}

// Chart configuration helper class
export class ChartConfigHelper {
  /**
   * Creates a validated chart plugin configuration
   */
  static createChartConfig(input: ChartPluginConfig): ChartPluginConfig {
    // Validate input
    this.validateChartConfig(input);
    
    // Create configuration
    const config: ChartPluginConfig = {
      name: input.name,
      displayName: input.displayName,
      category: input.category as ChartCategory,
      library: input.library as ChartLibrary,
      version: input.version,
      description: input.description,
      tags: ensureMutable(input.tags),
      configSchema: ensureValidSchema(input.configSchema),
      dataRequirements: {
        minColumns: input.dataRequirements.minColumns,
        maxColumns: input.dataRequirements.maxColumns,
        requiredFields: input.dataRequirements.requiredFields as string[],
        optionalFields: input.dataRequirements.optionalFields as string[] || [],
        supportedTypes: input.dataRequirements.supportedTypes as SupportedDataType[],
        aggregationSupport: input.dataRequirements.aggregationSupport,
        pivotSupport: input.dataRequirements.pivotSupport
      },
      exportFormats: (input.exportFormats || ['png', 'svg', 'pdf']) as ExportFormat[],
      component: input.component,
      previewComponent: input.previewComponent,
      configComponent: input.configComponent,
      interactionSupport: input.interactionSupport
    };
    
    return config;
  }
  
  /**
   * Validates chart configuration input
   */
  static validateChartConfig(input: ChartPluginConfig): void {
    // Required field validations
    if (!input.name) {
      throw new ChartConfigValidationError('Chart name is required', 'name', input.name);
    }
    
    if (!input.displayName) {
      throw new ChartConfigValidationError('Display name is required', 'displayName', input.displayName);
    }
    
    // Data requirements validation with safe access
    const dataReqs = input.dataRequirements;
    if (!dataReqs) {
      throw new ChartConfigValidationError(
        'Data requirements are required',
        'dataRequirements', 
        dataReqs
      );
    }
    
    // Use nullish coalescing to provide defaults for validation
    const minColumns = dataReqs.minColumns ?? 0;
    if (minColumns < 1) {
      throw new ChartConfigValidationError(
        'Minimum columns must be at least 1',
        'dataRequirements.minColumns',
        minColumns
      );
    }
    
    const maxColumns = dataReqs.maxColumns;
    if (maxColumns !== undefined && maxColumns < minColumns) {
      throw new ChartConfigValidationError(
        'Maximum columns must be greater than minimum columns',
        'dataRequirements.maxColumns',
        maxColumns
      );
    }
    
    // Validate required arrays exist
    if (!Array.isArray(dataReqs.requiredFields)) {
      throw new ChartConfigValidationError(
        'Required fields must be an array',
        'dataRequirements.requiredFields',
        dataReqs.requiredFields
      );
    }
    
    if (!Array.isArray(dataReqs.supportedTypes)) {
      throw new ChartConfigValidationError(
        'Supported types must be an array',
        'dataRequirements.supportedTypes',
        dataReqs.supportedTypes
      );
    }
    
    if (!input.component) {
      throw new ChartConfigValidationError(
        'Chart component is required',
        'component',
        input.component
      );
    }
  }

  /**
   * Creates a default configuration schema for common chart types
   */
  static createDefaultConfigSchema(chartType: string): ChartConfigSchema {
    const baseSchema: ChartConfigSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Chart Title',
          description: 'The main title of the chart',
          default: `${chartType} Chart`
        },
        colors: {
          type: 'array',
          title: 'Color Palette',
          description: 'Colors used in the chart',
          items: {
            type: 'color',
            title: 'Color'
          }
        },
        animation: {
          type: 'boolean',
          title: 'Enable Animation',
          description: 'Whether to animate the chart',
          default: true
        },
        responsive: {
          type: 'boolean',
          title: 'Responsive',
          description: 'Whether the chart should be responsive',
          default: true
        },
        showLegend: {
          type: 'boolean',
          title: 'Show Legend',
          description: 'Whether to show the legend',
          default: true
        }
      },
      required: []
    };

    // Add chart-specific properties based on type
    switch (chartType?.toLowerCase()) {
      case 'bar':
      case 'column':
      case 'line':
        baseSchema.properties.xField = {
          type: 'string',
          title: 'X-Axis Field',
          description: 'Field to use for X-axis'
        };
        baseSchema.properties.yField = {
          type: 'string',
          title: 'Y-Axis Field',
          description: 'Field to use for Y-axis'
        };
        baseSchema.properties.showGrid = {
          type: 'boolean',
          title: 'Show Grid',
          description: 'Whether to show grid lines',
          default: true
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      case 'pie':
      case 'doughnut':
        baseSchema.properties.nameField = {
          type: 'string',
          title: 'Name Field',
          description: 'Field to use for slice names'
        };
        baseSchema.properties.valueField = {
          type: 'string',
          title: 'Value Field',
          description: 'Field to use for slice values'
        };
        baseSchema.properties.innerRadius = {
          type: 'number',
          title: 'Inner Radius (%)',
          description: 'Inner radius percentage for doughnut charts',
          minimum: 0,
          maximum: 80,
          default: chartType === 'doughnut' ? 40 : 0
        };
        baseSchema.properties.showLabels = {
          type: 'boolean',
          title: 'Show Labels',
          description: 'Whether to show slice labels',
          default: true
        };
        baseSchema.required = ['nameField', 'valueField'];
        break;
        
      case 'line':
        baseSchema.properties.xField = {
          type: 'string',
          title: 'X-Axis Field',
          description: 'Field to use for X-axis'
        };
        baseSchema.properties.yField = {
          type: 'string',
          title: 'Y-Axis Field',
          description: 'Field to use for Y-axis'
        };
        baseSchema.properties.smooth = {
          type: 'boolean',
          title: 'Smooth Lines',
          description: 'Whether to smooth the lines',
          default: false
        };
        baseSchema.required = ['xField', 'yField'];
        break;
        
      case 'scatter':
        baseSchema.properties.xField = {
          type: 'string',
          title: 'X-Axis Field',
          description: 'Field to use for X-axis'
        };
        baseSchema.properties.yField = {
          type: 'string',
          title: 'Y-Axis Field',
          description: 'Field to use for Y-axis'
        };
        baseSchema.properties.sizeField = {
          type: 'string',
          title: 'Size Field',
          description: 'Field to use for bubble size (optional)'
        };
        baseSchema.required = ['xField', 'yField'];
        break;
    }
    
    return baseSchema;
  }

  /**
   * Creates a default configuration object from a chart plugin's config schema
   * This extracts default values from the schema and creates a usable config object
   * *** THIS IS THE MISSING METHOD THAT FIXES THE ERROR ***
   */
  static createDefaultConfigurationFromSchema(
    configSchema: any,
    chartType: string
  ): any {
    if (!configSchema || !configSchema.properties) {
      console.warn('Invalid config schema provided, falling back to basic defaults');
      return this.createBasicDefaults(chartType);
    }

    const config: any = {
      chartType: chartType,
      title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
    };

    // Extract default values from schema properties
    Object.entries(configSchema.properties).forEach(([key, property]: [string, any]) => {
      if (property.default !== undefined) {
        config[key] = property.default;
      } else {
        // Set type-appropriate defaults if no default is specified
        config[key] = this.getTypeDefault(property.type);
      }
    });

    // Ensure required fields have values
    if (configSchema.required && Array.isArray(configSchema.required)) {
      configSchema.required.forEach((field: string) => {
        if (config[field] === null || config[field] === undefined || config[field] === '') {
          // Set meaningful defaults for required fields
          if (field.includes('Field') || field.includes('field')) {
            config[field] = ''; // Field selectors start empty
          } else {
            config[field] = `Default ${field}`;
          }
        }
      });
    }

    // Add common chart defaults if not present
    if (!config.colors) {
      config.colors = ['#1976d2', '#dc004e', '#388e3c', '#f57c00', '#9c27b0', '#ff9800'];
    }

    if (config.animation === undefined) {
      config.animation = true;
    }

    if (config.responsive === undefined) {
      config.responsive = true;
    }

    return config;
  }

  /**
   * Helper method for type-based defaults
   */
  private static getTypeDefault(propertyType: string): any {
    switch (propertyType) {
      case 'string':
        return '';
      case 'boolean':
        return false;
      case 'number':
        return 0;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'select':
        return '';
      case 'color':
        return '#1976d2';
      default:
        return null;
    }
  }

  /**
   * Helper method for basic defaults when schema is invalid
   */
  private static createBasicDefaults(chartType: string): any {
    const baseConfig = {
      chartType: chartType,
      title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      colors: ['#1976d2', '#dc004e', '#388e3c', '#f57c00'],
      animation: true,
      responsive: true,
      showLegend: true
    };

    // Add chart-type specific defaults
    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'column':
      case 'line':
        return {
          ...baseConfig,
          xField: '',
          yField: '',
          'xAxis.field': '',
          'yAxis.field': '',
          'xAxis.label': '',
          'yAxis.label': '',
          xAxis: { field: '', label: '', type: 'category' },
          yAxis: { field: '', label: '', type: 'value' },
          showGrid: true
        };

      case 'pie':
      case 'doughnut':
        return {
          ...baseConfig,
          nameField: '',
          valueField: '',
          innerRadius: chartType === 'doughnut' ? 40 : 0,
          showLabels: true
        };

      case 'scatter':
        return {
          ...baseConfig,
          xField: '',
          yField: '',
          sizeField: '',
          showGrid: true
        };

      default:
        return baseConfig;
    }
  }
  
  /**
   * Merges user configuration with default values
   */
  static mergeWithDefaults<T>(userConfig: Partial<T>, defaults: T): T {
    return { ...defaults, ...userConfig };
  }
  
  /**
   * Validates a configuration against a schema
   */
  static validateConfigAgainstSchema(config: any, schema: ChartConfigSchema): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!config[field] || config[field] === '') {
          errors.push({
            field,
            message: `Required field "${field}" is missing or empty`,
            code: 'REQUIRED_FIELD_MISSING'
          });
        }
      }
    }

    // Validate field types
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
        const value = config[key];
        if (value !== undefined && value !== null) {
          if (!this.validateFieldType(value, property.type)) {
            errors.push({
              field: key,
              message: `Field "${key}" must be of type ${property.type}`,
              code: 'INVALID_TYPE'
            });
          }

          // Validate enum values
          if (property.enum && !property.enum.includes(value)) {
            errors.push({
              field: key,
              message: `Field "${key}" must be one of: ${property.enum.join(', ')}`,
              code: 'INVALID_ENUM_VALUE'
            });
          }

          // Validate number ranges
          if (property.type === 'number') {
            if (property.minimum !== undefined && value < property.minimum) {
              errors.push({
                field: key,
                message: `Field "${key}" must be at least ${property.minimum}`,
                code: 'VALUE_TOO_SMALL'
              });
            }
            if (property.maximum !== undefined && value > property.maximum) {
              errors.push({
                field: key,
                message: `Field "${key}" must not exceed ${property.maximum}`,
                code: 'VALUE_TOO_LARGE'
              });
            }
          }
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates if a value matches the expected type
   */
  private static validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'color':
        // Basic color validation (hex, rgb, or named colors)
        return typeof value === 'string' && (
          /^#[0-9A-F]{6}$/i.test(value) || 
          /^rgb\(\d+,\s*\d+,\s*\d+\)$/i.test(value) ||
          /^[a-z]+$/i.test(value)
        );
      case 'select':
        return typeof value === 'string';
      default:
        return true; // Unknown types pass validation
    }
  }

  /**
   * Creates field assignments from schema for a given chart type
   */
  static createFieldAssignmentsFromSchema(schema: ChartConfigSchema): Record<string, string> {
    const assignments: Record<string, string> = {};

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
        if (property.type === 'select' || key.includes('Field') || key.includes('field')) {
          assignments[key] = '';
        }
      });
    }

    return assignments;
  }

  /**
   * Gets display name for a chart configuration field
   */
  static getFieldDisplayName(fieldKey: string, schema?: ChartConfigSchema): string {
    if (schema?.properties?.[fieldKey]?.title) {
      return schema.properties[fieldKey].title;
    }

    // Convert camelCase/snake_case to readable format
    return fieldKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}