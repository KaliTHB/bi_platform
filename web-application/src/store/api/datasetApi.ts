// web-application/src/store/api/datasetApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Response interfaces
interface GetDatasetsResponse {
  datasets: Dataset[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Dataset interface (simplified to match your existing structure)
interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  type: 'source' | 'virtual' | 'sql' | 'table' | 'query' | 'transformation' | 'calculated' | 'imported';
  schema?: string;
  connection?: string;
  datasource_ids?: string[];
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
  owner_id?: string;
  created_by?: string;
  row_count?: number;
  last_modified?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  workspace_id?: string;
  status?: string;
  is_active?: boolean;
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

// ✅ FIX: Use the existing NEXT_PUBLIC_API_URL environment variable
const getBaseUrl = () => {
  // Use your existing environment variable
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    // If NEXT_PUBLIC_API_URL is set, use it with /api suffix
    return `${apiUrl}/api`;
  }
  
  // Fallback for development
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    return 'http://localhost:3001/api';
  }
  
  // Production fallback: use relative paths
  return '/api';
};

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/datasets`, // ✅ FIX: Point to correct backend
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      const workspaceId = state.workspace.currentWorkspace?.id;
      
      // Set content type
      headers.set('Content-Type', 'application/json');
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      if (workspaceId) {
        headers.set('X-Workspace-ID', workspaceId);
      }
      
      // ✅ REMOVE CORS HEADERS - These should be set by the server, not the client
      
      return headers;
    },
  }),
  tagTypes: ['Dataset', 'DatasetSchema', 'DatasetData', 'DatasetStats'],
  
  endpoints: (builder) => ({
    // Get all datasets with filtering, pagination, and search
    getDatasets: builder.query<GetDatasetsResponse, GetDatasetsParams>({
      query: ({ workspaceId, ...params }) => {
        const searchParams = new URLSearchParams();
        
        // Add workspace ID
        searchParams.append('workspace_id', workspaceId);
        
        // Add optional parameters
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.type) searchParams.append('type', params.type);
        if (params.sortBy) searchParams.append('sort_by', params.sortBy);
        if (params.sortDirection) searchParams.append('sort_direction', params.sortDirection);
        if (params.includeSchema !== undefined) searchParams.append('include_schema', params.includeSchema.toString());
        if (params.createdBy) searchParams.append('created_by', params.createdBy);
        if (params.datasourceId) searchParams.append('datasource_id', params.datasourceId);
        
        const queryString = searchParams.toString();
        return queryString ? `?${queryString}` : '';
      },
      providesTags: (result) =>
        result
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
      providesTags: (result, error, { id }) => [{ type: 'Dataset', id }],
    }),

    // Create new dataset
    createDataset: builder.mutation<Dataset, Partial<Dataset>>({
      query: (datasetData) => ({
        url: '',
        method: 'POST',
        body: datasetData,
      }),
      invalidatesTags: [{ type: 'Dataset', id: 'LIST' }],
    }),

    // Update existing dataset
    updateDataset: builder.mutation<Dataset, { id: string; data: Partial<Dataset> }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Dataset', id },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),

    // Delete dataset
    deleteDataset: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dataset', id },
        { type: 'Dataset', id: 'LIST' },
      ],
    }),

    // Preview dataset data (first 100 rows)
    previewDataset: builder.query<any, string>({
      query: (id) => `/${id}/preview`,
      providesTags: (result, error, id) => [{ type: 'DatasetData', id }],
    }),

    // Get dataset statistics
    getDatasetStats: builder.query<any, string>({
      query: (id) => `/${id}/stats`,
      providesTags: (result, error, id) => [{ type: 'DatasetStats', id }],
    }),

    // Query dataset with options
    queryDataset: builder.query<any, { id: string; options?: any }>({
      query: ({ id, options = {} }) => {
        const searchParams = new URLSearchParams();
        
        if (options.limit) searchParams.append('limit', options.limit.toString());
        if (options.offset) searchParams.append('offset', options.offset.toString());
        if (options.includeMetadata) searchParams.append('include_metadata', 'true');
        
        const queryString = searchParams.toString();
        return `/${id}/query${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { id }) => [{ type: 'DatasetData', id }],
    }),

    // Lazy query for manual triggering
    lazyQueryDataset: builder.query<any, { id: string; options?: any }>({
      query: ({ id, options = {} }) => {
        const searchParams = new URLSearchParams();
        
        if (options.limit) searchParams.append('limit', options.limit.toString());
        if (options.offset) searchParams.append('offset', options.offset.toString());
        if (options.includeMetadata) searchParams.append('include_metadata', 'true');
        
        const queryString = searchParams.toString();
        return `/${id}/query${queryString ? `?${queryString}` : ''}`;
      },
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetDatasetsQuery,
  useLazyGetDatasetsQuery,
  useGetDatasetByIdQuery,
  useLazyGetDatasetByIdQuery,
  useCreateDatasetMutation,
  useUpdateDatasetMutation,
  useDeleteDatasetMutation,
  usePreviewDatasetQuery,
  useLazyPreviewDatasetQuery,
  useGetDatasetStatsQuery,
  useQueryDatasetQuery,
  useLazyQueryDatasetQuery,
} = datasetApi;