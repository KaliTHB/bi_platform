// web-application/src/store/api/chartApi.ts - COMPLETE UPDATED VERSION
import { baseApi } from './baseApi';

// Types
export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id?: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  config_json: Record<string, any>;
  is_active: boolean;
  version: number;
  dataset_ids: string[];
  position_json?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  usage_count?: number;
  last_accessed?: string;
}

export interface ChartData {
  data: any[];
  columns: Array<{ name: string; type: string; format?: string }>;
  execution_time: number;
  metadata: {
    row_count: number;
    execution_time_ms: number;
    cache_hit: boolean;
    query_hash: string;
    generated_sql?: string;
  };
  query?: string;
  parameters?: Record<string, any>;
  cacheInfo?: {
    hit: boolean;
    key?: string;
    ttl?: number;
    createdAt?: string;
  };
}

export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'csv' | 'xlsx';
  width?: number;
  height?: number;
  include_data?: boolean;
  quality?: number;
  backgroundColor?: string;
  includeMetadata?: boolean;
  filename?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface ChartRefreshOptions {
  force?: boolean;
  showLoading?: boolean;
  updateCache?: boolean;
  timeout?: number;
}

// Chart API slice extending baseApi (shares the same middleware and reducer)
export const chartApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================================================
    // CHART CRUD OPERATIONS
    // ============================================================================
    
    getCharts: builder.query<
      { 
        success: boolean; 
        charts: Chart[]; 
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
        url: '/charts',
        method: 'GET',
        params: { workspace_id: workspaceId, ...params },
      }),
      providesTags: ['Chart'],
    }),

    getChart: builder.query<
      { 
        success: boolean; 
        chart: Chart; 
        message?: string;
      },
      string
    >({
      query: (id) => `/charts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chart', id }],
    }),

    createChart: builder.mutation<
      { success: boolean; chart: Chart; message: string },
      Partial<Chart>
    >({
      query: (data) => ({
        url: '/charts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Chart'],
    }),

    updateChart: builder.mutation<
      { success: boolean; chart: Chart; message: string },
      { id: string; data: Partial<Chart> }
    >({
      query: ({ id, data }) => ({
        url: `/charts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chart', id },
        'Chart',
      ],
    }),

    deleteChart: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/charts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chart'],
    }),

    duplicateChart: builder.mutation<
      { success: boolean; chart: Chart; message: string },
      { id: string; data: { name: string; description?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/charts/${id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Chart'],
    }),

    // ============================================================================
    // CHART DATA OPERATIONS
    // ============================================================================

    getChartData: builder.query<
      {
        success: boolean;
        data: ChartData;
        message?: string;
      },
      { 
        id: string;
        filters?: any[];
        refresh?: boolean;
        limit?: number;
        offset?: number;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/charts/${id}/data`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [
        { type: 'Chart', id },
        'Chart',
      ],
    }),

    refreshChart: builder.mutation<
      {
        success: boolean;
        refresh_id: string;
        status: 'initiated' | 'processing' | 'completed' | 'failed';
        started_at: string;
        estimated_completion_time?: string;
        message?: string;
      },
      { id: string; options?: ChartRefreshOptions }
    >({
      query: ({ id, options = {} }) => ({
        url: `/charts/${id}/refresh`,
        method: 'POST',
        body: options,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chart', id },
        'Chart',
      ],
    }),

    applyChartFilter: builder.mutation<
      {
        success: boolean;
        data: ChartData;
        filter_applied: any;
        execution_time_ms: number;
        cache_hit: boolean;
        message?: string;
      },
      { id: string; filters: any[] }
    >({
      query: ({ id, filters }) => ({
        url: `/charts/${id}/filter`,
        method: 'POST',
        body: { filters },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chart', id },
        'Chart',
      ],
    }),

    // ============================================================================
    // CHART EXPORT OPERATIONS
    // ============================================================================

    exportChart: builder.mutation<
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
        options: ChartExportOptions;
      }
    >({
      query: ({ id, options }) => ({
        url: `/charts/${id}/export`,
        method: 'POST',
        body: options,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chart', id },
      ],
    }),

    getChartExportStatus: builder.query<
      {
        success: boolean;
        export: {
          export_id: string;
          status: 'processing' | 'completed' | 'failed';
          download_url?: string;
          error_message?: string;
        };
        message?: string;
      },
      string
    >({
      query: (exportId) => `/charts/export/${exportId}/status`,
    }),

    // ============================================================================
    // CHART UTILITY OPERATIONS
    // ============================================================================

    getChartQuery: builder.query<
      {
        success: boolean;
        query: {
          generated_sql: string;
          parameters: Record<string, any>;
          execution_plan?: string;
          estimated_cost?: number;
          cache_key: string;
        };
        message?: string;
      },
      string
    >({
      query: (id) => `/charts/${id}/query`,
      providesTags: (result, error, id) => [{ type: 'Chart', id }],
    }),

    checkChartUsage: builder.query<
      {
        success: boolean;
        usage: {
          inUse: boolean;
          dashboardCount: number;
          dashboards: Array<{ id: string; name: string }>;
        };
        message?: string;
      },
      string
    >({
      query: (id) => `/charts/${id}/usage`,
      providesTags: (result, error, id) => [{ type: 'Chart', id }],
    }),

    getChartAnalytics: builder.query<
      {
        success: boolean;
        analytics: {
          view_count: number;
          last_viewed: string;
          avg_load_time: number;
          error_rate: number;
          usage_trend: any[];
        };
        message?: string;
      },
      { id: string; params?: any }
    >({
      query: ({ id, params }) => ({
        url: `/charts/${id}/analytics`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [
        { type: 'Chart', id },
      ],
    }),

    // ============================================================================
    // CHART STATUS OPERATIONS
    // ============================================================================

    toggleChartStatus: builder.mutation<
      { success: boolean; chart: Chart; message: string },
      { id: string; is_active: boolean }
    >({
      query: ({ id, is_active }) => ({
        url: `/charts/${id}/status`,
        method: 'PATCH',
        body: { is_active },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chart', id },
        'Chart',
      ],
    }),

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================

    bulkUpdateCharts: builder.mutation<
      { success: boolean; updated_count: number; message: string },
      { ids: string[]; data: Partial<Chart> }
    >({
      query: ({ ids, data }) => ({
        url: '/charts/bulk-update',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: ['Chart'],
    }),

    bulkDeleteCharts: builder.mutation<
      { success: boolean; deleted_count: number; message: string },
      { ids: string[] }
    >({
      query: ({ ids }) => ({
        url: '/charts/bulk-delete',
        method: 'DELETE',
        body: { ids },
      }),
      invalidatesTags: ['Chart'],
    }),

    // ============================================================================
    // CHART VALIDATION & TESTING
    // ============================================================================

    validateChartQuery: builder.mutation<
      {
        success: boolean;
        validation: {
          is_valid: boolean;
          errors: string[];
          warnings: string[];
          estimated_rows: number;
          estimated_execution_time: number;
        };
        message?: string;
      },
      { id: string; query_config: any }
    >({
      query: ({ id, query_config }) => ({
        url: `/charts/${id}/validate`,
        method: 'POST',
        body: { query_config },
      }),
    }),

    previewChartData: builder.mutation<
      {
        success: boolean;
        preview_data: ChartData;
        message?: string;
      },
      { id: string; limit?: number }
    >({
      query: ({ id, limit = 100 }) => ({
        url: `/charts/${id}/preview`,
        method: 'POST',
        body: { limit },
      }),
    }),
  }),
});

// Export hooks for use in components
export const {
  // ✅ CHART CRUD HOOKS
  useGetChartsQuery,
  useLazyGetChartsQuery,
  useGetChartQuery,
  useLazyGetChartQuery,
  useCreateChartMutation,
  useUpdateChartMutation,
  useDeleteChartMutation,
  useDuplicateChartMutation,
  
  // 🚀 CHART DATA HOOKS
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useRefreshChartMutation,
  useApplyChartFilterMutation,
  
  // 📊 CHART EXPORT HOOKS
  useExportChartMutation,
  useGetChartExportStatusQuery,
  
  // 🔧 CHART UTILITY HOOKS
  useGetChartQueryQuery,
  useCheckChartUsageQuery,
  useGetChartAnalyticsQuery,
  
  // 🎯 CHART STATUS HOOKS
  useToggleChartStatusMutation,
  
  // 🔄 BULK OPERATION HOOKS
  useBulkUpdateChartsMutation,
  useBulkDeleteChartsMutation,
  
  // ✅ CHART VALIDATION & TESTING HOOKS
  useValidateChartQueryMutation,
  usePreviewChartDataMutation,
} = chartApi;