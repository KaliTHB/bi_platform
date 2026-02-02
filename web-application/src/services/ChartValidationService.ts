// src/services/ChartValidationService.ts (No Logger Dependency)
import type { 
  ChartValidationResult, 
  ValidationError,
  ValidationWarning,
  Chart,
  ChartConfiguration,
  ChartData 
} from '@/types/chart.types';

interface ChartValidationOptions {
  strict?: boolean;
  skipDataValidation?: boolean;
  customRules?: ValidationRule[];
}

interface ValidationRule {
  name: string;
  validate: (chart: any) => ValidationError | null;
}

export class ChartValidationService {
  private validationRules: Map<string, ValidationRule> = new Map();
  private enableLogging: boolean;

  constructor(enableLogging: boolean = process.env.NODE_ENV === 'development') {
    this.enableLogging = enableLogging;
    this.initializeDefaultRules();
    this.log('ChartValidationService initialized');
  }

  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`[ChartValidationService] ${message}`, data || '');
    }
  }

  private logError(message: string, error?: any): void {
    console.error(`[ChartValidationService ERROR] ${message}`, error || '');
  }

  /**
   * Validate a complete chart configuration
   */
  public validateChart(
    chart: Partial<Chart>, 
    data?: ChartData,
    options: ChartValidationOptions = {}
  ): ChartValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.log('Starting chart validation', { chartName: chart.name, chartType: chart.type });

      // Basic chart structure validation
      const structureErrors = this.validateChartStructure(chart);
      errors.push(...structureErrors);

      // Chart type specific validation
      if (chart.type) {
        const typeErrors = this.validateChartType(chart.type, chart);
        errors.push(...typeErrors);
      }

      // Data validation (if data is provided)
      if (data && !options.skipDataValidation) {
        const dataErrors = this.validateChartData(chart, data);
        errors.push(...dataErrors);
      }

      // Configuration validation
      if (chart.visualization_config) {
        const configErrors = this.validateVisualizationConfig(
          chart.type || 'bar', 
          chart.visualization_config
        );
        errors.push(...configErrors);
      }

      // Custom rules validation
      if (options.customRules) {
        for (const rule of options.customRules) {
          const ruleError = rule.validate(chart);
          if (ruleError) {
            errors.push(ruleError);
          }
        }
      }

      // Generate warnings for best practices
      const practiceWarnings = this.generateBestPracticeWarnings(chart);
      warnings.push(...practiceWarnings);

      const result = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      this.log('Chart validation completed', { 
        valid: result.valid, 
        errorCount: errors.length, 
        warningCount: warnings.length 
      });

      return result;

    } catch (error) {
      this.logError('Error during chart validation:', error);
      return {
        valid: false,
        errors: [{
          field: 'general',
          message: 'Validation failed due to internal error',
          severity: 'error'
        }],
        warnings
      };
    }
  }

  /**
   * Quick validation for chart creation/updates
   */
  public quickValidate(chart: Partial<Chart>): { valid: boolean; message?: string } {
    // Basic required fields check
    if (!chart.name || chart.name.trim().length === 0) {
      return { valid: false, message: 'Chart name is required' };
    }

    if (!chart.type) {
      return { valid: false, message: 'Chart type is required' };
    }

    if (!chart.dataset_id) {
      return { valid: false, message: 'Dataset is required' };
    }

    return { valid: true };
  }

  /**
   * Validate chart data compatibility
   */
  public validateDataCompatibility(
    chartType: string, 
    data: ChartData
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || !data.data || data.data.length === 0) {
      errors.push({
        field: 'data',
        message: 'Chart data cannot be empty',
        severity: 'error'
      });
      return errors;
    }

    const columns = data.columns || [];
    
    // Type-specific data requirements
    switch (chartType) {
      case 'pie':
      case 'doughnut':
        if (columns.length < 2) {
          errors.push({
            field: 'data',
            message: 'Pie charts require at least 2 columns (label and value)',
            severity: 'error'
          });
        }
        break;

      case 'scatter':
      case 'bubble':
        if (columns.length < 2) {
          errors.push({
            field: 'data',
            message: 'Scatter plots require at least 2 numeric columns',
            severity: 'error'
          });
        }
        break;

      case 'heatmap':
        if (columns.length < 3) {
          errors.push({
            field: 'data',
            message: 'Heatmaps require at least 3 columns (X, Y, and value)',
            severity: 'error'
          });
        }
        break;

      case 'line':
      case 'area':
        const hasTimeColumn = columns.some(col => 
          col.type === 'date' || col.type === 'timestamp' || col.type === 'datetime'
        );
        if (!hasTimeColumn) {
          errors.push({
            field: 'data',
            message: 'Line/Area charts work best with time-series data',
            severity: 'warning'
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Name validation rule
    this.validationRules.set('name', {
      name: 'Chart Name Validation',
      validate: (chart: any) => {
        if (!chart.name || typeof chart.name !== 'string') {
          return {
            field: 'name',
            message: 'Chart name is required and must be a string',
            severity: 'error' as const
          };
        }
        if (chart.name.length > 100) {
          return {
            field: 'name',
            message: 'Chart name cannot exceed 100 characters',
            severity: 'error' as const
          };
        }
        return null;
      }
    });

    // Type validation rule
    this.validationRules.set('type', {
      name: 'Chart Type Validation',
      validate: (chart: any) => {
        const validTypes = [
          'bar', 'column', 'line', 'area', 'pie', 'doughnut',
          'scatter', 'bubble', 'heatmap', 'gauge', 'table',
          'metric', 'funnel', 'waterfall', 'candlestick'
        ];
        
        if (!chart.type || !validTypes.includes(chart.type)) {
          return {
            field: 'type',
            message: `Chart type must be one of: ${validTypes.join(', ')}`,
            severity: 'error' as const
          };
        }
        return null;
      }
    });
  }

  /**
   * Validate basic chart structure
   */
  private validateChartStructure(chart: Partial<Chart>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Run all validation rules
    for (const [ruleName, rule] of this.validationRules) {
      const error = rule.validate(chart);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Validate chart type specific requirements
   */
  private validateChartType(type: string, chart: Partial<Chart>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Add type-specific validation logic here
    switch (type) {
      case 'metric':
        if (!chart.query_config?.measures || chart.query_config.measures.length === 0) {
          errors.push({
            field: 'query_config.measures',
            message: 'Metric charts require at least one measure',
            severity: 'error'
          });
        }
        break;

      case 'table':
        const hasData = chart.query_config?.dimensions || chart.query_config?.measures;
        if (!hasData) {
          errors.push({
            field: 'query_config',
            message: 'Table charts require at least one dimension or measure',
            severity: 'error'
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validate chart data
   */
  private validateChartData(chart: Partial<Chart>, data: ChartData): ValidationError[] {
    if (!chart.type) return [];
    
    return this.validateDataCompatibility(chart.type, data);
  }

  /**
   * Validate visualization configuration
   */
  private validateVisualizationConfig(
    chartType: string, 
    config: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Add configuration validation logic based on chart type
    if (chartType === 'bar' || chartType === 'column') {
      if (config.x_axis && !config.x_axis.field) {
        errors.push({
          field: 'visualization_config.x_axis.field',
          message: 'X-axis field is required for bar/column charts',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Generate best practice warnings
   */
  private generateBestPracticeWarnings(chart: Partial<Chart>): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for long chart names
    if (chart.name && chart.name.length > 50) {
      warnings.push({
        field: 'name',
        message: 'Consider using a shorter chart name for better display',
        severity: 'medium'
      });
    }

    // Check for missing description
    if (!chart.description) {
      warnings.push({
        field: 'description',
        message: 'Adding a description helps users understand the chart purpose',
        severity: 'low'
      });
    }

    return warnings;
  }

  /**
   * Add custom validation rule
   */
  public addValidationRule(name: string, rule: ValidationRule): void {
    this.validationRules.set(name, rule);
    this.log(`Added custom validation rule: ${name}`);
  }

  /**
   * Remove validation rule
   */
  public removeValidationRule(name: string): boolean {
    const removed = this.validationRules.delete(name);
    if (removed) {
      this.log(`Removed validation rule: ${name}`);
    }
    return removed;
  }
}

// Export both named and default for flexibility
export default ChartValidationService;