// File: api-services/src/services/PluginManager.ts

import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Interfaces
export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  description?: string;
  author?: string;
  license?: string;
  configSchema: ConfigSchema;
  connect(config: ConnectionConfig): Promise<Connection>;
  testConnection(config: ConnectionConfig): Promise<TestResult>;
  executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult>;
  getSchema(connection: Connection): Promise<SchemaInfo>;
  getTables(connection: Connection, database?: string): Promise<TableInfo[]>;
  getColumns(connection: Connection, table: string): Promise<ColumnInfo[]>;
  disconnect(connection: Connection): Promise<void>;
  capabilities?: {
    supportsBulkInsert?: boolean;
    supportsTransactions?: boolean;
    supportsStoredProcedures?: boolean;
    supportsCustomFunctions?: boolean;
    maxConcurrentConnections?: number;
    supportsStreaming?: boolean;
  };
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'password' | 'select' | 'array' | 'object';
    required?: boolean;
    default?: any;
    options?: string[] | { label: string; value: string }[];
    validation?: RegExp | ((value: any) => boolean);
    description?: string;
    placeholder?: string;
    helpText?: string;
    group?: string;
  };
}

export interface ConnectionConfig {
  [key: string]: any;
}

export interface Connection {
  id: string;
  plugin: string;
  config: ConnectionConfig;
  connected_at: Date;
}

export interface TestResult {
  success: boolean;
  message: string;
  error_code?: string;
  response_time?: number;
}

export interface QueryResult {
  data: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  total_rows: number;
  execution_time: number;
  cached?: boolean;
  metadata?: {
    total_rows?: number;
    execution_time?: number;
    query_cost?: number;
  };
}

export interface SchemaInfo {
  databases: DatabaseInfo[];
}

export interface DatabaseInfo {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema?: string;
  type: 'table' | 'view' | 'materialized_view';
  columns: ColumnInfo[];
  row_count?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

/**
 * Plugin Manager - Handles ONLY DataSource plugins for backend
 * Chart plugins are handled by frontend ChartFactory
 */
export class PluginManager {
  private static instance: PluginManager | null = null;
  private static dataSourcePlugins: Map<string, DataSourcePlugin> = new Map();
  private static initialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance - for backward compatibility
   */
  static getInstance(): PluginManager {
    if (!this.instance) {
      this.instance = new PluginManager();
    }
    return this.instance;
  }

