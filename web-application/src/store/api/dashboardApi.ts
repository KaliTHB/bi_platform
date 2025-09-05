// web-application/src/store/api/dashboardApi.ts - UPDATED WITH SHARED BASE CONFIG
import { baseApi } from './baseApi';
import { Dashboard, DashboardWithCharts, CreateDashboardRequest, UpdateDashboardRequest } from '../../types/dashboard.types';

// Dashboard API slice extending baseApi (shares the same middleware and reducer)
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ✅ EXISTING ENDPOINTS
    getDashboards: builder.query<
      { success: boolean; dashboards: Dashboard[]; pagination: any; message?: string },
      { workspaceId: string; params?: any }
    >({
      query: ({ workspaceId, params = {} }) => ({
        url: '/dashboards',
        method: 'GET',
        params: { workspace_id: workspaceId, ...params },
      }),
      providesTags: ['Dashboard'],
    }),

    getDashboard: builder.query<
      { success: boolean; dashboard: DashboardWithCharts; message?: string },
      string
    >({
      query: (id) => `/dashboards/${id}`,
      providesTags: (result, error, id) => [{ type: 'Dashboard', id }],
    }),

    createDashboard: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      CreateDashboardRequest
    >({
      query: (data) => ({
        url: '/dashboards',
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
        url: `/dashboards/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard',
      ],
    }),

    deleteDashboard: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/dashboards/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Dashboard'],
    }),

    duplicateDashboard: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; data: { name: string; slug: string } }
    >({
      query: ({ id, data }) => ({
        url: `/dashboards/${id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Dashboard'],
    }),

    // 🚀 ENHANCED DASHBOARD DATA ENDPOINTS
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
        refresh?: boolean;
        filters?: any[];
        limit?: number;
        offset?: number;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/dashboards/${id}/data`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard',
      ],
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
        url: `/dashboards/${id}/refresh`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dashboard', id },
        'Dashboard',
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
      { id: string; filterId: string; filterValue: any }
    >({
      query: ({ id, filterId, filterValue }) => ({
        url: `/dashboards/${id}/filter`,
        method: 'POST',
        body: {
          filter_id: filterId,
          filter_value: filterValue
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard',
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
        }
      }
    >({
      query: ({ id, options }) => ({
        url: `/dashboards/${id}/export`,
        method: 'POST',
        body: options,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
      ],
    }),

    getDashboardAnalytics: builder.query<
      { success: boolean; analytics: any; message?: string },
      { id: string; params?: any }
    >({
      query: ({ id, params }) => ({
        url: `/dashboards/${id}/analytics`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
      ],
    }),

    // 🔧 UTILITY ENDPOINTS
    toggleDashboardStatus: builder.mutation<
      { success: boolean; dashboard: Dashboard; message: string },
      { id: string; status: 'draft' | 'published' | 'archived' }
    >({
      query: ({ id, status }) => ({
        url: `/dashboards/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dashboard', id },
        'Dashboard',
      ],
    }),

    shareDashboard: builder.mutation<
      { success: boolean; shareConfig: any; message: string },
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
        url: `/dashboards/${id}/share`,
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
        url: `/dashboards/${id}/favorite`,
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
  
  // ✅ UTILITY HOOKS
  useToggleDashboardStatusMutation,
  useShareDashboardMutation,
  useToggleDashboardFavoriteMutation,
} = dashboardApi;