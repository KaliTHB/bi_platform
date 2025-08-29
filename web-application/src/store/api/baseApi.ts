// web-application/src/store/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      const workspaceId = state.auth.workspace?.id;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      if (workspaceId) {
        headers.set('x-workspace-id', workspaceId);
      }
      
      return headers;
    },
  }),
  tagTypes: ['User', 'Workspace', 'Category', 'Dashboard', 'Dataset', 'Chart'],
  endpoints: () => ({}),
});