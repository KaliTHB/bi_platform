// web-application/src/middleware/apiMiddleware.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { clearWorkspace } from '@/store/slices/workspaceSlice';

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

class ApiMiddleware {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor() {
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Auto-inject authentication token
        const token = this.getToken();
        if (token && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Auto-inject workspace context
        const workspaceId = this.getWorkspaceId();
        if (workspaceId) {
          config.headers['X-Workspace-Id'] = workspaceId;
        }

        // Log outgoing requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(this.handleRequestError(error));
      }
    );
  }

  private setupResponseInterceptor() {
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Handle successful responses
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle token expiration (401 Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue failed requests during token refresh
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
            const newToken = await this.attemptTokenRefresh();
            if (newToken) {
              this.processQueue(null, newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleResponseError(error));
      }
    );
  }

  private getToken(): string | null {
    // First try Redux store
    const state = store.getState();
    const reduxToken = state.auth.token;
    
    if (reduxToken && reduxToken !== 'undefined') {
      // Sync to localStorage for consistency
      localStorage.setItem('auth_token', reduxToken);
      return reduxToken;
    }

    // Check localStorage
    const localToken = localStorage.getItem('auth_token');
    if (localToken && localToken !== 'undefined') {
      return localToken;
    }

    // Check Redux persist as fallback
    try {
      const persistAuth = localStorage.getItem('persist:auth');
      if (persistAuth) {
        const authData = JSON.parse(persistAuth);
        const tokenData = JSON.parse(authData.token || 'null');
        if (tokenData && tokenData !== 'undefined') {
          localStorage.setItem('auth_token', tokenData);
          return tokenData;
        }
      }
    } catch (error) {
      console.warn('Error parsing persist:auth:', error);
    }

    return null;
  }

  private getWorkspaceId(): string | null {
    const state = store.getState();
    return state.workspace.currentWorkspace?.id || null;
  }

  private async attemptTokenRefresh(): Promise<string | null> {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/auth/refresh', {
        refresh_token: refreshTokenValue
      });

      if (response.data.success) {
        const { token, refresh_token } = response.data.data;
        
        // Update Redux store
        store.dispatch(setCredentials({
          user: store.getState().auth.user!,
          token,
          workspace: store.getState().workspace.currentWorkspace,
          permissions: store.getState().auth.permissions
        }));

        // Update localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refresh_token);

        return token;
      }
      
      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private handleAuthFailure() {
    // Clear all auth data
    store.dispatch(logout());
    store.dispatch(clearWorkspace());
    
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    // Redirect to login (if in browser)
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  private handleRequestError(error: any): ApiError {
    return {
      code: 'REQUEST_ERROR',
      message: 'Failed to send request',
      status: 0,
      details: error
    };
  }

  private handleResponseError(error: AxiosError): ApiError {
    const response = error.response;
    
    if (!response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your connection.',
        status: 0,
        details: error
      };
    }

    const apiError: ApiError = {
      code: (response.data as any)?.error?.code || `HTTP_${response.status}`,
      message: (response.data as any)?.message || error.message || 'An error occurred',
      status: response.status,
      details: response.data
    };

    // Handle specific error codes
    switch (response.status) {
      case 401:
        apiError.message = 'Authentication required. Please login again.';
        break;
      case 403:
        apiError.message = 'You do not have permission to perform this action.';
        break;
      case 404:
        apiError.message = 'The requested resource was not found.';
        break;
      case 429:
        apiError.message = 'Too many requests. Please try again later.';
        break;
      case 500:
        apiError.message = 'Internal server error. Please try again later.';
        break;
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${apiError.status} ${apiError.code}`, apiError);
    }

    return apiError;
  }

  // Public API methods
  get<T = any>(url: string, config?: any): Promise<T> {
    return this.api.get(url, config).then(response => response.data);
  }

  post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.api.post(url, data, config).then(response => response.data);
  }

  put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.api.put(url, data, config).then(response => response.data);
  }

  patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.api.patch(url, data, config).then(response => response.data);
  }

  delete<T = any>(url: string, config?: any): Promise<T> {
    return this.api.delete(url, config).then(response => response.data);
  }

  // Workspace-specific methods
  workspace = {
    get: <T = any>(endpoint: string, config?: any): Promise<T> => {
      const workspaceId = this.getWorkspaceId();
      if (!workspaceId) {
        throw new Error('No workspace context available');
      }
      return this.get(`/api/workspaces/${workspaceId}${endpoint}`, config);
    },
    
    post: <T = any>(endpoint: string, data?: any, config?: any): Promise<T> => {
      const workspaceId = this.getWorkspaceId();
      if (!workspaceId) {
        throw new Error('No workspace context available');
      }
      return this.post(`/api/workspaces/${workspaceId}${endpoint}`, data, config);
    },

    put: <T = any>(endpoint: string, data?: any, config?: any): Promise<T> => {
      const workspaceId = this.getWorkspaceId();
      if (!workspaceId) {
        throw new Error('No workspace context available');
      }
      return this.put(`/api/workspaces/${workspaceId}${endpoint}`, data, config);
    },

    delete: <T = any>(endpoint: string, config?: any): Promise<T> => {
      const workspaceId = this.getWorkspaceId();
      if (!workspaceId) {
        throw new Error('No workspace context available');
      }
      return this.delete(`/api/workspaces/${workspaceId}${endpoint}`, config);
    }
  };

  // Raw axios instance for special cases
  get axios(): AxiosInstance {
    return this.api;
  }
}

// Create singleton instance
export const apiClient = new ApiMiddleware();
export default apiClient;