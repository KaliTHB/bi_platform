import { FieldAssignments } from '@/types/chart.types';
import ChartFactoryService from './ChartFactoryService';

export class ConfigMappingService {
  static async mapToFactoryConfig(
    dataConfig: {
      fieldAssignments: FieldAssignments;
      aggregations: any;
      filters: any;
      customConfig: any;
    },
    chartType: { id: string; library: string }
  ): Promise<any> {
    
    // Get the factory schema for this chart type
    const schema = await ChartFactoryService.getConfigSchema(chartType.id, chartType.library);
    
    const factoryConfig: any = {};

    // 1. Map Field Assignments to Factory Config
    this.mapFieldAssignments(dataConfig.fieldAssignments, factoryConfig, schema);

    // 2. Map Aggregations
    this.mapAggregations(dataConfig.aggregations, factoryConfig, schema);

    // 3. Map Filters
    this.mapFilters(dataConfig.filters, factoryConfig, schema);

    // 4. Map Custom Configuration
    this.mapCustomConfig(dataConfig.customConfig, factoryConfig, schema);

    // 5. Set Default Values
    this.setDefaultValues(factoryConfig, schema);

    console.log('🔄 Mapped configuration to factory format:', factoryConfig);
    return factoryConfig;
  }

  private static mapFieldAssignments(
    assignments: FieldAssignments, 
    factoryConfig: any, 
    schema: any
  ): void {
    Object.entries(assignments).forEach(([axisType, field]) => {
      if (!field) return;

      switch (axisType) {
        case 'x-axis':
          if (schema['xAxis.field'] || schema['xField']) {
            factoryConfig['xAxis.field'] = Array.isArray(field) ? field[0].name : field.name;
            factoryConfig['xField'] = Array.isArray(field) ? field[0].name : field.name;
          }
          break;

        case 'y-axis':
          if (Array.isArray(field)) {
            factoryConfig['yAxis.field'] = field.map(f => f.name);
            factoryConfig['yField'] = field.map(f => f.name);
          } else {
            factoryConfig['yAxis.field'] = field.name;
            factoryConfig['yField'] = field.name;
          }
          break;

        case 'series':
          if (!Array.isArray(field)) {
            factoryConfig['series.field'] = field.name;
            factoryConfig['seriesField'] = field.name;
          }
          break;

        case 'category':
          if (!Array.isArray(field)) {
            factoryConfig['labelField'] = field.name;
            factoryConfig['categoryField'] = field.name;
          }
          break;

        case 'value':
          if (!Array.isArray(field)) {
            factoryConfig['valueField'] = field.name;
          }
          break;

        case 'size':
          if (!Array.isArray(field)) {
            factoryConfig['sizeField'] = field.name;
          }
          break;

        case 'color':
          if (!Array.isArray(field)) {
            factoryConfig['colorField'] = field.name;
          }
          break;
      }
    });
  }

  private static mapAggregations(
    aggregations: any, 
    factoryConfig: any, 
    schema: any
  ): void {
    if (!aggregations || Object.keys(aggregations).length === 0) return;

    // Map aggregation settings to factory format
    Object.entries(aggregations).forEach(([fieldName, config]: [string, any]) => {
      if (config.aggregation) {
        factoryConfig[`${fieldName}.aggregation`] = config.aggregation;
      }
      if (config.groupBy) {
        factoryConfig.groupBy = config.groupBy;
      }
    });
  }

  private static mapFilters(
    filters: any, 
    factoryConfig: any, 
    schema: any
  ): void {
    if (!filters || !filters.rules || filters.rules.length === 0) return;

    // Convert filters to factory format
    factoryConfig.filters = filters.rules
      .filter((rule: any) => rule.enabled)
      .map((rule: any) => ({
        field: rule.fieldName,
        operator: rule.operator,
        value: rule.value,
        type: rule.fieldType
      }));
  }

