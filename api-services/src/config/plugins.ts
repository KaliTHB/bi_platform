// api-services/src/config/plugins.ts
import { logger } from '../utils/logger';

export interface PluginConfig {
  enabled: boolean;
  skipValidation?: boolean;
  dependencies?: string[];
  devOnly?: boolean;
}

export const PLUGIN_CONFIGURATION: Record<string, PluginConfig> = {
  // Relational Database Plugins (Core - Always Enabled)
  'postgres.ts': { enabled: true },
  'mysql.ts': { enabled: true },
  'mariadb.ts': { enabled: true },
  'mssql.ts': { enabled: process.env.PLUGIN_MSSQL_ENABLED === 'true' },
  'sqlite.ts': { enabled: true },
  'oracle.ts': { enabled: process.env.PLUGIN_ORACLE_ENABLED === 'true', dependencies: ['oracledb'] },

  // Cloud Database Plugins
  'mongodb.ts': { enabled: process.env.PLUGIN_MONGODB_ENABLED === 'true', dependencies: ['mongodb'] },
  'bigquery.ts': { enabled: process.env.PLUGIN_BIGQUERY_ENABLED === 'true', dependencies: ['@google-cloud/bigquery'] },
  'snowflake.ts': { enabled: process.env.PLUGIN_SNOWFLAKE_ENABLED === 'true', dependencies: ['snowflake-sdk'] },
  'athena.ts': { enabled: process.env.PLUGIN_ATHENA_ENABLED === 'true', dependencies: ['@aws-sdk/client-athena'] },
  'dynamodb.ts': { enabled: process.env.PLUGIN_DYNAMODB_ENABLED === 'true', dependencies: ['@aws-sdk/client-dynamodb'] },
  'cosmosdb.ts': { enabled: process.env.PLUGIN_COSMOSDB_ENABLED === 'true', dependencies: ['@azure/cosmos'] },

  // Storage Service Plugins
  's3.ts': { enabled: process.env.PLUGIN_S3_ENABLED === 'true', dependencies: ['@aws-sdk/client-s3'] },
  'azure_storage.ts': { enabled: process.env.PLUGIN_AZURE_STORAGE_ENABLED === 'true', dependencies: ['@azure/storage-blob'] },
  'google_storage.ts': { enabled: process.env.PLUGIN_GOOGLE_STORAGE_ENABLED === 'true', dependencies: ['@google-cloud/storage'] },
  'google_drive.ts': { enabled: process.env.PLUGIN_GOOGLE_DRIVE_ENABLED === 'true', dependencies: ['googleapis'] },
  'one_drive.ts': { enabled: process.env.PLUGIN_ONEDRIVE_ENABLED === 'true', dependencies: ['@azure/msal-node'] },
  'ftp.ts': { enabled: process.env.PLUGIN_FTP_ENABLED === 'true', dependencies: ['ssh2-sftp-client', 'ftp'] },

  // Data Lake Plugins
  'delta_table_aws.ts': { enabled: process.env.PLUGIN_DELTA_AWS_ENABLED === 'true', dependencies: ['@aws-sdk/client-s3'] },
  'delta_table_azure.ts': { enabled: process.env.PLUGIN_DELTA_AZURE_ENABLED === 'true', dependencies: ['@azure/storage-blob'] },
  'delta_table_gcp.ts': { enabled: process.env.PLUGIN_DELTA_GCP_ENABLED === 'true', dependencies: ['@google-cloud/storage'] },
  'iceberg.ts': { enabled: process.env.PLUGIN_ICEBERG_ENABLED === 'true', dependencies: ['apache-iceberg'] },
};

export class PluginConfigManager {
  /**
   * Check if a plugin should be loaded
   */
  static shouldLoadPlugin(filename: string): boolean {
    const config = PLUGIN_CONFIGURATION[filename];
    
    if (!config) {
      // If not in configuration, check environment variable
      const envVar = `PLUGIN_${filename.replace('.ts', '').toUpperCase()}_ENABLED`;
      return process.env[envVar] === 'true';
    }
    
    return config.enabled;
  }

