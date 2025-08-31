// web-application/src/utils/apiUtils.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data: T; // Changed from data?: T to data: T (required)
  message?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getHeaders(token?: string, workspaceId?: string): Record<string, string> {
    const headers = { ...this.defaultHeaders };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    if (workspaceId) {
      headers['X-Workspace-Id'] = workspaceId;
    }
    
    return headers;
  }

  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      headers?: Record<string, string>;
      token?: string;
      workspaceId?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
      token,
      workspaceId,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.getHeaders(token, workspaceId),
      ...customHeaders,
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Return error response with success: false
        return {
          success: false,
          data: data,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || []
        };
      }

      // Ensure success property is always present
      return {
        success: data.success !== false, // Default to true unless explicitly false
        data: data.data || data, // Use nested data if available, otherwise use full response
        message: data.message,
        errors: data.errors
      };
    } catch (error) {
      console.error('API request failed:', error);
      // Return error response instead of throwing
      return {
        success: false,
        data: null as T,
        message: error instanceof Error ? error.message : 'Network error occurred',
        errors: []
      };
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, token?: string, workspaceId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', token, workspaceId });
  }

  async post<T = any>(endpoint: string, body: any, token?: string, workspaceId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, token, workspaceId });
  }

  async put<T = any>(endpoint: string, body: any, token?: string, workspaceId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, token, workspaceId });
  }

  async delete<T = any>(endpoint: string, token?: string, workspaceId?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', token, workspaceId });
  }
}

export const apiClient = new ApiClient();

// Utility functions for handling API responses
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isApiError = (error: any): boolean => {
  return error?.response?.status >= 400;
};

export const getErrorCode = (error: any): string | null => {
  return error?.response?.data?.errors?.[0]?.code || null;
};