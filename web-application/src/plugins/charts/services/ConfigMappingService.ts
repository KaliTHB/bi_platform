import { FieldAssignments, ChartConfiguration } from '@/types/chart.types';

/**
 * Service for mapping between custom chart configuration and factory configuration
 * Handles the translation of user-friendly config to chart-specific config formats
 */
export class ConfigMappingService {
  
  /**
   * Map field assignments and custom configuration to factory configuration
   */
  static mapToFactoryConfig(
    assignments: FieldAssignments,
    customConfig: any,
    chartType: { id: string; library: string },
    schema?: any
  ): any {
    const factoryConfig: any = {};

    console.log('ConfigMapping Debug:', {
      assignments,
      customConfig,
      chartType,
      schema
    });

    // CRITICAL FIX: Map field assignments first
    this.mapFieldAssignments(factoryConfig, assignments);

    // Map custom configuration
    if (customConfig) {
      this.mapCustomConfig(factoryConfig, customConfig);
    }

    // Apply schema defaults
    if (schema) {
      this.setDefaultValues(factoryConfig, schema);
    }

    // Ensure axis field mappings exist
    this.ensureAxisFieldMappings(factoryConfig, assignments);

    console.log('Final Factory Config:', factoryConfig);

    return factoryConfig;
  }

  /**
   * CRITICAL FIX: Properly map field assignments to axis configurations
   */
  private static mapFieldAssignments(factoryConfig: any, assignments: FieldAssignments): void {
    if (!assignments) {
      console.warn('No field assignments provided');
      return;
    }

    // Initialize axes configuration
    factoryConfig.axes = {
      x: {},
      y: {}
    };

    // Map X-axis field
    const xAxisAssignment = assignments['x-axis'];
    if (xAxisAssignment) {
      const xField = Array.isArray(xAxisAssignment) ? xAxisAssignment[0] : xAxisAssignment;
      if (xField?.name) {
        factoryConfig.xField = xField.name;
        factoryConfig['xAxis.field'] = xField.name;
        factoryConfig.axes.x.field = xField.name;
        factoryConfig.axes.x.type = this.inferAxisType(xField.type);
        
        console.log('Mapped X-axis field:', xField.name);
      }
    }

    // Map Y-axis field
    const yAxisAssignment = assignments['y-axis'];
    if (yAxisAssignment) {
      const yField = Array.isArray(yAxisAssignment) ? yAxisAssignment[0] : yAxisAssignment;
      if (yField?.name) {
        factoryConfig.yField = yField.name;
        factoryConfig['yAxis.field'] = yField.name;
        factoryConfig.axes.y.field = yField.name;
        factoryConfig.axes.y.type = this.inferAxisType(yField.type);
        
        console.log('Mapped Y-axis field:', yField.name);
      }
    }

    // Map other common field assignments
    const categoryAssignment = assignments['category'];
    if (categoryAssignment) {
      const categoryField = Array.isArray(categoryAssignment) ? categoryAssignment[0] : categoryAssignment;
      if (categoryField?.name) {
        factoryConfig.categoryField = categoryField.name;
        factoryConfig.labelField = categoryField.name;
      }
    }

    const valueAssignment = assignments['value'];
    if (valueAssignment) {
      const valueField = Array.isArray(valueAssignment) ? valueAssignment[0] : valueAssignment;
      if (valueField?.name) {
        factoryConfig.valueField = valueField.name;
      }
    }

    const seriesAssignment = assignments['series'];
    if (seriesAssignment) {
      const seriesField = Array.isArray(seriesAssignment) ? seriesAssignment[0] : seriesAssignment;
      if (seriesField?.name) {
        factoryConfig.seriesField = seriesField.name;
      }
    }
  }

  /**
   * Infer ECharts axis type from field type
   */
  private static inferAxisType(fieldType?: string): 'category' | 'value' | 'time' | 'log' {
    switch (fieldType?.toLowerCase()) {
      case 'string':
      case 'text':
        return 'category';
      case 'number':
      case 'integer':
      case 'float':
      case 'decimal':
        return 'value';
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'time';
      default:
        return 'category';
    }
  }

