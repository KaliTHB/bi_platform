// File: web-application/src/services/datasetAPI.ts

import { apiClient } from '../utils/apiUtils';
import { 
  Dataset, 
  DatasetSchema,
  CreateDatasetRequest,
  UpdateDatasetRequest 
} from '../types/dataset.types';
import {
  DatasetListResponse,
  DatasetResponse,
  DatasetSchemaResponse,
  DatasetQueryResponse,
  DatasetTestResponse,
  DatasetCreateResponse,
  DatasetUpdateResponse,
  DatasetDeleteResponse
} from '../types/api-responses.types';

// ============================================================================
// Dataset API Service
// ============================================================================

export const datasetAPI = {
  // Get all datasets for a workspace
  getDatasets: async (workspaceId: string, params?: any): Promise<DatasetListResponse> => {
    const response = await apiClient.get(`/datasets`, {
      params: { ...params, workspaceId }
    });
    return response.data;
  },

  // Get a specific dataset by ID
  getDataset: async (datasetId: string): Promise<DatasetResponse> => {
    const response = await apiClient.get(`/datasets/${datasetId}`);
    return response.data;
  },

  // Create a new dataset
  createDataset: async (data: CreateDatasetRequest): Promise<DatasetCreateResponse> => {
    const response = await apiClient.post('/datasets', data);
    return response.data;
  },

  // Update an existing dataset
  updateDataset: async (datasetId: string, data: UpdateDatasetRequest): Promise<DatasetUpdateResponse> => {
    const response = await apiClient.put(`/datasets/${datasetId}`, data);
    return response.data;
  },

  // Delete a dataset
  deleteDataset: async (datasetId: string): Promise<DatasetDeleteResponse> => {
    const response = await apiClient.delete(`/datasets/${datasetId}`);
    return response.data;
  },

  // Query a dataset with options
  queryDataset: async (datasetId: string, queryOptions: {
    limit?: number;
    offset?: number;
    filters?: any[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<DatasetQueryResponse> => {
    const response = await apiClient.post(`/datasets/${datasetId}/query`, queryOptions);
    return response.data;
  },

  // Get dataset schema
  getDatasetSchema: async (datasetId: string): Promise<DatasetSchemaResponse> => {
    const response = await apiClient.get(`/datasets/${datasetId}/schema`);
    return response.data;
  },

  // Test dataset query
  testDataset: async (datasetId: string): Promise<DatasetTestResponse> => {
    const response = await apiClient.post(`/datasets/${datasetId}/test`);
    return response.data;
  },

  // Refresh dataset cache
  refreshDataset: async (datasetId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/refresh`);
    return response.data;
  },

  // Get dataset statistics
  getDatasetStats: async (datasetId: string): Promise<{
    success: boolean;
    stats: {
      row_count: number;
      column_count: number;
      size_bytes: number;
      last_updated: string;
      query_count: number;
      avg_query_time: number;
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/stats`);
    return response.data;
  },

  // Export dataset
  exportDataset: async (datasetId: string, format: 'csv' | 'excel' | 'json'): Promise<{
    success: boolean;
    download_url?: string;
    file_size?: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/export`, { format });
    return response.data;
  },

  // Validate dataset configuration
  validateDataset: async (config: Partial<CreateDatasetRequest>): Promise<{
    success: boolean;
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    message?: string;
  }> => {
    const response = await apiClient.post('/datasets/validate', config);
    return response.data;
  }
};

// ============================================================================
// Type-Safe Helper Functions
// ============================================================================

/**
 * Safely extract dataset from API response with proper error handling
 */
export function extractDataset(response: DatasetResponse): Dataset {
  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch dataset');
  }
  
  if (!response.dataset) {
    throw new Error('Dataset not found in response');
  }
  
  return response.dataset;
}

/**
 * Safely extract schema from API response with proper error handling
 */
export function extractSchema(response: DatasetSchemaResponse): DatasetSchema {
  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch dataset schema');
  }
  
  if (!response.schema) {
    throw new Error('Schema not found in response');
  }
  
  return response.schema;
}

/**
 * Safely extract query data from API response with proper error handling
 */
export function extractQueryData(response: DatasetQueryResponse): {
  data: any[];
  columns: Array<{ name: string; type: string; display_name?: string }>;
  totalRows: number;
  executionTime: number;
  cached: boolean;
} {
  if (!response.success) {
    throw new Error(response.message || 'Query failed');
  }
  
  return {
    data: response.data || [],
    columns: response.columns || [],
    totalRows: response.total_rows || 0,
    executionTime: response.execution_time || 0,
    cached: response.cached || false
  };
}

/**
 * Safely extract datasets list from API response
 */
export function extractDatasetsList(response: DatasetListResponse): Dataset[] {
  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch datasets');
  }
  
  return response.datasets || [];
}

// Export default
export default datasetAPI;