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
  ChartFilter,
  ChartInteractionEvent,
  ChartError,
  DataRequest
} from '@/types/chart.types';
import { ensureReadonly, ensureMutable, ensureValidSchema } from "../utils/chartDataUtils"
// OR if you prefer to import from the main types file, import these:
// import type {
//   ChartConfig,
//   ChartConfiguration,
//   ChartTheme,
//   ChartInteraction,
//   ChartFilter,
//   DataRequirements
// } from '@/types/chart.types';

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

// Input interface for the helper function
export interface ChartConfigInput {
  name: string;
  displayName: string;
  category: string;
  library: string;
  version: string;
  description?: string;
  tags?: string[];
  configSchema: ChartConfigSchema;
  dataRequirements: {
    minColumns: number;
    maxColumns?: number;
    requiredFields: string[];
    optionalFields?: string[];
    supportedTypes: string[];
    aggregationSupport?: boolean;
    pivotSupport?: boolean;
  };
  exportFormats?: string[];
  interactionSupport?: {
    zoom?: boolean;
    pan?: boolean;
    selection?: boolean;
    brush?: boolean;
    drilldown?: boolean;
    tooltip?: boolean;
    crossFilter?: boolean;
  };
  component: React.ComponentType<ChartProps>;
  previewComponent?: React.ComponentType<ChartPreviewProps>;
  configComponent?: React.ComponentType<ChartConfigProps>;
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
  static createChartConfig(input: ChartConfigInput): ChartPluginConfig {
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
        requiredFields: input.dataRequirements.requiredFields as readonly string[],
        optionalFields: input.dataRequirements.optionalFields as readonly string[] || [],
        supportedTypes: input.dataRequirements.supportedTypes as readonly SupportedDataType[],
        aggregationSupport: input.dataRequirements.aggregationSupport,
        pivotSupport: input.dataRequirements.pivotSupport
      },
      exportFormats: (input.exportFormats || ['png', 'svg', 'pdf']) as readonly ExportFormat[],
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
  static validateChartConfig(input: ChartConfigInput): void {
    // Validate required fields
    if (!input.name) {
      throw new ChartConfigValidationError('Chart name is required', 'name', input.name);
    }
    
    if (!input.displayName) {
      throw new ChartConfigValidationError('Display name is required', 'displayName', input.displayName);
    }
    
    // Validate category
    if (!CHART_CATEGORIES.includes(input.category as ChartCategory)) {
      throw new ChartConfigValidationError(
        `Invalid category: ${input.category}`,
        'category',
        input.category,
        [...CHART_CATEGORIES]
      );
    }
    
    // Validate library
    if (!CHART_LIBRARIES.includes(input.library as ChartLibrary)) {
      throw new ChartConfigValidationError(
        `Invalid library: ${input.library}`,
        'library',
        input.library,
        [...CHART_LIBRARIES]
      );
    }
    
    // Validate version format (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
    if (!versionRegex.test(input.version)) {
      throw new ChartConfigValidationError(
        'Version must follow semantic versioning (e.g., 1.0.0)',
        'version',
        input.version
      );
    }
    
    // Validate data requirements
    if (input.dataRequirements.minColumns < 1) {
      throw new ChartConfigValidationError(
        'Minimum columns must be at least 1',
        'dataRequirements.minColumns',
        input.dataRequirements.minColumns
      );
    }
    
    if (input.dataRequirements.maxColumns && 
        input.dataRequirements.maxColumns < input.dataRequirements.minColumns) {
      throw new ChartConfigValidationError(
        'Maximum columns must be greater than minimum columns',
        'dataRequirements.maxColumns',
        input.dataRequirements.maxColumns
      );
    }
    
    // Validate supported types
    const invalidTypes = input.dataRequirements.supportedTypes.filter(
      type => !SUPPORTED_DATA_TYPES.includes(type as SupportedDataType)
    );
    
    if (invalidTypes.length > 0) {
      throw new ChartConfigValidationError(
        `Invalid supported types: ${invalidTypes.join(', ')}`,
        'dataRequirements.supportedTypes',
        invalidTypes,
        [...SUPPORTED_DATA_TYPES]
      );
    }
    
    // Validate export formats
    if (input.exportFormats) {
      const invalidFormats = input.exportFormats.filter(
        format => !EXPORT_FORMATS.includes(format as ExportFormat)
      );
      
      if (invalidFormats.length > 0) {
        throw new ChartConfigValidationError(
          `Invalid export formats: ${invalidFormats.join(', ')}`,
          'exportFormats',
          invalidFormats,
          [...EXPORT_FORMATS]
        );
      }
    }
    
    // Validate component exists
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
        showLegend: {
          type: 'boolean',
          title: 'Show Legend',
          description: 'Whether to display the chart legend',
          default: true
        },
        animation: {
          type: 'boolean',
          title: 'Enable Animation',
          description: 'Whether to enable chart animations',
          default: true
        }
      },
      required: []
    };
    
    // Add chart-specific properties
    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'column':
        baseSchema.properties.orientation = {
          type: 'select',
          title: 'Orientation',
          description: 'Chart orientation',
          options: [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' }
          ],
          default: 'vertical'
        };
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
        baseSchema.required = ['xField', 'yField'];
        break;
        
      case 'pie':
      case 'donut':
        baseSchema.properties.labelField = {
          type: 'string',
          title: 'Label Field',
          description: 'Field to use for labels'
        };
        baseSchema.properties.valueField = {
          type: 'string',
          title: 'Value Field',
          description: 'Field to use for values'
        };
        baseSchema.properties.isDonut = {
          type: 'boolean',
          title: 'Donut Chart',
          description: 'Render as donut chart',
          default: false
        };
        baseSchema.required = ['labelField', 'valueField'];
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
        if (!(field in config) || config[field] === null || config[field] === undefined) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD_MISSING',
            severity: 'error'
          });
        }
      }
    }
    
    // Validate field types and constraints
    for (const [field, property] of Object.entries(schema.properties)) {
      if (field in config) {
        const value = config[field];
        
        // Type validation
        switch (property.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push({
                field,
                message: `${field} must be a string`,
                code: 'INVALID_TYPE',
                severity: 'error'
              });
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              errors.push({
                field,
                message: `${field} must be a number`,
                code: 'INVALID_TYPE',
                severity: 'error'
              });
            } else {
              // Range validation
              if (property.minimum !== undefined && value < property.minimum) {
                errors.push({
                  field,
                  message: `${field} must be at least ${property.minimum}`,
                  code: 'VALUE_TOO_SMALL',
                  severity: 'error'
                });
              }
              if (property.maximum !== undefined && value > property.maximum) {
                errors.push({
                  field,
                  message: `${field} must be at most ${property.maximum}`,
                  code: 'VALUE_TOO_LARGE',
                  severity: 'error'
                });
              }
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push({
                field,
                message: `${field} must be a boolean`,
                code: 'INVALID_TYPE',
                severity: 'error'
              });
            }
            break;
            
          case 'select':
            if (property.options) {
              const validValues = property.options.map(opt => opt.value);
              if (!validValues.includes(value)) {
                errors.push({
                  field,
                  message: `${field} must be one of: ${validValues.join(', ')}`,
                  code: 'INVALID_OPTION',
                  severity: 'error'
                });
              }
            }
            break;
        }
      }
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }
}

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}