  /**
   * Map custom configuration to factory config
   */
  private static mapCustomConfig(factoryConfig: any, customConfig: any): void {
    // Direct property mapping
    Object.entries(customConfig).forEach(([key, value]) => {
      if (value !== undefined) {
        factoryConfig[key] = value;
      }
    });

    // Common mappings with proper nesting
    if (customConfig.title) {
      factoryConfig.title = typeof customConfig.title === 'string' 
        ? { text: customConfig.title }
        : customConfig.title;
    }

    if (customConfig.colors && Array.isArray(customConfig.colors)) {
      factoryConfig.colors = customConfig.colors;
      factoryConfig.color = customConfig.colors;
    }

    if (customConfig.showLegend !== undefined) {
      factoryConfig.legend = factoryConfig.legend || {};
      factoryConfig.legend.show = customConfig.showLegend;
      factoryConfig['legend.show'] = customConfig.showLegend;
    }

    if (customConfig.showGrid !== undefined) {
      factoryConfig.grid = factoryConfig.grid || {};
      factoryConfig.grid.show_x_grid = customConfig.showGrid;
      factoryConfig.grid.show_y_grid = customConfig.showGrid;
    }

    // CRITICAL FIX: Properly map axis labels
    if (customConfig.xAxisLabel || customConfig.xAxisTitle) {
      factoryConfig.axes = factoryConfig.axes || { x: {}, y: {} };
      factoryConfig.axes.x.title = customConfig.xAxisLabel || customConfig.xAxisTitle;
      factoryConfig.axes.x.label = customConfig.xAxisLabel || customConfig.xAxisTitle;
      factoryConfig['xAxis.label'] = customConfig.xAxisLabel || customConfig.xAxisTitle;
    }

    if (customConfig.yAxisLabel || customConfig.yAxisTitle) {
      factoryConfig.axes = factoryConfig.axes || { x: {}, y: {} };
      factoryConfig.axes.y.title = customConfig.yAxisLabel || customConfig.yAxisTitle;
      factoryConfig.axes.y.label = customConfig.yAxisLabel || customConfig.yAxisTitle;
      factoryConfig['yAxis.label'] = customConfig.yAxisLabel || customConfig.yAxisTitle;
    }

    // Chart dimensions
    if (customConfig.width || customConfig.height) {
      factoryConfig.dimensions = factoryConfig.dimensions || {};
      if (customConfig.width) factoryConfig.dimensions.width = customConfig.width;
      if (customConfig.height) factoryConfig.dimensions.height = customConfig.height;
    }

    // Field assignments from custom config (fallback)
    if (customConfig.xField && !factoryConfig.xField) {
      factoryConfig.xField = customConfig.xField;
      factoryConfig.axes = factoryConfig.axes || { x: {}, y: {} };
      factoryConfig.axes.x.field = customConfig.xField;
    }

    if (customConfig.yField && !factoryConfig.yField) {
      factoryConfig.yField = customConfig.yField;
      factoryConfig.axes = factoryConfig.axes || { x: {}, y: {} };
      factoryConfig.axes.y.field = customConfig.yField;
    }
  }

  /**
   * CRITICAL FIX: Ensure axis field mappings are not missing
   */
  private static ensureAxisFieldMappings(factoryConfig: any, assignments: FieldAssignments): void {
    // Initialize field assignments if missing
    if (!factoryConfig.fieldAssignments) {
      factoryConfig.fieldAssignments = assignments || {};
    }

    // Ensure axes configuration exists
    if (!factoryConfig.axes) {
      factoryConfig.axes = { x: {}, y: {} };
    }

    // Try to recover missing axis fields from various sources
    if (!factoryConfig.xField && !factoryConfig.axes.x.field) {
      const xAxisAssignment = assignments?.['x-axis'];
      if (xAxisAssignment) {
        const xField = Array.isArray(xAxisAssignment) ? xAxisAssignment[0]?.name : xAxisAssignment.name;
        if (xField) {
          factoryConfig.xField = xField;
          factoryConfig.axes.x.field = xField;
          console.log('Recovered X-axis field:', xField);
        }
      }
    }

    if (!factoryConfig.yField && !factoryConfig.axes.y.field) {
      const yAxisAssignment = assignments?.['y-axis'];
      if (yAxisAssignment) {
        const yField = Array.isArray(yAxisAssignment) ? yAxisAssignment[0]?.name : yAxisAssignment.name;
        if (yField) {
          factoryConfig.yField = yField;
          factoryConfig.axes.y.field = yField;
          console.log('Recovered Y-axis field:', yField);
        }
      }
    }
  }

