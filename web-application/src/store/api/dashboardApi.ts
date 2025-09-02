// web-application/src/store/api/dashboardApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Dashboard, DashboardWithCharts, CreateDashboardRequest, UpdateDashboardRequest } from '../../types/dashboard.types';

// Base query configuration
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/dashboards',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Dashboard API slice
export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery,
  tagTypes: ['Dashboard', 'DashboardData', 'DashboardCharts', 'DashboardCache', 'DashboardAnalytics'],
  endpoints: (builder) => ({
    // ✅ EXISTING ENDPOINTS
    getDashboards: builder.query<
      { success: boolean; dashboards: Dashboard[]; pagination: any; message?: string },
      { workspaceId: string; params?: any }
    >({
      query: ({ workspaceId, params = {} }) => ({
        url: '',
        method: 'GET',
        params: { workspace_id: workspaceId, ...params },
      }),
      providesTags: ['Dashboard'],
    }),

    getDashboard: builder.query<
      { success: boolean; dashboard: DashboardWithCharts; message?: string },
      string
    >({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Dashboard', id }],
    }),

    createDashboard: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      CreateDashboardRequest
    >({
      query: (data) => ({
        url: '',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Dashboard'],
    }),

    updateDashboard: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; data: UpdateDashboardRequest }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard',
        { type: 'DashboardData', id },
        { type: 'DashboardCache', id }
      ],
    }),

    deleteDashboard: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Dashboard'],
    }),

    duplicateDashboard: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; data: { name: string; slug: string } }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Dashboard'],
    }),

    getDashboardAnalytics: builder.query<
      { success: boolean; analytics: any; message?: string },
      { id: string; params?: any }
    >({
      query: ({ id, params }) => ({
        url: `/${id}/analytics`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'DashboardAnalytics', id }],
    }),

    // 🚀 NEW ENDPOINTS - CRITICAL CACHE & FILTER OPERATIONS

    getDashboardData: builder.query<
      {
        success: boolean;
        data: {
          charts: any[];
          metadata: {
            dashboard_id: string;
            chart_count: number;
            last_updated: Date;
            cached: boolean;
            execution_time_ms?: number;
          };
        };
        message?: string;
      },
      {
        id: string;
        params?: {
          refresh?: boolean;
          filters?: any[];
          limit?: number;
          offset?: number;
          [key: string]: any;
        };
      }
    >({
      query: ({ id, params }) => ({
        url: `/${id}/data`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'DashboardData', id }],
      // Keep cached data for 5 minutes unless refresh=true
      keepUnusedDataFor: 300,
    }),

    refreshDashboard: builder.mutation<
      {
        success: boolean;
        refresh_id: string;
        status: 'initiated' | 'processing' | 'completed' | 'failed';
        started_at: Date;
        estimated_completion_time?: Date;
        charts_to_refresh: number;
        message?: string;
      },
      string
    >({
      query: (id) => ({
        url: `/${id}/refresh`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'DashboardData', id },
        { type: 'DashboardCache', id },
        { type: 'DashboardCharts', id }
      ],
    }),

    applyGlobalFilter: builder.mutation<
      {
        success: boolean;
        results: Array<{
          chart_id: string;
          success: boolean;
          data?: any;
          error?: string;
          cache_invalidated?: boolean;
        }>;
        filter_id: string;
        applied_value: any;
        affected_charts: number;
        message?: string;
      },
      {
        id: string;
        filter_id: string;
        filter_value: any;
      }
    >({
      query: ({ id, filter_id, filter_value }) => ({
        url: `/${id}/filter`,
        method: 'POST',
        body: { filter_id, filter_value },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'DashboardData', id },
        { type: 'DashboardCharts', id }
      ],
    }),

    exportDashboard: builder.mutation<
      {
        success: boolean;
        export: {
          export_id: string;
          format: string;
          file_path?: string;
          download_url?: string;
          file_size_bytes?: number;
          status: 'processing' | 'completed' | 'failed';
          created_at: Date;
        };
        message?: string;
      },
      {
        id: string;
        options: {
          format: 'pdf' | 'png' | 'svg' | 'xlsx' | 'json';
          include_filters?: boolean;
          page_size?: 'A4' | 'A3' | 'Letter' | 'Legal';
          orientation?: 'portrait' | 'landscape';
          width?: number;
          height?: number;
          quality?: number;
          [key: string]: any;
        };
      }
    >({
      query: ({ id, options }) => ({
        url: `/${id}/export`,
        method: 'POST',
        body: options,
      }),
    }),

    // 🔧 ADDITIONAL UTILITY ENDPOINTS

    getDashboardCharts: builder.query<
      {
        success: boolean;
        charts: any[];
        total: number;
        message?: string;
      },
      string
    >({
      query: (id) => `/${id}/charts`,
      providesTags: (result, error, id) => [{ type: 'DashboardCharts', id }],
    }),

    updateDashboardLayout: builder.mutation<
      {
        success: boolean;
        layout: any;
        message: string;
      },
      {
        id: string;
        layout: any;
      }
    >({
      query: ({ id, layout }) => ({
        url: `/${id}/layout`,
        method: 'PUT',
        body: { layout },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        { type: 'DashboardData', id }
      ],
    }),

    updateDashboardFilters: builder.mutation<
      {
        success: boolean;
        filters: any[];
        message: string;
      },
      {
        id: string;
        filters: any[];
      }
    >({
      query: ({ id, filters }) => ({
        url: `/${id}/filters`,
        method: 'PUT',
        body: { filters },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        { type: 'DashboardData', id }
      ],
    }),

    clearDashboardCache: builder.mutation<
      {
        success: boolean;
        cache_cleared: boolean;
        affected_charts: number;
        message?: string;
      },
      string
    >({
      query: (id) => ({
        url: `/${id}/cache/clear`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'DashboardCache', id },
        { type: 'DashboardData', id }
      ],
    }),

    getDashboardCacheStatus: builder.query<
      {
        success: boolean;
        cache_status: {
          dashboard_cached: boolean;
          charts_cached: number;
          total_charts: number;
          last_cache_update?: Date;
          cache_size_mb?: number;
        };
        message?: string;
      },
      string
    >({
      query: (id) => `/${id}/cache/status`,
      providesTags: (result, error, id) => [{ type: 'DashboardCache', id }],
    }),

    // ✅ EXISTING UTILITY ENDPOINTS
    toggleDashboardStatus: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; status: 'active' | 'inactive' | 'archived' }
    >({
      query: ({ id, status }) => ({
        url: `/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard'
      ],
    }),

    shareDashboard: builder.mutation<
      {
        success: boolean;
        sharing_config: any;
        message: string;
      },
      {
        id: string;
        shareData: {
          share_type: 'public' | 'password' | 'private';
          expires_at?: Date;
          password?: string;
        };
      }
    >({
      query: ({ id, shareData }) => ({
        url: `/${id}/share`,
        method: 'POST',
        body: shareData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dashboard', id }],
    }),

    toggleDashboardFavorite: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; is_featured: boolean }
    >({
      query: ({ id, is_featured }) => ({
        url: `/${id}/favorite`,
        method: 'PATCH',
        body: { is_featured },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard'
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  // ✅ EXISTING HOOKS
  useGetDashboardsQuery,
  useGetDashboardQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
  useDuplicateDashboardMutation,
  useGetDashboardAnalyticsQuery,
  
  // 🚀 NEW HOOKS - CRITICAL CACHE & FILTER OPERATIONS
  useGetDashboardDataQuery,
  useRefreshDashboardMutation,
  useApplyGlobalFilterMutation,
  useExportDashboardMutation,
  
  // 🔧 ADDITIONAL UTILITY HOOKS
  useGetDashboardChartsQuery,
  useUpdateDashboardLayoutMutation,
  useUpdateDashboardFiltersMutation,
  useClearDashboardCacheMutation,
  useGetDashboardCacheStatusQuery,
  
  // ✅ EXISTING UTILITY HOOKS
  useToggleDashboardStatusMutation,
  useShareDashboardMutation,
  useToggleDashboardFavoriteMutation,
} = dashboardApi;