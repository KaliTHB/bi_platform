// src/services/ChartConfigurationService.ts
// SERVICE FOR DYNAMIC CHART CONFIGURATION MANAGEMENT

import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';
import { ChartConfigHelper } from '@/plugins/charts/helpers/ChartConfigHelper';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ChartConfigurationTemplate {
  chartType: string;
  library: string;
  sections: ConfigurationSection[];
  validation: ValidationRules;
  defaults: Record<string, any>;
}

export interface ConfigurationSection {
  id: string;
  title: string;
  icon: string;
  description?: string;
  collapsed?: boolean;
  fields: ConfigurationField[];
}

export interface ConfigurationField {
  key: string;
  type: FieldType;
  title: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: FieldOption[];
  validation?: FieldValidation;
  conditional?: ConditionalRule;
  group?: string;
}

export type FieldType = 
  | 'field-selector' 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'color' 
  | 'select' 
  | 'multi-select'
  | 'range' 
  | 'array' 
  | 'object'
  | 'color-palette'
  | 'font-family'
  | 'border-style';

export interface FieldOption {
  label: string;
  value: any;
  description?: string;
  icon?: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: any) => string | null;
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not-equals' | 'in' | 'not-in';
  value: any;
}

export interface ValidationRules {
  required: string[];
  fieldTypes: Record<string, string[]>;
  custom: Array<{
    name: string;
    validator: (config: any, dataColumns: any[]) => string | null;
  }>;
}

// ============================================================================
// CHART CONFIGURATION SERVICE
// ============================================================================

export class ChartConfigurationService {
  private static instance: ChartConfigurationService | null = null;
  private configurationCache: Map<string, ChartConfigurationTemplate> = new Map();
  private templateGenerators: Map<string, (chartType: string) => ChartConfigurationTemplate> = new Map();

  private constructor() {
    this.initializeTemplateGenerators();
  }

