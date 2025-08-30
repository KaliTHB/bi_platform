/ File: api-services/src/plugins/datasources/index.ts
import { DataSourcePlugin } from '../interfaces/DataSourcePlugin';

// Relational Database Plugins
import { postgresPlugin } from './relational/postgres';
import { mysqlPlugin } from './relational/mysql';
import { mariadbPlugin } from './relational/mariadb';
import { mssqlPlugin } from './relational/mssql';
import { oraclePlugin } from './relational/oracle';
import { sqlitePlugin } from './relational/sqlite';

// Cloud Database Plugins
import { mongodbPlugin } from './cloud_databases/mongodb';
import { bigqueryPlugin } from './cloud_databases/bigquery';
import { snowflakePlugin } from './cloud_databases/snowflake';
import { athenaPlugin } from './cloud_databases/athena';
import { dynamodbPlugin } from './cloud_databases/dynamodb';
import { cosmosdbPlugin } from './cloud_databases/cosmosdb';

// Storage Service Plugins
import { s3Plugin } from './storage_services/s3';
import { azureStoragePlugin } from './storage_services/azure_storage';

// Data Lake Plugins
import { deltaTableAWSPlugin } from './data_lakes/delta_table_aws';
import { deltaTableAzurePlugin } from './data_lakes/delta_table_azure';
import { deltaTableGCPPlugin } from './data_lakes/delta_table_gcp';
import { icebergPlugin } from './data_lakes/iceberg';

// Complete Data Source Plugin Registry
export const DataSourcePlugins: Record<string, DataSourcePlugin> = {
  // Relational Databases
  postgres: postgresPlugin,
  mysql: mysqlPlugin,
  mariadb: mariadbPlugin,
  mssql: mssqlPlugin,
  oracle: oraclePlugin,
  sqlite: sqlitePlugin,
  
  // Cloud Databases
  mongodb: mongodbPlugin,
  bigquery: bigqueryPlugin,
  snowflake: snowflakePlugin,
  athena: athenaPlugin,
  dynamodb: dynamodbPlugin,
  cosmosdb: cosmosdbPlugin,
  
  // Storage Services
  s3: s3Plugin,
  azure_storage: azureStoragePlugin,
  
  // Data Lakes
  delta_table_aws: deltaTableAWSPlugin,
  delta_table_azure: deltaTableAzurePlugin,
  delta_table_gcp: deltaTableGCPPlugin,
  iceberg: icebergPlugin
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

export const getDataSourcePluginsByCategory = (category: string) => {
  return Object.values(DataSourcePlugins).filter(plugin => plugin.category === category);
};

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

export const getPluginStatistics = () => {
  const categories = Object.values(DataSourcePlugins).reduce((acc, plugin) => {
    acc[plugin.category] = (acc[plugin.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: Object.keys(DataSourcePlugins).length,
    categories,
    plugins: Object.keys(DataSourcePlugins)
  };
};