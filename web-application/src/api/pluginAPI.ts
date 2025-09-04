import { apiClient } from '../utils/apiUtils';

// Plugin API
export const pluginAPI = {
  getDataSourcePlugins: async (): Promise<{ success: boolean; plugins: any[]; message?: string }> => {
    const response = await apiClient.get('/plugins/datasources');
    return response.data;
  },

  getChartPlugins: async (): Promise<{ success: boolean; plugins: any[]; message?: string }> => {
    const response = await apiClient.get('/plugins/charts');
    return response.data;
  },

  testDataSourceConnection: async (data: { type: string; connection_config: any }): Promise<{ success: boolean; connection_valid?: boolean; message?: string; error?: string }> => {
    const response = await apiClient.post('/plugins/test-connection', data);
    return response.data;
  },

  getPluginConfiguration: async (workspaceId: string, pluginType: string, pluginName: string): Promise<{ success: boolean; configuration: any; message?: string }> => {
    const response = await apiClient.get(`/plugins/configuration/${pluginType}/${pluginName}`, undefined, workspaceId);
    return response.data;
  },

  updatePluginConfiguration: async (workspaceId: string, pluginType: string, pluginName: string, configuration: any): Promise<{ success: boolean; configuration: any; message: string }> => {
    const response = await apiClient.put(`/plugins/configuration/${pluginType}/${pluginName}`, configuration, undefined, workspaceId);
    return response.data;
  },
};