  static getInstance(): ChartConfigurationService {
    if (!ChartConfigurationService.instance) {
      ChartConfigurationService.instance = new ChartConfigurationService();
    }
    return ChartConfigurationService.instance;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get configuration template for a specific chart type
   */
  async getConfigurationTemplate(
    chartType: string, 
    library: string
  ): Promise<ChartConfigurationTemplate> {
    const cacheKey = `${library}-${chartType}`;
    
    // Check cache first
    if (this.configurationCache.has(cacheKey)) {
      return this.configurationCache.get(cacheKey)!;
    }

    // Try to get from chart registry
    let template = await this.loadFromRegistry(chartType, library);
    
    // Fallback to generated template
    if (!template) {
      template = this.generateTemplate(chartType, library);
    }

    // Cache the result
    this.configurationCache.set(cacheKey, template);
    
    return template;
  }

  /**
   * Generate default configuration from template
   */
  generateDefaultConfiguration(
    template: ChartConfigurationTemplate
  ): Record<string, any> {
    const config: Record<string, any> = {
      chartType: template.chartType,
      library: template.library,
      fieldAssignments: {},
      ...template.defaults
    };

    // Set defaults from all fields
    template.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.default !== undefined) {
          this.setNestedValue(config, field.key, field.default);
        }
      });
    });

    return config;
  }

  /**
   * Validate configuration against template
   */
  validateConfiguration(
    config: Record<string, any>,
    template: ChartConfigurationTemplate,
    dataColumns: Array<{ name: string; data_type: string }>
  ): {
    isValid: boolean;
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
  } {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];

    // Validate required fields
    template.validation.required.forEach(fieldKey => {
      const value = this.getNestedValue(config, fieldKey);
      if (value === undefined || value === null || value === '') {
        const field = this.findFieldByKey(template, fieldKey);
        errors.push({
          field: fieldKey,
          message: `${field?.title || fieldKey} is required`,
          severity: 'error'
        });
      }
    });

    // Validate field types
    Object.entries(template.validation.fieldTypes).forEach(([fieldKey, expectedTypes]) => {
      const fieldValue = this.getNestedValue(config, fieldKey);
      if (fieldValue) {
        const column = dataColumns.find(col => col.name === fieldValue);
        if (column && !this.isValidDataType(column.data_type, expectedTypes)) {
          errors.push({
            field: fieldKey,
            message: `${column.name} (${column.data_type}) is not suitable for ${fieldKey}`,
            severity: 'warning'
          });
        }
      }
    });

    // Run custom validations
    template.validation.custom.forEach(validator => {
      const error = validator.validator(config, dataColumns);
      if (error) {
        errors.push({
          field: validator.name,
          message: error,
          severity: 'error'
        });
      }
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  // ============================================================================
  // TEMPLATE GENERATORS
  // ============================================================================

  private initializeTemplateGenerators() {
    // Bar Chart Template
    this.templateGenerators.set('bar', (chartType) => ({
      chartType,
      library: 'echarts',
      defaults: {
        title: 'Bar Chart',
        orientation: 'vertical',
        showValues: false,
        animation: true,
        colors: ['#5470c6', '#91cc75', '#fac858']
      },
      sections: [
        {
          id: 'data-mapping',
          title: 'Data Mapping',
          icon: 'dataset',
          fields: [
            {
              key: 'xField',
              type: 'field-selector',
              title: 'Category Field (X-Axis)',
              description: 'Field to use for categories',
              required: true
            },
            {
              key: 'yField',
              type: 'field-selector',
              title: 'Value Field (Y-Axis)',
              description: 'Field to use for values',
              required: true
            },
            {
              key: 'seriesField',
              type: 'field-selector',
              title: 'Series Field',
              description: 'Optional field for multiple series'
            }
          ]
        },
        {
          id: 'appearance',
          title: 'Appearance',
          icon: 'palette',
          fields: [
            {
              key: 'title',
              type: 'string',
              title: 'Chart Title',
              default: 'Bar Chart'
            },
            {
              key: 'orientation',
              type: 'select',
              title: 'Orientation',
              default: 'vertical',
              options: [
                { label: 'Vertical', value: 'vertical' },
                { label: 'Horizontal', value: 'horizontal' }
              ]
            },
            {
              key: 'colors',
              type: 'color-palette',
              title: 'Color Palette',
              default: ['#5470c6', '#91cc75', '#fac858']
            },
            {
              key: 'barWidth',
              type: 'range',
              title: 'Bar Width (%)',
              default: 60,
              validation: { min: 10, max: 100 }
            }
          ]
        },
        {
          id: 'behavior',
          title: 'Behavior',
          icon: 'settings',
          collapsed: true,
          fields: [
            {
              key: 'animation',
              type: 'boolean',
              title: 'Enable Animation',
              default: true
            },
            {
              key: 'showValues',
              type: 'boolean',
              title: 'Show Values on Bars',
              default: false
            },
            {
              key: 'stack',
              type: 'boolean',
              title: 'Stack Bars',
              default: false
            }
          ]
        }
      ],
      validation: {
        required: ['xField', 'yField'],
        fieldTypes: {
          xField: ['categorical', 'date'],
          yField: ['numeric'],
          seriesField: ['categorical']
        },
        custom: [
          {
            name: 'uniqueness',
            validator: (config, dataColumns) => {
              if (config.xField === config.yField) {
                return 'X-Axis and Y-Axis fields must be different';
              }
              return null;
            }
          }
        ]
      }
    }));

    // Pie Chart Template
    this.templateGenerators.set('pie', (chartType) => ({
      chartType,
      library: 'echarts',
      defaults: {
        title: 'Pie Chart',
        innerRadius: 0,
        showLabels: true,
        showPercentages: true,
        legendPosition: 'right'
      },
      sections: [
        {
          id: 'data-mapping',
          title: 'Data Mapping',
          icon: 'dataset',
          fields: [
            {
              key: 'nameField',
              type: 'field-selector',
              title: 'Label Field',
              description: 'Field to use for slice labels',
              required: true
            },
            {
              key: 'valueField',
              type: 'field-selector',
              title: 'Value Field',
              description: 'Field to use for slice values',
              required: true
            }
          ]
        },
        {
          id: 'appearance',
          title: 'Appearance',
          icon: 'palette',
          fields: [
            {
              key: 'title',
              type: 'string',
              title: 'Chart Title',
              default: 'Pie Chart'
            },
            {
              key: 'innerRadius',
              type: 'range',
              title: 'Inner Radius (%)',
              description: 'Set > 0 for donut chart',
              default: 0,
              validation: { min: 0, max: 80 }
            },
            {
              key: 'colors',
              type: 'color-palette',
              title: 'Color Palette'
            },
            {
              key: 'legendPosition',
              type: 'select',
              title: 'Legend Position',
              default: 'right',
              options: [
                { label: 'Top', value: 'top' },
                { label: 'Bottom', value: 'bottom' },
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
                { label: 'None', value: 'none' }
              ]
            }
          ]
        },
        {
          id: 'behavior',
          title: 'Behavior',
          icon: 'settings',
          collapsed: true,
          fields: [
            {
              key: 'showLabels',
              type: 'boolean',
              title: 'Show Labels',
              default: true
            },
            {
              key: 'showPercentages',
              type: 'boolean',
              title: 'Show Percentages',
              default: true
            },
            {
              key: 'animation',
              type: 'boolean',
              title: 'Enable Animation',
              default: true
            }
          ]
        }
      ],
      validation: {
        required: ['nameField', 'valueField'],
        fieldTypes: {
          nameField: ['categorical'],
          valueField: ['numeric']
        },
        custom: [
          {
            name: 'uniqueness',
            validator: (config, dataColumns) => {
              if (config.nameField === config.valueField) {
                return 'Name and Value fields must be different';
              }
              return null;
            }
          }
        ]
      }
    }));

    // Line Chart Template
    this.templateGenerators.set('line', (chartType) => ({
      chartType,
      library: 'echarts',
      defaults: {
        title: 'Line Chart',
        smooth: false,
        showSymbols: true,
        animation: true
      },
      sections: [
        {
          id: 'data-mapping',
          title: 'Data Mapping',
          icon: 'dataset',
          fields: [
            {
              key: 'xField',
              type: 'field-selector',
              title: 'X-Axis Field',
              required: true
            },
            {
              key: 'yField',
              type: 'field-selector',
              title: 'Y-Axis Field',
              required: true
            },
            {
              key: 'seriesField',
              type: 'field-selector',
              title: 'Series Field',
              description: 'Optional field for multiple lines'
            }
          ]
        },
        {
          id: 'appearance',
          title: 'Appearance',
          icon: 'palette',
          fields: [
            {
              key: 'title',
              type: 'string',
              title: 'Chart Title',
              default: 'Line Chart'
            },
            {
              key: 'colors',
              type: 'color-palette',
              title: 'Color Palette'
            },
            {
              key: 'lineWidth',
              type: 'range',
              title: 'Line Width',
              default: 2,
              validation: { min: 1, max: 10 }
            }
          ]
        },
        {
          id: 'behavior',
          title: 'Behavior',
          icon: 'settings',
          collapsed: true,
          fields: [
            {
              key: 'smooth',
              type: 'boolean',
              title: 'Smooth Lines',
              default: false
            },
            {
              key: 'showSymbols',
              type: 'boolean',
              title: 'Show Data Points',
              default: true
            },
            {
              key: 'animation',
              type: 'boolean',
              title: 'Enable Animation',
              default: true
            }
          ]
        }
      ],
      validation: {
        required: ['xField', 'yField'],
        fieldTypes: {
          xField: ['categorical', 'date', 'numeric'],
          yField: ['numeric'],
          seriesField: ['categorical']
        },
        custom: []
      }
    }));
  }

  private async loadFromRegistry(
    chartType: string, 
    library: string
  ): Promise<ChartConfigurationTemplate | null> {
    try {
      await ChartRegistry.initialize();
      const plugin = ChartRegistry.getPlugin(`${library}-${chartType}`);
      
      if (plugin && plugin.configSchema) {
        return this.convertFromPluginSchema(plugin);
      }
    } catch (error) {
      console.warn('Failed to load from registry:', error);
    }
    
    return null;
  }

  private convertFromPluginSchema(plugin: any): ChartConfigurationTemplate {
    const sections: ConfigurationSection[] = [];
    const currentSection: { [key: string]: ConfigurationField[] } = {
      'data-mapping': [],
      'appearance': [],
      'behavior': []
    };

    // Convert schema properties to fields
    if (plugin.configSchema.properties) {
      Object.entries(plugin.configSchema.properties).forEach(([key, property]: [string, any]) => {
        const field: ConfigurationField = {
          key,
          type: this.mapSchemaType(property.type),
          title: property.title || key,
          description: property.description,
          required: plugin.configSchema.required?.includes(key),
          default: property.default,
          options: property.enum?.map((value: any) => ({
            label: typeof value === 'object' ? value.label : value,
            value: typeof value === 'object' ? value.value : value
          })),
          validation: {
            min: property.minimum,
            max: property.maximum,
            pattern: property.pattern
          }
        };

        // Categorize field
        const section = this.categorizeField(key, property);
        currentSection[section].push(field);
      });
    }

    // Build sections
    Object.entries(currentSection).forEach(([sectionId, fields]) => {
      if (fields.length > 0) {
        sections.push({
          id: sectionId,
          title: this.getSectionTitle(sectionId),
          icon: this.getSectionIcon(sectionId),
          fields
        });
      }
    });

    return {
      chartType: plugin.name.replace(/^.*-/, ''),
      library: plugin.library,
      sections,
      defaults: this.extractDefaults(plugin.configSchema),
      validation: {
        required: plugin.configSchema.required || [],
        fieldTypes: this.extractFieldTypes(plugin.dataRequirements),
        custom: []
      }
    };
  }

  private generateTemplate(chartType: string, library: string): ChartConfigurationTemplate {
    const generator = this.templateGenerators.get(chartType.toLowerCase());
    
    if (generator) {
      return generator(chartType);
    }

    // Fallback template
    return {
      chartType,
      library,
      defaults: { title: `${chartType} Chart` },
      sections: [
        {
          id: 'basic',
          title: 'Basic Settings',
          icon: 'settings',
          fields: [
            {
              key: 'title',
              type: 'string',
              title: 'Chart Title',
              default: `${chartType} Chart`
            }
          ]
        }
      ],
      validation: {
        required: [],
        fieldTypes: {},
        custom: []
      }
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapSchemaType(schemaType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      'string': 'string',
      'number': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'field-selector': 'field-selector',
      'color': 'color',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[schemaType] || 'string';
  }

  private categorizeField(key: string, property: any): string {
    if (property.group) return property.group;
    
    if (key.includes('Field') || key.includes('field')) return 'data-mapping';
    if (key.includes('color') || key.includes('title') || key.includes('legend')) return 'appearance';
    return 'behavior';
  }

  private getSectionTitle(sectionId: string): string {
    const titles: Record<string, string> = {
      'data-mapping': 'Data Mapping',
      'appearance': 'Appearance',
      'behavior': 'Behavior',
      'advanced': 'Advanced'
    };
    return titles[sectionId] || sectionId;
  }

  private getSectionIcon(sectionId: string): string {
    const icons: Record<string, string> = {
      'data-mapping': 'dataset',
      'appearance': 'palette',
      'behavior': 'settings',
      'advanced': 'code'
    };
    return icons[sectionId] || 'settings';
  }

  private extractDefaults(schema: any): Record<string, any> {
    const defaults: Record<string, any> = {};
    
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
        if (property.default !== undefined) {
          defaults[key] = property.default;
        }
      });
    }
    
    return defaults;
  }

  private extractFieldTypes(dataRequirements: any): Record<string, string[]> {
    // This would be more sophisticated based on the chart type
    return {
      xField: ['categorical', 'date'],
      yField: ['numeric'],
      nameField: ['categorical'],
      valueField: ['numeric']
    };
  }

  private findFieldByKey(template: ChartConfigurationTemplate, key: string): ConfigurationField | null {
    for (const section of template.sections) {
      const field = section.fields.find(f => f.key === key);
      if (field) return field;
    }
    return null;
  }

  private isValidDataType(dataType: string, expectedTypes: string[]): boolean {
    const typeChecks: Record<string, (type: string) => boolean> = {
      numeric: (type) => ['number', 'integer', 'decimal', 'float', 'double', 'bigint'].some(t => 
        type.toLowerCase().includes(t)
      ),
      categorical: (type) => ['string', 'varchar', 'text', 'char'].some(t => 
        type.toLowerCase().includes(t)
      ),
      date: (type) => ['date', 'datetime', 'timestamp', 'time'].some(t => 
        type.toLowerCase().includes(t)
      )
    };

    return expectedTypes.some(expectedType => 
      typeChecks[expectedType]?.(dataType) || expectedType === 'any'
    );
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (current[key] === undefined) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }
}

// Export singleton instance
export const chartConfigurationService = ChartConfigurationService.getInstance();