// web-application/src/middleware/apiMiddleware.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { clearWorkspaces } from '@/store/slices/workspaceSlice'; // Fixed: Changed from clearWorkspace to clearWorkspaces

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
        if (token && token !== 'undefined' && token !== 'null') {
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

        if (error.response?.status === 401 && !originalRequest._retry) {
          // Token might be expired or invalid
          console.log('401 error detected, attempting token refresh or logout');
          
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            originalRequest._retry = true;

            try {
              // Attempt to refresh token
              const refreshResponse = await this.refreshToken();
              
              if (refreshResponse) {
                // Update token in store and localStorage
                store.dispatch(setCredentials({
                  user: refreshResponse.user,
                  token: refreshResponse.token,
                  workspace: refreshResponse.workspace,
                  permissions: refreshResponse.permissions,
                }));

                // Process failed queue with new token
                this.processQueue(null, refreshResponse.token);
                
                // Retry original request with new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
                }
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              this.processQueue(refreshError, null);
              this.handleAuthError();
            } finally {
              this.isRefreshing = false;
            }
          }

          // Queue the request if refresh is in progress
          return new Promise((resolve, reject) => {
            this.failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.api(originalRequest));
              },
              reject,
            });
          });
        }

        return Promise.reject(this.handleResponseError(error));
      }
    );
  }

  private async refreshToken(): Promise<any> {
    // Implement token refresh logic here
    // This would typically call a refresh token endpoint
    throw new Error('Token refresh not implemented');
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private handleAuthError() {
    // Clear authentication state
    store.dispatch(logout());
    store.dispatch(clearWorkspaces()); // Fixed: Now using clearWorkspaces
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  private getToken(): string | null {
    // Try to get token from Redux store first
    const state = store.getState();
    if (state.auth.token) {
      return state.auth.token;
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    
    return null;
  }

  private getWorkspaceId(): string | null {
    // Try to get workspace ID from Redux store
    const state = store.getState();
    if (state.workspace.current?.id) {
      return state.workspace.current.id;
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_workspace_id');
    }
    
    return null;
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
      // Server responded with error status
      const data = response.data as any;
      return {
        code: data?.code || 'SERVER_ERROR',
        message: data?.message || data?.error || error.message,
        status: response.status,
        details: data,
      };
    } else if (request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        status: 0,
        details: error,
      };
    } else {
      // Request setup error
      return {
        code: 'REQUEST_SETUP_ERROR',
        message: error.message || 'Request setup failed',
        status: 0,
        details: error,
      };
    }
  }

  // Public method to get the axios instance
  public getInstance(): AxiosInstance {
    return this.api;
  }

  // Public method for manual API calls
  public async request<T = any>(config: any): Promise<T> {
    const response = await this.api.request(config);
    return response.data;
  }
}

// Export singleton instance
export const apiMiddleware = new ApiMiddleware();
export const apiClient = apiMiddleware.getInstance();
export default apiMiddleware;