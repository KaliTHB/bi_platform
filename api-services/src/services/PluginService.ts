// api-services/src/services/PluginService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'nosql' | 'files' | 'apis';
  version: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: PluginConfigSchema;
  capabilities?: DataSourceCapabilities;
  icon?: string;
  tags?: string[];
  isActive: boolean;
}

interface ChartPlugin {
  name: string;
  displayName: string;
  category: 'basic' | 'advanced' | 'statistical' | 'geographic' | 'custom';
  version: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: PluginConfigSchema;
  capabilities?: ChartCapabilities;
  icon?: string;
  tags?: string[];
  isActive: boolean;
}

interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'password' | 'select' | 'array' | 'object';
    required?: boolean;
    default?: any;
    options?: string[] | Array<{ label: string; value: string }>;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
    };
    description?: string;
    placeholder?: string;
    helpText?: string;
    group?: string;
    conditional?: {
      field: string;
      value: any;
    };
  };
}

interface DataSourceCapabilities {
  supportsBulkInsert?: boolean;
  supportsTransactions?: boolean;
  supportsStoredProcedures?: boolean;
  supportsCustomFunctions?: boolean;
  maxConcurrentConnections?: number;
  supportsStreaming?: boolean;
  supportsRealTime?: boolean;
  supportedDataTypes?: string[];
  supportsJoins?: boolean;
  supportsAggregations?: boolean;
}

interface ChartCapabilities {
  supportsDimensions?: number; // Max dimensions supported
  supportsMeasures?: number; // Max measures supported
  supportsFiltering?: boolean;
  supportsSorting?: boolean;
  supportsGrouping?: boolean;
  supportsInteractivity?: boolean;
  supportsAnimation?: boolean;
  supportsRealTime?: boolean;
  supportedDataTypes?: string[];
  requiredFields?: string[];
}

interface PluginConfiguration {
  id: string;
  workspace_id: string;
  plugin_type: 'datasource' | 'chart';
  plugin_name: string;
  configuration: any;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  version: string;
}

interface ConnectionTestResult {
  isValid: boolean;
  message: string;
  error?: string;
  details?: {
    connection_time_ms?: number;
    server_version?: string;
    database_count?: number;
    table_count?: number;
  };
}

