/ File: web-application/src/services/pluginAPI.ts
import { apiClient } from '../utils/apiUtils';
import type { Plugin, PluginConfiguration, ConnectionTestResult } from '../hooks/usePluginConfiguration';

export class PluginAPIService {
  private baseUrl = '/api/plugins';

  async getAvailablePlugins(): Promise<Plugin[]> {
    const response = await apiClient.get<{ plugins: Plugin[] }>(`${this.baseUrl}/available`);
    return response.data.plugins;
  }

  async getWorkspaceConfigurations(workspaceId: string): Promise<PluginConfiguration[]> {
    const response = await apiClient.get<{ configurations: PluginConfiguration[] }>(
      `${this.baseUrl}/configurations`,
      undefined,
      workspaceId
    );
    return response.data.configurations;
  }

  async updatePluginConfiguration(
    workspaceId: string,
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any,
    isEnabled: boolean
  ): Promise<PluginConfiguration> {
    const response = await apiClient.put<{ configuration: PluginConfiguration }>(
      `${this.baseUrl}/configurations`,
      {
        plugin_type: pluginType,
        plugin_name: pluginName,
        configuration,
        is_enabled: isEnabled
      },
      undefined,
      workspaceId
    );
    return response.data.configuration;
  }

  async testPluginConnection(
    workspaceId: string,
    pluginName: string,
    configuration: any
  ): Promise<ConnectionTestResult> {
    const response = await apiClient.post<ConnectionTestResult>(
      `${this.baseUrl}/test-connection`,
      {
        plugin_name: pluginName,
        configuration
      },
      undefined,
      workspaceId
    );
    return response.data;
  }

  async getPluginStatistics(workspaceId: string) {
    const response = await apiClient.get(`${this.baseUrl}/statistics`, undefined, workspaceId);
    return response.data;
  }
}

export const pluginAPI = new PluginAPIService();