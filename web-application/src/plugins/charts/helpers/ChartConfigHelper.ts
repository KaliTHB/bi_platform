// File: web-application/src/plugins/charts/helpers/ChartConfigHelper.ts

import React from 'react';

// Import existing interfaces from your project
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
} from '../interfaces';

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
    public allowedValues?: readonly string[]
  ) {
    super(message);
    this.name = 'ChartConfigValidationError';
  }

  // Helper method to get a formatted error message
  getFormattedMessage(): string {
    let message = this.message;
    if (this.allowedValues && this.allowedValues.length > 0) {
      message += `\nAllowed values: ${this.allowedValues.join(', ')}`;
    }
    message += `\nReceived value: ${JSON.stringify(this.value)}`;
    return message;
  }
}

// Validation helper functions
function validateStringField(value: any, fieldName: string, required: boolean = true): void {
  if (required && (!value || typeof value !== 'string' || value.trim() === '')) {
    throw new ChartConfigValidationError(
      `${fieldName} is required and must be a non-empty string`,
      fieldName,
      value
    );
  }
  if (!required && value !== undefined && (typeof value !== 'string' || value.trim() === '')) {
    throw new ChartConfigValidationError(
      `${fieldName} must be a non-empty string if provided`,
      fieldName,
      value
    );
  }
}

function validateArrayField<T>(
  value: any,
  fieldName: string,
  allowedValues: readonly T[],
  required: boolean = false
): void {
  if (required && !value) {
    throw new ChartConfigValidationError(
      `${fieldName} is required`,
      fieldName,
      value,
      allowedValues as readonly string[]
    );
  }
  
  if (value) {
    if (!Array.isArray(value)) {
      throw new ChartConfigValidationError(
        `${fieldName} must be an array`,
        fieldName,
        value,
        allowedValues as readonly string[]
      );
    }
    
    const invalidValues = value.filter(item => !allowedValues.includes(item));
    if (invalidValues.length > 0) {
      throw new ChartConfigValidationError(
        `Invalid ${fieldName} values: ${invalidValues.join(', ')}`,
        fieldName,
        invalidValues,
        allowedValues as readonly string[]
      );
    }
  }
}

function validateEnumField<T>(
  value: any,
  fieldName: string,
  allowedValues: readonly T[],
  required: boolean = true
): void {
  if (required && !value) {
    throw new ChartConfigValidationError(
      `${fieldName} is required`,
      fieldName,
      value,
      allowedValues as readonly string[]
    );
  }
  
  if (value && !allowedValues.includes(value)) {
    throw new ChartConfigValidationError(
      `Invalid ${fieldName}: "${value}"`,
      fieldName,
      value,
      allowedValues as readonly string[]
    );
  }
}

function validateVersionFormat(version: string): void {
  const versionRegex = /^\d+\.\d+\.\d+(-[\w\d\-\.]+)?(\+[\w\d\-\.]+)?$/;
  if (!versionRegex.test(version)) {
    throw new ChartConfigValidationError(
      `Invalid version format: "${version}". Must follow semantic versioning (e.g., "1.0.0")`,
      'version',
      version,
      ['Example: 1.0.0', 'Example: 1.2.3-beta.1', 'Example: 2.0.0+build.123']
    );
  }
}

function validateNameFormat(name: string, library: string): void {
  // Check kebab-case format
  if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(name)) {
    throw new ChartConfigValidationError(
      `Invalid name format: "${name}". Should be kebab-case (e.g., "echarts-bar-chart")`,
      'name',
      name,
      [`${library}-chart-name`, `${library}-custom-visualization`]
    );
  }
  
  // Check library prefix
  if (!name.startsWith(library)) {
    throw new ChartConfigValidationError(
      `Chart name "${name}" should start with library prefix "${library}"`,
      'name',
      name,
      [`${library}-${name.split('-').slice(1).join('-')}`]
    );
  }
}

function validateReactComponent(component: any, fieldName: string, required: boolean = true): void {
  if (required && !component) {
    throw new ChartConfigValidationError(
      `${fieldName} is required`,
      fieldName,
      component
    );
  }
  
  if (component && typeof component !== 'function') {
    throw new ChartConfigValidationError(
      `${fieldName} must be a React component (function)`,
      fieldName,
      typeof component
    );
  }
}

