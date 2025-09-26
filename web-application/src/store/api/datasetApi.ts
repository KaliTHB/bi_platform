// bi_platform\web-application\src\store\api\datasetsApi.ts
// RTK Query API for dataset operations

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'virtual' | 'physical' | 'table' | 'query' | 'source' | 'transformation';
  schema: string;
  connection: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
  row_count?: number;
  last_updated?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  workspace_id: string;
  tags?: string[];
}

export interface ColumnDefinition {
  name: string;
  display_name?: string;
  data_type: string;
  nullable?: boolean;
  unique?: boolean;
  description?: string;
  is_primary_key?: boolean;
  default_value?: any;
  sample_values?: string[];
  unique_count?: number;
  null_count?: number;
}

export interface DatasetColumnsResponse {
  columns: ColumnDefinition[];
  total_count: number;
  dataset_info: {
    id: string;
    name: string;
    row_count?: number;
    last_analyzed?: string;
  };
}

export interface DatasetPreviewResponse {
  data: Record<string, any>[];
  columns: ColumnDefinition[];
  total_count: number;
  has_more: boolean;
  query_time: number;
  preview_info: {
    limit: number;
    offset: number;
    sample_type: 'random' | 'sequential';
  };
}

export interface DatasetListResponse {
  datasets: Dataset[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface DatasetFilters {
  search?: string;
  type?: string[];
  workspace_id?: string;
  owner_id?: string;
  tags?: string[];
  created_after?: string;
  updated_after?: string;
}

export interface DatasetListParams {
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'row_count';
  sort_order?: 'asc' | 'desc';
  filters?: DatasetFilters;
}

export interface DatasetPreviewParams {
  limit?: number;
  offset?: number;
  sample_type?: 'random' | 'sequential';
  columns?: string[]; // Specific columns to fetch
}

// =============================================================================
// RTK QUERY API DEFINITION
// =============================================================================

export const datasetsApi = createApi({
  reducerPath: 'datasetsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // Add authentication token if available
      const state = getState() as RootState;
      const token = state.auth?.token;
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Dataset', 'DatasetColumns', 'DatasetPreview'],
  endpoints: (builder) => ({
    
    // ==========================================================================
    // GET DATASET LIST
    // ==========================================================================
    getDatasets: builder.query<DatasetListResponse, DatasetListParams | void>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        // Add pagination parameters
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.sort_by) searchParams.append('sort_by', params.sort_by);
        if (params.sort_order) searchParams.append('sort_order', params.sort_order);
        
        // Add filter parameters
        if (params.filters) {
          const { filters } = params;
          if (filters.search) searchParams.append('search', filters.search);
          if (filters.type) filters.type.forEach(t => searchParams.append('type', t));
          if (filters.workspace_id) searchParams.append('workspace_id', filters.workspace_id);
          if (filters.owner_id) searchParams.append('owner_id', filters.owner_id);
          if (filters.tags) filters.tags.forEach(tag => searchParams.append('tags', tag));
          if (filters.created_after) searchParams.append('created_after', filters.created_after);
          if (filters.updated_after) searchParams.append('updated_after', filters.updated_after);
        }
        
        return `/datasets?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.datasets.map(({ id }) => ({ type: 'Dataset' as const, id })),
              { type: 'Dataset', id: 'LIST' },
            ]
          : [{ type: 'Dataset', id: 'LIST' }],
    }),

    // ==========================================================================
    // GET SINGLE DATASET
    // ==========================================================================
    getDataset: builder.query<Dataset, string>({
      query: (datasetId) => `/datasets/${datasetId}`,
      providesTags: (result, error, datasetId) => [
        { type: 'Dataset', id: datasetId }
      ],
    }),

    // ==========================================================================
    // GET DATASET COLUMNS
    // ==========================================================================
    getDatasetColumns: builder.query<DatasetColumnsResponse, string>({
      query: (datasetId) => `/datasets/${datasetId}/columns`,
      providesTags: (result, error, datasetId) => [
        { type: 'DatasetColumns', id: datasetId }
      ],
    }),

    // ==========================================================================
    // GET DATASET PREVIEW
    // ==========================================================================
    getDatasetPreview: builder.query<DatasetPreviewResponse, {
      datasetId: string;
      params?: DatasetPreviewParams;
    }>({
      query: ({ datasetId, params = {} }) => {
        const searchParams = new URLSearchParams();
        
        // Add preview parameters
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.sample_type) searchParams.append('sample_type', params.sample_type);
        if (params.columns) {
          params.columns.forEach(col => searchParams.append('columns', col));
        }
        
        return `/datasets/${datasetId}/preview?${searchParams.toString()}`;
      },
      providesTags: (result, error, { datasetId }) => [
        { type: 'DatasetPreview', id: datasetId }
      ],
    }),

    // ==========================================================================
    // EXECUTE CUSTOM DATASET QUERY
    // ==========================================================================
    executeDatasetQuery: builder.mutation<DatasetPreviewResponse, {
      datasetId: string;
      query: string;
      params?: {
        limit?: number;
        timeout?: number;
      };
    }>({
      query: ({ datasetId, query, params = {} }) => ({
        url: `/datasets/${datasetId}/query`,
        method: 'POST',
        body: {
          query,
          limit: params.limit || 1000,
          timeout: params.timeout || 30000,
        },
      }),
      invalidatesTags: (result, error, { datasetId }) => [
        { type: 'DatasetPreview', id: datasetId }
      ],
    }),

    // ==========================================================================
    // GET DATASET SCHEMA INFO
    // ==========================================================================
    getDatasetSchema: builder.query<{
      schema_info: {
        tables: Array<{
          name: string;
          type: string;
          row_count?: number;
          columns: ColumnDefinition[];
        }>;
        relationships: Array<{
          from_table: string;
          from_column: string;
          to_table: string;
          to_column: string;
          relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many';
        }>;
      };
    }, string>({
      query: (datasetId) => `/datasets/${datasetId}/schema`,
      providesTags: (result, error, datasetId) => [
        { type: 'Dataset', id: `${datasetId}-schema` }
      ],
    }),

    // ==========================================================================
    // REFRESH DATASET METADATA
    // ==========================================================================
    refreshDatasetMetadata: builder.mutation<{
      success: boolean;
      message: string;
      updated_at: string;
    }, string>({
      query: (datasetId) => ({
        url: `/datasets/${datasetId}/refresh`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, datasetId) => [
        { type: 'Dataset', id: datasetId },
        { type: 'DatasetColumns', id: datasetId },
        { type: 'DatasetPreview', id: datasetId },
      ],
    }),

    // ==========================================================================
    // CREATE DATASET
    // ==========================================================================
    createDataset: builder.mutation<Dataset, Partial<Dataset>>({
      query: (newDataset) => ({
        url: '/datasets',
        method: 'POST',
        body: newDataset,
      }),
      invalidatesTags: [{ type: 'Dataset', id: 'LIST' }],
    }),

    // ==========================================================================
    // UPDATE DATASET
    // ==========================================================================
    updateDataset: builder.mutation<Dataset, {
      datasetId: string;
      updates: Partial<Dataset>;
    }>({
      query: ({ datasetId, updates }) => ({
        url: `/datasets/${datasetId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { datasetId }) => [
        { type: 'Dataset', id: datasetId },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),

    // ==========================================================================
    // DELETE DATASET
    // ==========================================================================
    deleteDataset: builder.mutation<{ success: boolean }, string>({
      query: (datasetId) => ({
        url: `/datasets/${datasetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, datasetId) => [
        { type: 'Dataset', id: datasetId },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),
  }),
});

// =============================================================================
// EXPORT HOOKS
// =============================================================================

export const {
  // Query hooks
  useGetDatasetsQuery,
  useGetDatasetQuery,
  useGetDatasetColumnsQuery,
  useGetDatasetPreviewQuery,
  useGetDatasetSchemaQuery,
  
  // Lazy query hooks
  useLazyGetDatasetColumnsQuery,
  useLazyGetDatasetPreviewQuery,
  useLazyGetDatasetSchemaQuery,
  
  // Mutation hooks
  useExecuteDatasetQueryMutation,
  useRefreshDatasetMetadataMutation,
  useCreateDatasetMutation,
  useUpdateDatasetMutation,
  useDeleteDatasetMutation,
} = datasetsApi;

// =============================================================================
// SELECTORS
// =============================================================================

// Select datasets by workspace
export const selectDatasetsByWorkspace = (workspaceId: string) =>
  datasetsApi.endpoints.getDatasets.select({ 
    filters: { workspace_id: workspaceId } 
  });

// Select dataset columns
export const selectDatasetColumns = (datasetId: string) =>
  datasetsApi.endpoints.getDatasetColumns.select(datasetId);

// Select dataset preview
export const selectDatasetPreview = (datasetId: string, params?: DatasetPreviewParams) =>
  datasetsApi.endpoints.getDatasetPreview.select({ datasetId, params });

export default datasetsApi;