// File: api-services/src/services/PluginService.ts
import { Pool, PoolClient } from 'pg';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';
import { DataSourceRegistry } from '../plugins/datasources/registry/DataSourceRegistry';
import { ChartRegistry } from '../plugins/charts/registry/ChartRegistry';

export interface PluginConfiguration {
  id: string;
  workspace_id: string;
  plugin_type: 'datasource' | 'chart';
  plugin_name: string;
  configuration: any;
  is_enabled: boolean;
  enabled_by: string;
  enabled_at: Date;
  last_used?: Date;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Plugin {
  name: string;
  displayName: string;
  category: string;
  version: string;
  description?: string;
  plugin_type: 'datasource' | 'chart';
  configSchema: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error_code?: string;
}

export class PluginService {
  private db: Pool;
  private cacheService: CacheService;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    this.cacheService = new CacheService();
  }

  async getAvailablePlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    // Get data source plugins
    const dataSourcePlugins = DataSourceRegistry.getAllPlugins();
    plugins.push(...dataSourcePlugins.map(plugin => ({
      name: plugin.name,
      displayName: plugin.displayName,
      category: plugin.category,
      version: plugin.version,
      description: plugin.description,
      plugin_type: 'datasource' as const,
      configSchema: plugin.configSchema
    })));

    // Get chart plugins
    const chartPlugins = ChartRegistry.getAllPlugins();
    plugins.push(...chartPlugins.map(plugin => ({
      name: plugin.name,
      displayName: plugin.displayName,
      category: plugin.category,
      version: plugin.version,
      description: plugin.description,
      plugin_type: 'chart' as const,
      configSchema: plugin.configSchema
    })));

    return plugins;
  }

  async getWorkspaceConfigurations(workspaceId: string): Promise<PluginConfiguration[]> {
    const cacheKey = `workspace-configs:${workspaceId}`;
    
    // Try cache first
    let configs = await this.cacheService.get<PluginConfiguration[]>(cacheKey);
    
    if (configs) {
      return configs;
    }

    const query = `
      WITH plugin_stats AS (
        SELECT 
          plugin_name,
          plugin_type,
          COUNT(*) as usage_count,
          MAX(last_used) as last_used
        FROM workspace_plugin_configs 
        WHERE workspace_id = $1
        GROUP BY plugin_name, plugin_type
      )
      SELECT 
        wpc.id,
        wpc.workspace_id,
        wpc.plugin_type,
        wpc.plugin_name,
        wpc.configuration,
        wpc.is_enabled,
        wpc.enabled_by,
        wpc.enabled_at,
        COALESCE(ps.usage_count, 0) as usage_count,
        ps.last_used,
        wpc.created_at,
        wpc.updated_at
      FROM workspace_plugin_configs wpc
      LEFT JOIN plugin_stats ps ON (
        wpc.plugin_name = ps.plugin_name AND 
        wpc.plugin_type = ps.plugin_type
      )
      WHERE wpc.workspace_id = $1
      ORDER BY wpc.plugin_type, wpc.plugin_name
    `;

    const result = await this.db.query(query, [workspaceId]);
    configs = result.rows;

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, configs, 300);

    return configs;
  }

  async updatePluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any,
    isEnabled: boolean,
    userId: string
  ): Promise<PluginConfiguration> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Validate plugin configuration
      const validation = await this.validatePluginConfiguration(pluginType, pluginName, configuration);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const query = `
        INSERT INTO workspace_plugin_configs (
          workspace_id, plugin_type, plugin_name, configuration, 
          is_enabled, enabled_by, enabled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (workspace_id, plugin_type, plugin_name)
        DO UPDATE SET 
          configuration = $4,
          is_enabled = $5,
          enabled_by = $6,
          enabled_at = CASE WHEN $5 = true THEN CURRENT_TIMESTAMP ELSE workspace_plugin_configs.enabled_at END,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await client.query(query, [
        workspaceId,
        pluginType,
        pluginName,
        JSON.stringify(configuration),
        isEnabled,
        userId
      ]);

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.delete(`workspace-configs:${workspaceId}`);

      return {
        ...result.rows[0],
        configuration: JSON.parse(result.rows[0].configuration),
        usage_count: 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async testPluginConnection(pluginName: string, configuration: any): Promise<ConnectionTestResult> {
    try {
      const plugin = DataSourceRegistry.getPlugin(pluginName);
      if (!plugin) {
        return {
          success: false,
          message: `Plugin ${pluginName} not found`,
          error_code: 'PLUGIN_NOT_FOUND'
        };
      }

      const result = await plugin.testConnection(configuration);
      return {
        success: result,
        message: result ? 'Connection successful' : 'Connection failed'
      };
    } catch (error) {
      logger.error(`Plugin connection test failed for ${pluginName}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        error_code: 'CONNECTION_FAILED'
      };
    }
  }

  async getPluginStatistics(workspaceId: string) {
    const query = `
      SELECT 
        plugin_type,
        plugin_name,
        COUNT(*) as config_count,
        SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled_count,
        AVG(usage_count) as avg_usage,
        MAX(last_used) as last_used,
        MIN(created_at) as first_configured
      FROM workspace_plugin_configs
      WHERE workspace_id = $1
      GROUP BY plugin_type, plugin_name
      ORDER BY plugin_type, enabled_count DESC
    `;

    const result = await this.db.query(query, [workspaceId]);
    
    const statistics = {
      total_plugins: result.rows.length,
      enabled_plugins: result.rows.filter(row => row.enabled_count > 0).length,
      by_type: result.rows.reduce((acc, row) => {
        acc[row.plugin_type] = acc[row.plugin_type] || { total: 0, enabled: 0 };
        acc[row.plugin_type].total++;
        if (row.enabled_count > 0) acc[row.plugin_type].enabled++;
        return acc;
      }, {} as any),
      plugin_details: result.rows
    };

    return statistics;
  }

  private async validatePluginConfiguration(
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    if (pluginType === 'datasource') {
      return DataSourceRegistry.validatePluginConfiguration(pluginName, configuration);
    } else {
      return ChartRegistry.validatePluginConfiguration(pluginName, configuration);
    }
  }
}