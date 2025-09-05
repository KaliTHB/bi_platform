// web-application/src/store/api/authApi.ts - UPDATED WITH SHARED BASE CONFIG
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Separate auth API with its own base query since it doesn't need workspace context
const authBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/auth` : 'http://localhost:3001/api/v1/auth',
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
    login: builder.mutation<
      { 
        success: boolean; 
        user: any; 
        token: string; 
        workspace?: any; 
        permissions?: string[]; 
        message: string 
      },
      { email: string; password: string; workspace_slug?: string }
    >({
      query: (credentials) => ({
        url: '/login',
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
        url: '/logout',
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
        url: '/verify',
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
        url: '/refresh',
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
        url: '/me',
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
      { name?: string; email?: string; avatar?: string }
    >({
      query: (data) => ({
        url: '/me',
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
        url: '/change-password',
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
        url: '/forgot-password',
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
        url: '/reset-password',
        method: 'POST',
        body: data,
      }),
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
} = authApi;