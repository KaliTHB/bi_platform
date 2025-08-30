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
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = userApi;