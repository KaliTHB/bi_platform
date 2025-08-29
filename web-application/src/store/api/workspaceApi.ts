import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/workspaces',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Workspace'],
  endpoints: (builder) => ({
    getUserWorkspaces: builder.query<any, void>({
      query: () => '',
      providesTags: ['Workspace'],
    }),
    getWorkspaceDetails: builder.query<any, string>({
      query: (workspaceId) => `/${workspaceId}`,
      providesTags: ['Workspace'],
    }),
    switchWorkspace: builder.mutation<any, string>({
      query: (workspaceSlug) => ({
        url: `/${workspaceSlug}/switch`,
        method: 'POST',
      }),
      invalidatesTags: ['Workspace'],
    }),
    createWorkspace: builder.mutation<any, any>({
      query: (workspaceData) => ({
        url: '',
        method: 'POST',
        body: workspaceData,
      }),
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const useWorkspaceApi = workspaceApi;