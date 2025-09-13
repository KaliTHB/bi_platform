// web-application/src/store/api/baseApi.ts - COMPLETE UPDATED VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { logout } from '../slices/authSlice';

// ✅ FIXED: Ensure proper API URL construction with /api prefix
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If NEXT_PUBLIC_API_URL already ends with /api, use it as is
  if (envUrl?.endsWith('/api')) {
    return envUrl;
  }
  
  // Otherwise, construct the proper URL
  const baseUrl = envUrl || 'http://localhost:3001';
  return `${baseUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 BaseAPI: Initialized with URL:', API_BASE_URL);

// Base query configuration with authentication and workspace context
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceSlug = state.workspace.currentWorkspace?.slug;
    const workspaceId = state.workspace.currentWorkspace?.id;
    
    // Debug logging
    console.log('📡 BaseAPI: Preparing request headers', {
      endpoint: endpoint || 'unknown',
      baseUrl: API_BASE_URL,
      hasToken: !!token,
      hasWorkspace: !!workspaceId,
      workspaceSlug: workspaceSlug || 'none',
      workspaceId: workspaceId || 'none',
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
    });
    
    // Add authentication header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('🔑 BaseAPI: Authorization header added');
    } else {
      console.warn('⚠️ BaseAPI: No token in Redux state, checking localStorage...');
      
      // Fallback to localStorage if Redux doesn't have token
      const fallbackToken = localStorage.getItem('token');
      if (fallbackToken) {
        headers.set('Authorization', `Bearer ${fallbackToken}`);
        console.log('🔑 BaseAPI: Using fallback token from localStorage');
      } else {
        console.warn('⚠️ BaseAPI: No token found anywhere - request may fail');
      }
    }
    
    // Add workspace context headers (multiple formats for compatibility)
    if (workspaceId) {
      headers.set('X-Workspace-Id', workspaceId);
      console.log(`🏢 BaseAPI: Workspace ID header added: ${workspaceId}`);
    }
    
    if (workspaceSlug) {
      headers.set('X-Workspace-Slug', workspaceSlug);
      console.log(`🏢 BaseAPI: Workspace slug header added: ${workspaceSlug}`);
    }
    
    // Ensure content type is set
    if (!headers.get('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return headers;
  },
  
  // Add timeout configuration
  timeout: 30000, // 30 seconds timeout
});

// Enhanced base query wrapper with error handling and token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const requestUrl = typeof args === 'string' ? args : args.url;
  const method = typeof args === 'string' ? 'GET' : (args.method || 'GET');
  const fullUrl = `${API_BASE_URL}${requestUrl}`;
  
  // Log the request details
  console.log('📡 BaseAPI: Making request', {
    method: method.toUpperCase(),
    requestUrl,
    fullUrl,
    timestamp: new Date().toISOString(),
    hasBody: !!(typeof args !== 'string' && args.body),
    hasParams: !!(typeof args !== 'string' && args.params)
  });
  
  // Make the initial request
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle the response
  if (result.error) {
    const errorStatus = typeof result.error.status === 'number' ? result.error.status : 0;
    const errorData = result.error.data || {};
    
    console.error('❌ BaseAPI: Request failed', {
      status: errorStatus,
      statusText: result.error.statusText || 'Unknown',
      url: fullUrl,
      method: method.toUpperCase(),
      errorType: result.error.status === 'FETCH_ERROR' ? 'Network Error' : 'HTTP Error',
      errorData,
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error cases
    switch (errorStatus) {
      case 401:
        console.warn('🔐 BaseAPI: Authentication failed (401)');
        
        // Check if this is a token expiration vs invalid token
        if (errorData?.error === 'TOKEN_EXPIRED' && errorData?.can_refresh) {
          console.log('🔄 BaseAPI: Token expired but can be refreshed');
          // TODO: Implement automatic token refresh here if needed
          // For now, just log out the user
        }
        
        console.log('🚪 BaseAPI: Logging out user due to authentication failure');
        api.dispatch(logout());
        
        // Redirect to login (only in browser)
        if (typeof window !== 'undefined') {
          console.log('🔄 BaseAPI: Redirecting to login page');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
        break;
        
      case 403:
        console.warn('🚫 BaseAPI: Access forbidden (403) - insufficient permissions');
        break;
        
      case 404:
        console.error('🔍 BaseAPI: Endpoint not found (404)', {
          requestedUrl: fullUrl,
          suggestion: 'Check if the API endpoint exists and is properly registered on the server',
          possibleCauses: [
            'Route not registered in backend',
            'Incorrect URL construction',
            'Missing middleware',
            'Server not running'
          ]
        });
        break;
        
      case 500:
        console.error('🔥 BaseAPI: Server error (500)');
        break;
        
      default:
        if (result.error.status === 'FETCH_ERROR') {
          console.error('🌐 BaseAPI: Network/Connection error', {
            message: 'Could not connect to server',
            possibleCauses: [
              'Server is not running',
              'Incorrect API URL',
              'CORS issues',
              'Network connectivity problems'
            ],
            checkList: [
              `Verify server is running on expected port`,
              `Confirm API_BASE_URL: ${API_BASE_URL}`,
              'Check browser network tab for details',
              'Verify CORS configuration on server'
            ]
          });
        }
    }
  } else if (result.data) {
    console.log('✅ BaseAPI: Request successful', {
      url: fullUrl,
      method: method.toUpperCase(),
      hasData: !!result.data,
      dataType: typeof result.data,
      timestamp: new Date().toISOString()
    });
    
    // Log successful response structure for debugging
    if (result.data && typeof result.data === 'object') {
      console.log('📊 BaseAPI: Response structure', {
        success: result.data.success,
        hasMessage: !!result.data.message,
        hasData: !!result.data.data,
        hasPagination: !!result.data.pagination,
        dataKeys: result.data.data ? Object.keys(result.data.data) : []
      });
    }
  }
  
  return result;
};

// Create the base API
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  
  // Define tag types for cache invalidation
  tagTypes: [
    'Auth',
    'User', 
    'Workspace',
    'Dashboard', 
    'Chart', 
    'Category', 
    'Dataset',
    'Permission', 
    'Role',
    'Plugin',
    'Webview'
  ],
  
  // Keep unused data for 60 seconds
  keepUnusedDataFor: 60,
  
  // Refetch on reconnect and focus
  refetchOnReconnect: true,
  refetchOnFocus: false, // Set to true if you want refetch on window focus
  
  // Base endpoints (other APIs will inject into this)
  endpoints: (builder) => ({
    // Health check endpoint for testing connectivity
    healthCheck: builder.query<
      { success: boolean; status: string; timestamp: string },
      void
    >({
      query: () => '/health',
      keepUnusedDataFor: 0, // Don't cache health checks
    }),
  }),
});

// Export hooks for the base endpoints
export const { useHealthCheckQuery } = baseApi;

// Export the base API configuration for debugging
export const getApiConfig = () => ({
  baseUrl: API_BASE_URL,
  reducerPath: baseApi.reducerPath,
  tagTypes: baseApi.tagTypes,
});

// Utility function to test API connectivity
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🧪 BaseAPI: Testing connectivity to', API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const isHealthy = response.ok;
    console.log(`${isHealthy ? '✅' : '❌'} BaseAPI: Connectivity test`, {
      status: response.status,
      statusText: response.statusText,
      url: `${API_BASE_URL}/health`
    });
    
    return isHealthy;
  } catch (error) {
    console.error('❌ BaseAPI: Connectivity test failed', error);
    return false;
  }
};

// Development helper - only available in development mode
if (process.env.NODE_ENV === 'development') {
  // Make debugging functions available on window object
  if (typeof window !== 'undefined') {
    (window as any).apiDebug = {
      baseUrl: API_BASE_URL,
      testConnectivity: testApiConnectivity,
      getConfig: getApiConfig,
    };
    
    console.log('🛠️ BaseAPI: Debug tools available at window.apiDebug');
  }
}