  private static mapCustomConfig(
    customConfig: any, 
    factoryConfig: any, 
    schema: any
  ): void {
    if (!customConfig || Object.keys(customConfig).length === 0) return;

    // Direct mapping for custom configuration
    Object.entries(customConfig).forEach(([key, value]) => {
      // Check if this key exists in schema
      if (schema[key] || key.includes('.')) {
        factoryConfig[key] = value;
      }
    });

    // Common mappings
    if (customConfig.title) {
      factoryConfig.title = customConfig.title;
    }

    if (customConfig.colors) {
      factoryConfig.colors = customConfig.colors;
      factoryConfig.color = customConfig.colors;
    }

    if (customConfig.showLegend !== undefined) {
      factoryConfig['legend.show'] = customConfig.showLegend;
      factoryConfig.showLegend = customConfig.showLegend;
    }

    if (customConfig.showGrid !== undefined) {
      factoryConfig['grid.show'] = customConfig.showGrid;
      factoryConfig.showGrid = customConfig.showGrid;
    }

    // Axis labels
    if (customConfig.xAxisLabel) {
      factoryConfig['xAxis.label'] = customConfig.xAxisLabel;
    }

    if (customConfig.yAxisLabel) {
      factoryConfig['yAxis.label'] = customConfig.yAxisLabel;
    }

    // Chart dimensions
    if (customConfig.width) {
      factoryConfig.width = customConfig.width;
    }

    if (customConfig.height) {
      factoryConfig.height = customConfig.height;
    }
  }

  private static setDefaultValues(factoryConfig: any, schema: any): void {
    // Set default values for required fields that don't have values
    Object.entries(schema).forEach(([key, schemaField]: [string, any]) => {
      if (schemaField.required && 
          factoryConfig[key] === undefined && 
          schemaField.default !== undefined) {
        factoryConfig[key] = schemaField.default;
      }

      // Set common defaults
      if (key === 'animation' && factoryConfig[key] === undefined) {
        factoryConfig[key] = true;
      }

      if (key === 'responsive' && factoryConfig[key] === undefined) {
        factoryConfig[key] = true;
      }
    });

    // Library-specific defaults
    if (!factoryConfig.colors) {
      factoryConfig.colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
      ];
    }
  }

  static validateMappedConfig(
    factoryConfig: any,
    chartType: { id: string; library: string },
    assignments: FieldAssignments
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required field assignments
    const requiredAxes = ['x-axis', 'y-axis'];
    requiredAxes.forEach(axis => {
      const assignment = assignments[axis];
      if (!assignment || (Array.isArray(assignment) && assignment.length === 0)) {
        errors.push(`${axis.replace('-', ' ')} field is required`);
      }
    });

    // Check data field mappings
    if (!factoryConfig.xField && !factoryConfig['xAxis.field']) {
      errors.push('X-axis field mapping is missing');
    }

    if (!factoryConfig.yField && !factoryConfig['yAxis.field']) {
      errors.push('Y-axis field mapping is missing');
    }

    // Chart-specific validations
    switch (chartType.id) {
      case 'pie':
      case 'pie-chart':
        if (!factoryConfig.labelField && !factoryConfig.categoryField) {
          errors.push('Pie chart requires a category field');
        }
        if (!factoryConfig.valueField) {
          errors.push('Pie chart requires a value field');
        }
        break;

      case 'scatter':
      case 'scatter-plot':
        if (factoryConfig.xField && factoryConfig.yField) {
          const xField = assignments['x-axis'];
          const yField = assignments['y-axis'];
          if (xField && !Array.isArray(xField) && xField.type !== 'number') {
            warnings.push('Scatter plot works best with numeric X-axis');
          }
          if (yField && !Array.isArray(yField) && yField.type !== 'number') {
            warnings.push('Scatter plot works best with numeric Y-axis');
          }
        }
        break;

      case 'line':
      case 'line-chart':
        const xField = assignments['x-axis'];
        if (xField && !Array.isArray(xField) && 
            !['date', 'number'].includes(xField.type)) {
          warnings.push('Line chart works best with date or numeric X-axis');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default ConfigMappingService;