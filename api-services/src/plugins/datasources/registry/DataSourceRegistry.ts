// File: api-services/src/plugins/datasources/registry/DataSourceRegistry.ts
import { DataSourcePlugin } from '../interfaces';
import { logger } from '../../../utils/logger';

// Import plugins by category
// Relational Database Plugins
import { PostgreSQLPlugin } from '../relational/postgres';
import { MySQLPlugin } from '../relational/mysql';
import { mariadbPlugin } from '../relational/mariadb';
import { mssqlPlugin } from '../relational/mssql';
import { oraclePlugin } from '../relational/oracle';
import { sqlitePlugin } from '../relational/sqlite';

// Cloud Database Plugins
import { MongoDBPlugin } from '../cloud_databases/mongodb';
import { bigqueryPlugin } from '../cloud_databases/bigquery';
import { snowflakePlugin } from '../cloud_databases/snowflake';
import { athenaPlugin } from '../cloud_databases/athena';
import { dynamodbPlugin } from '../cloud_databases/dynamodb';
import { cosmosdbPlugin } from '../cloud_databases/cosmosdb';

// Storage Service Plugins
import { s3Plugin } from '../storage_services/s3';
import { azureStoragePlugin } from '../storage_services/azure_storage';

// Data Lake Plugins
import { deltaTableAWSPlugin } from '../data_lakes/delta_table_aws';
import { deltaTableAzurePlugin } from '../data_lakes/delta_table_azure';
import { deltaTableGCPPlugin } from '../data_lakes/delta_table_gcp';
import { icebergPlugin } from '../data_lakes/iceberg';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PluginStats {
  total: number;
  categories: Record<string, number>;
  plugins: string[];
}

export class DataSourceRegistry {
  private static plugins = new Map<string, DataSourcePlugin>();
  private static initialized = false;

  static {
    this.initialize();
  }

  /**
   * Initialize the registry with all available plugins
   */
  private static initialize(): void {
    if (this.initialized) return;

    try {
      // Register plugins by category
      this.registerCategoryPlugins([
        // Relational databases
        postgresPlugin,
        mysqlPlugin,
        mariadbPlugin,
        mssqlPlugin,
        oraclePlugin,
        sqlitePlugin,

        // Cloud databases
        mongodbPlugin,
        bigqueryPlugin,
        snowflakePlugin,
        athenaPlugin,
        dynamodbPlugin,
        cosmosdbPlugin,

        // Storage services
        s3Plugin,
        azureStoragePlugin,

        // Data lakes
        deltaTableAWSPlugin,
        deltaTableAzurePlugin,
        deltaTableGCPPlugin,
        icebergPlugin
      ]);

      this.initialized = true;
      logger.info(`DataSourceRegistry initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to initialize DataSourceRegistry:', error);
      throw error;
    }
  }

  /**
   * Register multiple plugins at once
   */
  private static registerCategoryPlugins(plugins: DataSourcePlugin[]): void {
    plugins.forEach(plugin => {
      if (plugin && this.validatePluginInterface(plugin)) {
        this.registerPlugin(plugin);
      } else {
        logger.warn(`Skipping invalid plugin: ${plugin?.name || 'unknown'}`);
      }
    });
  }

  /**
   * Register a single plugin
   */
  static registerPlugin(plugin: DataSourcePlugin): void {
    if (!this.validatePluginInterface(plugin)) {
      throw new Error(`Invalid plugin interface: ${plugin.name}`);
    }

    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin ${plugin.name} is already registered. Overwriting...`);
    }

    this.plugins.set(plugin.name, plugin);
    logger.debug(`Plugin registered: ${plugin.name} (${plugin.category})`);
  }

