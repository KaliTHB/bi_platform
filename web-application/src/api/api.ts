// web-application/src/services/api.ts
import { apiClient } from '../utils/apiUtils';

// Standard API response interface for consistency
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Dataset API
export const datasetAPI = {
  getDatasets: async (workspaceId: string, params?: any): Promise<{ success: boolean; datasets: any[]; message?: string }> => {
    const allParams = { workspace_id: workspaceId, ...params };
    const queryParams = new URLSearchParams();
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/datasets?${queryParams.toString()}`);
    return response.data;
  },

  getColumns: async (datasetId: string): Promise<Array<{ name: string; type: string }>> => {
    try {
      // Use the existing getDatasetSchema method to get column information
      const schemaResponse = await datasetAPI.getDatasetSchema(datasetId);
      
      if (schemaResponse.success && schemaResponse.schema && schemaResponse.schema.columns) {
        // Convert schema columns to the expected format
        return schemaResponse.schema.columns.map(column => ({
          name: column.name,
          type: column.type || 'string'
        }));
      }
      
      throw new Error('Failed to get columns from schema');
    } catch (error: any) {
      // Fallback: try to get columns from preview
      try {
        const previewResponse = await datasetAPI.previewDataset(datasetId, { limit: 1 });
        
        if (previewResponse.success && previewResponse.columns) {
          return previewResponse.columns;
        }
        
        throw new Error('Failed to get columns from preview');
      } catch (previewError) {
        console.error('Failed to get columns:', error, previewError);
        throw new Error(`Unable to get columns for dataset ${datasetId}`);
      }
    }
  },

   // Get dataset preview
  previewDataset: async (datasetId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    preview: any[];
    columns: Array<{ name: string; type: string }>;
    total_rows: number;
    message?: string;
  }> => {
    let endpoint = `/datasets/${datasetId}/preview`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  getDataset: async (datasetId: string): Promise<{ success: boolean; dataset: any; message?: string }> => {
    const response = await apiClient.get(`/datasets/${datasetId}`);
    return response.data;
  },

   getDatasetSchema: async (datasetId: string): Promise<{
    success: boolean;
    schema: {
      columns: Array<{ 
        name: string; 
        type: string; 
        nullable?: boolean;
        primaryKey?: boolean;
        description?: string;
      }>;
      table_info?: {
        name: string;
        row_count?: number;
        size?: string;
      };
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/schema`);
    return response.data;
  },

  refreshDataset: async (datasetId: string): Promise<{
    success: boolean;
    dataset: any;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/refresh`, {});
    return response.data;
  },

  createDataset: async (data: any): Promise<{ success: boolean; dataset: any; message: string }> => {
    const response = await apiClient.post('/datasets', data);
    return response.data;
  },

  updateDataset: async (datasetId: string, data: any): Promise<{ success: boolean; dataset: any; message: string }> => {
    const response = await apiClient.put(`/datasets/${datasetId}`, data);
    return response.data;
  },

  deleteDataset: async (datasetId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/datasets/${datasetId}`);
    return response.data;
  },

  queryDataset: async (datasetId: string, queryOptions: any): Promise<{ 
    success: boolean; 
    data: any[]; 
    columns: Array<{ name: string; type: string }>; 
    total_rows: number;
    execution_time: number;
    cached: boolean;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/query`, queryOptions);
    return response.data;
  },

  testDataset: async (datasetId: string): Promise<{
    success: boolean;
    preview: any[];
    columns?: Array<{ name: string; type: string }>;
    execution_time?: number;
    error?: string;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/test`, {});
    return response.data;
  },
};

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

// Category API
export const categoryAPI = {
  getCategories: async (workspaceId: string, params?: any): Promise<{ success: boolean; categories: any[]; message?: string }> => {
    const allParams = { workspace_id: workspaceId, ...params };
    const queryParams = new URLSearchParams();
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/categories?${queryParams.toString()}`);
    return response.data;
  },

  getCategory: async (categoryId: string): Promise<{ success: boolean; category: any; message?: string }> => {
    const response = await apiClient.get(`/categories/${categoryId}`);
    return response.data;
  },

  createCategory: async (data: any): Promise<{ success: boolean; category: any; message: string }> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId: string, data: any): Promise<{ success: boolean; category: any; message: string }> => {
    const response = await apiClient.put(`/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (categoryId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/categories/${categoryId}`);
    return response.data;
  },
};

export default {
  authAPI,
  workspaceAPI,
  datasetAPI,
  dashboardAPI,
  chartAPI,
  userAPI,
  pluginAPI,
  categoryAPI,
  webviewAPI,
};