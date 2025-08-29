// File: api-services/src/services/PluginService.ts

import { Pool } from 'pg';
import { DataSourcePlugin } from '../plugins/interfaces/DataSourcePlugin';
import { getDataSourcePlugin, getAvailableDataSourcePlugins } from '../plugins/datasources';
import { ChartPluginConfig } from '../plugins/interfaces/ChartPlugin';

export interface PluginConfiguration {
  id: string;
  workspace_id: string;
  plugin_type: 'datasource' | 'chart';
  plugin_name: string;
  configuration: any;
  is_enabled: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export class PluginService {
  constructor(private db: Pool) {}

  // Data Source Plugin Methods
  async getAvailableDataSourcePlugins() {
    return getAvailableDataSourcePlugins();
  }

  async getDataSourcePlugin(name: string): Promise<DataSourcePlugin | null> {
    return getDataSourcePlugin(name);
  }

  async testDataSourceConnection(pluginName: string, config: any): Promise<boolean> {
    const plugin = getDataSourcePlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    return await plugin.testConnection(config);
  }

  // Plugin Configuration Methods
  async getWorkspacePluginConfigs(workspaceId: string): Promise<PluginConfiguration[]> {
    const query = `
      SELECT * FROM workspace_plugin_configs 
      WHERE workspace_id = $1 
      ORDER BY plugin_type, plugin_name
    `;
    
    const result = await this.db.query(query, [workspaceId]);
    return result.rows;
  }

  async updatePluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any,
    isEnabled: boolean,
    userId: string
  ): Promise<PluginConfiguration> {
    const query = `
      INSERT INTO workspace_plugin_configs (workspace_id, plugin_type, plugin_name, configuration, is_enabled, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (workspace_id, plugin_type, plugin_name) 
      DO UPDATE SET 
        configuration = $4,
        is_enabled = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      workspaceId,
      pluginType,
      pluginName,
      JSON.stringify(configuration),
      isEnabled,
      userId
    ]);

    return result.rows[0];
  }

  async enablePlugin(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    userId: string
  ): Promise<void> {
    await this.updatePluginConfiguration(workspaceId, pluginType, pluginName, {}, true, userId);
  }

  async disablePlugin(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ): Promise<void> {
    const query = `
      UPDATE workspace_plugin_configs 
      SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = $1 AND plugin_type = $2 AND plugin_name = $3
    `;

    await this.db.query(query, [workspaceId, pluginType, pluginName]);
  }

  async getPluginUsageStats(workspaceId: string, pluginName?: string) {
    let query = `
      SELECT 
        plugin_name,
        COUNT(*) as usage_count,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(usage_timestamp) as last_used
      FROM plugin_usage_stats 
      WHERE workspace_id = $1
    `;
    
    const params = [workspaceId];
    
    if (pluginName) {
      query += ' AND plugin_name = $2';
      params.push(pluginName);
    }
    
    query += ' GROUP BY plugin_name ORDER BY usage_count DESC';
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async logPluginUsage(
    workspaceId: string,
    pluginName: string,
    usageType: string,
    userId?: string,
    executionTimeMs?: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const query = `
      INSERT INTO plugin_usage_stats 
      (workspace_id, plugin_name, user_id, usage_type, execution_time_ms, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      workspaceId,
      pluginName,
      userId,
      usageType,
      executionTimeMs,
      success,
      errorMessage
    ]);
  }
}
