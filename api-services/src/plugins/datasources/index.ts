// File: api-services/src/plugins/datasources/index.ts
import { DataSourceRegistry } from './registry/DataSourceRegistry';
import { DataSourcePlugin } from './interfaces';

/**
 * Main DataSource Plugin API
 * This is the public interface that other parts of the application should use
 */
export const DataSourcePlugins = {
  // Get plugin by name
  get: (name: string) => DataSourceRegistry.getPlugin(name),
  
  // Get all plugins
  getAll: () => DataSourceRegistry.getAllPlugins(),
  
  // Get plugins by category
  getByCategory: (category: string) => DataSourceRegistry.getPluginsByCategory(category),
  
  // Get all categories
  getCategories: () => DataSourceRegistry.getCategories(),
  
  // Check if plugin exists
  has: (name: string) => DataSourceRegistry.hasPlugin(name),
  
  // Search plugins
  search: (searchTerm: string) => DataSourceRegistry.searchPlugins(searchTerm),
  
  // Get statistics
  getStatistics: () => DataSourceRegistry.getStatistics(),
  
  // Validate plugin configuration
  validateConfig: (pluginName: string, config: any) => 
    DataSourceRegistry.validatePluginConfiguration(pluginName, config),

  // Compatibility methods for existing API
  getAvailablePlugins: () => DataSourceRegistry.getAllPlugins().map(plugin => ({
    name: plugin.name,
    displayName: plugin.displayName,
    category: plugin.category,
    version: plugin.version,
    description: plugin.description
  })),

  getDataSourcePlugin: (name: string) => DataSourceRegistry.getPlugin(name),
  
  getDataSourcePluginsByCategory: (category: string) => DataSourceRegistry.getPluginsByCategory(category),
  
  getPluginStatistics: () => DataSourceRegistry.getStatistics()
};

// For backward compatibility, also export the individual functions
export const getDataSourcePlugin = DataSourcePlugins.getDataSourcePlugin;
export const getAvailableDataSourcePlugins = DataSourcePlugins.getAvailablePlugins;
export const getDataSourcePluginsByCategory = DataSourcePlugins.getDataSourcePluginsByCategory;
export const getPluginStatistics = DataSourcePlugins.getPluginStatistics;

// Validate plugin interface helper
export const validatePluginInterface = (plugin: any): plugin is DataSourcePlugin => {
  const requiredMethods = [
    'connect', 'testConnection', 'executeQuery', 
    'getSchema', 'disconnect'
  ];
  
  return requiredMethods.every(method => typeof plugin[method] === 'function') &&
         typeof plugin.name === 'string' &&
         typeof plugin.displayName === 'string' &&
         typeof plugin.category === 'string' &&
         typeof plugin.version === 'string' &&
         typeof plugin.configSchema === 'object';
};

// Export the registry for direct access if needed
export { DataSourceRegistry };

// Export types
export * from './interfaces';