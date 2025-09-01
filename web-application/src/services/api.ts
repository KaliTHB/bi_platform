// web-application/src/services/api.ts
import { apiClient } from '../utils/apiUtils';
import type { 
  LoginRequest, 
  LoginResponse, 
  User, 
  Workspace, 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest 
} from '../types';

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

// Authentication API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }): Promise<{ success: boolean; user: User; message: string }> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/logout', {});
    return response.data;
  },

  verifyToken: async (): Promise<{ success: boolean; valid: boolean; user: User; message?: string }> => {
    const response = await apiClient.get('/auth/verify');
    return response.data;
  },

  forgotPassword: async (data: { email: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: { token: string; new_password: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
};

// Workspace API
export const workspaceAPI = {
  getWorkspaces: async (): Promise<{ success: boolean; workspaces: Workspace[]; message?: string }> => {
    const response = await apiClient.get('/workspaces');
    return response.data;
  },

  getWorkspace: async (workspaceId: string): Promise<{ success: boolean; workspace: Workspace; message?: string }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  createWorkspace: async (data: CreateWorkspaceRequest): Promise<{ success: boolean; workspace: Workspace; message: string }> => {
    const response = await apiClient.post('/workspaces', data);
    return response.data;
  },

  updateWorkspace: async (workspaceId: string, data: UpdateWorkspaceRequest): Promise<{ success: boolean; workspace: Workspace; message: string }> => {
    const response = await apiClient.put(`/workspaces/${workspaceId}`, data);
    return response.data;
  },

  deleteWorkspace: async (workspaceId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/workspaces/${workspaceId}`);
    return response.data;
  },

  getWorkspaceMembers: async (workspaceId: string): Promise<{ success: boolean; members: any[]; message?: string }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  getWorkspaceActivity: async (workspaceId: string, params?: any): Promise<{ success: boolean; activity: any[]; message?: string }> => {
    let endpoint = `/workspaces/${workspaceId}/activity`;
    
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

  inviteUser: async (workspaceId: string, userData: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/workspaces/${workspaceId}/invite`, userData);
    return response.data;
  },

  updateUserRole: async (workspaceId: string, userId: string, roleData: { role_ids: string[] }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put(`/workspaces/${workspaceId}/members/${userId}/roles`, roleData);
    return response.data;
  },

  removeUser: async (workspaceId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  },
};

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

// Dashboard API
export const dashboardAPI = {
  getDashboards: async (workspaceId: string, params?: any): Promise<{ success: boolean; dashboards: any[]; message?: string }> => {
    const allParams = { workspace_id: workspaceId, ...params };
    const queryParams = new URLSearchParams();
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/dashboards?${queryParams.toString()}`);
    return response.data;
  },

  getDashboard: async (dashboardId: string): Promise<{ success: boolean; dashboard: any; message?: string }> => {
    const response = await apiClient.get(`/dashboards/${dashboardId}`);
    return response.data;
  },

  createDashboard: async (data: any): Promise<{ success: boolean; dashboard: any; message: string }> => {
    const response = await apiClient.post('/dashboards', data);
    return response.data;
  },

  updateDashboard: async (dashboardId: string, data: any): Promise<{ success: boolean; dashboard: any; message: string }> => {
    const response = await apiClient.put(`/dashboards/${dashboardId}`, data);
    return response.data;
  },

  deleteDashboard: async (dashboardId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/dashboards/${dashboardId}`);
    return response.data;
  },

  duplicateDashboard: async (dashboardId: string, data: { name: string; slug: string }): Promise<{ success: boolean; dashboard: any; message: string }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/duplicate`, data);
    return response.data;
  },

  getDashboardAnalytics: async (dashboardId: string, params?: any): Promise<{ success: boolean; analytics: any; message?: string }> => {
    let endpoint = `/dashboards/${dashboardId}/analytics`;
    
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
};

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

// User API
export const userAPI = {
  getUsers: async (workspaceId?: string): Promise<{ success: boolean; users: any[]; message?: string }> => {
    const endpoint = workspaceId ? `/users?workspace_id=${workspaceId}` : '/users';
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  getUser: async (userId: string): Promise<{ success: boolean; user: any; message?: string }> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: any): Promise<{ success: boolean; user: any; message: string }> => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },

  updateUserProfile: async (data: any): Promise<{ success: boolean; user: any; message: string }> => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/users/change-password', data);
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

// Webview API
export const webviewAPI = {
  getWebviews: async (): Promise<{ success: boolean; webviews: any[]; message?: string }> => {
    const response = await apiClient.get('/webviews');
    return response.data;
  },

  getWebview: async (webviewId: string): Promise<{ success: boolean; webview: any; message?: string }> => {
    const response = await apiClient.get(`/webviews/${webviewId}`);
    return response.data;
  },

  getWebviewByName: async (webviewName: string): Promise<{
    success: boolean;
    webview: any;
    message?: string;
  }> => {
    const response = await apiClient.get(`/webviews/by-name/${webviewName}`);
    return response.data;
  },

  getWebviewCategories: async (webviewId: string, searchQuery?: string): Promise<{
    success: boolean;
    categories: any[];
    message?: string;
  }> => {
    const params = new URLSearchParams({
      include_dashboards: 'true',
      include_inactive: 'false'
    });

    if (searchQuery) {
      params.append('search', searchQuery);
    }

    const response = await apiClient.get(`/webviews/${webviewId}/categories?${params.toString()}`);
    return response.data;
  },

  getWebviewStats: async (webviewId: string): Promise<{
    success: boolean;
    stats: {
      total: number;
      featured: number;
      totalViews: number;
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/webviews/${webviewId}/stats`);
    return response.data;
  },

  logWebviewActivity: async (webviewId: string, activity: {
    event_type: string;
    category_id?: string;
    dashboard_id?: string;
    search_query?: string;
    navigation_path: string[];
    device_info: {
      type: string;
      screen_resolution: string;
      browser: string;
    };
  }): Promise<{
    success: boolean;
    message?: string;
  }> => {
    const response = await apiClient.post(`/webviews/${webviewId}/activity`, {
      ...activity,
      timestamp: Date.now().toISOString()
    });
    return response.data;
  }
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