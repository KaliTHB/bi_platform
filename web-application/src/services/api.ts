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
    const response = await apiClient.post('/auth/logout');
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
    const response = await apiClient.get(`/workspaces/${workspaceId}/activity`, { params });
    return response.data;
  },

  inviteUser: async (workspaceId: string, userData: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/workspaces/${workspaceId}/members`, userData);
    return response.data;
  },

  updateUserRole: async (workspaceId: string, userId: string, data: { role_ids: string[] }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put(`/workspaces/${workspaceId}/members/${userId}`, data);
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
    const response = await apiClient.get(`/datasets`, {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  getDataset: async (datasetId: string): Promise<{ success: boolean; dataset: any; message?: string }> => {
    const response = await apiClient.get(`/datasets/${datasetId}`);
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

  getDatasetSchema: async (datasetId: string): Promise<{ success: boolean; schema: any; message?: string }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/schema`);
    return response.data;
  },

  testDataset: async (datasetId: string): Promise<{
    success: boolean;
    preview?: any[];
    columns?: Array<{ name: string; type: string }>;
    execution_time?: number;
    error?: string;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/test`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getDashboards: async (workspaceId: string, params?: any): Promise<{ success: boolean; dashboards: any[]; message?: string }> => {
    const response = await apiClient.get('/dashboards', {
      params: { ...params, workspaceId }
    });
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
    const response = await apiClient.get(`/dashboards/${dashboardId}/analytics`, { params });
    return response.data;
  },
};

// Chart API
export const chartAPI = {
  getCharts: async (dashboardId: string): Promise<{ success: boolean; charts: any[]; message?: string }> => {
    const response = await apiClient.get(`/charts?dashboardId=${dashboardId}`);
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

  duplicateChart: async (chartId: string, data: { dashboard_id: string }): Promise<{ success: boolean; chart: any; message: string }> => {
    const response = await apiClient.post(`/charts/${chartId}/duplicate`, data);
    return response.data;
  },

  getChartData: async (chartId: string, filters?: any): Promise<{
    success: boolean; 
    data: any[];
    columns: Array<{ name: string; type: string }>;
    execution_time: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/charts/${chartId}/data`, { filters });
    return response.data;
  },

  exportChart: async (chartId: string, options: { format: 'json' | 'csv' | 'excel' | 'png' | 'svg' | 'pdf'; [key: string]: any }): Promise<{ 
    success: boolean;
    export: { 
      data: string | Blob; 
      filename: string;
      format: string; 
    };
    message?: string;
  }> => {
    const response = await apiClient.post(`/charts/${chartId}/export`, options);
    
    // For image formats (png, svg) and PDF, the response might be a blob
    if (options.format === 'png' || options.format === 'svg' || options.format === 'pdf') {
      return {
        success: response.data.success || true,
        export: {
          data: response.data.export?.data || response.data.data,
          filename: response.data.export?.filename || `chart_${chartId}.${options.format}`,
          format: options.format
        },
        message: response.data.message
      };
    }
    
    // For data formats (json, csv, excel), return the structured response
    return {
      success: response.data.success || true,
      export: {
        data: response.data.export?.data || response.data.data,
        filename: response.data.export?.filename || `chart_${chartId}.${options.format}`,
        format: response.data.export?.format || options.format
      },
      message: response.data.message
    };
  },
};

// User API
export const userAPI = {
  getUsers: async (workspaceId: string, params?: any): Promise<{ success: boolean; users: any[]; message?: string }> => {
    const response = await apiClient.get('/users', {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  getUser: async (userId: string): Promise<{ success: boolean; user: any; message?: string }> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  createUser: async (workspaceId: string, data: any): Promise<{ success: boolean; user: any; message: string }> => {
    const response = await apiClient.post('/users', { ...data, workspaceId });
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

  updateProfile: async (data: any): Promise<{ success: boolean; user: User; message: string }> => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put('/users/change-password', data);
    return response.data;
  },
};

// Plugin API
export const pluginAPI = {
  getPlugins: async (): Promise<{
    success: boolean; 
    dataSourcePlugins: any[];
    chartPlugins: any[];
    message?: string;
  }> => {
    const response = await apiClient.get('/plugins');
    return response.data;
  },

  getDataSourcePlugins: async (): Promise<{ success: boolean; plugins: any[]; message?: string }> => {
    const response = await apiClient.get('/plugins/data-sources');
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

export const categoryAPI = {
  getCategories: async (workspaceId: string, params?: {
    webview_id?: string;
    include_dashboards?: boolean;
    include_inactive?: boolean;
    search?: string;
  }): Promise<{
    success: boolean;
    categories: any[];
    total_count: number;
    message?: string;
  }> => {
    const queryParams = new URLSearchParams({
      workspace_id: workspaceId,
      include_dashboards: 'true',  // Default to true for webview usage
      include_inactive: 'false'    // Default to false
    });

    if (params?.webview_id) queryParams.append('webview_id', params.webview_id);
    if (params?.include_dashboards !== undefined) queryParams.set('include_dashboards', params.include_dashboards.toString());
    if (params?.include_inactive !== undefined) queryParams.set('include_inactive', params.include_inactive.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.get(`/categories?${queryParams.toString()}`);
    return response.data;
  },

  getCategory: async (categoryId: string, includeDashboards: boolean = false): Promise<{
    success: boolean;
    category: any;
    message?: string;
  }> => {
    const params = includeDashboards ? '?include_dashboards=true' : '';
    const response = await apiClient.get(`/categories/${categoryId}${params}`);
    return response.data;
  },

  createCategory: async (data: {
    workspace_id: string;
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    color?: string;
    parent_category_id?: string;
    sort_order?: number;
  }): Promise<{
    success: boolean;
    category: any;
    message: string;
  }> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId: string, data: {
    name?: string;
    display_name?: string;
    description?: string;
    icon?: string;
    color?: string;
    parent_category_id?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    category: any;
    message: string;
  }> => {
    const response = await apiClient.put(`/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (categoryId: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await apiClient.delete(`/categories/${categoryId}`);
    return response.data;
  },

  reorderCategories: async (workspaceId: string, categoryIds: string[]): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await apiClient.post('/categories/reorder', {
      workspace_id: workspaceId,
      category_ids: categoryIds
    });
    return response.data;
  }
};

// Webview API - Add this section as well
export const webviewAPI = {
  getWebviewByName: async (webviewName: string): Promise<{
    success: boolean;
    webview_config: any;
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
      timestamp: new Date().toISOString()
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
  categoryAPI,  // Add this
  webviewAPI,   // Add this
};