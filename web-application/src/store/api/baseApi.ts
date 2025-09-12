// web-application/src/store/api/baseApi.ts - COMPLETE FIXED VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { logout } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceSlug = state.workspace.currentWorkspace?.slug;
    const workspaceId = state.workspace.currentWorkspace?.id;
    
    console.log('📡 Base API: Preparing headers', {
      hasToken: !!token,
      hasWorkspace: !!workspaceSlug,
      endpoint: headers.get('endpoint') || 'unknown'
    });
    
    // Add authorization header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('🔑 Base API: Token added to request headers');
    } else {
      console.warn('⚠️ Base API: No authentication token found in Redux state');
      
      // Fallback to localStorage if Redux doesn't have token
      const fallbackToken = localStorage.getItem('token');
      if (fallbackToken) {
        headers.set('Authorization', `Bearer ${fallbackToken}`);
        console.log('🔑 Base API: Using fallback token from localStorage');
      }
    }
    
    // Add workspace context
    if (workspaceSlug) {
      headers.set('X-Workspace-Slug', workspaceSlug);
      console.log(`🏢 Base API: Workspace slug added: ${workspaceSlug}`);
    }
    // Add workspace context
    if (workspaceId) {
      headers.set('X-Workspace-Id', workspaceId);
      console.log(`🏢 Base API: Workspace Id added: ${workspaceId}`);
    }
    
    // Set content type for JSON requests
    headers.set('Content-Type', 'application/json');
    
    return headers;
  },
});

// Enhanced base query with comprehensive error handling and token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  console.log('📡 Base API: Making request', {
    url: typeof args === 'string' ? args : args.url,
    method: typeof args === 'string' ? 'GET' : args.method || 'GET'
  });
  
  let result = await baseQuery(args, api, extraOptions);
  
  // Log the result for debugging
  if (result.error) {
    console.error('❌ Base API: Request failed', {
      status: result.error.status,
      error: result.error,
      url: typeof args === 'string' ? args : args.url
    });
  } else {
    console.log('✅ Base API: Request successful', {
      url: typeof args === 'string' ? args : args.url,
      hasData: !!result.data
    });
  }
  
  // Handle 401 unauthorized errors with token refresh logic
  if (result.error && result.error.status === 401) {
    console.log('🚨 Base API: 401 Unauthorized, handling auth error...');
    
    const state = api.getState() as RootState;
    const currentToken = state.auth.token;
    
    if (currentToken) {
      console.log('🔄 Base API: Attempting token refresh...');
      
      try {
        // Try to refresh the token
        const refreshResult = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        });
        
        if (refreshResult.ok) {
          const refreshData = await refreshResult.json();
          
          if (refreshData.success && refreshData.token) {
            console.log('✅ Base API: Token refresh successful');
            
            // Update token in localStorage
            localStorage.setItem('token', refreshData.token);
            
            // Update Redux store would need to be done via dispatch
            // This is a limitation of this approach - we can't dispatch from here
            // In a real app, you might want to use RTK Query's built-in retry logic
            
            // Retry the original request with the new token
            if (typeof args === 'object') {
              args.headers = {
                ...args.headers,
                Authorization: `Bearer ${refreshData.token}`,
              };
            }
            
            console.log('🔄 Base API: Retrying original request with new token');
            result = await baseQuery(args, api, extraOptions);
            
            if (result.data) {
              console.log('✅ Base API: Retry successful');
              return result;
            }
          }
        }
      } catch (refreshError) {
        console.error('❌ Base API: Token refresh failed:', refreshError);
      }
    }
    
    // If we get here, token refresh failed or no token available
    console.log('🚪 Base API: Authentication failed, clearing session and redirecting...');
    
    // Clear authentication state
    api.dispatch(logout());
    
    // Redirect to login after a short delay to allow state to update
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
        
        if (!isPublicPath) {
          console.log('🔄 Base API: Redirecting to login');
          window.location.href = '/login';
        }
      }, 100);
    }
  }
  
  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User', 
    'Workspace', 
    'Dashboard', 
    'Dataset', 
    'Category',
    'Permission',
    'Role'
  ],
  endpoints: (builder) => ({
    // Health check endpoint
    healthCheck: builder.query<{ success: boolean; message: string; timestamp: string }, void>({
      query: () => '/health',
      transformResponse: (response: any) => {
        console.log('🏥 Base API: Health check response', response);
        return response;
      },
    }),
  }),
});

export const {
  useHealthCheckQuery,
  useLazyHealthCheckQuery,
} = baseApi;