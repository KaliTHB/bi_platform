// File: web-application/src/store/api/baseApi.ts
// Fixed RTK Query base API configuration using constants

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { logout } from '../slices/authSlice';
import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  HTTP_STATUS, 
  HTTP_METHODS,
  isSuccessStatus,
  isClientError,
  isServerError 
} from '@/constants/api';
import { STORAGE_KEYS } from '@/constants';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

console.log('🔧 BaseAPI: Initialized with configuration:', {
  baseUrl: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

// ========================================
// BASE QUERY CONFIGURATION
// ========================================
const baseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL, // ✅ Use constant instead of hard-coded
  timeout: API_CONFIG.TIMEOUT, // ✅ Use constant instead of hard-coded
  
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceSlug = state.workspace.currentWorkspace?.slug;
    const workspaceId = state.workspace.currentWorkspace?.id;
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('📡 BaseAPI: Preparing request', {
        endpoint: endpoint || 'unknown',
        hasToken: !!token,
        hasWorkspace: !!workspaceId,
        workspaceSlug: workspaceSlug || 'none',
        method: 'GET', // Default, will be overridden by actual request
      });
    }
    
    // Set default headers from constants
    Object.entries(API_CONFIG.DEFAULT_HEADERS).forEach(([key, value]) => {
      if (!headers.get(key)) {
        headers.set(key, value);
      }
    });
    
    // Add authentication header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      // Fallback to localStorage if Redux doesn't have token yet
      if (typeof window !== 'undefined') {
        const fallbackToken = authStorage.getToken();
        if (fallbackToken) {
          headers.set('Authorization', `Bearer ${fallbackToken}`);
          console.log('🔑 BaseAPI: Using fallback token from localStorage');
        }
      }
    }
    
    // Add workspace context headers
    if (workspaceId) {
      headers.set('X-Workspace-ID', workspaceId);
    }
    
    if (workspaceSlug) {
      headers.set('X-Workspace-Slug', workspaceSlug);
    }
    
    // Add request tracking for debugging
    //if (process.env.NODE_ENV === 'development') {
    //  headers.set('X-Request-Id', `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    //}
    
    return headers;
  },
  
  // Add response preprocessing
  responseHandler: async (response) => {
    const contentType = response.headers.get('content-type');
    
    // Handle different content types
    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/')) {
      return response.text();
    } else if (contentType?.includes('application/octet-stream') || 
               contentType?.includes('application/vnd.openxmlformats')) {
      return response.blob();
    }
    
    // Default to json
    return response.json();
  },
});

// ========================================
// ENHANCED BASE QUERY WITH ERROR HANDLING & RETRY
// ========================================
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const startTime = Date.now();
  
  // Extract request info for logging
  const requestUrl = typeof args === 'string' ? args : args.url;
  const method = typeof args === 'string' ? HTTP_METHODS.GET : (args.method || HTTP_METHODS.GET);
  const fullUrl = `${API_CONFIG.BASE_URL}${requestUrl}`;
  
  // Log request start
  if (process.env.NODE_ENV === 'development') {
    console.log('📡 BaseAPI: Request started', {
      method: method.toUpperCase(),
      url: requestUrl,
      fullUrl,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Make the initial request with retry logic
  let result = await makeRequestWithRetry(args, api, extraOptions);
  const duration = Date.now() - startTime;
  
  // Handle authentication errors
  if (result.error) {
    const status = result.error.status;
    
    if (status === HTTP_STATUS.UNAUTHORIZED) {
      console.log('🔄 BaseAPI: Attempting token refresh due to 401');
      
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: API_ENDPOINTS.AUTH.REFRESH,
          method: HTTP_METHODS.POST,
        },
        api,
        extraOptions
      );
      
      if (refreshResult.data) {
        console.log('✅ BaseAPI: Token refreshed successfully, retrying original request');
        
        // Update the token in the store if the refresh was successful
        if (refreshResult.data && typeof refreshResult.data === 'object' && 'token' in refreshResult.data) {
          // The auth slice should handle the token update
          // Retry the original request
          result = await makeRequestWithRetry(args, api, extraOptions);
        }
      } else {
        console.log('❌ BaseAPI: Token refresh failed, logging out user');
        // Refresh failed, logout the user
        api.dispatch(logout());
      }
    }
  }
  
  // Log request completion
  if (process.env.NODE_ENV === 'development') {
    const logLevel = result.error ? 'error' : 'log';
    console[logLevel](`📡 BaseAPI: Request completed`, {
      method: method.toUpperCase(),
      url: requestUrl,
      status: result.error?.status || 'success',
      duration: `${duration}ms`,
      success: !result.error,
    });
    
    if (result.error) {
      console.error('❌ BaseAPI: Request error details', {
        status: result.error.status,
        statusText: result.error.statusText || 'Unknown',
        data: result.error.data,
        originalArgs: args,
      });
    }
  }
  
  return result;
};

