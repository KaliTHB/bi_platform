// web-application/src/store/api/datasetApi.ts - UPDATED COMPLETE VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ==================== TYPE DEFINITIONS ====================

// Backend Response Structure (what your API actually returns)
interface BackendApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// Dataset interfaces
interface Dataset {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'source' | 'virtual' | 'sql' | 'transformation' | 'table';
  workspace_id: string;
  owner?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  created_at: string;
  updated_at: string;
  row_count?: number;
  is_active: boolean;
  schema_json?: any;
}

// Column interface for dataset schema
interface DatasetColumn {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
}

// Specific response types that match your backend
interface GetDatasetsData {
  datasets: Dataset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Frontend Expected Structure (for RTK Query cache normalization)
interface GetDatasetsResponse {
  datasets: Dataset[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Query parameters interface
interface GetDatasetsParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  includeSchema?: boolean;
  createdBy?: string;
  datasourceId?: string;
}

// Dataset preview response
interface DatasetPreviewResponse {
  data: any[];
  columns: DatasetColumn[];
  total_rows: number;
  preview_rows: number;
  truncated: boolean;
}

// Dataset columns response
interface DatasetColumnsResponse {
  columns: DatasetColumn[];
  total_columns: number;
  schema_updated_at: string;
}

// Dataset query request parameters
interface DatasetQueryRequest {
  filters?: Array<{
    column: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'not_like';
    value: any;
  }>;
  columns?: string[];
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  include_metadata?: boolean;
}

// Dataset query response
interface DatasetQueryResponse {
  data: any[];
  columns: DatasetColumn[];
  metadata: {
    row_count: number;
    total_rows: number;
    execution_time_ms: number;
    cache_hit: boolean;
    query_hash: string;
    generated_sql?: string;
  };
  cached: boolean;
}

// Dataset stats interface
interface DatasetStats {
  row_count: number;
  column_count: number;
  size_bytes: number;
  size_formatted: string;
  last_updated: string;
  last_accessed?: string;
}

// ==================== API DEFINITION ====================

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/datasets',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Dataset', 'DatasetData', 'DatasetPreview', 'DatasetSchema', 'DatasetStats'],
  endpoints: (builder) => ({

    // ==================== EXISTING ENDPOINTS ====================

    // Get all datasets with filtering and pagination
    getDatasets: builder.query<GetDatasetsResponse, GetDatasetsParams>({
      query: ({ 
        workspaceId, 
        page = 1, 
        limit = 20, 
        search, 
        type, 
        sortBy, 
        sortDirection,
        includeSchema = false,
        createdBy,
        datasourceId 
      }) => {
        const searchParams = new URLSearchParams();
        
        searchParams.append('workspace_id', workspaceId);
        searchParams.append('page', page.toString());
        searchParams.append('limit', limit.toString());
        
        if (search) searchParams.append('search', search);
        if (type) searchParams.append('type', type);
        if (sortBy) searchParams.append('sort_by', sortBy);
        if (sortDirection) searchParams.append('sort_direction', sortDirection);
        if (includeSchema) searchParams.append('include_schema', 'true');
        if (createdBy) searchParams.append('created_by', createdBy);
        if (datasourceId) searchParams.append('datasource_id', datasourceId);
        
        const queryString = searchParams.toString();
        return `?${queryString}`;
      },
      transformResponse: (response: BackendApiResponse<GetDatasetsData>): GetDatasetsResponse => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch datasets');
        }

        const { datasets, pagination } = response.data;
        
        return {
          datasets,
          total: pagination.total,
          page: pagination.page,
          limit: pagination.limit,
          pages: pagination.total_pages,
          has_next: pagination.has_next,
          has_previous: pagination.has_previous
        };
      },
      providesTags: (result) =>
        result?.datasets
          ? [
              ...result.datasets.map(({ id }) => ({ type: 'Dataset' as const, id })),
              { type: 'Dataset', id: 'LIST' },
            ]
          : [{ type: 'Dataset', id: 'LIST' }],
    }),

