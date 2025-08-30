// api-services/src/services/PluginManager.ts
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface DataSourcePlugin {
  name: string;
  type: string;
  version: string;
  description: string;
  connect(config: any): Promise<any>;
  disconnect(connection: any): Promise<void>;
  executeQuery(connection: any, query: string, params?: any[]): Promise<{
    rows: any[];
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      description?: string;
    }>;
  }>;
  testConnection(config: any): Promise<boolean>;
  getSchema?(connection: any, schema?: string): Promise<any>;
}

interface ChartPlugin {
  name: string;
  type: string;
  version: string;
  description: string;
  category: string;
  config_schema: any;
  render_config: any;
  supported_data_types: string[];
  min_columns: number;
  max_columns: number;
}

export class PluginManager {
  private static dataSourcePlugins: Map<string, DataSourcePlugin> = new Map();
  private static chartPlugins: Map<string, ChartPlugin> = new Map();
  private static initialized = false;

  /**
   * Initialize plugin system - load all plugins from filesystem
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadDataSourcePlugins();
      await this.loadChartPlugins();
      this.initialized = true;
      logger.info('Plugin system initialized', {
        dataSourcePlugins: this.dataSourcePlugins.size,
        chartPlugins: this.chartPlugins.size
      });
    } catch (error) {
      logger.error('Failed to initialize plugin system', error);
      throw error;
    }
  }

  /**
   * Load data source plugins from filesystem
   */
  private static async loadDataSourcePlugins(): Promise<void> {
    const pluginsPath = path.join(__dirname, '../plugins/datasources');
    
    if (!fs.existsSync(pluginsPath)) {
      logger.warn('Data source plugins directory not found', { pluginsPath });
      return;
    }

    const pluginDirs = fs.readdirSync(pluginsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const pluginDir of pluginDirs) {
      try {
        await this.loadDataSourcePlugin(pluginDir, pluginsPath);
      } catch (error) {
        logger.error('Failed to load data source plugin', { plugin: pluginDir, error });
      }
    }
  }