function validateConfigSchema(schema: any): void {
  if (!schema || typeof schema !== 'object') {
    throw new ChartConfigValidationError(
      'configSchema is required and must be an object',
      'configSchema',
      schema
    );
  }
  
  // Basic schema validation
  if (!schema.type || schema.type !== 'object') {
    throw new ChartConfigValidationError(
      'configSchema must have type: "object"',
      'configSchema.type',
      schema.type,
      ['object']
    );
  }
  
  if (!schema.properties || typeof schema.properties !== 'object') {
    throw new ChartConfigValidationError(
      'configSchema must have a properties object',
      'configSchema.properties',
      schema.properties
    );
  }
}

function validateDataRequirements(requirements: any): void {
  if (!requirements || typeof requirements !== 'object') {
    throw new ChartConfigValidationError(
      'dataRequirements is required and must be an object',
      'dataRequirements',
      requirements
    );
  }
  
  if (typeof requirements.minColumns !== 'number' || requirements.minColumns < 1) {
    throw new ChartConfigValidationError(
      'dataRequirements.minColumns must be a positive number',
      'dataRequirements.minColumns',
      requirements.minColumns
    );
  }
  
  if (requirements.maxColumns !== undefined && 
      (typeof requirements.maxColumns !== 'number' || requirements.maxColumns < requirements.minColumns)) {
    throw new ChartConfigValidationError(
      'dataRequirements.maxColumns must be a number greater than or equal to minColumns',
      'dataRequirements.maxColumns',
      requirements.maxColumns
    );
  }
  
  if (!Array.isArray(requirements.requiredFields)) {
    throw new ChartConfigValidationError(
      'dataRequirements.requiredFields must be an array of strings',
      'dataRequirements.requiredFields',
      requirements.requiredFields
    );
  }
  
  if (!Array.isArray(requirements.supportedTypes)) {
    throw new ChartConfigValidationError(
      'dataRequirements.supportedTypes must be an array',
      'dataRequirements.supportedTypes',
      requirements.supportedTypes
    );
  }
  
  const invalidTypes = requirements.supportedTypes.filter(
    (type: any) => !SUPPORTED_DATA_TYPES.includes(type)
  );
  if (invalidTypes.length > 0) {
    throw new ChartConfigValidationError(
      `Invalid supported data types: ${invalidTypes.join(', ')}`,
      'dataRequirements.supportedTypes',
      invalidTypes,
      SUPPORTED_DATA_TYPES as readonly string[]
    );
  }
}