interface PluginUsage {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  period: string;
  usage_count: number;
  unique_users: number;
  error_rate: number;
  avg_execution_time_ms: number;
  last_used_at?: Date;
  top_users: Array<{
    user_id: string;
    usage_count: number;
  }>;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export class PluginService {
  private dataSourcePlugins: Map<string, DataSourcePlugin> = new Map();
  private chartPlugins: Map<string, ChartPlugin> = new Map();
  private pluginConfigurations: Map<string, PluginConfiguration> = new Map();
  private pluginUsageStats: Map<string, PluginUsage> = new Map();

  constructor() {
    // Initialize with available plugins
    this.initializePlugins();
  }

  private initializePlugins(): void {
    // Initialize data source plugins
    this.registerDataSourcePlugins();
    // Initialize chart plugins
    this.registerChartPlugins();
  }

  private registerDataSourcePlugins(): void {
    const dataSourcePlugins: DataSourcePlugin[] = [
      {
        name: 'postgresql',
        displayName: 'PostgreSQL',
        category: 'relational',
        version: '1.0.0',
        description: 'Connect to PostgreSQL databases',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'database',
        tags: ['sql', 'relational', 'postgresql'],
        isActive: true,
        configSchema: {
          host: {
            type: 'string',
            required: true,
            description: 'Database host',
            placeholder: 'localhost'
          },
          port: {
            type: 'number',
            required: true,
            default: 5432,
            description: 'Database port',
            validation: { min: 1, max: 65535 }
          },
          database: {
            type: 'string',
            required: true,
            description: 'Database name'
          },
          username: {
            type: 'string',
            required: true,
            description: 'Username'
          },
          password: {
            type: 'password',
            required: true,
            description: 'Password'
          },
          ssl: {
            type: 'boolean',
            default: false,
            description: 'Use SSL connection'
          },
          connection_timeout: {
            type: 'number',
            default: 30,
            description: 'Connection timeout in seconds',
            validation: { min: 1, max: 300 }
          }
        },
        capabilities: {
          supportsBulkInsert: true,
          supportsTransactions: true,
          supportsStoredProcedures: true,
          supportsCustomFunctions: true,
          maxConcurrentConnections: 100,
          supportsStreaming: false,
          supportsRealTime: false,
          supportsJoins: true,
          supportsAggregations: true,
          supportedDataTypes: ['string', 'number', 'boolean', 'date', 'json']
        }
      },
      {
        name: 'mysql',
        displayName: 'MySQL',
        category: 'relational',
        version: '1.0.0',
        description: 'Connect to MySQL databases',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'database',
        tags: ['sql', 'relational', 'mysql'],
        isActive: true,
        configSchema: {
          host: {
            type: 'string',
            required: true,
            description: 'Database host',
            placeholder: 'localhost'
          },
          port: {
            type: 'number',
            required: true,
            default: 3306,
            description: 'Database port',
            validation: { min: 1, max: 65535 }
          },
          database: {
            type: 'string',
            required: true,
            description: 'Database name'
          },
          username: {
            type: 'string',
            required: true,
            description: 'Username'
          },
          password: {
            type: 'password',
            required: true,
            description: 'Password'
          },
          ssl: {
            type: 'boolean',
            default: false,
            description: 'Use SSL connection'
          }
        },
        capabilities: {
          supportsBulkInsert: true,
          supportsTransactions: true,
          supportsStoredProcedures: true,
          supportsCustomFunctions: true,
          maxConcurrentConnections: 100,
          supportsJoins: true,
          supportsAggregations: true,
          supportedDataTypes: ['string', 'number', 'boolean', 'date', 'json']
        }
      },
      {
        name: 'csv_file',
        displayName: 'CSV File',
        category: 'files',
        version: '1.0.0',
        description: 'Import data from CSV files',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'file-text',
        tags: ['csv', 'file', 'import'],
        isActive: true,
        configSchema: {
          file_path: {
            type: 'string',
            required: true,
            description: 'Path to CSV file'
          },
          delimiter: {
            type: 'select',
            options: [
              { label: 'Comma (,)', value: ',' },
              { label: 'Semicolon (;)', value: ';' },
              { label: 'Tab', value: '\t' },
              { label: 'Pipe (|)', value: '|' }
            ],
            default: ',',
            description: 'Field delimiter'
          },
          has_header: {
            type: 'boolean',
            default: true,
            description: 'First row contains headers'
          },
          encoding: {
            type: 'select',
            options: ['utf-8', 'iso-8859-1', 'windows-1252'],
            default: 'utf-8',
            description: 'File encoding'
          }
        },
        capabilities: {
          supportsBulkInsert: false,
          supportsTransactions: false,
          supportsJoins: false,
          supportsAggregations: false,
          supportedDataTypes: ['string', 'number', 'date']
        }
      }
    ];

    dataSourcePlugins.forEach(plugin => {
      this.dataSourcePlugins.set(plugin.name, plugin);
    });
  }

  private registerChartPlugins(): void {
    const chartPlugins: ChartPlugin[] = [
      {
        name: 'bar_chart',
        displayName: 'Bar Chart',
        category: 'basic',
        version: '1.0.0',
        description: 'Vertical and horizontal bar charts',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'bar-chart',
        tags: ['basic', 'comparison', 'categorical'],
        isActive: true,
        configSchema: {
          orientation: {
            type: 'select',
            options: [
              { label: 'Vertical', value: 'vertical' },
              { label: 'Horizontal', value: 'horizontal' }
            ],
            default: 'vertical',
            description: 'Bar orientation'
          },
          stacked: {
            type: 'boolean',
            default: false,
            description: 'Stack bars'
          },
          show_values: {
            type: 'boolean',
            default: true,
            description: 'Show values on bars'
          },
          color_scheme: {
            type: 'select',
            options: ['blue', 'green', 'red', 'purple', 'orange', 'custom'],
            default: 'blue',
            description: 'Color scheme'
          }
        },
        capabilities: {
          supportsDimensions: 2,
          supportsMeasures: 5,
          supportsFiltering: true,
          supportsSorting: true,
          supportsGrouping: true,
          supportsInteractivity: true,
          supportsAnimation: true,
          supportedDataTypes: ['string', 'number', 'date'],
          requiredFields: ['x_axis', 'y_axis']
        }
      },
      {
        name: 'line_chart',
        displayName: 'Line Chart',
        category: 'basic',
        version: '1.0.0',
        description: 'Line charts for time series and trends',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'trending-up',
        tags: ['basic', 'trends', 'time-series'],
        isActive: true,
        configSchema: {
          smooth_lines: {
            type: 'boolean',
            default: false,
            description: 'Smooth line curves'
          },
          show_points: {
            type: 'boolean',
            default: true,
            description: 'Show data points'
          },
          fill_area: {
            type: 'boolean',
            default: false,
            description: 'Fill area under line'
          },
          line_width: {
            type: 'number',
            default: 2,
            description: 'Line width in pixels',
            validation: { min: 1, max: 10 }
          }
        },
        capabilities: {
          supportsDimensions: 1,
          supportsMeasures: 10,
          supportsFiltering: true,
          supportsSorting: true,
          supportsGrouping: true,
          supportsInteractivity: true,
          supportsAnimation: true,
          supportsRealTime: true,
          supportedDataTypes: ['date', 'number'],
          requiredFields: ['x_axis', 'y_axis']
        }
      },
      {
        name: 'pie_chart',
        displayName: 'Pie Chart',
        category: 'basic',
        version: '1.0.0',
        description: 'Pie and donut charts for proportional data',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'pie-chart',
        tags: ['basic', 'proportional', 'categorical'],
        isActive: true,
        configSchema: {
          chart_type: {
            type: 'select',
            options: [
              { label: 'Pie', value: 'pie' },
              { label: 'Donut', value: 'donut' }
            ],
            default: 'pie',
            description: 'Chart style'
          },
          show_labels: {
            type: 'boolean',
            default: true,
            description: 'Show labels'
          },
          show_values: {
            type: 'boolean',
            default: true,
            description: 'Show values'
          },
          show_percentages: {
            type: 'boolean',
            default: true,
            description: 'Show percentages'
          }
        },
        capabilities: {
          supportsDimensions: 1,
          supportsMeasures: 1,
          supportsFiltering: true,
          supportsSorting: true,
          supportsInteractivity: true,
          supportsAnimation: true,
          supportedDataTypes: ['string', 'number'],
          requiredFields: ['dimension', 'measure']
        }
      },
      {
        name: 'table',
        displayName: 'Table',
        category: 'basic',
        version: '1.0.0',
        description: 'Data tables with sorting and pagination',
        author: 'BI Platform Team',
        license: 'MIT',
        icon: 'table',
        tags: ['basic', 'tabular', 'detailed'],
        isActive: true,
        configSchema: {
          page_size: {
            type: 'number',
            default: 20,
            description: 'Rows per page',
            validation: { min: 5, max: 1000 }
          },
          show_search: {
            type: 'boolean',
            default: true,
            description: 'Show search box'
          },
          show_pagination: {
            type: 'boolean',
            default: true,
            description: 'Show pagination'
          },
          striped_rows: {
            type: 'boolean',
            default: true,
            description: 'Alternate row colors'
          }
        },
        capabilities: {
          supportsDimensions: 20,
          supportsMeasures: 20,
          supportsFiltering: true,
          supportsSorting: true,
          supportsGrouping: false,
          supportsInteractivity: true,
          supportedDataTypes: ['string', 'number', 'date', 'boolean'],
          requiredFields: []
        }
      }
    ];

    chartPlugins.forEach(plugin => {
      this.chartPlugins.set(plugin.name, plugin);
    });
  }

  async getDataSourcePlugins(category?: string): Promise<DataSourcePlugin[]> {
    try {
      logger.info('Getting data source plugins', { category });

      let plugins = Array.from(this.dataSourcePlugins.values())
        .filter(plugin => plugin.isActive);

      if (category) {
        plugins = plugins.filter(plugin => plugin.category === category);
      }

      return plugins.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error: any) {
      logger.error('Error getting data source plugins:', error);
      throw new Error(`Failed to get data source plugins: ${error.message}`);
    }
  }

  async getChartPlugins(category?: string): Promise<ChartPlugin[]> {
    try {
      logger.info('Getting chart plugins', { category });

      let plugins = Array.from(this.chartPlugins.values())
        .filter(plugin => plugin.isActive);

      if (category) {
        plugins = plugins.filter(plugin => plugin.category === category);
      }

      return plugins.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error: any) {
      logger.error('Error getting chart plugins:', error);
      throw new Error(`Failed to get chart plugins: ${error.message}`);
    }
  }

  async testDataSourceConnection(pluginName: string, connectionConfig: any): Promise<ConnectionTestResult> {
    try {
      logger.info('Testing data source connection', { pluginName });

      const plugin = this.dataSourcePlugins.get(pluginName);
      if (!plugin) {
        return {
          isValid: false,
          message: 'Plugin not found',
          error: `Data source plugin '${pluginName}' not found`
        };
      }

      // Validate configuration against schema
      const validation = await this.validatePluginConfiguration('datasource', pluginName, connectionConfig);
      if (!validation.isValid) {
        return {
          isValid: false,
          message: 'Configuration validation failed',
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      // Mock connection test based on plugin type
      const startTime = Date.now();
      let testResult: ConnectionTestResult;

      switch (pluginName) {
        case 'postgresql':
        case 'mysql':
          // Simulate database connection test
          await this.simulateDelay(1000, 3000);
          testResult = {
            isValid: Math.random() > 0.1, // 90% success rate for demo
            message: 'Connection test completed',
            details: {
              connection_time_ms: Date.now() - startTime,
              server_version: pluginName === 'postgresql' ? '13.4' : '8.0.25',
              database_count: Math.floor(Math.random() * 10) + 1,
              table_count: Math.floor(Math.random() * 100) + 10
            }
          };
          break;

        case 'csv_file':
          // Simulate file access test
          await this.simulateDelay(500, 1500);
          testResult = {
            isValid: Math.random() > 0.05, // 95% success rate for demo
            message: 'File access test completed',
            details: {
              connection_time_ms: Date.now() - startTime
            }
          };
          break;

        default:
          testResult = {
            isValid: false,
            message: 'Unsupported plugin',
            error: `Connection test not implemented for plugin '${pluginName}'`
          };
      }

      if (!testResult.isValid && !testResult.error) {
        testResult.error = 'Connection failed - please check your configuration';
      }

      return testResult;
    } catch (error: any) {
      logger.error('Error testing data source connection:', error);
      return {
        isValid: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  async getPluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ): Promise<PluginConfiguration | null> {
    try {
      const configKey = `${workspaceId}:${pluginType}:${pluginName}`;
      const configuration = this.pluginConfigurations.get(configKey);

      if (!configuration) {
        // Return default configuration based on plugin schema
        const plugin = pluginType === 'datasource' 
          ? this.dataSourcePlugins.get(pluginName)
          : this.chartPlugins.get(pluginName);

        if (!plugin) {
          return null;
        }

        // Create default configuration from schema
        const defaultConfig: any = {};
        Object.entries(plugin.configSchema).forEach(([key, schema]) => {
          if (schema.default !== undefined) {
            defaultConfig[key] = schema.default;
          }
        });

        return {
          id: uuidv4(),
          workspace_id: workspaceId,
          plugin_type: pluginType,
          plugin_name: pluginName,
          configuration: defaultConfig,
          is_active: true,
          created_by: 'system',
          created_at: new Date(),
          updated_at: new Date(),
          version: plugin.version
        };
      }

      return configuration;
    } catch (error: any) {
      logger.error('Error getting plugin configuration:', error);
      throw new Error(`Failed to get plugin configuration: ${error.message}`);
    }
  }

  async updatePluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configurationData: any,
    updatedBy: string
  ): Promise<PluginConfiguration> {
    try {
      logger.info('Updating plugin configuration', { workspaceId, pluginType, pluginName });

      // Validate configuration
      const validation = await this.validatePluginConfiguration(pluginType, pluginName, configurationData);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const configKey = `${workspaceId}:${pluginType}:${pluginName}`;
      const existingConfig = this.pluginConfigurations.get(configKey);

      const plugin = pluginType === 'datasource' 
        ? this.dataSourcePlugins.get(pluginName)
        : this.chartPlugins.get(pluginName);

      if (!plugin) {
        throw new Error(`Plugin '${pluginName}' not found`);
      }

      const updatedConfiguration: PluginConfiguration = {
        id: existingConfig?.id || uuidv4(),
        workspace_id: workspaceId,
        plugin_type: pluginType,
        plugin_name: pluginName,
        configuration: configurationData,
        is_active: true,
        created_by: existingConfig?.created_by || updatedBy,
        updated_by: updatedBy,
        created_at: existingConfig?.created_at || new Date(),
        updated_at: new Date(),
        version: plugin.version
      };

      this.pluginConfigurations.set(configKey, updatedConfiguration);

      logger.info('Plugin configuration updated successfully', { 
        workspaceId, 
        pluginType, 
        pluginName 
      });
      return updatedConfiguration;
    } catch (error: any) {
      logger.error('Error updating plugin configuration:', error);
      throw new Error(`Failed to update plugin configuration: ${error.message}`);
    }
  }

  async resetPluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ): Promise<void> {
    try {
      logger.info('Resetting plugin configuration', { workspaceId, pluginType, pluginName });

      const configKey = `${workspaceId}:${pluginType}:${pluginName}`;
      this.pluginConfigurations.delete(configKey);

      logger.info('Plugin configuration reset successfully', { 
        workspaceId, 
        pluginType, 
        pluginName 
      });
    } catch (error: any) {
      logger.error('Error resetting plugin configuration:', error);
      throw new Error(`Failed to reset plugin configuration: ${error.message}`);
    }
  }

  async getPluginUsage(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    period: string
  ): Promise<PluginUsage> {
    try {
      const usageKey = `${workspaceId}:${pluginType}:${pluginName}:${period}`;
      const existingUsage = this.pluginUsageStats.get(usageKey);

      if (existingUsage) {
        return existingUsage;
      }

      // Generate mock usage statistics
      const mockUsage: PluginUsage = {
        plugin_name: pluginName,
        plugin_type: pluginType,
        period,
        usage_count: Math.floor(Math.random() * 1000) + 10,
        unique_users: Math.floor(Math.random() * 20) + 1,
        error_rate: Math.random() * 0.1, // 0-10% error rate
        avg_execution_time_ms: Math.floor(Math.random() * 2000) + 100,
        last_used_at: new Date(Date.now() - Math.random() * 86400000), // Within last day
        top_users: Array.from({ length: 3 }, (_, i) => ({
          user_id: `user-${i + 1}`,
          usage_count: Math.floor(Math.random() * 100) + 10
        }))
      };

      this.pluginUsageStats.set(usageKey, mockUsage);
      return mockUsage;
    } catch (error: any) {
      logger.error('Error getting plugin usage:', error);
      throw new Error(`Failed to get plugin usage: ${error.message}`);
    }
  }

  async validatePluginConfiguration(
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any
  ): Promise<ValidationResult> {
    try {
      const plugin = pluginType === 'datasource' 
        ? this.dataSourcePlugins.get(pluginName)
        : this.chartPlugins.get(pluginName);

      if (!plugin) {
        return {
          isValid: false,
          errors: [{
            field: 'plugin',
            message: `Plugin '${pluginName}' not found`,
            code: 'PLUGIN_NOT_FOUND'
          }],
          warnings: []
        };
      }

      const errors: Array<{ field: string; message: string; code: string }> = [];
      const warnings: Array<{ field: string; message: string; code: string }> = [];

      // Validate each field in the configuration
      Object.entries(plugin.configSchema).forEach(([fieldName, schema]) => {
        const value = configuration[fieldName];

        // Check required fields
        if (schema.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' is required`,
            code: 'REQUIRED_FIELD_MISSING'
          });
          return;
        }

        // Skip validation if field is not provided and not required
        if (value === undefined || value === null) {
          return;
        }

        // Type validation
        const expectedType = schema.type;
        const actualType = typeof value;

        switch (expectedType) {
          case 'string':
            if (actualType !== 'string') {
              errors.push({
                field: fieldName,
                message: `Field '${fieldName}' must be a string`,
                code: 'INVALID_TYPE'
              });
            } else if (schema.validation) {
              if (schema.validation.minLength && value.length < schema.validation.minLength) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' must be at least ${schema.validation.minLength} characters long`,
                  code: 'MIN_LENGTH_VIOLATION'
                });
              }
              if (schema.validation.maxLength && value.length > schema.validation.maxLength) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' must not exceed ${schema.validation.maxLength} characters`,
                  code: 'MAX_LENGTH_VIOLATION'
                });
              }
              if (schema.validation.pattern && !new RegExp(schema.validation.pattern).test(value)) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' does not match the required pattern`,
                  code: 'PATTERN_VIOLATION'
                });
              }
            }
            break;

          case 'number':
            if (actualType !== 'number' || isNaN(value)) {
              errors.push({
                field: fieldName,
                message: `Field '${fieldName}' must be a valid number`,
                code: 'INVALID_TYPE'
              });
            } else if (schema.validation) {
              if (schema.validation.min !== undefined && value < schema.validation.min) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' must be at least ${schema.validation.min}`,
                  code: 'MIN_VALUE_VIOLATION'
                });
              }
              if (schema.validation.max !== undefined && value > schema.validation.max) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' must not exceed ${schema.validation.max}`,
                  code: 'MAX_VALUE_VIOLATION'
                });
              }
            }
            break;

          case 'boolean':
            if (actualType !== 'boolean') {
              errors.push({
                field: fieldName,
                message: `Field '${fieldName}' must be a boolean`,
                code: 'INVALID_TYPE'
              });
            }
            break;

          case 'select':
            if (schema.options) {
              const validOptions = Array.isArray(schema.options) && schema.options.length > 0 && typeof schema.options[0] === 'object'
                ? schema.options.map((opt: any) => opt.value)
                : schema.options;
              
              if (!validOptions.includes(value)) {
                errors.push({
                  field: fieldName,
                  message: `Field '${fieldName}' must be one of: ${validOptions.join(', ')}`,
                  code: 'INVALID_OPTION'
                });
              }
            }
            break;
        }

        // Check conditional fields
        if (schema.conditional) {
          const conditionalFieldValue = configuration[schema.conditional.field];
          if (conditionalFieldValue !== schema.conditional.value && value !== undefined) {
            warnings.push({
              field: fieldName,
              message: `Field '${fieldName}' is only relevant when '${schema.conditional.field}' is '${schema.conditional.value}'`,
              code: 'CONDITIONAL_FIELD_WARNING'
            });
          }
        }
      });

      // Check for unknown fields
      Object.keys(configuration).forEach(fieldName => {
        if (!plugin.configSchema[fieldName]) {
          warnings.push({
            field: fieldName,
            message: `Unknown field '${fieldName}' will be ignored`,
            code: 'UNKNOWN_FIELD'
          });
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error: any) {
      logger.error('Error validating plugin configuration:', error);
      throw new Error(`Failed to validate plugin configuration: ${error.message}`);
    }
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}