  /**
   * Load individual data source plugin
   */
  private static async loadDataSourcePlugin(pluginDir: string, basePath: string): Promise<void> {
    const pluginPath = path.join(basePath, pluginDir);
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const indexPath = path.join(pluginPath, 'index.js');

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found for plugin ${pluginDir}`);
    }

    // Check if index exists
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Index file not found for plugin ${pluginDir}`);
    }

    // Load manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Validate manifest
    this.validateDataSourceManifest(manifest);

    // Load plugin code
    const pluginModule = require(indexPath);
    const plugin: DataSourcePlugin = {
      ...manifest,
      ...pluginModule
    };

    // Validate plugin interface
    this.validateDataSourcePlugin(plugin);

    this.dataSourcePlugins.set(plugin.type, plugin);
    logger.info('Loaded data source plugin', { 
      type: plugin.type, 
      name: plugin.name, 
      version: plugin.version 
    });
  }

  /**
   * Load chart plugins from filesystem
   */
  private static async loadChartPlugins(): Promise<void> {
    const pluginsPath = path.join(__dirname, '../plugins/charts');
    
    if (!fs.existsSync(pluginsPath)) {
      logger.warn('Chart plugins directory not found', { pluginsPath });
      return;
    }

    const pluginDirs = fs.readdirSync(pluginsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const pluginDir of pluginDirs) {
      try {
        await this.loadChartPlugin(pluginDir, pluginsPath);
      } catch (error) {
        logger.error('Failed to load chart plugin', { plugin: pluginDir, error });
      }
    }
  }

  /**
   * Load individual chart plugin
   */
  private static async loadChartPlugin(pluginDir: string, basePath: string): Promise<void> {
    const pluginPath = path.join(basePath, pluginDir);
    const manifestPath = path.join(pluginPath, 'manifest.json');

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found for chart plugin ${pluginDir}`);
    }

    // Load manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Validate manifest
    this.validateChartManifest(manifest);

    const plugin: ChartPlugin = manifest;

    this.chartPlugins.set(plugin.type, plugin);
    logger.info('Loaded chart plugin', { 
      type: plugin.type, 
      name: plugin.name, 
      version: plugin.version,
      category: plugin.category
    });
  }

  /**
   * Validate data source plugin manifest
   */
  private static validateDataSourceManifest(manifest: any): void {
    const required = ['name', 'type', 'version', 'description'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field '${field}' in data source plugin manifest`);
      }
    }
  }

  /**
   * Validate chart plugin manifest
   */
  private static validateChartManifest(manifest: any): void {
    const required = ['name', 'type', 'version', 'description', 'category', 'config_schema'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field '${field}' in chart plugin manifest`);
      }
    }
  }

  /**
   * Validate data source plugin interface
   */
  private static validateDataSourcePlugin(plugin: any): void {
    const required = ['connect', 'disconnect', 'executeQuery', 'testConnection'];
    for (const method of required) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Data source plugin missing required method '${method}'`);
      }
    }
  }

  /**
   * Get data source plugin by type
   */
  static getDataSourcePlugin(type: string): DataSourcePlugin | null {
    return this.dataSourcePlugins.get(type) || null;
  }

  /**
   * Get chart plugin by type
   */
  static getChartPlugin(type: string): ChartPlugin | null {
    return this.chartPlugins.get(type) || null;
  }

  /**
   * Get all data source plugins
   */
  static getAllDataSourcePlugins(): DataSourcePlugin[] {
    return Array.from(this.dataSourcePlugins.values());
  }

  /**
   * Get all chart plugins
   */
  static getAllChartPlugins(): ChartPlugin[] {
    return Array.from(this.chartPlugins.values());
  }

  /**
   * Get chart plugins by category
   */
  static getChartPluginsByCategory(category: string): ChartPlugin[] {
    return Array.from(this.chartPlugins.values())
      .filter(plugin => plugin.category === category);
  }

  /**
   * Test data source connection
   */
  static async testDataSourceConnection(type: string, config: any): Promise<boolean> {
    const plugin = this.getDataSourcePlugin(type);
    if (!plugin) {
      throw new Error(`Data source plugin not found: ${type}`);
    }

    try {
      return await plugin.testConnection(config);
    } catch (error) {
      logger.error('Data source connection test failed', { type, error });
      return false;
    }
  }

  /**
   * Get plugin statistics
   */
  static getPluginStats(): {
    dataSourcePlugins: number;
    chartPlugins: number;
    categories: string[];
  } {
    const categories = Array.from(new Set(
      Array.from(this.chartPlugins.values()).map(p => p.category)
    ));

    return {
      dataSourcePlugins: this.dataSourcePlugins.size,
      chartPlugins: this.chartPlugins.size,
      categories
    };
  }

  /**
   * Reload plugins (useful for development)
   */
  static async reload(): Promise<void> {
    this.dataSourcePlugins.clear();
    this.chartPlugins.clear();
    this.initialized = false;

    // Clear require cache for plugin modules
    const pluginsPath = path.join(__dirname, '../plugins');
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(pluginsPath)) {
        delete require.cache[key];
      }
    });

    await this.initialize();
  }

  /**
   * Get plugin manifest for frontend
   */
  static getPluginManifests(): {
    dataSourcePlugins: any[];
    chartPlugins: any[];
  } {
    return {
      dataSourcePlugins: Array.from(this.dataSourcePlugins.values()).map(plugin => ({
        name: plugin.name,
        type: plugin.type,
        version: plugin.version,
        description: plugin.description
      })),
      chartPlugins: Array.from(this.chartPlugins.values()).map(plugin => ({
        name: plugin.name,
        type: plugin.type,
        version: plugin.version,
        description: plugin.description,
        category: plugin.category,
        config_schema: plugin.config_schema,
        render_config: plugin.render_config,
        supported_data_types: plugin.supported_data_types,
        min_columns: plugin.min_columns,
        max_columns: plugin.max_columns
      }))
    };
  }

  /**
   * Validate chart configuration against plugin schema
   */
  static validateChartConfig(chartType: string, config: any): { valid: boolean; errors: string[] } {
    const plugin = this.getChartPlugin(chartType);
    if (!plugin) {
      return { valid: false, errors: [`Chart type '${chartType}' not supported`] };
    }

    // Basic validation against schema
    const errors: string[] = [];
    const schema = plugin.config_schema;

    if (schema.required) {
      for (const field of schema.required) {
        if (!config[field]) {
          errors.push(`Missing required field '${field}'`);
        }
      }
    }

    // Validate data requirements
    if (config.columns) {
      if (plugin.min_columns && config.columns.length < plugin.min_columns) {
        errors.push(`Chart requires at least ${plugin.min_columns} columns`);
      }
      if (plugin.max_columns && config.columns.length > plugin.max_columns) {
        errors.push(`Chart supports maximum ${plugin.max_columns} columns`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}