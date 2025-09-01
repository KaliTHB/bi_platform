// web-application/src/store/api/dashboardApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { 
  Dashboard, 
  DashboardWithCharts, 
  CreateDashboardRequest, 
  UpdateDashboardRequest,
  DuplicateDashboardRequest 
} from '../../types/dashboard.types';

// Response types
interface DashboardListResponse {
  success: boolean;
  dashboards: Dashboard[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

interface DashboardResponse {
  success: boolean;
  dashboard: DashboardWithCharts;
  message?: string;
}

interface DashboardCreateResponse {
  success: boolean;
  dashboard: Dashboard;
  message: string;
}

interface DashboardUpdateResponse {
  success: boolean;
  dashboard: Dashboard;
  message: string;
}

interface DashboardDeleteResponse {
  success: boolean;
  message: string;
}

interface DashboardAnalyticsResponse {
  success: boolean;
  analytics: {
    views: number;
    unique_viewers: number;
    avg_session_time: number;
    most_viewed_charts: Array<{
      chart_id: string;
      chart_name: string;
      views: number;
    }>;
    recent_activity: Array<{
      user_id: string;
      user_name: string;
      action: string;
      timestamp: string;
    }>;
  };
  message?: string;
}

// Query parameters
interface GetDashboardsParams {
  workspace_id?: string;
  category_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'views';
  sort_direction?: 'asc' | 'desc';
  status?: 'active' | 'archived';
  created_by?: string;
}

interface GetDashboardAnalyticsParams {
  date_from?: string;
  date_to?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  include_charts?: boolean;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/dashboards',
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
  tagTypes: ['Dashboard', 'DashboardList', 'DashboardAnalytics'],
  endpoints: (builder) => ({
    // Get all dashboards with filtering and pagination
    getDashboards: builder.query<DashboardListResponse, GetDashboardsParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
        
        return queryParams.toString() ? `?${queryParams.toString()}` : '';
      },
      providesTags: (result) =>
        result
          ? [
              ...result.dashboards.map(({ id }) => ({ type: 'Dashboard' as const, id })),
              { type: 'DashboardList', id: 'LIST' },
            ]
          : [{ type: 'DashboardList', id: 'LIST' }],
    }),

    // Get a specific dashboard by ID
    getDashboard: builder.query<DashboardResponse, string>({
      query: (dashboardId) => `/${dashboardId}`,
      providesTags: (result, error, id) => [{ type: 'Dashboard', id }],
    }),

    // Create a new dashboard
    createDashboard: builder.mutation<DashboardCreateResponse, CreateDashboardRequest>({
      query: (dashboardData) => ({
        url: '',
        method: 'POST',
        body: dashboardData,
      }),
      invalidatesTags: [{ type: 'DashboardList', id: 'LIST' }],
    }),

    // Update an existing dashboard
    updateDashboard: builder.mutation<
      DashboardUpdateResponse,
      { id: string; updates: UpdateDashboardRequest }
    >({
      query: ({ id, updates }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        { type: 'DashboardList', id: 'LIST' },
      ],
    }),

    // Delete a dashboard
    deleteDashboard: builder.mutation<DashboardDeleteResponse, string>({
      query: (dashboardId) => ({
        url: `/${dashboardId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dashboard', id },
        { type: 'DashboardList', id: 'LIST' },
      ],
    }),

    // Duplicate a dashboard
    duplicateDashboard: builder.mutation<
      DashboardCreateResponse,
      { id: string; data: DuplicateDashboardRequest }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'DashboardList', id: 'LIST' }],
    }),

    // Get dashboard analytics
    getDashboardAnalytics: builder.query<
      DashboardAnalyticsResponse,
      { dashboardId: string; params?: GetDashboardAnalyticsParams }
    >({
      query: ({ dashboardId, params = {} }) => {
        const queryParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
        
        const queryString = queryParams.toString();
        return `/${dashboardId}/analytics${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { dashboardId }) => [
        { type: 'DashboardAnalytics', id: dashboardId },
      ],
    }),

    // Publish/unpublish dashboard
    toggleDashboardStatus: builder.mutation<
      DashboardUpdateResponse,
      { id: string; status: 'published' | 'draft' | 'archived' }
    >({
      query: ({ id, status }) => ({
        url: `/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        { type: 'DashboardList', id: 'LIST' },
      ],
    }),

    // Share dashboard (generate public link)
    shareDashboard: builder.mutation<
      { success: boolean; share_url: string; expires_at?: string },
      { id: string; share_config: { expires_in?: number; password?: string; public: boolean } }
    >({
      query: ({ id, share_config }) => ({
        url: `/${id}/share`,
        method: 'POST',
        body: share_config,
      }),
    }),

    // Add dashboard to favorites
    toggleDashboardFavorite: builder.mutation<
      { success: boolean; is_favorite: boolean },
      string
    >({
      query: (dashboardId) => ({
        url: `/${dashboardId}/favorite`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dashboard', id },
        { type: 'DashboardList', id: 'LIST' },
      ],
    }),

    // Update dashboard layout
    updateDashboardLayout: builder.mutation<
      DashboardUpdateResponse,
      { id: string; layout_config: any }
    >({
      query: ({ id, layout_config }) => ({
        url: `/${id}/layout`,
        method: 'PATCH',
        body: { layout_config },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dashboard', id }],
    }),

    // Update dashboard filters
    updateDashboardFilters: builder.mutation<
      DashboardUpdateResponse,
      { id: string; filters: any[] }
    >({
      query: ({ id, filters }) => ({
        url: `/${id}/filters`,
        method: 'PATCH',
        body: { filters },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dashboard', id }],
    }),

    // Export dashboard
    exportDashboard: builder.mutation<
      { success: boolean; export_url: string; format: string },
      { id: string; format: 'pdf' | 'png' | 'json'; options?: any }
    >({
      query: ({ id, format, options }) => ({
        url: `/${id}/export`,
        method: 'POST',
        body: { format, options },
      }),
    }),
  }),
});

export const {
  useGetDashboardsQuery,
  useGetDashboardQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
  useDuplicateDashboardMutation,
  useGetDashboardAnalyticsQuery,
  useToggleDashboardStatusMutation,
  useShareDashboardMutation,
  useToggleDashboardFavoriteMutation,
  useUpdateDashboardLayoutMutation,
  useUpdateDashboardFiltersMutation,
  useExportDashboardMutation,
} = dashboardApi;