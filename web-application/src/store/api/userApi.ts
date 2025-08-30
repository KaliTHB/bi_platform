// File: ./src/store/api/userApi.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  roles: Role[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  level?: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_ids?: string[];
  is_active?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role_ids?: string[];
  is_active?: boolean;
}

export interface UsersResponse {
  users: User[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: string;
  status?: 'active' | 'inactive' | 'all';
}

// Create the API slice
export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // Get auth token from your auth state
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      // Get workspace ID from your workspace state
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (workspaceId) {
        headers.set('x-workspace-id', workspaceId);
      }
      
      return headers;
    },
  }),
  tagTypes: ['User', 'UserList'],
  endpoints: (builder) => ({
    // Get users with pagination and filtering
    getUsers: builder.query<UsersResponse, GetUsersParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        // Add all non-undefined parameters
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });

        const queryString = searchParams.toString();
        return {
          url: `/users${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'UserList', id: 'LIST' },
            ]
          : [{ type: 'UserList', id: 'LIST' }],
    }),

    // Get single user by ID
    getUser: builder.query<{ user: User }, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Create new user
    createUser: builder.mutation<{ user: User; message: string }, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),

    // Update user
    updateUser: builder.mutation<{ user: User; message: string }, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'UserList', id: 'LIST' },
      ],
    }),

    // Delete user (soft delete)
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'UserList', id: 'LIST' },
      ],
    }),

    // Assign role to user
    assignUserRole: builder.mutation<{ message: string }, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: { role_id: roleId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'UserList', id: 'LIST' },
      ],
    }),

    // Remove role from user
    removeUserRole: builder.mutation<{ message: string }, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'UserList', id: 'LIST' },
      ],
    }),

    // Update user profile (for current user)
    updateProfile: builder.mutation<{ user: User; message: string }, UpdateUserRequest>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Change user password
    changePassword: builder.mutation<{ message: string }, { current_password: string; new_password: string }>({
      query: (data) => ({
        url: '/users/change-password',
        method: 'PUT',
        body: data,
      }),
    }),

    // Invite user to workspace
    inviteUser: builder.mutation<{ message: string }, { email: string; role_ids: string[]; message?: string }>({
      query: (data) => ({
        url: '/users/invite',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),

    // Get user activity/audit log
    getUserActivity: builder.query<{ activities: any[] }, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, page = 1, limit = 20 }) => 
        `/users/${userId}/activity?page=${page}&limit=${limit}`,
    }),

    // Bulk update users
    bulkUpdateUsers: builder.mutation<{ message: string; updated: number }, { userIds: string[]; updates: Partial<UpdateUserRequest> }>({
      query: (data) => ({
        url: '/users/bulk-update',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),

    // Bulk delete users
    bulkDeleteUsers: builder.mutation<{ message: string; deleted: number }, string[]>({
      query: (userIds) => ({
        url: '/users/bulk-delete',
        method: 'DELETE',
        body: { user_ids: userIds },
      }),
      invalidatesTags: [{ type: 'UserList', id: 'LIST' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAssignUserRoleMutation,
  useRemoveUserRoleMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useInviteUserMutation,
  useGetUserActivityQuery,
  useBulkUpdateUsersMutation,
  useBulkDeleteUsersMutation,
} = userApi;

// Export the reducer
export default userApi.reducer;