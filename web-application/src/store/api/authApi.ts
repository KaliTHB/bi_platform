// web-application/src/store/api/authApi.ts - CLEAN VERSION USING UNIFIED TYPES
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ✅ Import all types from unified auth types
import type {
  // Authentication types
  LoginCredentials,
  LoginResponse,
  LoginMutationResult,
  RefreshTokenRequest,
  RefreshTokenResponse,
  VerifyTokenResponse,
  
  // User profile types
  GetCurrentUserResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  
  // Password management types
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  
  // Permission types
  UserPermissionsResponse,
  GetUserRolesResponse,
  CheckPermissionsRequest,
  CheckPermissionsResponse,
  RefreshPermissionsRequest,
  
  // Workspace types
  SwitchWorkspaceRequest,
  SwitchWorkspaceResponse,
  
  // Session types
  GetSessionsResponse,
  RevokeSessionRequest,
  
  // Audit log types
  GetAuditLogRequest,
  GetAuditLogResponse,
  
  // Generic API types
  ApiResponse,
  AuthErrorResponse,
} from '@/types/auth.types';

// ✅ Base query configuration with proper headers
const authBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth` 
    : 'http://localhost:3001/api/auth',
    
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const workspaceId = state.workspace.currentWorkspace?.id;
    
    // Add authorization header if token exists
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add workspace context if available
    if (workspaceId) {
      headers.set('x-workspace-id', workspaceId);
    }
    
    // Set content type and accept headers
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    
    return headers;
  },
});

// ✅ Auth API definition using unified types
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Auth', 'User', 'UserPermissions', 'Session', 'AuditLog'],
  
  endpoints: (builder) => ({
    // ==================== AUTHENTICATION ENDPOINTS ====================
    
    /**
     * Login user with email/username and password
     * POST /api/auth/login
     */
    login: builder.mutation<LoginResponse, LoginCredentials>({
      query: (credentials) => {
        console.log('🔄 AuthAPI: Sending login request:', { 
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
        console.log('📥 AuthAPI: Login response received:', response);
        return response;
      },
      transformErrorResponse: (response: { status: number; data: AuthErrorResponse }) => {
        console.error('❌ AuthAPI: Login error response:', response);
        return response;
      },
      invalidatesTags: ['Auth', 'User', 'UserPermissions'],
    }),

    /**
     * Logout current user
     * POST /api/auth/logout
     */
    logout: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'UserPermissions', 'Session'],
    }),

    /**
     * Verify current token validity
     * GET /api/auth/verify
     */
    verifyToken: builder.query<VerifyTokenResponse, void>({
      query: () => '/verify',
      providesTags: ['Auth'],
    }),

    /**
     * Refresh access token using refresh token
     * POST /api/auth/refresh
     */
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: ({ refresh_token }) => ({
        url: '/refresh',
        method: 'POST',
        body: { refresh_token },
      }),
      invalidatesTags: ['Auth'],
    }),

    // ==================== USER PROFILE ENDPOINTS ====================

    /**
     * Get current user profile with permissions and workspaces
     * GET /api/auth/profile
     */
    getCurrentUser: builder.query<GetCurrentUserResponse, void>({
      query: () => '/profile',
      providesTags: ['User'],
    }),

    /**
     * Update current user profile
     * PUT /api/auth/profile
     */
    updateCurrentUser: builder.mutation<UpdateProfileResponse, UpdateProfileRequest>({
      query: (userData) => ({
        url: '/profile',
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    // ==================== PERMISSION ENDPOINTS ====================

    /**
     * Get current user's permissions for specified workspace
     * GET /api/auth/permissions
     */
    getCurrentUserPermissions: builder.query<UserPermissionsResponse, {
      workspaceId?: string;
    }>({
      query: ({ workspaceId }) => ({
        url: '/permissions',
        params: workspaceId ? { workspace_id: workspaceId } : undefined,
      }),
      providesTags: (result, error, { workspaceId }) => [
        'UserPermissions',
        { type: 'UserPermissions', id: workspaceId || 'current' }
      ],
    }),

    /**
     * Refresh user permissions (force reload from database)
     * POST /api/auth/permissions/refresh
     */
    refreshUserPermissions: builder.mutation<UserPermissionsResponse, RefreshPermissionsRequest>({
      query: ({ workspaceId }) => ({
        url: '/permissions/refresh',
        method: 'POST',
        body: workspaceId ? { workspace_id: workspaceId } : {},
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        'UserPermissions',
        { type: 'UserPermissions', id: workspaceId || 'current' }
      ],
    }),

    /**
     * Check if user has specific permissions
     * POST /api/auth/permissions/check
     */
    checkUserPermissions: builder.query<CheckPermissionsResponse, CheckPermissionsRequest>({
      query: ({ permissions, workspaceId }) => ({
        url: '/permissions/check',
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
     * Get user's role assignments
     * GET /api/auth/roles
     */
    getUserRoles: builder.query<GetUserRolesResponse, { workspaceId?: string }>({
      query: ({ workspaceId }) => ({
        url: '/roles',
        params: workspaceId ? { workspace_id: workspaceId } : undefined,
      }),
      providesTags: ['UserPermissions'],
    }),

    // ==================== PASSWORD MANAGEMENT ====================

    /**
     * Change user password
     * POST /api/auth/change-password
     */
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordRequest>({
      query: (passwords) => ({
        url: '/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    /**
     * Request password reset email
     * POST /api/auth/forgot-password
     */
    requestPasswordReset: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: ({ email }) => ({
        url: '/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),

    /**
     * Confirm password reset with token
     * POST /api/auth/reset-password
     */
    confirmPasswordReset: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: ({ token, new_password }) => ({
        url: '/reset-password',
        method: 'POST',
        body: { token, new_password },
      }),
    }),

    // ==================== WORKSPACE SWITCHING ====================

    /**
     * Switch to different workspace
     * POST /api/auth/switch-workspace
     */
    switchWorkspace: builder.mutation<SwitchWorkspaceResponse, SwitchWorkspaceRequest>({
      query: ({ workspace_id }) => ({
        url: '/switch-workspace',
        method: 'POST',
        body: { workspace_id },
      }),
      invalidatesTags: ['Auth', 'User', 'UserPermissions'],
    }),

    // ==================== SESSION MANAGEMENT ====================

    /**
     * Get all user sessions
     * GET /api/auth/sessions
     */
    getSessions: builder.query<GetSessionsResponse, void>({
      query: () => '/sessions',
      providesTags: ['Session'],
    }),

    /**
     * Revoke specific session
     * DELETE /api/auth/sessions/:session_id
     */
    revokeSession: builder.mutation<ApiResponse, RevokeSessionRequest>({
      query: ({ session_id }) => ({
        url: `/sessions/${session_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    /**
     * Revoke all sessions except current
     * DELETE /api/auth/sessions
     */
    revokeAllSessions: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/sessions',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth', 'Session'],
    }),

    // ==================== AUDIT LOG ====================

    /**
     * Get authentication audit logs
     * GET /api/auth/audit
     */
    getAuthAuditLog: builder.query<GetAuditLogResponse, GetAuditLogRequest>({
      query: ({ page = 1, limit = 50, action, workspace_id } = {}) => ({
        url: '/audit',
        params: {
          page: page.toString(),
          limit: limit.toString(),
          ...(action && { action }),
          ...(workspace_id && { workspace_id }),
        },
      }),
      providesTags: ['AuditLog'],
    }),
  }),
});

// ==================== EXPORT HOOKS ====================

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

  // Permission hooks
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

  // Session management hooks
  useGetSessionsQuery,
  useLazyGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,

  // Audit log hooks
  useGetAuthAuditLogQuery,
  useLazyGetAuthAuditLogQuery,
} = authApi;

// Export the API itself for store configuration
export default authApi;

// ==================== TYPE EXPORTS ====================
// Re-export commonly used types for convenience
export type {
  LoginCredentials,
  LoginResponse,
  LoginMutationResult,
  UserPermissionsResponse,
  SwitchWorkspaceRequest,
  SwitchWorkspaceResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '@/types/auth.types';