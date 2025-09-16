// bi_platform/web-application/src/middleware/apiMiddleware.ts
// Updated to use auth storage and workspace storage utilities

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { clearWorkspaces, setCurrentWorkspace } from '@/store/slices/workspaceSlice';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

interface RefreshResponse {
  success: boolean;
  data?: {
    token: string;
    user: any;
    workspace?: any;
    permissions?: string[];
    expires_in?: number;
  };
  message?: string;
  error?: string;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

class ApiMiddleware {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: QueueItem[] = [];
  private refreshPromise: Promise<RefreshResponse> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor using storage utilities
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Use auth storage utility to get token
        const token = this.getToken();
        const workspaceId = this.getWorkspaceId();
        
        if (token && token !== 'undefined' && token !== 'null') {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Use workspace storage to get workspace context
        if (workspaceId) {
          config.headers['X-Workspace-Id'] = workspaceId;
        }

        // Add workspace slug for additional context
        const currentWorkspace = workspaceStorage.getCurrentWorkspace();
        if (currentWorkspace?.slug) {
          config.headers['X-Workspace-Slug'] = currentWorkspace.slug;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            hasToken: !!token,
            workspaceId,
            workspaceSlug: currentWorkspace?.slug
          });
        }
        
        return config;
      },
      (error) => Promise.reject(this.handleRequestError(error))
    );

    // Response interceptor with improved token refresh using storage utilities
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Check for 401 error and token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          const errorData = error.response.data as any;
          const errorCode = errorData?.error;
          
          console.log('🔍 401 error detected:', { 
            errorCode, 
            canRefresh: errorData?.can_refresh,
            url: originalRequest.url 
          });

          // Handle different types of 401 errors
          if (errorCode === 'TOKEN_EXPIRED' && errorData?.can_refresh !== false) {
            return this.handleTokenRefresh(originalRequest);
          } else {
            // Token is invalid or refresh not possible
            console.log('🚫 Token invalid, logging out');
            this.handleLogout();
            return Promise.reject(this.handleResponseError(error));
          }
        }

        // Handle 403 Workspace Access Denied
        if (error.response?.status === 403) {
          const errorData = error.response.data as any;
          if (errorData?.error === 'WORKSPACE_ACCESS_DENIED') {
            console.log('🏢 Workspace access denied');
            // Clear workspace data but keep auth
            workspaceStorage.clearWorkspace();
            store.dispatch(clearWorkspaces());
          }
        }

        return Promise.reject(this.handleResponseError(error));
      }
    );
  }

  private async handleTokenRefresh(originalRequest: any): Promise<any> {
    if (this.isRefreshing) {
      // If already refreshing, queue the request
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return this.api(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      console.log('🔄 Attempting token refresh...');
      
      // Get refresh token from auth storage
      const refreshToken = authStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Attempt token refresh
      const refreshResponse = await this.refreshToken(refreshToken);
      
      if (refreshResponse.success && refreshResponse.data?.token) {
        const newToken = refreshResponse.data.token;
        const userData = refreshResponse.data.user;
        const workspaceData = refreshResponse.data.workspace;
        const permissions = refreshResponse.data.permissions || [];
        const expiresIn = refreshResponse.data.expires_in || 24 * 60 * 60 * 1000; // 24 hours default

        // Update auth storage with new token and expiry
        const expiry = Date.now() + (expiresIn * 1000); // Convert seconds to milliseconds
        authStorage.setToken(newToken, expiry);
        authStorage.setUser(userData);
        
        // Update permissions in storage
        if (workspaceData?.id) {
          authStorage.setPermissions(permissions, workspaceData.id);
          workspaceStorage.setCurrentWorkspace(workspaceData);
        }

        // Update Redux store
        store.dispatch(setCredentials({
          user: userData,
          token: newToken,
          workspace: workspaceData,
          permissions
        }));

        // Process failed queue
        this.processQueue(null, newToken);
        
        console.log('✅ Token refreshed successfully');
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return this.api(originalRequest);
        
      } else {
        throw new Error(refreshResponse.error || 'Token refresh failed');
      }
    } catch (refreshError) {
      console.log('❌ Token refresh failed:', refreshError);
      
      // Process failed queue with error
      this.processQueue(refreshError, null);
      
      // Handle logout
      this.handleLogout();
      
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.log('Refresh token request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    
    this.failedQueue = [];
  }

  private handleLogout() {
    console.log('🚪 Handling logout - clearing all storage');
    
    // Clear all storage using utilities
    authStorage.clearAuth();
    workspaceStorage.clearWorkspace();
    
    // Clear Redux state
    store.dispatch(logout());
    store.dispatch(clearWorkspaces());
    
    // Redirect to login if in browser
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login')) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
      }
    }
  }

  // Use auth storage utility to get token
  private getToken(): string | null {
    try {
      const state = store.getState();
      if (state.auth.token) {
        return state.auth.token;
      }
      
      // Fallback to storage utility
      return authStorage.getToken();
    } catch (error) {
      // If Redux store is not available, use storage utility
      return authStorage.getToken();
    }
  }

  // Use workspace storage utility to get workspace ID
  private getWorkspaceId(): string | null {
    try {
      const state = store.getState();
      if (state.workspace.current?.id) {
        return state.workspace.current.id;
      }
    } catch (error) {
      // Redux store not available, fallback to storage
    }
    
    // Fallback to workspace storage utility
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    return currentWorkspace?.id || null;
  }

  private handleRequestError(error: any): ApiError {
    return {
      code: 'REQUEST_ERROR',
      message: 'Request configuration error',
      status: 0,
      details: error,
    };
  }

  private handleResponseError(error: AxiosError): ApiError {
    const response = error.response;
    const request = error.request;

    if (response) {
      const data = response.data as any;
      return {
        code: data?.code || data?.error || 'SERVER_ERROR',
        message: data?.message || data?.error || error.message,
        status: response.status,
        details: data,
      };
    } else if (request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        status: 0,
        details: error,
      };
    } else {
      return {
        code: 'REQUEST_SETUP_ERROR',
        message: error.message || 'Request setup failed',
        status: 0,
        details: error,
      };
    }
  }

  // Public methods
  public getInstance(): AxiosInstance {
    return this.api;
  }

  public async request<T = any>(config: any): Promise<T> {
    const response = await this.api.request(config);
    return response.data;
  }

  // Method to manually refresh token
  public async forceTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = authStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const refreshResponse = await this.refreshToken(refreshToken);
      
      if (refreshResponse.success && refreshResponse.data?.token) {
        const newToken = refreshResponse.data.token;
        const userData = refreshResponse.data.user;
        const workspaceData = refreshResponse.data.workspace;
        const permissions = refreshResponse.data.permissions || [];
        const expiresIn = refreshResponse.data.expires_in || 24 * 60 * 60 * 1000;

        // Update storage
        const expiry = Date.now() + (expiresIn * 1000);
        authStorage.setToken(newToken, expiry);
        authStorage.setUser(userData);
        
        if (workspaceData?.id) {
          authStorage.setPermissions(permissions, workspaceData.id);
          workspaceStorage.setCurrentWorkspace(workspaceData);
        }

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Force token refresh failed:', error);
      this.handleLogout();
      return false;
    }
  }

  // Method to check if token is about to expire
  public isTokenExpiringSoon(): boolean {
    const token = authStorage.getToken();
    if (!token) return true;

    // Check if token expires in less than 5 minutes
    const tokenData = authStorage.getUser(); // This might contain expiry info
    // You might need to decode JWT token to get expiry
    // For now, assume it's valid if we have it
    return false;
  }

  // Method to get current session info
  public getSessionInfo() {
    return {
      token: authStorage.getToken(),
      user: authStorage.getUser(),
      workspace: workspaceStorage.getCurrentWorkspace(),
      permissions: authStorage.getPermissions(),
      isAuthenticated: authStorage.isAuthenticated(),
      availableWorkspaces: workspaceStorage.getAvailableWorkspaces()
    };
  }
}

// Export singleton instance
export const apiMiddleware = new ApiMiddleware();
export const apiClient = apiMiddleware.getInstance();
export default apiMiddleware;