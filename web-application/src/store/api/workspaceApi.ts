import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// ✅ FIXED: Use proper workspace interface
interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  description?: string;
  logo_url?: string;
  user_role: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  settings?: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_accessed?: string;
}

interface WorkspacesResponse {
  success: boolean;
  data: Workspace[];
  message?: string;
}

interface WorkspaceResponse {
  success: boolean;
  data: {
    workspace: Workspace;
    token?: string;
    permissions?: string[];
    switched_at?: string;
  };
  message?: string;
}

interface SwitchWorkspaceRequest {
  workspace_id: string;
}

interface CreateWorkspaceRequest {
  name: string;
  display_name?: string;
  description?: string;
  is_public?: boolean;
  subscription_plan?: string;
}

// ✅ FIXED: Updated workspace API with correct endpoints
export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',
  baseQuery: fetchBaseQuery({
    // ✅ FIXED: Use proper API URL construction
    baseUrl: process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api`
      : 'http://localhost:3001/api',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      const workspaceSlug = state.workspace.currentWorkspace?.slug;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      } else {
        // Fallback to localStorage
        const fallbackToken = authStorage.getToken();
        if (fallbackToken) {
          headers.set('authorization', `Bearer ${fallbackToken}`);
        }
      }
      
      if (workspaceSlug) {
        headers.set('X-Workspace-Slug', workspaceSlug);
      }
      
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Workspace'],
  endpoints: (builder) => ({
    // ✅ FIXED: Get user workspaces - correct endpoint
    getUserWorkspaces: builder.query<WorkspacesResponse, void>({
      query: () => '/workspaces',
      providesTags: (result) => 
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Workspace' as const, id })),
              { type: 'Workspace', id: 'LIST' },
            ]
          : [{ type: 'Workspace', id: 'LIST' }],
    }),

    // ✅ FIXED: Switch workspace - correct endpoint and payload
    switchWorkspace: builder.mutation<WorkspaceResponse, SwitchWorkspaceRequest>({
      query: ({ workspace_id }) => ({
        url: '/auth/switch-workspace',
        method: 'POST',
        body: { workspace_id },
      }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
      // Transform response to handle token updates
      transformResponse: (response: WorkspaceResponse, meta, arg) => {
        // If a new token is provided, update localStorage
        if (response.data?.token) {
          authStorage.setToken(response.data.token);
        }
        return response;
      },
    }),

    // Get workspace details
    getWorkspaceDetails: builder.query<WorkspaceResponse, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}`,
      providesTags: (result, error, workspaceId) => [
        { type: 'Workspace', id: workspaceId }
      ],
    }),

    // Create new workspace
    createWorkspace: builder.mutation<WorkspaceResponse, CreateWorkspaceRequest>({
      query: (workspaceData) => ({
        url: '/workspaces',
        method: 'POST',
        body: workspaceData,
      }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
    }),

    // Update workspace
    updateWorkspace: builder.mutation<
      WorkspaceResponse, 
      { workspaceId: string; updates: Partial<CreateWorkspaceRequest> }
    >({
      query: ({ workspaceId, updates }) => ({
        url: `/workspaces/${workspaceId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { workspaceId }) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'Workspace', id: 'LIST' },
      ],
    }),

    // Delete workspace
    deleteWorkspace: builder.mutation<{ success: boolean; message: string }, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'Workspace', id: 'LIST' },
      ],
    }),
  }),
});

// ✅ Export hooks for use in components
export const {
  useGetUserWorkspacesQuery,
  useSwitchWorkspaceMutation,
  useGetWorkspaceDetailsQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} = workspaceApi;