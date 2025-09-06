// web-application/src/utils/apiUtils.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// TypeScript interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Get the API base URL from environment or default to localhost:3001
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default for development
  return 'http://localhost:3001';
};

// Create axios instance with default configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Get token from localStorage (with SSR safety)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add workspace ID if available
      const workspaceId = localStorage.getItem('current_workspace_id');
      if (workspaceId) {
        config.headers = config.headers || {};
        config.headers['X-Workspace-Id'] = workspaceId;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('current_workspace_id');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    if (error.response?.status === 429) {
      // Rate limited - provide specific error message
      const rateLimitError = new Error('Too many requests. Please try again later.');
      rateLimitError.name = 'RateLimitError';
      return Promise.reject(rateLimitError);
    }
    
    // Handle network errors
    if (!error.response) {
      const networkError = new Error('Unable to connect to server. Please check your connection.');
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }
    
    return Promise.reject(error);
  }
);

// Utility functions for common API operations
export const apiUtils = {
  // Health check
  healthCheck: async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  },
  
  // Set auth token
  setAuthToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },
  
  // Clear auth token
  clearAuthToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('current_workspace_id');
    }
  },
  
  // Get auth token
  getAuthToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
  
  // Set current workspace
  setCurrentWorkspace: (workspaceId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_workspace_id', workspaceId);
    }
  },
  
  // Get current workspace
  getCurrentWorkspace: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('current_workspace_id');
    }
    return null;
  },
  
  // Get API base URL
  getBaseUrl: getApiBaseUrl,
  
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      return !!token;
    }
    return false;
  },
};

// Error handling utilities
export const handleApiError = (error: any): ApiError => {
  if (error?.response) {
    return {
      message: error.response.data?.message || error.response.data?.error || error.response.statusText || "API request failed",
      code: error.response.data?.code,
      status: error.response.status,
      details: error.response.data,
    };
  }

  if (error?.request) {
    return {
      message: "Network error - please check your connection",
      code: "NETWORK_ERROR",
    };
  }

  if (error.name === 'RateLimitError') {
    return {
      message: error.message,
      code: "RATE_LIMIT_EXCEEDED",
      status: 429,
    };
  }

  if (error.name === 'NetworkError') {
    return {
      message: error.message,
      code: "NETWORK_ERROR",
    };
  }

  return {
    message: error?.message || "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
};

// Format error message for UI display
export const getErrorMessage = (error: any): string => {
  if (typeof error === "string") return error;
  const apiError = handleApiError(error);
  return apiError.message;
};

// Error type guards
export const isPermissionError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 403 || apiError.code === "PERMISSION_DENIED";
};

export const isNotFoundError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 404 || apiError.code === "NOT_FOUND";
};

export const isValidationError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 400 || apiError.code === "VALIDATION_ERROR";
};

export const isAuthError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 401 || apiError.code === "UNAUTHORIZED";
};

export const isRateLimitError = (error: any): boolean => {
  const apiError = handleApiError(error);
  return apiError.status === 429 || apiError.code === "RATE_LIMIT_EXCEEDED";
};

// Build query string from object
export const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

// Download file from API response
export const downloadFile = (response: AxiosResponse, filename?: string) => {
  if (typeof window === 'undefined') return;
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Try to get filename from response headers or use provided filename
  const contentDisposition = response.headers['content-disposition'];
  let downloadFilename = filename;
  
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      downloadFilename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', downloadFilename || 'download');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Retry wrapper with exponential backoff
export const retryApiRequest = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      const apiError = handleApiError(error);
      // Don't retry client errors (4xx)
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error;
      }

      if (attempt === maxRetries) break;

      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Create standardized API response
export const createApiResponse = <T>(
  success: boolean,
  data: T | null = null,
  error?: string
): ApiResponse<T> => ({
  success,
  data,
  message: success ? "Success" : error || "Request failed",
  errors: success
    ? []
    : [
        {
          code: "ERROR",
          message: error || "Request failed",
        },
      ],
});

// Validate shape of API response
export const validateApiResponse = <T>(response: any): response is ApiResponse<T> => {
  return response && typeof response === "object" && "success" in response && "data" in response;
};

export default apiClient;