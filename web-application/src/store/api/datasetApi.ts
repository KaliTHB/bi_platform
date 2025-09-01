// web-application/src/store/api/datasetApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { 
  Dataset, 
  CreateDatasetRequest, 
  UpdateDatasetRequest,
  ColumnDefinition 
} from '../../types/dataset.types';

// Response types
interface DatasetListResponse {
  success: boolean;
  datasets: Dataset[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

interface DatasetResponse {
  success: boolean;
  dataset: Dataset;
  message?: string;
}

interface DatasetCreateResponse {
  success: boolean;
  dataset: Dataset;
  message: string;
}

interface DatasetUpdateResponse {
  success: boolean;
  dataset: Dataset;
  message: string;
}

interface DatasetDeleteResponse {
  success: boolean;
  message: string;
}

interface DatasetQueryResponse {
  success: boolean;
  data: any[];
  columns: ColumnDefinition[];
  total_rows: number;
  execution_time: number;
  cached: boolean;
  message?: string;
}

interface DatasetSchemaResponse {
  success: boolean;
  schema: {
    columns: ColumnDefinition[];
    table_info?: any;
    relationships?: any[];
  };
  message?: string;
}

interface DatasetTestResponse {
  success: boolean;
  preview?: any[];
  columns?: ColumnDefinition[];
  execution_time?: number;
  error?: string;
  message?: string;
}

interface DatasetValidationResponse {
  success: boolean;
  valid: boolean;
  issues?: Array<{
    type: 'error' | 'warning';
    message: string;
    line?: number;
    column?: number;
  }>;
  suggestions?: string[];
  message?: string;
}

// Query parameters
interface GetDatasetsParams {
  workspace_id?: string;
  type?: 'source' | 'derived' | 'materialized';
  data_source_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'last_queried';
  sort_direction?: 'asc' | 'desc';
  status?: 'active' | 'inactive';
  created_by?: string;
  tags?: string[];
}

interface QueryDatasetParams {
  limit?: number;
  offset?: number;
  filters?: Array<{
    column: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in';
    value: any;
  }>;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  columns?: string[];
  group_by?: string[];
  aggregations?: Array<{
    column: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    alias?: string;
  }>;
  use_cache?: boolean;
}

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/datasets',
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
  tagTypes: ['Dataset', 'DatasetList', 'DatasetSchema', 'DatasetQuery'],
  endpoints: (builder) => ({
    // Get all datasets with filtering and pagination
    getDatasets: builder.query<DatasetListResponse, GetDatasetsParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(item => queryParams.append(key, item.toString()));
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });
        
        return queryParams.toString() ? `?${queryParams.toString()}` : '';
      },
      providesTags: (result) =>
        result
          ? [
              ...result.datasets.map(({ id }) => ({ type: 'Dataset' as const, id })),
              { type: 'DatasetList', id: 'LIST' },
            ]
          : [{ type: 'DatasetList', id: 'LIST' }],
    }),

    // Get a specific dataset by ID
    getDataset: builder.query<DatasetResponse, string>({
      query: (datasetId) => `/${datasetId}`,
      providesTags: (result, error, id) => [{ type: 'Dataset', id }],
    }),

    // Create a new dataset
    createDataset: builder.mutation<DatasetCreateResponse, CreateDatasetRequest>({
      query: (datasetData) => ({
        url: '',
        method: 'POST',
        body: datasetData,
      }),
      invalidatesTags: [{ type: 'DatasetList', id: 'LIST' }],
    }),

    // Update an existing dataset
    updateDataset: builder.mutation<
      DatasetUpdateResponse,
      { id: string; updates: UpdateDatasetRequest }
    >({
      query: ({ id, updates }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dataset', id },
        { type: 'DatasetList', id: 'LIST' },
        { type: 'DatasetSchema', id },
      ],
    }),

    // Delete a dataset
    deleteDataset: builder.mutation<DatasetDeleteResponse, string>({
      query: (datasetId) => ({
        url: `/${datasetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dataset', id },
        { type: 'DatasetList', id: 'LIST' },
      ],
    }),

    // Query a dataset with filters and options
    queryDataset: builder.mutation<
      DatasetQueryResponse,
      { id: string; params: QueryDatasetParams }
    >({
      query: ({ id, params }) => ({
        url: `/${id}/query`,
        method: 'POST',
        body: params,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'DatasetQuery', id },
      ],
    }),

    // Get dataset schema information
    getDatasetSchema: builder.query<DatasetSchemaResponse, string>({
      query: (datasetId) => `/${datasetId}/schema`,
      providesTags: (result, error, id) => [{ type: 'DatasetSchema', id }],
    }),

    // Test dataset query (preview)
    testDataset: builder.mutation<DatasetTestResponse, string>({
      query: (datasetId) => ({
        url: `/${datasetId}/test`,
        method: 'POST',
        body: {},
      }),
    }),

    // Validate dataset query/configuration
    validateDataset: builder.mutation<
      DatasetValidationResponse,
      { id?: string; query?: string; config?: any }
    >({
      query: ({ id, query, config }) => ({
        url: id ? `/${id}/validate` : '/validate',
        method: 'POST',
        body: { query, config },
      }),
    }),

    // Refresh dataset cache
    refreshDatasetCache: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (datasetId) => ({
        url: `/${datasetId}/cache/refresh`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dataset', id },
        { type: 'DatasetQuery', id },
      ],
    }),

    // Clear dataset cache
    clearDatasetCache: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (datasetId) => ({
        url: `/${datasetId}/cache/clear`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'DatasetQuery', id },
      ],
    }),

    // Get dataset lineage (dependencies)
    getDatasetLineage: builder.query<
      {
        success: boolean;
        lineage: {
          upstream: Array<{ id: string; name: string; type: string }>;
          downstream: Array<{ id: string; name: string; type: string }>;
        };
      },
      string
    >({
      query: (datasetId) => `/${datasetId}/lineage`,
      providesTags: (result, error, id) => [{ type: 'Dataset', id: `${id}-lineage` }],
    }),

    // Get dataset usage statistics
    getDatasetUsage: builder.query<
      {
        success: boolean;
        usage: {
          total_queries: number;
          unique_users: number;
          avg_execution_time: number;
          most_used_columns: Array<{ column: string; usage_count: number }>;
          recent_queries: Array<{
            user: string;
            query_time: string;
            execution_time: number;
          }>;
        };
      },
      { datasetId: string; timeframe?: '24h' | '7d' | '30d' | '90d' }
    >({
      query: ({ datasetId, timeframe = '30d' }) => 
        `/${datasetId}/usage?timeframe=${timeframe}`,
    }),

    // Duplicate a dataset
    duplicateDataset: builder.mutation<
      DatasetCreateResponse,
      { id: string; name: string; description?: string }
    >({
      query: ({ id, name, description }) => ({
        url: `/${id}/duplicate`,
        method: 'POST',
        body: { name, description },
      }),
      invalidatesTags: [{ type: 'DatasetList', id: 'LIST' }],
    }),

    // Export dataset
    exportDataset: builder.mutation<
      { success: boolean; export_url: string; format: string },
      { 
        id: string; 
        format: 'csv' | 'xlsx' | 'json' | 'parquet';
        options?: { 
          limit?: number;
          filters?: any[];
          columns?: string[];
        }
      }
    >({
      query: ({ id, format, options }) => ({
        url: `/${id}/export`,
        method: 'POST',
        body: { format, options },
      }),
    }),

    // Schedule dataset refresh
    scheduleDatasetRefresh: builder.mutation<
      { success: boolean; schedule_id: string; message: string },
      {
        id: string;
        schedule: {
          enabled: boolean;
          cron_expression: string;
          timezone?: string;
          notification_settings?: any;
        };
      }
    >({
      query: ({ id, schedule }) => ({
        url: `/${id}/schedule`,
        method: 'POST',
        body: schedule,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    }),

    // Get dataset permissions
    getDatasetPermissions: builder.query<
      {
        success: boolean;
        permissions: Array<{
          user_id: string;
          user_name: string;
          permission_type: string;
          granted_at: string;
          granted_by: string;
        }>;
      },
      string
    >({
      query: (datasetId) => `/${datasetId}/permissions`,
    }),
  }),
});

export const {
  useGetDatasetsQuery,
  useGetDatasetQuery,
  useCreateDatasetMutation,
  useUpdateDatasetMutation,
  useDeleteDatasetMutation,
  useQueryDatasetMutation,
  useGetDatasetSchemaQuery,
  useTestDatasetMutation,
  useValidateDatasetMutation,
  useRefreshDatasetCacheMutation,
  useClearDatasetCacheMutation,
  useGetDatasetLineageQuery,
  useGetDatasetUsageQuery,
  useDuplicateDatasetMutation,
  useExportDatasetMutation,
  useScheduleDatasetRefreshMutation,
  useGetDatasetPermissionsQuery,
} = datasetApi;