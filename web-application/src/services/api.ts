// web-application/src/services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  User,
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest
} from '@/types/auth.types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generic API response type
interface ApiResponse<T = any> {
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
  }): Promise<{ message: string; user: User }> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  verifyToken: async (): Promise<{ success: boolean; valid: boolean; user: User }> => {
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
  getWorkspaces: async (): Promise<{ success: boolean; workspaces: Workspace[] }> => {
    const response = await apiClient.get('/workspaces');
    return response.data;
  },

  getWorkspace: async (workspaceId: string): Promise<{ success: boolean; workspace: Workspace }> => {
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

  getWorkspaceMembers: async (workspaceId: string): Promise<{ success: boolean; members: any[] }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  getWorkspaceActivity: async (workspaceId: string, params?: any): Promise<{ success: boolean; activity: any[] }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}/activity`, { params });
    return response.data;
  },

  inviteUser: async (workspaceId: string, userData: any): Promise<{success: boolean;  message: string }> => {
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
  getDatasets: async (workspaceId: string, params?: any): Promise<ApiResponse<{ success: boolean; datasets: any[] }>> => {
    const response = await apiClient.get(`/datasets`, {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  getDataset: async (datasetId: string): Promise<{ success: boolean; dataset: any }> => {
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
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/query`, queryOptions);
    return response.data;
  },

  getDatasetSchema: async (datasetId: string): Promise<{ success: boolean; schema: any }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/schema`);
    return response.data;
  },

  testDataset: async (datasetId: string): Promise<{
    success: boolean;
    preview?: any[];
    columns?: Array<{ name: string; type: string }>;
    execution_time?: number;
    error?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/test`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getDashboards: async (workspaceId: string, params?: any): Promise<ApiResponse<{ success: boolean; dashboards: any[] }>> => {
    const response = await apiClient.get('/dashboards', {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  getDashboard: async (dashboardId: string): Promise<{ success: boolean; dashboard: any }> => {
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

  deleteDashboard: async (dashboardId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/dashboards/${dashboardId}`);
    return response.data;
  },

  duplicateDashboard: async (dashboardId: string, data: { name: string; slug: string }): Promise<{ success: boolean; dashboard: any; message: string }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/duplicate`, data);
    return response.data;
  },

  getDashboardAnalytics: async (dashboardId: string, params?: any): Promise<{ success: boolean; analytics: any }> => {
    const response = await apiClient.get(`/dashboards/${dashboardId}/analytics`, { params });
    return response.data;
  },
};

// Chart API
// Complete chartAPI object for web-application/src/services/api.ts
export const chartAPI = {
  getCharts: async (dashboardId: string): Promise<{ success: boolean; charts: any[] }> => {
    const response = await apiClient.get(`/charts?dashboardId=${dashboardId}`);
    return response.data;
  },

  getChart: async (chartId: string): Promise<{ success: boolean; chart: any }> => {
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
  }> => {
    const response = await apiClient.post(`/charts/${chartId}/data`, { filters });
    return response.data;
  },

  // ADD THIS MISSING METHOD:
  exportChart: async (chartId: string, options: { format: 'json' | 'csv' | 'excel' | 'png' | 'svg' | 'pdf'; [key: string]: any }): Promise<{ 
    export: { 
      data: string | Blob; 
      filename: string;
      format: string; 
    } 
  }> => {
    const response = await apiClient.post(`/charts/${chartId}/export`, options);
    
    // For image formats (png, svg) and PDF, the response might be a blob
    if (options.format === 'png' || options.format === 'svg' || options.format === 'pdf') {
      // If the backend returns raw data for images, wrap it appropriately
      return {
        export: {
          data: response.data,
          filename: `chart_${chartId}.${options.format}`,
          format: options.format
        }
      };
    }
    
    // For data formats (json, csv, excel), return the structured response
    return {
      export: {
        data: response.data.data.data,
        filename: response.data.data.filename,
        format: response.data.data.format
      }
    };
  },
};

// User API
export const userAPI = {
  getUsers: async (workspaceId: string, params?: any): Promise<ApiResponse<{ success: boolean; users: any[] }>> => {
    const response = await apiClient.get('/users', {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  getUser: async (userId: string): Promise<{ success: boolean; user: any }> => {
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

  changePassword: async (data: { success: boolean; current_password: string; new_password: string }): Promise<{ message: string }> => {
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
  }> => {
    const response = await apiClient.get('/plugins');
    return response.data;
  },

  getDataSourcePlugins: async (): Promise<{ success: boolean;  plugins: any[] }> => {
    const response = await apiClient.get('/plugins/data-sources');
    return response.data;
  },

  getChartPlugins: async (): Promise<{ success: boolean; plugins: any[] }> => {
    const response = await apiClient.get('/plugins/charts');
    return response.data;
  },

  testDataSourceConnection: async (data: { type: string; connection_config: any }): Promise<{ success: boolean; error?: string }> => {
    const response = await apiClient.post('/plugins/data-sources/test', data);
    return response.data;
  },

  validateChartConfig: async (data: { chart_type: string; config: any }): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await apiClient.post('/plugins/charts/validate', data);
    return response.data;
  },
};

// Export API
export const exportAPI = {
  exportDashboard: async (dashboardId: string, format: 'pdf' | 'png' | 'jpg'): Promise<Blob> => {
    const response = await apiClient.get(`/exports/dashboard/${dashboardId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  exportChart: async (chartId: string, format: 'pdf' | 'png' | 'jpg' | 'svg'): Promise<Blob> => {
    const response = await apiClient.get(`/exports/chart/${chartId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  exportData: async (datasetId: string, format: 'csv' | 'xlsx', filters?: any): Promise<Blob> => {
    const response = await apiClient.post(`/exports/data/${datasetId}`, 
      { filters },
      {
        params: { format },
        responseType: 'blob'
      }
    );
    return response.data;
  },
};

// Health API
export const healthAPI = {
  getHealth: async (): Promise<any> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  getDetailedHealth: async (): Promise<any> => {
    const response = await apiClient.get('/health/detailed');
    return response.data;
  },

  getMetrics: async (): Promise<any> => {
    const response = await apiClient.get('/health/metrics');
    return response.data;
  },
};


// Utility functions
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default apiClient;