  /**
   * Get a plugin by name
   */
  static getPlugin(name: string): DataSourcePlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  static getAllPlugins(): DataSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  static getPluginsByCategory(category: string): DataSourcePlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.category === category);
  }

  /**
   * Get all available categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    this.plugins.forEach(plugin => categories.add(plugin.category));
    return Array.from(categories).sort();
  }

  /**
   * Check if a plugin exists
   */
  static hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get plugin statistics
   */
  static getStatistics(): PluginStats {
    const plugins = this.getAllPlugins();
    const categories: Record<string, number> = {};

    plugins.forEach(plugin => {
      categories[plugin.category] = (categories[plugin.category] || 0) + 1;
    });

    return {
      total: plugins.length,
      categories,
      plugins: plugins.map(p => p.name)
    };
  }

  /**
   * Validate plugin configuration against schema
   */
  static validatePluginConfiguration(pluginName: string, config: any): ValidationResult {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      return { valid: false, errors: [`Plugin ${pluginName} not found`] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const schema = plugin.configSchema;

    if (!schema || !schema.properties) {
      return { valid: true, errors: [] };
    }

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!config || config[requiredProp] === undefined || config[requiredProp] === null) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }

    // Validate property types and constraints
    if (config && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const value = config[propName];
        if (value !== undefined && value !== null) {
          const validationResult = this.validateProperty(value, propSchema);
          if (!validationResult.valid) {
            errors.push(`Invalid value for property ${propName}: ${validationResult.error}`);
          } else if (validationResult.warning) {
            warnings.push(`Warning for property ${propName}: ${validationResult.warning}`);
          }
        }
      }

      // Check for unknown properties if additionalProperties is false
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties));
        for (const propName of Object.keys(config)) {
          if (!allowedProps.has(propName)) {
            warnings.push(`Unknown property: ${propName}`);
          }
        }
      }
    }

    return { 
      valid: errors.length === 0, 
      errors, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
  }

  /**
   * Validate a single property value against its schema
   */
  private static validateProperty(value: any, schema: any): { valid: boolean; error?: string; warning?: string } {
    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Expected string' };
        }
        if (schema.minLength && value.length < schema.minLength) {
          return { valid: false, error: `Minimum length is ${schema.minLength}` };
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          return { valid: false, error: `Maximum length is ${schema.maxLength}` };
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          return { valid: false, error: 'Does not match required pattern' };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: 'Expected number' };
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          return { valid: false, error: `Minimum value is ${schema.minimum}` };
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
          return { valid: false, error: `Maximum value is ${schema.maximum}` };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Expected boolean' };
        }
        break;

      default:
        // For unknown types, just accept the value
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return { valid: false, error: `Must be one of: ${schema.enum.join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * Validate that a plugin implements the required interface
   */
  private static validatePluginInterface(plugin: any): plugin is DataSourcePlugin {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    // Check required properties
    const requiredProps = ['name', 'displayName', 'category', 'version', 'configSchema'];
    for (const prop of requiredProps) {
      if (!plugin[prop]) {
        logger.error(`Plugin missing required property: ${prop}`);
        return false;
      }
    }

    // Check required methods
    const requiredMethods = [
      'connect', 'testConnection', 'executeQuery', 
      'getSchema', 'getTables', 'getColumns', 'disconnect'
    ];
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        logger.error(`Plugin ${plugin.name} missing required method: ${method}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Search plugins by name or description
   */
  static searchPlugins(searchTerm: string): DataSourcePlugin[] {
    const term = searchTerm.toLowerCase();
    return this.getAllPlugins().filter(plugin =>
      plugin.name.toLowerCase().includes(term) ||
      plugin.displayName.toLowerCase().includes(term) ||
      (plugin.description && plugin.description.toLowerCase().includes(term))
    );
  }

  /**
   * Get plugins that support specific capabilities
   */
  static getPluginsByCapability(capability: string): DataSourcePlugin[] {
    return this.getAllPlugins().filter(plugin => {
      // Add capability checking logic based on your plugin interface
      return plugin.configSchema?.properties?.[capability] !== undefined;
    });
  }

  /**
   * Remove a plugin (for testing or dynamic management)
   */
  static unregisterPlugin(name: string): boolean {
    const existed = this.plugins.has(name);
    if (existed) {
      this.plugins.delete(name);
      logger.info(`Plugin unregistered: ${name}`);
    }
    return existed;
  }

  /**
   * Clear all plugins (for testing)
   */
  static clear(): void {
    this.plugins.clear();
    this.initialized = false;
    logger.warn('All plugins cleared from registry');
  }

  /**
   * Re-initialize the registry
   */
  static reinitialize(): void {
    this.clear();
    this.initialize();
  }
}