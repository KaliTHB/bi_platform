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
  try {
    console.log('🔄 Attempting token refresh...');
    
    // Get current token
    const currentToken = this.getToken();
    if (!currentToken) {
      throw new Error('No current token available for refresh');
    }

    // Call refresh endpoint with current token
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!refreshResponse.ok) {
      // If refresh fails, the token is likely completely invalid
      console.error('❌ Token refresh failed with status:', refreshResponse.status);
      throw new Error(`Token refresh failed: ${refreshResponse.status}`);
    }

    const data = await refreshResponse.json();
    
    if (!data.success || !data.data?.token) {
      console.error('❌ Invalid refresh response:', data);
      throw new Error('Invalid refresh response format');
    }

    console.log('✅ Token refreshed successfully');
    
    return {
      token: data.data.token,
      user: data.data.user,
      workspace: data.data.workspace,
      permissions: data.data.permissions
    };

  } catch (error: any) {
    console.error('❌ Token refresh error:', error.message);
    throw error;
  }
}

// ENHANCED: Better error handling in the interceptor
private setupInterceptors() {
  this.api.interceptors.request.use(
    (config: any) => {
      const token = this.getToken();
      const workspaceId = this.getWorkspaceId();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      if (workspaceId) {
        config.headers['X-Workspace-ID'] = workspaceId;
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  this.api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest: any = error.config;

      // Check if this is a token expiration error
      if (error.response?.status === 401 && !originalRequest._retry) {
        console.log('🔍 401 error detected, attempting token refresh...');
        
        // Check if the error is specifically about token expiration
        const errorCode = error.response?.data?.error;
        if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'TOKEN_INVALID') {
          
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            originalRequest._retry = true;

            try {
              const refreshResponse = await this.refreshToken();
              
              if (refreshResponse?.token) {
                // Update token in store and localStorage
                store.dispatch(setCredentials({
                  user: refreshResponse.user,
                  token: refreshResponse.token,
                  workspace: refreshResponse.workspace,
                  permissions: refreshResponse.permissions,
                }));

                // Update localStorage as backup
                if (typeof window !== 'undefined') {
                  localStorage.setItem('token', refreshResponse.token);
                }

                // Process failed queue with new token
                this.processQueue(null, refreshResponse.token);
                
                // Retry original request with new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
                }
                
                console.log('✅ Retrying original request with new token');
                return this.api(originalRequest);
              }
            } catch (refreshError: any) {
              console.error('❌ Token refresh failed:', refreshError.message);
              this.processQueue(refreshError, null);
              this.handleAuthError();
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshing = false;
            }
          } else {
            // Queue the request if refresh is already in progress
            console.log('🔄 Token refresh in progress, queueing request...');
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
        }
      }

      return Promise.reject(this.handleResponseError(error));
    }
  );
}

private handleAuthError() {
  console.log('🚪 Handling authentication error - clearing session and redirecting');
  
  // Clear authentication state
  store.dispatch(logout());
  store.dispatch(clearWorkspaces());
  
  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
  }
  
  // Redirect to login
  if (typeof window !== 'undefined') {
    // Give a small delay to ensure state is cleared
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
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