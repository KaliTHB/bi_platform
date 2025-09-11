import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { User, CreateUserRequest, UpdateUserRequest } from '../../types';

interface GetUsersResponse {
  data: User[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

interface UpdateUserArgs {
  id: string;
  updates: UpdateUserRequest;
}

interface SearchUsersParams {
  query?: string;
  limit?: number;
  offset?: number;
  role?: string;
  is_active?: boolean;
}

interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  user_role: string;
  assigned_at: string;
}

interface UserPermission {
  permission: string;
  resource?: string;
  granted: boolean;
}

interface WorkspaceAssignmentArgs {
  userId: string;
  workspaceId: string;
  roleId?: string;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/users',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      const workspaceSlug = (getState() as RootState).workspace.currentWorkspace?.slug;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      if (workspaceSlug) {
        headers.set('X-Workspace-Slug', workspaceSlug);
      }
      
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Existing endpoints
    getUsers: builder.query<GetUsersResponse, any>({
      query: (params = {}) => ({
        url: '',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),
    
    getUser: builder.query<{ data: User }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    createUser: builder.mutation<{ data: User; message: string }, CreateUserRequest>({
      query: (userData) => ({
        url: '',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    
    updateUser: builder.mutation<{ data: User; message: string }, UpdateUserArgs>({
      query: ({ id, updates }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    updateProfile: builder.mutation<{ data: User; message: string }, UpdateUserRequest>({
      query: (profileData) => ({
        url: '/profile',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    
    changePassword: builder.mutation<
      { message: string },
      { current_password: string; new_password: string }
    >({
      query: (passwordData) => ({
        url: '/change-password',
        method: 'PUT',
        body: passwordData,
      }),
    }),

    // MISSING ENDPOINTS - Add these to complete the API
    
    // Get user by ID (alias for getUser for consistency)
    getUserById: builder.query<{ data: User }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    // Get current authenticated user
    getCurrentUser: builder.query<{ data: User }, void>({
      query: () => '/me',
      providesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    
    // Get user's workspaces
    getUserWorkspaces: builder.query<{ data: UserWorkspace[] }, string>({
      query: (userId) => `/${userId}/workspaces`,
      providesTags: (result, error, userId) => [
        { type: 'User', id: `${userId}-workspaces` }
      ],
    }),
    
    // Get user's permissions in current workspace
    getUserPermissions: builder.query<{ data: UserPermission[] }, string>({
      query: (userId) => `/${userId}/permissions`,
      providesTags: (result, error, userId) => [
        { type: 'User', id: `${userId}-permissions` }
      ],
    }),
    
    // Deactivate user (soft delete)
    deactivateUser: builder.mutation<{ data: User; message: string }, string>({
      query: (id) => ({
        url: `/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    // Reactivate user
    reactivateUser: builder.mutation<{ data: User; message: string }, string>({
      query: (id) => ({
        url: `/${id}/reactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    // Add user to workspace
    addUserToWorkspace: builder.mutation<
      { message: string },
      WorkspaceAssignmentArgs
    >({
      query: ({ userId, workspaceId, roleId }) => ({
        url: `/${userId}/workspaces/${workspaceId}`,
        method: 'POST',
        body: { role_id: roleId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: `${userId}-workspaces` },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    // Remove user from workspace
    removeUserFromWorkspace: builder.mutation<
      { message: string },
      { userId: string; workspaceId: string }
    >({
      query: ({ userId, workspaceId }) => ({
        url: `/${userId}/workspaces/${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: `${userId}-workspaces` },
        { type: 'User', id: 'LIST' },
      ],
    }),
    
    // Search users
    searchUsers: builder.query<GetUsersResponse, SearchUsersParams>({
      query: (params) => ({
        url: '/search',
        params,
      }),
      providesTags: [{ type: 'User', id: 'SEARCH' }],
    }),
  }),
});

export const {
  // Original exports
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  
  // Missing exports that you need to add
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useGetUserWorkspacesQuery,
  useGetUserPermissionsQuery,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useAddUserToWorkspaceMutation,
  useRemoveUserFromWorkspaceMutation,
  useSearchUsersQuery,
  useLazySearchUsersQuery,
} = userApi;