  /**
   * Set default values based on schema
   */
  private static setDefaultValues(factoryConfig: any, schema: any): void {
    if (!schema || !schema.properties) return;

    Object.entries(schema.properties).forEach(([key, schemaField]: [string, any]) => {
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

    // Default axis types if not set
    if (factoryConfig.axes) {
      if (factoryConfig.axes.x && !factoryConfig.axes.x.type) {
        factoryConfig.axes.x.type = 'category';
      }
      if (factoryConfig.axes.y && !factoryConfig.axes.y.type) {
        factoryConfig.axes.y.type = 'value';
      }
    }
  }

  /**
   * Validate mapped configuration
   */
  static validateMappedConfig(
    factoryConfig: any,
    chartType: { id: string; library: string },
    assignments: FieldAssignments
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('Validating config:', {
      factoryConfig,
      chartType,
      assignments
    });

    // Check required field assignments for most charts
    if (!this.isPieChart(chartType.id)) {
      // Most charts need X and Y axes
      const requiredAxes = ['x-axis', 'y-axis'];
      requiredAxes.forEach(axis => {
        const assignment = assignments?.[axis];
        if (!assignment || (Array.isArray(assignment) && assignment.length === 0)) {
          errors.push(`${axis.replace('-', ' ')} field is required`);
        }
      });

      // Check that axis fields are mapped in factory config
      if (!factoryConfig.xField && !factoryConfig.axes?.x?.field && !factoryConfig['xAxis.field']) {
        errors.push('X-axis field mapping is missing from factory config');
      }

      if (!factoryConfig.yField && !factoryConfig.axes?.y?.field && !factoryConfig['yAxis.field']) {
        errors.push('Y-axis field mapping is missing from factory config');
      }
    }

    // Chart-specific validations
    switch (chartType.id.toLowerCase()) {
      case 'pie':
      case 'pie-chart':
      case 'donut':
        if (!factoryConfig.labelField && !factoryConfig.categoryField && !assignments?.category) {
          errors.push('Pie chart requires a category/label field');
        }
        if (!factoryConfig.valueField && !assignments?.value) {
          errors.push('Pie chart requires a value field');
        }
        break;

      case 'scatter':
      case 'scatter-plot':
      case 'bubble':
        if (factoryConfig.xField && factoryConfig.yField) {
          const xField = assignments?.['x-axis'];
          const yField = assignments?.['y-axis'];
          if (xField && !Array.isArray(xField) && xField.type && !['number', 'integer', 'float'].includes(xField.type)) {
            warnings.push('Scatter plot works best with numeric X-axis');
          }
          if (yField && !Array.isArray(yField) && yField.type && !['number', 'integer', 'float'].includes(yField.type)) {
            warnings.push('Scatter plot works best with numeric Y-axis');
          }
        }
        break;

      case 'line':
      case 'line-chart':
      case 'area':
        const xField = assignments?.['x-axis'];
        if (xField && !Array.isArray(xField) && xField.type && 
            !['date', 'datetime', 'number', 'integer', 'float'].includes(xField.type)) {
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

  /**
   * Check if chart type is a pie chart variant
   */
  private static isPieChart(chartId: string): boolean {
    const pieTypes = ['pie', 'pie-chart', 'donut', 'doughnut', 'ring'];
    return pieTypes.some(type => chartId.toLowerCase().includes(type));
  }

  /**
   * Create a complete field mapping from assignments for debugging
   */
  static createFieldMapping(assignments: FieldAssignments): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    Object.entries(assignments || {}).forEach(([key, assignment]) => {
      if (assignment) {
        const field = Array.isArray(assignment) ? assignment[0] : assignment;
        if (field?.name) {
          mapping[key] = field.name;
        }
      }
    });
    
    return mapping;
  }
}

export default ConfigMappingService;