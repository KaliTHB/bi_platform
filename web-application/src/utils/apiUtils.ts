// bi_platform/web-application/src/utils/apiUtils.ts
// Updated to use auth storage and workspace storage utilities

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { authStorage, workspaceStorage } from './storageUtils';

// Define the base URL from environment or default
const BASE_URL = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API Client class
export class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = BASE_URL) {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token and workspace headers
    this.instance.interceptors.request.use(
      (config) => {
        // Get token from auth storage instead of direct localStorage access
        const token = this.token || authStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Get user from auth storage instead of direct localStorage access
        const currentUser = this.token || authStorage.getUser();
        if (currentUser?.id) {
          config.headers['X-user-ID'] = currentUser.id;
        }        

        // Add workspace context from workspace storage
        const currentWorkspace = workspaceStorage.getCurrentWorkspace();
        if (currentWorkspace?.id) {
          config.headers['X-Workspace-ID'] = currentWorkspace.id;
          config.headers['X-Workspace-Slug'] = currentWorkspace.slug;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration - clear auth storage
          this.clearToken();
          authStorage.clearAuth();
          // You might want to redirect to login here or dispatch logout action
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    // Store token using auth storage utility with proper TTL
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    authStorage.setToken(token, expiry);
  }

  clearToken() {
    this.token = null;
    // Clear token using auth storage utility
    authStorage.clearAuth();
  }

  // GET request with workspace context
  async get<T = any>(
    url: string, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    
    // Use provided workspaceId or get from workspace storage
    const finalWorkspaceId = workspaceId || workspaceStorage.getCurrentWorkspace()?.id;
    if (finalWorkspaceId) {
      config.headers = { 
        ...config.headers, 
        'X-Workspace-ID': finalWorkspaceId 
      };
    }
    
    return this.instance.get(url, config);
  }

  // POST request with workspace context
  async post<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    
    const finalWorkspaceId = workspaceId || workspaceStorage.getCurrentWorkspace()?.id;
    if (finalWorkspaceId) {
      config.headers = { 
        ...config.headers, 
        'X-Workspace-ID': finalWorkspaceId 
      };
    }
    
    return this.instance.post(url, data, config);
  }

  // PUT request with workspace context
  async put<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    
    const finalWorkspaceId = workspaceId || workspaceStorage.getCurrentWorkspace()?.id;
    if (finalWorkspaceId) {
      config.headers = { 
        ...config.headers, 
        'X-Workspace-ID': finalWorkspaceId 
      };
    }
    
    return this.instance.put(url, data, config);
  }

  // DELETE request with workspace context
  async delete<T = any>(
    url: string, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    
    const finalWorkspaceId = workspaceId || workspaceStorage.getCurrentWorkspace()?.id;
    if (finalWorkspaceId) {
      config.headers = { 
        ...config.headers, 
        'X-Workspace-ID': finalWorkspaceId 
      };
    }
    
    return this.instance.delete(url, config);
  }

  // PATCH request with workspace context
  async patch<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    
    const finalWorkspaceId = workspaceId || workspaceStorage.getCurrentWorkspace()?.id;
    if (finalWorkspaceId) {
      config.headers = { 
        ...config.headers, 
        'X-Workspace-ID': finalWorkspaceId 
      };
    }
    
    return this.instance.patch(url, data, config);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Enhanced utility functions using storage utilities
export const apiUtils = {
  // Token management using auth storage
  setAuthToken: (token: string, expiry?: number) => {
    apiClient.setToken(token);
    if (expiry) {
      authStorage.setToken(token, expiry);
    }
  },

  clearAuthToken: () => {
    apiClient.clearToken();
  },

  getAuthToken: () => {
    return authStorage.getToken();
  },

  // Initialize token from auth storage
  initializeToken: () => {
    if (typeof window !== 'undefined') {
      const token = authStorage.getToken();
      if (token) {
        apiClient.setToken(token);
      }
    }
  },

  // Authentication check using auth storage
  isAuthenticated: () => {
    return authStorage.isAuthenticated();
  },

  // User management using auth storage
  getCurrentUser: () => {
    return authStorage.getUser();
  },

  setCurrentUser: (user: any) => {
    authStorage.setUser(user);
  },

  // Permission management using auth storage
  getUserPermissions: (workspaceId?: string) => {
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    const finalWorkspaceId = workspaceId || currentWorkspace?.id;
    return authStorage.getPermissions(finalWorkspaceId);
  },

  setUserPermissions: (permissions: string[], workspaceId?: string) => {
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    const finalWorkspaceId = workspaceId || currentWorkspace?.id;
    return authStorage.setPermissions(permissions, finalWorkspaceId);
  },

  // Workspace management using workspace storage
  getCurrentWorkspace: () => {
    return workspaceStorage.getCurrentWorkspace();
  },

  setCurrentWorkspace: (workspace: any) => {
    workspaceStorage.setCurrentWorkspace(workspace);
  },

  getAvailableWorkspaces: () => {
    return workspaceStorage.getAvailableWorkspaces();
  },

  setAvailableWorkspaces: (workspaces: any[]) => {
    workspaceStorage.setAvailableWorkspaces(workspaces);
  },

  // Switch workspace with proper cleanup
  switchWorkspace: async (workspace: any) => {
    // Clear current workspace permissions
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    if (currentWorkspace?.id) {
      authStorage.clearPermissions(currentWorkspace.id);
    }

    // Set new workspace
    workspaceStorage.setCurrentWorkspace(workspace);

    // You might want to fetch new permissions here
    // and set them using setUserPermissions
  },

  // Complete logout with storage cleanup
  logout: () => {
    apiClient.clearToken();
    authStorage.clearAuth();
    workspaceStorage.clearWorkspace();
  },

  // Error handling utilities
  formatApiError: (error: any) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  handleApiError: (error: any) => {
    console.error('API Error:', error);
    const message = apiUtils.formatApiError(error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      apiUtils.logout();
    } else if (error.response?.status === 403) {
      // Workspace access denied
      console.warn('Workspace access denied');
    }
    
    // You can add notification logic here
    // For example: toast.error(message);
    
    return message;
  },

  // Session validation
  validateSession: () => {
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    const workspace = workspaceStorage.getCurrentWorkspace();
    
    return {
      isValid: !!(token && user && workspace),
      hasToken: !!token,
      hasUser: !!user,
      hasWorkspace: !!workspace,
      token,
      user,
      workspace
    };
  },

  // Request with automatic retry on token refresh
  requestWithRetry: async <T = any>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 1
  ): Promise<AxiosResponse<T>> => {
    try {
      return await requestFn();
    } catch (error: any) {
      if (error.response?.status === 401 && maxRetries > 0) {
        // Try to refresh token or re-authenticate
        // This would be implemented based on your auth flow
        console.log('Token refresh needed');
        
        // For now, just logout on 401
        apiUtils.logout();
      }
      throw error;
    }
  }
};

// Initialize token on app load
if (typeof window !== 'undefined') {
  apiUtils.initializeToken();
}

// Export default
export default apiUtils;