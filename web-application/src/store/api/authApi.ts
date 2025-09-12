// web-application/src/store/api/authApi.ts - COMPLETE UPDATED VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Define response types
interface LoginResponse {
  success: boolean;
  user: any;
  token: string;
  workspace?: any;
  permissions?: string[];
  message: string;
}

interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

interface VerifyTokenResponse {
  success: boolean;
  user: any;
  workspace?: any;
  permissions?: string[];
  valid: boolean;
  message?: string;
}

// Enhanced auth base query with better error handling
const authBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth` 
    : 'http://localhost:3001/api/auth',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
      console.log('🔑 Auth API: Token added to headers');
    }
    
    headers.set('Content-Type', 'application/json');
    
    // Add debug info
    console.log('📡 Auth API: Preparing request headers', {
      hasToken: !!token,
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/auth'
    });
    
    return headers;
  },
});

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // Login endpoint with enhanced error handling
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => {
        console.log('📤 Auth API: Sending login request', { 
          ...credentials, 
          password: '[REDACTED]' 
        });
        
        return {
          url: '/login',
          method: 'POST',
          body: credentials,
        };
      },
      transformResponse: (response: LoginResponse) => {
        console.log('📥 Auth API: Login response received', {
          success: response.success,
          hasUser: !!response.user,
          hasToken: !!response.token,
          hasWorkspace: !!response.workspace,
          permissionCount: response.permissions?.length || 0
        });
        
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('❌ Auth API: Login error response', response);
        
        const errorData = response.data || {};
        return {
          status: response.status,
          message: errorData.message || errorData.error || 'Login failed',
          error: errorData.error || 'UNKNOWN_ERROR'
        };
      },
      invalidatesTags: ['Auth', 'User'],
    }),
    
    // Logout endpoint
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => {
        console.log('📤 Auth API: Sending logout request');
        
        return {
          url: '/logout',
          method: 'POST',
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Logout response received', response);
        return response;
      },
      invalidatesTags: ['Auth', 'User'],
    }),
    
    // Token verification endpoint
    verifyToken: builder.query<VerifyTokenResponse, void>({
      query: () => {
        console.log('📤 Auth API: Sending token verification request');
        
        return {
          url: '/verify',
          method: 'GET',
        };
      },
      transformResponse: (response: VerifyTokenResponse) => {
        console.log('📥 Auth API: Token verification response', {
          success: response.success,
          valid: response.valid,
          hasUser: !!response.user,
          hasWorkspace: !!response.workspace,
          permissionCount: response.permissions?.length || 0
        });
        
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('❌ Auth API: Token verification error', response);
        return response;
      },
      providesTags: ['Auth'],
    }),
    
    // Token refresh endpoint
    refreshToken: builder.mutation<
      { success: boolean; token: string; user: any; message: string },
      { refresh_token: string }
    >({
      query: ({ refresh_token }) => {
        console.log('📤 Auth API: Sending token refresh request');
        
        return {
          url: '/refresh',
          method: 'POST',
          body: { refresh_token },
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Token refresh response', {
          success: response.success,
          hasNewToken: !!response.token,
          hasUser: !!response.user
        });
        
        return response;
      },
      invalidatesTags: ['Auth'],
    }),

    // Get current user profile
    getCurrentUser: builder.query<
      {
        success: boolean;
        user: any;
        permissions?: string[];
        workspaces?: any[];
        message?: string;
      },
      void
    >({
      query: () => {
        console.log('📤 Auth API: Sending get current user request');
        
        return {
          url: '/me',
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Get current user response', {
          success: response.success,
          hasUser: !!response.user,
          permissionCount: response.permissions?.length || 0,
          workspaceCount: response.workspaces?.length || 0
        });
        
        return response;
      },
      providesTags: ['User'],
    }),

    // Update user profile
    updateProfile: builder.mutation<
      {
        success: boolean;
        user: any;
        message: string;
      },
      { name?: string; email?: string; avatar?: string }
    >({
      query: (data) => {
        console.log('📤 Auth API: Sending update profile request');
        
        return {
          url: '/me',
          method: 'PUT',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Update profile response', response);
        return response;
      },
      invalidatesTags: ['User'],
    }),

    // Change password
    changePassword: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { current_password: string; new_password: string }
    >({
      query: (data) => {
        console.log('📤 Auth API: Sending change password request');
        
        return {
          url: '/change-password',
          method: 'POST',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Change password response', {
          success: response.success
        });
        
        return response;
      },
    }),

    // Request password reset
    requestPasswordReset: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { email: string }
    >({
      query: (data) => {
        console.log('📤 Auth API: Sending password reset request');
        
        return {
          url: '/forgot-password',
          method: 'POST',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Password reset request response', response);
        return response;
      },
    }),

    // Reset password with token
    resetPassword: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { token: string; new_password: string }
    >({
      query: (data) => {
        console.log('📤 Auth API: Sending password reset');
        
        return {
          url: '/reset-password',
          method: 'POST',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 Auth API: Password reset response', response);
        return response;
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useLazyVerifyTokenQuery,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
} = authApi;