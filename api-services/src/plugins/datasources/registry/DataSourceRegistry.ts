// File: api-services/src/plugins/datasources/registry/DataSourceRegistry.ts
import { DataSourcePlugin } from '../interfaces';
import { PostgreSQLPlugin } from '../relational/postgres';
import { MySQLPlugin } from '../relational/mysql';

export class DataSourceRegistry {
  private static plugins = new Map<string, DataSourcePlugin>();
  
  static {
    // Register all data source plugins
    this.registerPlugin(PostgreSQLPlugin);
    this.registerPlugin(MySQLPlugin);
    
    // Add more plugins here as they are implemented
    // this.registerPlugin(MongoDBPlugin);
    // this.registerPlugin(AthenaPlugin);
    // etc.
  }
  
  static registerPlugin(plugin: DataSourcePlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  static getPlugin(name: string): DataSourcePlugin | undefined {
    return this.plugins.get(name);
  }
  
  static getAllPlugins(): DataSourcePlugin[] {
    return Array.from(this.plugins.values());
  }
  
  static getPluginsByCategory(category: string): DataSourcePlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.category === category);
  }
  
  static validatePluginConfiguration(pluginName: string, config: any): { valid: boolean; errors: string[] } {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      return { valid: false, errors: [`Plugin ${pluginName} not found`] };
    }
    
    const errors: string[] = [];
    const schema = plugin.configSchema;
    
    // Check required properties
    for (const requiredProp of schema.required) {
      if (!config[requiredProp]) {
        errors.push(`Missing required property: ${requiredProp}`);
      }
    }
    
    // Validate property types and constraints
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const value = config[propName];
      if (value !== undefined && value !== null) {
        if (!this.validateProperty(value, propSchema)) {
          errors.push(`Invalid value for property ${propName}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private static validateProperty(value: any, schema: any): boolean {
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') return false;
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
        break;
      case 'integer':
        if (!Number.isInteger(value)) return false;
        if (schema.minimum !== undefined && value < schema.minimum) return false;
        if (schema.maximum !== undefined && value > schema.maximum) return false;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
    }
    return true;
  }
}