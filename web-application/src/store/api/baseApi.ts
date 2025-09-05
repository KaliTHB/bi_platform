// web-application/src/store/api/baseApi.ts - FIXED BASE URL
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  // ✅ FIXED: Add /api/v1 prefix to match backend routes
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceSlug = state.workspace.currentWorkspace?.slug;
    
    // Add authorization header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('🔑 Token added to request headers'); // Debug log
    } else {
      console.warn('⚠️ No authentication token found in state'); // Debug log
    }
    
    // Add workspace context
    if (workspaceSlug) {
      headers.set('X-Workspace-Slug', workspaceSlug);
      console.log(`🏢 Workspace slug added: ${workspaceSlug}`); // Debug log
    }
    
    // Set content type for JSON requests
    headers.set('Content-Type', 'application/json');
    
    return headers;
  },
});

// Enhanced base query with comprehensive error handling
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  console.log('📡 Making API request:', args); // Debug log
  
  let result = await baseQuery(args, api, extraOptions);
  
  // Log the result for debugging
  if (result.error) {
    console.error('❌ API Request failed:', {
      error: result.error,
      args: args,
      status: result.error.status
    });
  } else {
    console.log('✅ API Request successful:', args);
  }
  
  // Handle 401 unauthorized errors
  if (result.error && result.error.status === 401) {
    console.log('🚨 Authentication failed, clearing state and redirecting...');
    
    // Clear auth state
    // api.dispatch(logout()); // Uncomment when logout action is available
    
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.removeItem('persist:root');
      localStorage.removeItem('auth_token');
      
      // Redirect to login
      window.location.href = '/login';
    }
  }
  
  // Handle 403 forbidden errors (workspace access)
  if (result.error && result.error.status === 403) {
    console.log('🚫 Access forbidden - insufficient permissions or invalid workspace');
  }
  
  // Handle 404 errors
  if (result.error && result.error.status === 404) {
    console.log('🔍 Resource not found - check API endpoint');
  }
  
  // Handle network/CORS errors
  if (result.error && 'name' in result.error && result.error.name === 'TypeError') {
    console.error('🌐 Network error - possibly CORS or server down:', result.error);
  }
  
  return result;
};

// Base API for shared functionality
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Workspace',
    'Dataset',
    'Dashboard',
    'Chart',
    'Category',
    'Webview',
    'Permission',
    'Role',
    'Audit'
  ],
  endpoints: () => ({}),
});

export { baseQueryWithReauth as enhancedBaseQuery };