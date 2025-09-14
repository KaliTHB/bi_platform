// web-application/src/middleware/apiMiddleware.ts - FIXED VERSION
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { clearWorkspaces } from '@/store/slices/workspaceSlice';

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
  };
  message?: string;
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
    // Request interceptor
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        const workspaceId = this.getWorkspaceId();
        
        if (token && token !== 'undefined' && token !== 'null') {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (workspaceId) {
          config.headers['X-Workspace-Id'] = workspaceId;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => Promise.reject(this.handleRequestError(error))
    );

    // Response interceptor with improved token refresh
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
          
          console.log('🔍 401 error detected:', { errorCode, canRefresh: errorData?.can_refresh });
          
          // Only try refresh if the backend indicates it's possible
          if ((errorCode === 'TOKEN_EXPIRED' || errorCode === 'TOKEN_INVALID') && errorData?.can_refresh) {
            
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              originalRequest._retry = true;

              try {
                // Use shared refresh promise to prevent multiple simultaneous refreshes
                if (!this.refreshPromise) {
                  this.refreshPromise = this.refreshToken();
                }
                
                const refreshResponse = await this.refreshPromise;
                
                if (refreshResponse?.success && refreshResponse?.data?.token) {
                  console.log('✅ Token refreshed successfully');
                  
                  // Update Redux store
                  store.dispatch(setCredentials({
                    user: refreshResponse.data.user,
                    token: refreshResponse.data.token,
                    workspace: refreshResponse.data.workspace,
                    permissions: refreshResponse.data.permissions,
                  }));

                  // Update localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('token', refreshResponse.data.token);
                  }

                  // Process all queued requests
                  this.processQueue(null, refreshResponse.data.token);
                  
                  // Retry original request
                  if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                  }
                  
                  return this.api(originalRequest);
                } else {
                  throw new Error(refreshResponse?.message || 'Token refresh failed');
                }
                
              } catch (refreshError: any) {
                console.error('❌ Token refresh failed:', refreshError.message);
                
                // Process queue with error
                this.processQueue(refreshError, null);
                
                // Handle auth error (logout and redirect)
                this.handleAuthError();
                
                return Promise.reject(refreshError);
                
              } finally {
                this.isRefreshing = false;
                this.refreshPromise = null; // Reset the promise
              }
              
            } else {
              // Queue request while refresh is in progress
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
          } else {
            // Can't refresh or other auth error - handle immediately
            console.log('❌ Auth error that cannot be refreshed, logging out');
            this.handleAuthError();
          }
        }

        return Promise.reject(this.handleResponseError(error));
      }
    );
  }

  private async refreshToken(): Promise<RefreshResponse> {
    try {
      console.log('🔄 Attempting token refresh...');
      
      const currentToken = this.getToken();
      if (!currentToken) {
        throw new Error('No current token available for refresh');
      }

      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        }
      });

      if (!refreshResponse.ok) {
        throw new Error(`Token refresh failed with status: ${refreshResponse.status}`);
      }

      const data: RefreshResponse = await refreshResponse.json();
      
      if (!data.success || !data.data?.token) {
        console.error('❌ Invalid refresh response:', data);
        throw new Error(data.message || 'Invalid refresh response format');
      }

      return data;
      
    } catch (error: any) {
      console.error('❌ Token refresh error:', error.message);
      throw error;
    }
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error('No token available'));
      }
    });
    
    this.failedQueue = [];
  }

  private handleAuthError() {
    console.log('🚪 Handling authentication error - clearing session');
    
    // Clear Redux state
    store.dispatch(logout());
    store.dispatch(clearWorkspaces());
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
      localStorage.removeItem('selected_workspace_id');
    }
    
    // Redirect to login with a small delay to prevent redirect loops
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        // Check if already on login page to prevent redirect loops
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }, 100);
    }
  }

  private getToken(): string | null {
    // Try Redux store first
    const state = store.getState();
    if (state.auth.token && state.auth.token !== 'null' && state.auth.token !== 'undefined') {
      return state.auth.token;
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      return token && token !== 'null' && token !== 'undefined' ? token : null;
    }
    
    return null;
  }

  private getWorkspaceId(): string | null {
    const state = store.getState();
    if (state.workspace.current?.id) {
      return state.workspace.current.id;
    }
    
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

  public getInstance(): AxiosInstance {
    return this.api;
  }

  public async request<T = any>(config: any): Promise<T> {
    const response = await this.api.request(config);
    return response.data;
  }
}

// Export singleton instance
export const apiMiddleware = new ApiMiddleware();
export const apiClient = apiMiddleware.getInstance();
export default apiMiddleware;