// ========================================
// RETRY LOGIC IMPLEMENTATION
// ========================================
const makeRequestWithRetry = async (
  args: any, 
  api: any, 
  extraOptions: any, 
  attempt: number = 1
): Promise<any> => {
  const result = await baseQuery(args, api, extraOptions);
  
  // Check if we should retry
  if (result.error && shouldRetry(result.error, attempt)) {
    console.log(`🔄 BaseAPI: Retrying request (attempt ${attempt + 1}/${API_CONFIG.RETRY_ATTEMPTS + 1})`);
    
    // Wait before retrying
    await delay(API_CONFIG.RETRY_DELAY * attempt);
    
    // Retry the request
    return makeRequestWithRetry(args, api, extraOptions, attempt + 1);
  }
  
  return result;
};

// ========================================
// RETRY DECISION LOGIC
// ========================================
const shouldRetry = (error: any, attempt: number): boolean => {
  // Don't retry if we've exceeded max attempts
  if (attempt >= API_CONFIG.RETRY_ATTEMPTS) {
    return false;
  }
  
  // Don't retry on client errors (4xx) except for specific cases
  if (isClientError(error.status)) {
    // Only retry on specific client errors
    return error.status === HTTP_STATUS.UNAUTHORIZED || 
           error.status === 429; // Rate limiting
  }
  
  // Retry on server errors (5xx)
  if (isServerError(error.status)) {
    return true;
  }
  
  // Retry on network errors
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return true;
  }
  
  return false;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ========================================
// BASE API DEFINITION
// ========================================
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  
  // Define tag types for caching invalidation
  tagTypes: [
    'Auth',
    'User', 
    'Workspace',
    'Dashboard',
    'Chart',
    'Dataset',
    'DataSource',
    'Category',
    'Plugin',
    'Role',
    'Permission',
    'AuditLog',
    'Analytics',
    'System',
  ],
  
  // Keep queries fresh for the configured time
  keepUnusedDataFor: API_CONFIG.CACHE_TTL / 1000, // Convert to seconds for RTK Query
  
  // Refetch on mount/reconnect
  refetchOnMountOrArgChange: API_CONFIG.STALE_TIME / 1000, // Convert to seconds
  refetchOnReconnect: true,
  refetchOnFocus: false, // Don't refetch on window focus to avoid excessive requests
  
  // Base endpoints - other APIs will inject into this
  endpoints: (builder) => ({
    // Health check endpoint
    healthCheck: builder.query<{ status: string; timestamp: string }, void>({
      query: () => ({
        url: API_ENDPOINTS.SYSTEM.HEALTH,
        method: HTTP_METHODS.GET,
      }),
      keepUnusedDataFor: 30, // Keep health data for 30 seconds only
    }),
    
    // System status endpoint
    getSystemStatus: builder.query<any, void>({
      query: () => ({
        url: API_ENDPOINTS.SYSTEM.STATUS,
        method: HTTP_METHODS.GET,
      }),
      providesTags: ['System'],
    }),
    
    // Version info endpoint
    getVersion: builder.query<{ version: string; build: string }, void>({
      query: () => ({
        url: API_ENDPOINTS.SYSTEM.VERSION,
        method: HTTP_METHODS.GET,
      }),
      keepUnusedDataFor: 300, // Keep version data for 5 minutes
    }),
  }),
});

// ========================================
// EXPORT HOOKS AND API
// ========================================
export const {
  useHealthCheckQuery,
  useGetSystemStatusQuery,
  useGetVersionQuery,
  util: { getRunningQueriesThunk },
} = baseApi;

// Export the baseApi as default
export default baseApi;

// ========================================
// API UTILITIES FOR OTHER FILES
// ========================================

/**
 * Helper to build request configuration
 */
export const buildRequest = (
  url: string,
  method: keyof typeof HTTP_METHODS = 'GET',
  body?: any,
  headers?: Record<string, string>
) => ({
  url,
  method: HTTP_METHODS[method],
  ...(body && { body }),
  ...(headers && { headers }),
});

/**
 * Helper to handle file uploads
 */
export const buildFileUploadRequest = (
  url: string,
  file: File,
  additionalData?: Record<string, any>
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }
  
  return {
    url,
    method: HTTP_METHODS.POST,
    body: formData,
    // Don't set Content-Type header, let the browser set it with boundary
    prepareHeaders: (headers: Headers) => {
      headers.delete('Content-Type');
      return headers;
    },
  };
};

/**
 * Helper to handle query parameters
 */
export const buildQueryUrl = (
  baseUrl: string,
  params?: Record<string, any>
): string => {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryString.append(key, String(value));
    }
  });
  
  const queryStr = queryString.toString();
  return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
};