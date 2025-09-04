import { apiClient } from '../utils/apiUtils';

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
      timestamp: new Date().toISOString()
    });
    return response.data;
  }
};