  /**
   * Check if plugin dependencies are available
   */
  static checkPluginDependencies(filename: string): { available: boolean; missing: string[] } {
    const config = PLUGIN_CONFIGURATION[filename];
    
    if (!config?.dependencies) {
      return { available: true, missing: [] };
    }

    const missing: string[] = [];
    
    for (const dep of config.dependencies) {
      try {
        require.resolve(dep);
      } catch (error) {
        missing.push(dep);
      }
    }

    return {
      available: missing.length === 0,
      missing
    };
  }

  /**
   * Get plugin load status
   */
  static getPluginStatus(filename: string): {
    enabled: boolean;
    dependenciesAvailable: boolean;
    missing: string[];
    shouldLoad: boolean;
  } {
    const enabled = this.shouldLoadPlugin(filename);
    const { available, missing } = this.checkPluginDependencies(filename);
    
    return {
      enabled,
      dependenciesAvailable: available,
      missing,
      shouldLoad: enabled && available
    };
  }

  /**
   * Get all plugin statuses
   */
  static getAllPluginStatuses(): Record<string, ReturnType<typeof PluginConfigManager.getPluginStatus>> {
    const statuses: Record<string, ReturnType<typeof PluginConfigManager.getPluginStatus>> = {};
    
    for (const filename of Object.keys(PLUGIN_CONFIGURATION)) {
      statuses[filename] = this.getPluginStatus(filename);
    }
    
    return statuses;
  }

  /**
   * Log plugin loading summary
   */
  static logPluginSummary(): void {
    const statuses = this.getAllPluginStatuses();
    const enabled = Object.values(statuses).filter(s => s.shouldLoad).length;
    const disabled = Object.values(statuses).filter(s => !s.enabled).length;
    const missingDeps = Object.values(statuses).filter(s => s.enabled && !s.dependenciesAvailable).length;
    
    logger.info('Plugin Configuration Summary:', {
      total: Object.keys(statuses).length,
      enabled,
      disabled,
      missingDependencies: missingDeps
    });

    // Log missing dependencies
    for (const [filename, status] of Object.entries(statuses)) {
      if (status.enabled && !status.dependenciesAvailable) {
        logger.warn(`Plugin ${filename} missing dependencies:`, status.missing);
      }
    }
  }
}

// Export default environment configuration for .env file
export const DEFAULT_ENV_CONFIG = `
# Core Database Plugins (always enabled)
# PLUGIN_POSTGRES_ENABLED=true
# PLUGIN_MYSQL_ENABLED=true
# PLUGIN_MARIADB_ENABLED=true
# PLUGIN_SQLITE_ENABLED=true

# Optional Database Plugins
PLUGIN_MSSQL_ENABLED=false
PLUGIN_ORACLE_ENABLED=false

# Cloud Database Plugins
PLUGIN_MONGODB_ENABLED=false
PLUGIN_BIGQUERY_ENABLED=false
PLUGIN_SNOWFLAKE_ENABLED=false
PLUGIN_ATHENA_ENABLED=false
PLUGIN_DYNAMODB_ENABLED=false
PLUGIN_COSMOSDB_ENABLED=false

# Storage Service Plugins
PLUGIN_S3_ENABLED=false
PLUGIN_AZURE_STORAGE_ENABLED=false
PLUGIN_GOOGLE_STORAGE_ENABLED=false
PLUGIN_GOOGLE_DRIVE_ENABLED=false
PLUGIN_ONEDRIVE_ENABLED=false
PLUGIN_FTP_ENABLED=false

# Data Lake Plugins
PLUGIN_DELTA_AWS_ENABLED=false
PLUGIN_DELTA_AZURE_ENABLED=false
PLUGIN_DELTA_GCP_ENABLED=false
PLUGIN_ICEBERG_ENABLED=false
`;