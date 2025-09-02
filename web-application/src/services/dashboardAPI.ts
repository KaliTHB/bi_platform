// web-application/src/services/dashboardAPI.ts
import { apiClient } from '../utils/apiUtils';

// Dashboard API - COMPLETE IMPLEMENTATION WITH ALL CACHE & FILTER OPERATIONS
export const dashboardAPI = {
  // ✅ EXISTING FUNCTIONS
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

  // 🚀 NEW FUNCTIONS - CRITICAL CACHE & FILTER OPERATIONS
  getDashboardData: async (dashboardId: string, params?: { 
    refresh?: boolean;
    filters?: any[];
    limit?: number;
    offset?: number;
    [key: string]: any;
  }): Promise<{
    success: boolean;
    data: {
      charts: any[];
      metadata: {
        dashboard_id: string;
        chart_count: number;
        last_updated: Date;
        cached: boolean;
        execution_time_ms?: number;
      };
    };
    message?: string;
  }> => {
    let endpoint = `/dashboards/${dashboardId}/data`;
    
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

  applyGlobalFilter: async (dashboardId: string, filterId: string, filterValue: any): Promise<{
    success: boolean;
    results: Array<{ 
      chart_id: string; 
      success: boolean; 
      data?: any; 
      error?: string;
      cache_invalidated?: boolean;
    }>;
    filter_id: string;
    applied_value: any;
    affected_charts: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/filter`, {
      filter_id: filterId,
      filter_value: filterValue
    });
    return response.data;
  },

  refreshDashboard: async (dashboardId: string): Promise<{
    success: boolean;
    refresh_id: string;
    status: 'initiated' | 'processing' | 'completed' | 'failed';
    started_at: Date;
    estimated_completion_time?: Date;
    charts_to_refresh: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/refresh`, {});
    return response.data;
  },

  exportDashboard: async (dashboardId: string, options: {
    format: 'pdf' | 'png' | 'svg' | 'xlsx' | 'json';
    include_filters?: boolean;
    page_size?: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    width?: number;
    height?: number;
    quality?: number;
    [key: string]: any;
  }): Promise<{
    success: boolean;
    export: {
      export_id: string;
      format: string;
      file_path?: string;
      download_url?: string;
      file_size_bytes?: number;
      status: 'processing' | 'completed' | 'failed';
      created_at: Date;
    };
    message?: string;
  }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/export`, options);
    return response.data;
  },

  // 🔧 ADDITIONAL UTILITY FUNCTIONS
  getDashboardCharts: async (dashboardId: string): Promise<{
    success: boolean;
    charts: any[];
    total: number;
    message?: string;
  }> => {
    const response = await apiClient.get(`/dashboards/${dashboardId}/charts`);
    return response.data;
  },

  updateDashboardLayout: async (dashboardId: string, layout: any): Promise<{
    success: boolean;
    layout: any;
    message: string;
  }> => {
    const response = await apiClient.put(`/dashboards/${dashboardId}/layout`, { layout });
    return response.data;
  },

  updateDashboardFilters: async (dashboardId: string, filters: any[]): Promise<{
    success: boolean;
    filters: any[];
    message: string;
  }> => {
    const response = await apiClient.put(`/dashboards/${dashboardId}/filters`, { filters });
    return response.data;
  },

  clearDashboardCache: async (dashboardId: string): Promise<{
    success: boolean;
    cache_cleared: boolean;
    affected_charts: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/dashboards/${dashboardId}/cache/clear`, {});
    return response.data;
  },

  getDashboardCacheStatus: async (dashboardId: string): Promise<{
    success: boolean;
    cache_status: {
      dashboard_cached: boolean;
      charts_cached: number;
      total_charts: number;
      last_cache_update?: Date;
      cache_size_mb?: number;
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/dashboards/${dashboardId}/cache/status`);
    return response.data;
  }
};