  /**
   * Initialize plugin manager - loads only DataSource plugins
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('PluginManager already initialized');
      return;
    }

    try {
      logger.info('Initializing PluginManager...');
      
      // Load DataSource plugins only
      await this.loadDataSourcePlugins();
      
      this.initialized = true;
      logger.info(`PluginManager initialized successfully with ${this.dataSourcePlugins.size} data source plugins`);
      
    } catch (error) {
      logger.error('Failed to initialize PluginManager:', error);
      throw error;
    }
  }

  /**
   * Load data source plugins from filesystem
   */
  private static async loadDataSourcePlugins(): Promise<void> {
    const pluginsPath = path.join(__dirname, '../plugins/datasources');
    
    if (!fs.existsSync(pluginsPath)) {
      logger.warn('DataSource plugins directory not found', { pluginsPath });
      return;
    }

    try {
      // Get category directories (relational, cloud, etc.)
      const categories = fs.readdirSync(pluginsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      logger.info(`Found plugin categories: ${categories.join(', ')}`);

      for (const category of categories) {
        const categoryPath = path.join(pluginsPath, category);
        
        try {
          const pluginFiles = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
            .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.spec.ts'));

          for (const pluginFile of pluginFiles) {
            try {
              const pluginPath = path.join(categoryPath, pluginFile);
              const pluginModule = require(pluginPath);
              
              // Support both default and named exports
              const plugin = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
              
              if (plugin && this.validatePlugin(plugin)) {
                this.dataSourcePlugins.set(plugin.name, plugin);
                logger.info(`Loaded plugin: ${plugin.name} (${category})`);
              } else {
                logger.warn(`Invalid plugin: ${pluginFile}`);
              }
            } catch (error) {
              logger.error(`Failed to load plugin ${pluginFile}:`, error);
            }
          }
        } catch (error) {
          logger.error(`Failed to read category directory ${category}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to load data source plugins:', error);
    }
  }

  /**
   * Validate plugin structure
   */
  private static validatePlugin(plugin: any): boolean {
    const requiredProperties = ['name', 'displayName', 'category', 'version', 'configSchema'];
    const requiredMethods = ['connect', 'testConnection', 'executeQuery', 'getSchema', 'getTables', 'getColumns', 'disconnect'];

    // Check required properties
    for (const prop of requiredProperties) {
      if (!plugin[prop]) {
        logger.warn(`Plugin missing required property: ${prop}`);
        return false;
      }
    }

    // Check required methods
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        logger.warn(`Plugin missing required method: ${method}`);
        return false;
      }
    }

    // Validate config schema
    if (typeof plugin.configSchema !== 'object') {
      logger.warn('Plugin configSchema must be an object');
      return false;
    }

    return true;
  }

  /**
   * Get data source plugin by name
   */
  static getDataSourcePlugin(name: string): DataSourcePlugin | null {
    return this.dataSourcePlugins.get(name) || null;
  }

  /**
   * Get all data source plugins
   */
  static getAllDataSourcePlugins(): DataSourcePlugin[] {
    return Array.from(this.dataSourcePlugins.values());
  }

  /**
   * Get data source plugins by category
   */
  static getDataSourcePluginsByCategory(category: string): DataSourcePlugin[] {
    return Array.from(this.dataSourcePlugins.values())
      .filter(plugin => plugin.category === category);
  }

  /**
   * Test data source connection
   */
  static async testDataSourceConnection(pluginName: string, config: ConnectionConfig): Promise<TestResult> {
    const plugin = this.getDataSourcePlugin(pluginName);
    if (!plugin) {
      return {
        success: false,
        message: `Data source plugin not found: ${pluginName}`,
        error_code: 'PLUGIN_NOT_FOUND'
      };
    }

    try {
      const startTime = Date.now();
      const result = await plugin.testConnection(config);
      const responseTime = Date.now() - startTime;

      return {
        success: result.success,
        message: result.message,
        error_code: result.error_code,
        response_time: responseTime
      };

    } catch (error) {
      logger.error('Data source connection test failed', { 
        plugin: pluginName, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        error_code: 'CONNECTION_TEST_ERROR'
      };
    }
  }

  /**
   * Execute query using data source plugin
   */
  static async executeQuery(
    pluginName: string, 
    connection: Connection, 
    query: string, 
    params?: any[]
  ): Promise<QueryResult> {
    const plugin = this.getDataSourcePlugin(pluginName);
    if (!plugin) {
      throw new Error(`Data source plugin not found: ${pluginName}`);
    }

    try {
      return await plugin.executeQuery(connection, query, params);
    } catch (error) {
      logger.error('Query execution failed', { 
        plugin: pluginName, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get plugin statistics
   */
  static getPluginStats(): {
    dataSourcePlugins: number;
    categories: string[];
    pluginsByCategory: Record<string, number>;
  } {
    const plugins = Array.from(this.dataSourcePlugins.values());
    const categories = Array.from(new Set(plugins.map(p => p.category)));
    
    const pluginsByCategory = plugins.reduce((acc, plugin) => {
      acc[plugin.category] = (acc[plugin.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      dataSourcePlugins: this.dataSourcePlugins.size,
      categories,
      pluginsByCategory
    };
  }

  /**
   * Get plugin manifest for frontend (DataSource plugins only)
   */
  static getDataSourceManifests(): any[] {
    return Array.from(this.dataSourcePlugins.values()).map(plugin => ({
      name: plugin.name,
      displayName: plugin.displayName,
      category: plugin.category,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      license: plugin.license,
      configSchema: plugin.configSchema,
      capabilities: plugin.capabilities
    }));
  }

  /**
   * Validate plugin configuration
   */
  static validatePluginConfig(
    pluginName: string, 
    config: any
  ): { valid: boolean; errors: string[] } {
    const plugin = this.getDataSourcePlugin(pluginName);
    if (!plugin) {
      return { valid: false, errors: [`Data source plugin '${pluginName}' not found`] };
    }

    const errors: string[] = [];
    const schema = plugin.configSchema;

    // Check required fields
    Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.required && (config[fieldName] === undefined || config[fieldName] === '')) {
        errors.push(`Field '${fieldName}' is required`);
      }

      // Validate field values
      if (config[fieldName] !== undefined && fieldSchema.validation) {
        if (fieldSchema.validation instanceof RegExp) {
          if (!fieldSchema.validation.test(config[fieldName])) {
            errors.push(`Field '${fieldName}' does not match required pattern`);
          }
        } else if (typeof fieldSchema.validation === 'function') {
          if (!fieldSchema.validation(config[fieldName])) {
            errors.push(`Field '${fieldName}' failed validation`);
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reload plugins (useful for development)
   */
  static async reload(): Promise<void> {
    this.dataSourcePlugins.clear();
    this.initialized = false;

    // Clear require cache for plugin modules
    const pluginsPath = path.join(__dirname, '../plugins/datasources');
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(pluginsPath)) {
        delete require.cache[key];
      }
    });

    await this.initialize();
    logger.info('PluginManager reloaded successfully');
  }

  /**
   * Check if plugin manager is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  // Instance methods that delegate to static methods (for backward compatibility)
  getDataSourcePlugin(name: string): DataSourcePlugin | null {
    return PluginManager.getDataSourcePlugin(name);
  }

  getAllDataSourcePlugins(): DataSourcePlugin[] {
    return PluginManager.getAllDataSourcePlugins();
  }

  getDataSourcePluginsByCategory(category: string): DataSourcePlugin[] {
    return PluginManager.getDataSourcePluginsByCategory(category);
  }

  async testDataSourceConnection(pluginName: string, config: ConnectionConfig): Promise<TestResult> {
    return PluginManager.testDataSourceConnection(pluginName, config);
  }

  async executeQuery(pluginName: string, connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    return PluginManager.executeQuery(pluginName, connection, query, params);
  }

  getPluginStats(): { dataSourcePlugins: number; categories: string[]; pluginsByCategory: Record<string, number>; } {
    return PluginManager.getPluginStats();
  }

  getDataSourceManifests(): any[] {
    return PluginManager.getDataSourceManifests();
  }

  validatePluginConfig(pluginName: string, config: any): { valid: boolean; errors: string[]; } {
    return PluginManager.validatePluginConfig(pluginName, config);
  }

  async reload(): Promise<void> {
    return PluginManager.reload();
  }

  isInitialized(): boolean {
    return PluginManager.isInitialized();
  }
}