// Main helper function with comprehensive validation
export function createChartConfig(input: ChartConfigInput): ChartPluginConfig {
  try {
    // Validate required string fields
    validateStringField(input.name, 'name');
    validateStringField(input.displayName, 'displayName');
    validateStringField(input.category, 'category');
    validateStringField(input.library, 'library');
    validateStringField(input.version, 'version');
    
    // Validate optional string fields
    validateStringField(input.description, 'description', false);
    
    // Validate enums
    validateEnumField(input.category, 'category', CHART_CATEGORIES);
    validateEnumField(input.library, 'library', CHART_LIBRARIES);
    
    // Validate version format
    validateVersionFormat(input.version);
    
    // Validate name format and library prefix
    validateNameFormat(input.name, input.library);
    
    // Validate arrays
    if (input.tags) {
      if (!Array.isArray(input.tags) || !input.tags.every(tag => typeof tag === 'string')) {
        throw new ChartConfigValidationError(
          'tags must be an array of strings',
          'tags',
          input.tags
        );
      }
    }
    
    validateArrayField(input.exportFormats, 'exportFormats', EXPORT_FORMATS, false);
    
    // Validate complex objects
    validateConfigSchema(input.configSchema);
    validateDataRequirements(input.dataRequirements);
    
    // Validate React components
    validateReactComponent(input.component, 'component');
    validateReactComponent(input.previewComponent, 'previewComponent', false);
    validateReactComponent(input.configComponent, 'configComponent', false);
    
    // Validate interaction support if provided
    if (input.interactionSupport) {
      if (typeof input.interactionSupport !== 'object') {
        throw new ChartConfigValidationError(
          'interactionSupport must be an object',
          'interactionSupport',
          input.interactionSupport
        );
      }
      
      const booleanFields = ['zoom', 'pan', 'selection', 'brush', 'drilldown', 'tooltip', 'crossFilter'];
      for (const field of booleanFields) {
        const value = (input.interactionSupport as any)[field];
        if (value !== undefined && typeof value !== 'boolean') {
          throw new ChartConfigValidationError(
            `interactionSupport.${field} must be a boolean if provided`,
            `interactionSupport.${field}`,
            value
          );
        }
      }
    }
    
    // Return the validated and properly typed configuration
    return {
      name: input.name,
      displayName: input.displayName,
      category: input.category as ChartCategory,
      library: input.library as ChartLibrary,
      version: input.version,
      description: input.description,
      tags: input.tags || [],
      configSchema: input.configSchema,
      dataRequirements: {
        minColumns: input.dataRequirements.minColumns,
        maxColumns: input.dataRequirements.maxColumns,
        requiredFields: input.dataRequirements.requiredFields,
        optionalFields: input.dataRequirements.optionalFields || [],
        supportedTypes: input.dataRequirements.supportedTypes as SupportedDataType[],
        aggregationSupport: input.dataRequirements.aggregationSupport,
        pivotSupport: input.dataRequirements.pivotSupport,
      },
      exportFormats: (input.exportFormats || ['png', 'svg']) as ExportFormat[],
      interactionSupport: input.interactionSupport,
      component: input.component,
      previewComponent: input.previewComponent,
      configComponent: input.configComponent,
    };
    
  } catch (error) {
    if (error instanceof ChartConfigValidationError) {
      throw error;
    }
    // Wrap unexpected errors
    throw new ChartConfigValidationError(
      `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'unknown',
      input
    );
  }
}

// Helper function for batch creation with error handling
export function createMultipleChartConfigs(inputs: ChartConfigInput[]): {
  successful: ChartPluginConfig[];
  failed: Array<{ input: ChartConfigInput; error: ChartConfigValidationError }>;
} {
  const successful: ChartPluginConfig[] = [];
  const failed: Array<{ input: ChartConfigInput; error: ChartConfigValidationError }> = [];

  inputs.forEach((input, index) => {
    try {
      const config = createChartConfig(input);
      successful.push(config);
    } catch (error) {
      console.error(`Failed to create chart config at index ${index}:`, error);
      
      if (error instanceof ChartConfigValidationError) {
        failed.push({ input, error });
      } else {
        failed.push({ 
          input, 
          error: new ChartConfigValidationError(
            `Unexpected error at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'unknown',
            input
          )
        });
      }
    }
  });

  return { successful, failed };
}

// Helper function to validate category specifically
export function validateCategory(category: string): category is ChartCategory {
  return CHART_CATEGORIES.includes(category as ChartCategory);
}

// Helper function to validate library specifically
export function validateLibrary(library: string): library is ChartLibrary {
  return CHART_LIBRARIES.includes(library as ChartLibrary);
}

// Helper function to get available options
export function getAvailableOptions() {
  return {
    categories: [...CHART_CATEGORIES],
    libraries: [...CHART_LIBRARIES],
    exportFormats: [...EXPORT_FORMATS],
    supportedDataTypes: [...SUPPORTED_DATA_TYPES],
  };
}

// Helper function to create a basic chart config template
export function createChartConfigTemplate(
  name: string,
  library: ChartLibrary,
  category: ChartCategory = 'basic'
): Partial<ChartConfigInput> {
  return {
    name: `${library}-${name}`,
    displayName: name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    category,
    library,
    version: '1.0.0',
    description: `${category} chart visualization using ${library}`,
    tags: [library, category, 'visualization'],
    exportFormats: ['png', 'svg'],
    configSchema: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          title: 'Chart Title', 
          default: 'Chart Title' 
        },
        showLegend: { 
          type: 'boolean', 
          title: 'Show Legend', 
          default: true 
        },
        colors: { 
          type: 'array', 
          title: 'Color Palette',
          default: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
        }
      },
      required: ['title']
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['category', 'value'],
      supportedTypes: ['string', 'number'],
      aggregationSupport: true,
      pivotSupport: false
    },
    interactionSupport: {
      tooltip: true,
      zoom: false,
      pan: false
    }
  };
}

// Export default for easier imports
export default {
  createChartConfig,
  createMultipleChartConfigs,
  createChartConfigTemplate,
  validateCategory,
  validateLibrary,
  getAvailableOptions,
  ChartConfigValidationError,
  CHART_CATEGORIES,
  CHART_LIBRARIES,
  EXPORT_FORMATS,
  SUPPORTED_DATA_TYPES
};