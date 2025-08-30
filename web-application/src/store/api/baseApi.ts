import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
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
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Workspace',
    'Dataset',
    'Dashboard',
    'Chart',
    'Category',
    'Webview',
    'Permission',
    'Role',
    'Audit'
  ],
  endpoints: () => ({}),
});