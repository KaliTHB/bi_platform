// web-application/src/store/api/authApi.ts - UPDATED WITH CORRECT BACKEND ENDPOINTS
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ✅ FIXED: Auth API with correct base URL structure
const authBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth` 
    : 'http://localhost:3001/api/auth',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceId = state.workspace.currentWorkspace?.id;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    if (workspaceId) {
      headers.set('x-workspace-id', workspaceId);
    }
    
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// ✅ UPDATED: Types matching backend response format
interface AuthApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ✅ UPDATED: Backend permissions response format
interface UserPermissionsResponse {
  success: boolean;
  permissions: string[];
  roles?: string[];
  is_admin?: boolean;
  role_level?: number;
  user_info?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
  workspace_used?: string;
  warning?: string;
  message?: string;
}

interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

interface LoginResponse {
  success: boolean;
  user: any;
  token: string;
  workspace?: any;
  permissions?: string[];
  message: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Auth', 'User', 'UserPermissions'],
  endpoints: (builder) => ({
    // ==================== AUTHENTICATION ENDPOINTS ====================
    
    login: builder.mutation<LoginResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/login', // becomes /api/auth/login
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'User', 'UserPermissions'],
    }),
    
    logout: builder.mutation<AuthApiResponse, void>({
      query: () => ({
        url: '/logout', // becomes /api/auth/logout
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'UserPermissions'],
    }),
    
    verifyToken: builder.query<AuthApiResponse<{
      user: any;
      workspace?: any;
      permissions?: string[];
      valid: boolean;
    }>, void>({
      query: () => ({
        url: '/verify', // becomes /api/auth/verify
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    
    refreshToken: builder.mutation<AuthApiResponse<{
      token: string;
      user: any;
    }>, { refresh_token: string }>({
      query: ({ refresh_token }) => ({
        url: '/refresh', // becomes /api/auth/refresh
        method: 'POST',
        body: { refresh_token },
      }),
      invalidatesTags: ['Auth'],
    }),

    // ==================== USER PROFILE ENDPOINTS ====================

    getCurrentUser: builder.query<AuthApiResponse<{
      user: any;
      permissions?: string[];
      workspaces?: any[];
    }>, void>({
      query: () => '/profile', // ✅ FIXED: becomes /api/auth/profile
      providesTags: ['User'],
    }),

    updateCurrentUser: builder.mutation<AuthApiResponse<{
      user: any;
    }>, {
      first_name?: string;
      last_name?: string;
      avatar_url?: string;
    }>({
      query: (userData) => ({
        url: '/profile', // ✅ FIXED: becomes /api/auth/profile
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    // ==================== PERMISSION ENDPOINTS ====================

    /**
     * ✅ UPDATED: Get current user's permissions - matches backend exactly
     */
    getCurrentUserPermissions: builder.query<UserPermissionsResponse, {
      workspaceId?: string;
    }>({
      query: ({ workspaceId }) => ({
        url: '/permissions', // becomes /api/auth/permissions
        params: workspaceId ? { workspace_id: workspaceId } : undefined,
      }),
      providesTags: (result, error, { workspaceId }) => [
        'UserPermissions',
        { type: 'UserPermissions', id: workspaceId || 'current' }
      ],
    }),

    /**
     * Lazy version for on-demand permission loading
     * This creates useLazyGetCurrentUserPermissionsQuery automatically
     */

    /**
     * ✅ UPDATED: Refresh user permissions (if backend supports it)
     */
    refreshUserPermissions: builder.mutation<UserPermissionsResponse, {
      workspaceId?: string;
    }>({
      query: ({ workspaceId }) => ({
        url: '/permissions/refresh', // becomes /api/auth/permissions/refresh
        method: 'POST',
        body: workspaceId ? { workspace_id: workspaceId } : {},
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        'UserPermissions',
        { type: 'UserPermissions', id: workspaceId || 'current' }
      ],
    }),

    /**
     * Check if user has specific permissions (if backend supports it)
     */
    checkUserPermissions: builder.query<AuthApiResponse<{
      results: Array<{
        permission: string;
        granted: boolean;
        reason?: string;
      }>;
      allGranted: boolean;
    }>, {
      permissions: string[];
      workspaceId?: string;
    }>({
      query: ({ permissions, workspaceId }) => ({
        url: '/permissions/check', // becomes /api/auth/permissions/check
        method: 'POST',
        body: {
          permissions,
          workspace_id: workspaceId,
        },
      }),
      // Don't cache permission checks as they can change frequently
      keepUnusedDataFor: 0,
    }),

    /**
     * Get user's role assignments (if backend supports it)
     */
    getUserRoles: builder.query<AuthApiResponse<{
      roles: Array<{
        id: string;
        name: string;
        display_name: string;
        level: number;
        is_system: boolean;
        permissions: string[];
        assigned_at: string;
        expires_at?: string;
      }>;
    }>, { workspaceId?: string }>({
      query: ({ workspaceId }) => ({
        url: '/roles', // becomes /api/auth/roles
        params: workspaceId ? { workspace_id: workspaceId } : undefined,
      }),
      providesTags: ['UserPermissions'],
    }),

    // ==================== PASSWORD MANAGEMENT ====================

    changePassword: builder.mutation<AuthApiResponse, {
      current_password: string;
      new_password: string;
    }>({
      query: (passwords) => ({
        url: '/change-password', // ✅ FIXED: matches backend route
        method: 'POST',
        body: passwords,
      }),
    }),

    requestPasswordReset: builder.mutation<AuthApiResponse, {
      email: string;
    }>({
      query: ({ email }) => ({
        url: '/forgot-password', // ✅ FIXED: matches backend route
        method: 'POST',
        body: { email },
      }),
    }),

    confirmPasswordReset: builder.mutation<AuthApiResponse, {
      token: string;
      new_password: string;
    }>({
      query: ({ token, new_password }) => ({
        url: '/reset-password', // ✅ FIXED: matches backend route
        method: 'POST',
        body: { token, new_password },
      }),
    }),

    // ==================== WORKSPACE SWITCHING ====================

    switchWorkspace: builder.mutation<AuthApiResponse<{
      workspace: any;
      permissions: string[];
      token?: string;
    }>, {
      workspace_id: string; // ✅ FIXED: backend expects workspace_id not slug
    }>({
      query: ({ workspace_id }) => ({
        url: '/switch-workspace', // becomes /api/auth/switch-workspace
        method: 'POST',
        body: { workspace_id },
      }),
      invalidatesTags: ['Auth', 'User', 'UserPermissions'],
    }),

    // ==================== SESSION MANAGEMENT ====================
    // Note: These endpoints may need to be implemented in backend

    getSessions: builder.query<AuthApiResponse<{
      sessions: Array<{
        id: string;
        device_name?: string;
        ip_address: string;
        user_agent: string;
        created_at: string;
        last_activity: string;
        is_current: boolean;
      }>;
    }>, void>({
      query: () => '/sessions', // becomes /api/auth/sessions
    }),

    revokeSession: builder.mutation<AuthApiResponse, {
      session_id: string;
    }>({
      query: ({ session_id }) => ({
        url: `/sessions/${session_id}`, // becomes /api/auth/sessions/:id
        method: 'DELETE',
      }),
    }),

    revokeAllSessions: builder.mutation<AuthApiResponse, void>({
      query: () => ({
        url: '/sessions', // becomes /api/auth/sessions
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    // ==================== AUDIT LOG ====================
    // Note: This endpoint may need to be implemented in backend

    getAuthAuditLog: builder.query<AuthApiResponse<{
      logs: Array<{
        id: string;
        action: string;
        success: boolean;
        ip_address: string;
        user_agent: string;
        workspace_id?: string;
        details?: any;
        created_at: string;
      }>;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>, {
      page?: number;
      limit?: number;
      action?: string;
      workspace_id?: string;
    }>({
      query: ({ page = 1, limit = 50, action, workspace_id }) => ({
        url: '/audit', // becomes /api/auth/audit
        params: {
          page: page.toString(),
          limit: limit.toString(),
          action,
          workspace_id,
        },
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Authentication hooks
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useLazyVerifyTokenQuery,
  useRefreshTokenMutation,

  // User profile hooks
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateCurrentUserMutation,

  // ✅ PERMISSION HOOKS - Now correctly mapped to backend endpoints!
  useGetCurrentUserPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useRefreshUserPermissionsMutation,
  useCheckUserPermissionsQuery,
  useLazyCheckUserPermissionsQuery,
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,

  // Password management hooks
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,

  // Workspace switching hooks
  useSwitchWorkspaceMutation,

  // Session management hooks (may need backend implementation)
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,

  // Audit log hooks (may need backend implementation)
  useGetAuthAuditLogQuery,
  useLazyGetAuthAuditLogQuery,
} = authApi;

// Export the API itself for store configuration
export default authApi;