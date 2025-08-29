// File: api-services/src/plugins/datasources/index.ts

import { postgresPlugin } from './relational/postgres';
import { DataSourcePlugin } from '../interfaces/DataSourcePlugin';

// Data Source Plugin Registry
export const DataSourcePlugins: Record<string, DataSourcePlugin> = {
  postgres: postgresPlugin
  // Additional plugins will be added here:
  // mysql: mysqlPlugin,
  // mongodb: mongodbPlugin,
  // etc.
};

export const getDataSourcePlugin = (name: string): DataSourcePlugin | null => {
  return DataSourcePlugins[name] || null;
};

export const getAvailableDataSourcePlugins = () => {
  return Object.keys(DataSourcePlugins).map(key => ({
    name: key,
    displayName: DataSourcePlugins[key].displayName,
    category: DataSourcePlugins[key].category,
    version: DataSourcePlugins[key].version,
    configSchema: DataSourcePlugins[key].configSchema
  }));
};