    // Get single dataset by ID
    getDatasetById: builder.query<Dataset, { id: string; includeSchema?: boolean }>({
      query: ({ id, includeSchema = false }) => 
        `/${id}?include_schema=${includeSchema}`,
      transformResponse: (response: BackendApiResponse<Dataset>): Dataset => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch dataset');
        }
        return response.data;
      },
      providesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    }),

    // Create new dataset
    createDataset: builder.mutation<Dataset, Partial<Dataset>>({
      query: (datasetData) => ({
        url: '',
        method: 'POST',
        body: datasetData,
      }),
      transformResponse: (response: BackendApiResponse<Dataset>): Dataset => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to create dataset');
        }
        return response.data;
      },
      invalidatesTags: [{ type: 'Dataset', id: 'LIST' }],
    }),

    // Update existing dataset
    updateDataset: builder.mutation<Dataset, { id: string; data: Partial<Dataset> }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: BackendApiResponse<Dataset>): Dataset => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to update dataset');
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dataset', id },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),

    // Delete dataset
    deleteDataset: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: BackendApiResponse<any>) => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to delete dataset');
        }
        return { message: response.message || 'Dataset deleted successfully' };
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Dataset', id },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),

    // Get dataset statistics
    getDatasetStats: builder.query<DatasetStats, string>({
      query: (id) => `/${id}/stats`,
      transformResponse: (response: BackendApiResponse<DatasetStats>) => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to get dataset stats');
        }
        return response.data;
      },
      providesTags: (result, error, id) => [{ type: 'DatasetStats', id }],
    }),

    // ==================== NEW ENDPOINTS ====================

    // GET /api/datasets/{id}/columns
    getDatasetColumns: builder.query<DatasetColumnsResponse, { 
      id: string; 
      includeDescription?: boolean;
    }>({
      query: ({ id, includeDescription = false }) => {
        const params = new URLSearchParams();
        if (includeDescription) {
          params.append('include_description', 'true');
        }
        
        const queryString = params.toString();
        return `/${id}/columns${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: BackendApiResponse<DatasetColumnsResponse>): DatasetColumnsResponse => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch dataset columns');
        }
        return response.data;
      },
      providesTags: (result, error, { id }) => [
        { type: 'DatasetSchema', id },
        { type: 'Dataset', id }
      ],
    }),

    // GET /api/datasets/{id}/preview
    getDatasetPreview: builder.query<DatasetPreviewResponse, { 
      id: string; 
      limit?: number;
      columns?: string[];
    }>({
      query: ({ id, limit = 100, columns }) => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        
        if (columns && columns.length > 0) {
          params.append('columns', columns.join(','));
        }
        
        const queryString = params.toString();
        return `/${id}/preview${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: BackendApiResponse<DatasetPreviewResponse>): DatasetPreviewResponse => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to preview dataset');
        }
        return response.data;
      },
      providesTags: (result, error, { id }) => [
        { type: 'DatasetPreview', id },
        { type: 'DatasetData', id }
      ],
    }),

    // POST /api/datasets/{id}/query - Mutation version
    executeDatasetQuery: builder.mutation<DatasetQueryResponse, { 
      id: string; 
      queryOptions: DatasetQueryRequest;
    }>({
      query: ({ id, queryOptions }) => ({
        url: `/${id}/query`,
        method: 'POST',
        body: queryOptions,
      }),
      transformResponse: (response: BackendApiResponse<DatasetQueryResponse>): DatasetQueryResponse => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to execute dataset query');
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'DatasetData', id },
        { type: 'DatasetStats', id }
      ],
    }),

    // POST /api/datasets/{id}/query - Query version (for polling/real-time)
    queryDatasetWithOptions: builder.query<DatasetQueryResponse, { 
      id: string; 
      queryOptions: DatasetQueryRequest;
    }>({
      query: ({ id, queryOptions }) => ({
        url: `/${id}/query`,
        method: 'POST',
        body: queryOptions,
      }),
      transformResponse: (response: BackendApiResponse<DatasetQueryResponse>): DatasetQueryResponse => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to execute dataset query');
        }
        return response.data;
      },
      providesTags: (result, error, { id }) => [
        { type: 'DatasetData', id }
      ],
    }),

    // ==================== LEGACY SUPPORT ====================
    
    // Legacy preview endpoint (keeping for backward compatibility)
    previewDataset: builder.query<any, string>({
      query: (id) => `/${id}/preview`,
      transformResponse: (response: BackendApiResponse<any>) => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to preview dataset');
        }
        return response.data;
      },
      providesTags: (result, error, id) => [{ type: 'DatasetData', id }],
    }),

    // Legacy query endpoint (keeping for backward compatibility)
    queryDataset: builder.query<any, { id: string; options?: any }>({
      query: ({ id, options = {} }) => {
        const searchParams = new URLSearchParams();
        
        if (options.limit) searchParams.append('limit', options.limit.toString());
        if (options.offset) searchParams.append('offset', options.offset.toString());
        if (options.includeMetadata) searchParams.append('include_metadata', 'true');
        
        const queryString = searchParams.toString();
        return `/${id}/query${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: BackendApiResponse<any>) => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to query dataset');
        }
        return response.data;
      },
      providesTags: (result, error, { id }) => [{ type: 'DatasetData', id }],
    }),

    // ==================== HELPER ENDPOINTS ====================

    // Get dataset columns with preview data in one call
    getDatasetSchemaAndPreview: builder.query<{
      columns: DatasetColumnsResponse;
      preview: DatasetPreviewResponse;
    }, { 
      id: string; 
      previewLimit?: number;
    }>({
      queryFn: async ({ id, previewLimit = 50 }, api, extraOptions, baseQuery) => {
        try {
          // Execute both requests in parallel
          const [columnsResult, previewResult] = await Promise.all([
            baseQuery(`/${id}/columns`),
            baseQuery(`/${id}/preview?limit=${previewLimit}`)
          ]);

          if (columnsResult.error) return { error: columnsResult.error };
          if (previewResult.error) return { error: previewResult.error };

          const columnsResponse = columnsResult.data as BackendApiResponse<DatasetColumnsResponse>;
          const previewResponse = previewResult.data as BackendApiResponse<DatasetPreviewResponse>;

          if (!columnsResponse.success || !previewResponse.success) {
            return { 
              error: { 
                status: 'CUSTOM_ERROR', 
                error: 'Failed to fetch schema and preview data' 
              } 
            };
          }

          return {
            data: {
              columns: columnsResponse.data,
              preview: previewResponse.data
            }
          };
        } catch (error) {
          return { 
            error: { 
              status: 'CUSTOM_ERROR', 
              error: `Failed to fetch schema and preview: ${error}` 
            } 
          };
        }
      },
      providesTags: (result, error, { id }) => [
        { type: 'DatasetSchema', id },
        { type: 'DatasetPreview', id },
        { type: 'DatasetData', id }
      ],
    }),
  }),
});

// ==================== EXPORTED HOOKS ====================

export const {
  // Main dataset CRUD operations
  useGetDatasetsQuery,
  useLazyGetDatasetsQuery,
  useGetDatasetByIdQuery,
  useLazyGetDatasetByIdQuery,
  useCreateDatasetMutation,
  useUpdateDatasetMutation,
  useDeleteDatasetMutation,
  
  // Dataset statistics
  useGetDatasetStatsQuery,
  useLazyGetDatasetStatsQuery,
  
  // NEW: Columns endpoints
  useGetDatasetColumnsQuery,
  useLazyGetDatasetColumnsQuery,
  
  // NEW: Preview endpoints  
  useGetDatasetPreviewQuery,
  useLazyGetDatasetPreviewQuery,
  
  // NEW: Query endpoints
  useExecuteDatasetQueryMutation,
  useQueryDatasetWithOptionsQuery,
  useLazyQueryDatasetWithOptionsQuery,
  
  // Combined endpoints
  useGetDatasetSchemaAndPreviewQuery,
  useLazyGetDatasetSchemaAndPreviewQuery,
  
  // Legacy endpoints (backward compatibility)
  usePreviewDatasetQuery,
  useLazyPreviewDatasetQuery,
  useQueryDatasetQuery,
  useLazyQueryDatasetQuery,
} = datasetApi;

// ==================== EXPORT DEFAULT ====================

export default datasetApi;