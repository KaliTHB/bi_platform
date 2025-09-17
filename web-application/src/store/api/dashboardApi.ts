// web-application/src/store/api/dashboardApi.ts - COMPLETE UPDATED VERSION
import { baseApi } from './baseApi';

// Types
export interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'workspace';
  is_featured: boolean;
  is_public: boolean;
  chart_count: number;
  view_count: number;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  thumbnail_url?: string;
  tags: string[];
  tabs?: DashboardTab[];
  global_filters?: GlobalFilter[];
  owner: {
    id: string;
    name: string;
    email: string;
  };
  config_json?: {
    auto_refresh?: {
      enabled: boolean;
      interval: number;
    };
    export_settings?: Record<string, any>;
    interaction_settings?: Record<string, any>;
  };
  theme_config?: {
    primary_color?: string;
    background_color?: string;
    font_family?: string;
  };
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
}

export interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  charts: Chart[];
  is_visible: boolean;
  sort_order: number;
}

export interface Chart {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  config_json: any;
  data_json?: any;
  x: number;
  y: number;
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  is_visible: boolean;
  dataset_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  default_value?: any;
  current_value?: any;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

export interface CreateDashboardRequest {
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  category_id?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateDashboardRequest {
  name?: string;
  display_name?: string;
  description?: string;
  slug?: string;
  category_id?: string;
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  config_json?: Record<string, any>;
  theme_config?: Record<string, any>;
}

// Dashboard API slice extending baseApi (shares the same middleware and reducer)
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================================================
    // DASHBOARD CRUD OPERATIONS
    // ============================================================================
    
    getDashboards: builder.query<
      { 
        success: boolean; 
        dashboards: Dashboard[]; 
        pagination?: {
          page: number;
          limit: number;
          total: number;
          total_pages: number;
        };
        message?: string;
      },
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
      { 
        success: boolean; 
        dashboard: Dashboard; 
        message?: string;
      },
      string
    >({
      query: (dashboardId) => ({
        url: `/dashboards/${dashboardId}`,
        params: {
          include_charts: true,
          include_data: false
        }
      }),
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
      { id: string; data: { name: string; slug: string; description?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/dashboards/${id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Dashboard'],
    }),

    // ============================================================================
    // DASHBOARD DATA OPERATIONS
    // ============================================================================

    getDashboardData: builder.query<
      {
        success: boolean;
        data: {
          charts: any[];
          metadata: {
            dashboard_id: string;
            chart_count: number;
            last_updated: string;
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
        started_at: string;
        estimated_completion_time?: string;
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

    // ============================================================================
    // DASHBOARD EXPORT OPERATIONS
    // ============================================================================

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
          created_at: string;
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

    // ============================================================================
    // DASHBOARD ANALYTICS & PERFORMANCE
    // ============================================================================

    getDashboardAnalytics: builder.query<
      { 
        success: boolean; 
        analytics: {
          views: {
            total: number;
            unique_users: number;
            daily_average: number;
          };
          charts: {
            total_interactions: number;
            most_viewed_chart: string;
            average_time_spent: number;
          };
          filters: {
            most_used_filter: string;
            filter_usage_count: number;
          };
          performance: {
            average_load_time: number;
            cache_hit_rate: number;
          };
        };
        message?: string;
      },
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

    // ============================================================================
    // DASHBOARD UTILITY OPERATIONS
    // ============================================================================

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
      { 
        success: boolean; 
        shareConfig: {
          share_token: string;
          share_url: string;
          expires_at?: string;
        };
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

    // ============================================================================
    // DASHBOARD CACHE OPERATIONS
    // ============================================================================

    getCacheStatus: builder.query<
      {
        success: boolean;
        cache_status: {
          dashboard_cached: boolean;
          charts_cached: number;
          total_charts: number;
          last_cache_update?: string;
          cache_size_mb?: number;
        };
        message?: string;
      },
      string
    >({
      query: (id) => `/dashboards/${id}/cache/status`,
    }),

    clearCache: builder.mutation<
      {
        success: boolean;
        cache_cleared: boolean;
        affected_charts: number;
        message?: string;
      },
      string
    >({
      query: (id) => ({
        url: `/dashboards/${id}/cache/clear`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dashboard', id },
        'Dashboard'
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  // ✅ DASHBOARD CRUD HOOKS
  useGetDashboardsQuery,
  useLazyGetDashboardsQuery,
  useGetDashboardQuery,
  useLazyGetDashboardQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
  useDuplicateDashboardMutation,
  
  // 🚀 DASHBOARD DATA HOOKS
  useGetDashboardDataQuery,
  useLazyGetDashboardDataQuery,
  useRefreshDashboardMutation,
  useApplyGlobalFilterMutation,
  
  // 📊 DASHBOARD EXPORT HOOKS
  useExportDashboardMutation,
  
  // 📈 DASHBOARD ANALYTICS HOOKS
  useGetDashboardAnalyticsQuery,
  
  // 🔧 DASHBOARD UTILITY HOOKS
  useToggleDashboardStatusMutation,
  useShareDashboardMutation,
  useToggleDashboardFavoriteMutation,
  
  // 💾 DASHBOARD CACHE HOOKS
  useGetCacheStatusQuery,
  useClearCacheMutation,
} = dashboardApi;