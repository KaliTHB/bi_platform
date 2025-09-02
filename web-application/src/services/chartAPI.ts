import { apiClient } from '../utils/apiUtils';

// Chart API - UPDATED WITH REFRESH PARAMETER SUPPORT
export const chartAPI = {
  getCharts: async (params: string | { workspaceId?: string; dashboardId?: string }): Promise<{ success: boolean; charts: any[]; message?: string }> => {
    let queryParams = new URLSearchParams();
    
    if (typeof params === 'string') {
      // Legacy support: dashboardId as string
      queryParams.append('dashboard_id', params);
    } else {
      // New support: params object
      if (params.workspaceId) {
        queryParams.append('workspace_id', params.workspaceId);
      }
      if (params.dashboardId) {
        queryParams.append('dashboard_id', params.dashboardId);
      }
    }
    
    const endpoint = queryParams.toString() ? `/charts?${queryParams.toString()}` : '/charts';
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  getChart: async (chartId: string): Promise<{ success: boolean; chart: any; message?: string }> => {
    const response = await apiClient.get(`/charts/${chartId}`);
    return response.data;
  },

  createChart: async (data: any): Promise<{ success: boolean; chart: any; message: string }> => {
    const response = await apiClient.post('/charts', data);
    return response.data;
  },

  updateChart: async (chartId: string, data: any): Promise<{ success: boolean; chart: any; message: string }> => {
    const response = await apiClient.put(`/charts/${chartId}`, data);
    return response.data;
  },

  deleteChart: async (chartId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/charts/${chartId}`);
    return response.data;
  },

  duplicateChart: async (chartId: string, data: { name: string; dashboard_id?: string }): Promise<{ success: boolean; chart: any; message: string }> => {
    const response = await apiClient.post(`/charts/${chartId}/duplicate`, data);
    return response.data;
  },

  executeChartQuery: async (chartId: string): Promise<{ success: boolean; data: any[]; columns: any[]; message?: string }> => {
    const response = await apiClient.post(`/charts/${chartId}/execute`, {});
    return response.data;
  },

  // UPDATED: getChartData now supports refresh parameter
  getChartData: async (chartId: string, params?: { 
    filters?: any[]; 
    refresh?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: any; // Allow additional properties
  }): Promise<{
    success: boolean; 
    data: any[];
    columns: Array<{ name: string; type: string }>;
    execution_time: number;
    cached?: boolean;
    total_rows?: number;
    message?: string;
  }> => {
    let endpoint = `/charts/${chartId}/data`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'filters') {
            queryParams.append(key, JSON.stringify(value));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  exportChart: async (chartId: string, options: { 
    format: 'json' | 'csv' | 'excel' | 'png' | 'svg' | 'pdf'; 
    [key: string]: any 
  }): Promise<{ 
    success: boolean;
    export: { 
      data: string | Blob; 
      filename: string;
      format: string; 
    };
    message?: string;
  }> => {
    const response = await apiClient.post(`/charts/${chartId}/export`, options);
    return response.data;
  },

  refreshChart: async (chartId: string): Promise<{ success: boolean; data: any; message?: string }> => {
    const response = await apiClient.post(`/charts/${chartId}/refresh`,{});
    return response.data;
  },
};
