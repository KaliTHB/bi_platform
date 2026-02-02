// web-application/src/store/api/userApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface User {
  id: string;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  is_active: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  department?: string;
  position?: string;
  role_names?: string[];
  roles?: any[];
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  roles?: string[];
  is_active?: boolean;
  department?: string;
  position?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  password?: string;
  roles?: string[];
  is_active?: boolean;
  department?: string;
  position?: string;
}

export interface GetUsersResponse {
  success: boolean;
  data: User[];
  metadata?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  message?: string;
}

export interface UserResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface SearchUsersParams {
  query?: string;
  limit?: number;
  offset?: number;
  role?: string;
  is_active?: boolean;
  include_inactive?: boolean;
  detailed?: boolean;
}

// ============================================================================
// USER API SLICE
// ============================================================================

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      const workspaceSlug = (getState() as RootState).workspace.currentWorkspace?.slug;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      if (workspaceSlug) {
        headers.set('X-Workspace-Slug', workspaceSlug);
      }
      
      headers.set('Content-Type', 'application/json');
      
      return headers;
    },
  }),
  tagTypes: ['User', 'UserList', 'UserWorkspaces'],
  endpoints: (builder) => ({
    
    // ============================================================================
    // ADMIN USER MANAGEMENT ENDPOINTS
    // ============================================================================
    
    /**
     * GET /api/admin/users - Get all users in workspace
     */
    getUsers: builder.query<GetUsersResponse, SearchUsersParams | void>({
      query: (params = {}) => ({
        url: 'admin/users',
        params,
      }),
      providesTags: ['UserList'],
    }),

    /**
     * GET /api/admin/users/:id - Get user by ID
     */
    getUserById: builder.query<UserResponse, string>({
      query: (id) => `admin/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    /**
     * POST /api/admin/users - Create new user
     */
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (userData) => ({
        url: 'admin/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['UserList'],
    }),

    /**
     * PUT /api/admin/users/:id - Update user
     */
    updateUser: builder.mutation<UserResponse, { id: string; updates: UpdateUserRequest }>({
      query: ({ id, updates }) => ({
        url: `admin/users/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'UserList',
      ],
    }),

    /**
     * DELETE /api/admin/users/:id - Delete user
     */
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        'UserList',
      ],
    }),

    // ============================================================================
    // USER PROFILE & WORKSPACE ENDPOINTS
    // ============================================================================

    /**
     * GET /api/user/workspaces - Get user's workspaces
     */
    getUserWorkspaces: builder.query<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        slug: string;
        user_role: string;
        assigned_at: string;
      }>;
    }, void>({
      query: () => 'user/workspaces',
      providesTags: ['UserWorkspaces'],
    }),

    /**
     * GET /api/user/default-workspace - Get user's default workspace
     */
    getDefaultWorkspace: builder.query<{
      success: boolean;
      data: {
        id: string;
        name: string;
        slug: string;
        is_default: boolean;
      };
    }, void>({
      query: () => 'user/default-workspace',
    }),

    /**
     * GET /api/user/:id - Get user profile
     */
    getUserProfile: builder.query<UserResponse, string>({
      query: (id) => `user/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    /**
     * PUT /api/user/:id - Update user profile
     */
    updateUserProfile: builder.mutation<UserResponse, { id: string; updates: UpdateUserRequest }>({
      query: ({ id, updates }) => ({
        url: `user/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'UserList',
      ],
    }),

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================

    /**
     * POST /api/admin/users/bulk - Bulk create users
     */
    bulkCreateUsers: builder.mutation<{
      success: boolean;
      data: {
        successful: User[];
        failed: Array<{
          email: string;
          error: string;
        }>;
      };
      message: string;
    }, {
      users: CreateUserRequest[];
      send_welcome_email?: boolean;
    }>({
      query: (bulkData) => ({
        url: 'admin/users/bulk',
        method: 'POST',
        body: bulkData,
      }),
      invalidatesTags: ['UserList'],
    }),

    /**
     * PUT /api/admin/users/bulk - Bulk update users
     */
    bulkUpdateUsers: builder.mutation<{
      success: boolean;
      data: {
        successful: string[];
        failed: Array<{
          userId: string;
          error: string;
        }>;
      };
      message: string;
    }, {
      user_ids: string[];
      updates: UpdateUserRequest;
    }>({
      query: (bulkData) => ({
        url: 'admin/users/bulk',
        method: 'PUT',
        body: bulkData,
      }),
      invalidatesTags: ['UserList'],
    }),

    /**
     * DELETE /api/admin/users/bulk - Bulk delete users
     */
    bulkDeleteUsers: builder.mutation<{
      success: boolean;
      data: {
        successful: string[];
        failed: Array<{
          userId: string;
          error: string;
        }>;
      };
      message: string;
    }, {
      user_ids: string[];
    }>({
      query: (bulkData) => ({
        url: 'admin/users/bulk',
        method: 'DELETE',
        body: bulkData,
      }),
      invalidatesTags: ['UserList'],
    }),

    // ============================================================================
    // USER SEARCH & FILTERING
    // ============================================================================

    /**
     * GET /api/admin/users/search - Advanced user search
     */
    searchUsers: builder.query<GetUsersResponse, {
      query: string;
      filters?: {
        role?: string;
        department?: string;
        is_active?: boolean;
        created_after?: string;
        created_before?: string;
      };
      limit?: number;
      offset?: number;
    }>({
      query: ({ query, filters, limit = 20, offset = 0 }) => ({
        url: 'admin/users/search',
        params: {
          query,
          ...filters,
          limit,
          offset,
        },
      }),
      providesTags: ['UserList'],
    }),

    // ============================================================================
    // USER ANALYTICS & STATS
    // ============================================================================

    /**
     * GET /api/admin/users/stats - Get user statistics
     */
    getUserStats: builder.query<{
      success: boolean;
      data: {
        total_users: number;
        active_users: number;
        inactive_users: number;
        recent_signups: number;
        by_department: Array<{
          department: string;
          count: number;
        }>;
        by_role: Array<{
          role: string;
          count: number;
        }>;
      };
    }, {
      period?: 'day' | 'week' | 'month' | 'year';
      start_date?: string;
      end_date?: string;
    }>({
      query: (params = {}) => ({
        url: 'admin/users/stats',
        params,
      }),
    }),

    /**
     * GET /api/admin/users/:id/activity - Get user activity log
     */
    getUserActivity: builder.query<{
      success: boolean;
      data: Array<{
        id: string;
        action: string;
        resource_type: string;
        resource_id: string;
        details: Record<string, any>;
        ip_address: string;
        user_agent: string;
        timestamp: string;
      }>;
    }, {
      userId: string;
      limit?: number;
      offset?: number;
      start_date?: string;
      end_date?: string;
    }>({
      query: ({ userId, ...params }) => ({
        url: `admin/users/${userId}/activity`,
        params,
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // User CRUD operations
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  
  // User profile operations
  useGetUserWorkspacesQuery,
  useGetDefaultWorkspaceQuery,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  
  // Bulk operations
  useBulkCreateUsersMutation,
  useBulkUpdateUsersMutation,
  useBulkDeleteUsersMutation,
  
  // Search and filtering
  useSearchUsersQuery,
  
  // Analytics and stats
  useGetUserStatsQuery,
  useGetUserActivityQuery,
  
  // Lazy queries for on-demand loading
  useLazyGetUsersQuery,
  useLazyGetUserByIdQuery,
  useLazySearchUsersQuery,
} = userApi;

export default userApi;