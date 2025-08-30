// File: api-services/src/plugins/datasources/registry/DataSourceRegistry.ts
import { DataSourcePlugin } from '../interfaces/DataSourcePlugin';
import { PostgreSQLPlugin } from '../relational/postgresql';
import { MySQLPlugin } from '../relational/mysql';
import { MongoDBPlugin } from '../nosql/mongodb';
import { BigQueryPlugin } from '../cloud/bigquery';
import { SnowflakePlugin } from '../cloud/snowflake';

export class DataSourceRegistry {
  private static plugins = new Map<string, DataSourcePlugin>();

  static {
    // Register essential plugins only
    this.registerPlugin(PostgreSQLPlugin);
    this.registerPlugin(MySQLPlugin);
    this.registerPlugin(MongoDBPlugin);
    this.registerPlugin(BigQueryPlugin);
    this.registerPlugin(SnowflakePlugin);
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
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!config[requiredProp]) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }

    // Validate property types and constraints
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const value = config[propName];
        if (value !== undefined && value !== null) {
          if (!this.validateProperty(value, propSchema as any)) {
            errors.push(`Invalid value for property ${propName}`);
          }
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
        if (schema.minLength && value.length < schema.minLength) return false;
        if (schema.maxLength && value.length > schema.maxLength) return false;
        break;
      case 'integer':
        if (!Number.isInteger(value)) return false;
        if (schema.minimum !== undefined && value < schema.minimum) return false;
        if (schema.maximum !== undefined && value > schema.maximum) return false;
        break;
      case 'number':
        if (typeof value !== 'number') return false;
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