// web-application/src/store/api/authApi.ts - FIXED with correct API endpoints
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Fixed: Separate auth API with correct base URL including /api prefix
const authBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth` 
    : 'http://localhost:3001/api/auth', // ✅ FIXED: Added /api prefix
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // ✅ FIXED: All endpoints now correctly use the backend routes
    login: builder.mutation<
      { 
        success: boolean; 
        user: any; 
        token: string; 
        workspace?: any; 
        permissions?: string[]; 
        message: string 
      },
      { 
        email?: string; 
        username?: string;
        password: string; 
        workspace_slug?: string 
      }
    >({
      query: (credentials) => ({
        url: '/login', // This becomes /api/auth/login
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    
    logout: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/logout', // This becomes /api/auth/logout
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    
    verifyToken: builder.query<
      { 
        success: boolean; 
        user: any; 
        workspace?: any; 
        permissions?: string[]; 
        valid: boolean;
        message?: string 
      },
      void
    >({
      query: () => ({
        url: '/verify', // This becomes /api/auth/verify
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    
    refreshToken: builder.mutation<
      { 
        success: boolean; 
        token: string; 
        user: any; 
        message: string 
      },
      { refresh_token: string }
    >({
      query: ({ refresh_token }) => ({
        url: '/refresh', // This becomes /api/auth/refresh
        method: 'POST',
        body: { refresh_token },
      }),
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
      query: () => ({
        url: '/me', // This becomes /api/auth/me
        method: 'GET',
      }),
      providesTags: ['User'],
    }),

    // Update user profile  
    updateProfile: builder.mutation<
      {
        success: boolean;
        user: any;
        message: string;
      },
      { 
        name?: string; 
        email?: string; 
        avatar?: string;
        first_name?: string;
        last_name?: string;
      }
    >({
      query: (data) => ({
        url: '/me', // This becomes /api/auth/me
        method: 'PUT',
        body: data,
      }),
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
      query: (data) => ({
        url: '/change-password', // This becomes /api/auth/change-password
        method: 'POST',
        body: data,
      }),
    }),

    // Request password reset
    requestPasswordReset: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { email: string }
    >({
      query: (data) => ({
        url: '/forgot-password', // This becomes /api/auth/forgot-password
        method: 'POST',
        body: data,
      }),
    }),

    // Reset password with token
    resetPassword: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { token: string; new_password: string }
    >({
      query: (data) => ({
        url: '/reset-password', // This becomes /api/auth/reset-password
        method: 'POST',
        body: data,
      }),
    }),

    // Register new user (if needed)
    register: builder.mutation<
      {
        success: boolean;
        user: any;
        token?: string;
        message: string;
        requires_verification?: boolean;
      },
      {
        email: string;
        username?: string;
        password: string;
        first_name: string;
        last_name: string;
        invitation_token?: string;
        workspace_slug?: string;
      }
    >({
      query: (userData) => ({
        url: '/register', // This becomes /api/auth/register
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useRegisterMutation,
} = authApi;