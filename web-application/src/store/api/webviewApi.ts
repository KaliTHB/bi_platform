import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { WebviewConfig } from '../../types';

interface GetWebviewConfigsResponse {
  data: WebviewConfig[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

interface CreateWebviewConfigRequest {
  workspace_id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  theme_config: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    sidebar_style: 'light' | 'dark';
    navbar_style: 'light' | 'dark';
    font_family: string;
  };
  navigation_config: {
    show_dashboard_thumbnails: boolean;
    show_view_counts: boolean;
    show_last_accessed: boolean;
    enable_search: boolean;
    enable_favorites: boolean;
    sidebar_width: number;
  };
  branding_config: {
    company_name: string;
    company_logo: string;
    favicon_url: string;
  };
  is_active: boolean;
}

interface UpdateWebviewConfigRequest {
  id: string;
  updates: Partial<CreateWebviewConfigRequest>;
}

export const webviewApi = createApi({
  reducerPath: 'webviewApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/webviews',
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
  tagTypes: ['WebviewConfig'],
  endpoints: (builder) => ({
    getWebviewConfigs: builder.query<GetWebviewConfigsResponse, { workspaceId: string; params?: any }>({
      query: ({ workspaceId, params = {} }) => ({
        url: '',
        params: { workspace_id: workspaceId, ...params },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'WebviewConfig' as const, id })),
              { type: 'WebviewConfig', id: 'LIST' },
            ]
          : [{ type: 'WebviewConfig', id: 'LIST' }],
    }),
    
    getWebviewConfig: builder.query<{ data: WebviewConfig }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'WebviewConfig', id }],
    }),

    getWebviewByName: builder.query<{ data: WebviewConfig }, { workspaceId: string; webviewName: string }>({
      query: ({ workspaceId, webviewName }) => ({
        url: `/by-name/${webviewName}`,
        params: { workspace_id: workspaceId },
      }),
      providesTags: (result, error, { webviewName }) => [{ type: 'WebviewConfig', id: webviewName }],
    }),
    
    createWebviewConfig: builder.mutation<{ data: WebviewConfig; message: string }, CreateWebviewConfigRequest>({
      query: (webviewData) => ({
        url: '',
        method: 'POST',
        body: webviewData,
      }),
      invalidatesTags: [{ type: 'WebviewConfig', id: 'LIST' }],
    }),
    
    updateWebviewConfig: builder.mutation<{ data: WebviewConfig; message: string }, UpdateWebviewConfigRequest>({
      query: ({ id, updates }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WebviewConfig', id },
        { type: 'WebviewConfig', id: 'LIST' },
      ],
    }),
    
    deleteWebviewConfig: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'WebviewConfig', id },
        { type: 'WebviewConfig', id: 'LIST' },
      ],
    }),

    // Get webview navigation data (for public webview access)
    getWebviewNavigation: builder.query<{
      webview_config: WebviewConfig;
      categories: any[];
      user_favorites: any[];
      recent_dashboards: any[];
    }, { webviewId: string; workspaceId: string }>({
      query: ({ webviewId, workspaceId }) => ({
        url: `/${webviewId}/navigation`,
        params: { workspace_id: workspaceId },
      }),
    }),

    // Track webview analytics
    trackWebviewEvent: builder.mutation<{ success: boolean }, {
      webview_id: string;
      event_type: string;
      category_id?: string;
      dashboard_id?: string;
      search_query?: string;
      metadata?: any;
    }>({
      query: (eventData) => ({
        url: '/analytics/track',
        method: 'POST',
        body: eventData,
      }),
    }),
  }),
});

export const {
  useGetWebviewConfigsQuery,
  useGetWebviewConfigQuery,
  useGetWebviewByNameQuery,
  useCreateWebviewConfigMutation,
  useUpdateWebviewConfigMutation,
  useDeleteWebviewConfigMutation,
  useGetWebviewNavigationQuery,
  useTrackWebviewEventMutation,
} = webviewApi;