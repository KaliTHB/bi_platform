// web-application/src/utils/apiUtils.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Define the base URL from environment or default
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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

    // Add request interceptor to include auth token
    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
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
          // Handle token expiration
          this.clearToken();
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    // Optionally store in localStorage
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // GET request
  async get<T = any>(
    url: string, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    if (workspaceId) {
      config.headers = { ...config.headers, 'X-Workspace-ID': workspaceId };
    }
    return this.instance.get(url, config);
  }

  // POST request
  async post<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    if (workspaceId) {
      config.headers = { ...config.headers, 'X-Workspace-ID': workspaceId };
    }
    return this.instance.post(url, data, config);
  }

  // PUT request
  async put<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    if (workspaceId) {
      config.headers = { ...config.headers, 'X-Workspace-ID': workspaceId };
    }
    return this.instance.put(url, data, config);
  }

  // DELETE request
  async delete<T = any>(
    url: string, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    if (workspaceId) {
      config.headers = { ...config.headers, 'X-Workspace-ID': workspaceId };
    }
    return this.instance.delete(url, config);
  }

  // PATCH request
  async patch<T = any>(
    url: string, 
    data?: any, 
    params?: any, 
    workspaceId?: string
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = { params };
    if (workspaceId) {
      config.headers = { ...config.headers, 'X-Workspace-ID': workspaceId };
    }
    return this.instance.patch(url, data, config);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Utility functions
export const apiUtils = {
  setAuthToken: (token: string) => {
    apiClient.setToken(token);
  },

  clearAuthToken: () => {
    apiClient.clearToken();
  },

  getAuthToken: () => {
    return localStorage.getItem('auth_token');
  },

  initializeToken: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

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
    
    // You can add notification logic here
    // For example: toast.error(message);
    
    return message;
  }
};

// Initialize token on app load
apiUtils.initializeToken();