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
    // Fix: Build query string from params and workspaceId
    const allParams = { workspace_id: workspaceId, ...params };
    const queryParams = new URLSearchParams();
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/datasets?${queryParams.toString()}`);
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
    columns?: string[];
    [key: string]: any;
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
    // Add empty object as body parameter for POST request
    const response = await apiClient.post(`/datasets/${datasetId}/test`, {});
    return response.data;
  },

  // Refresh dataset cache
  refreshDataset: async (datasetId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/refresh`, {});
    return response.data;
  },

  // Get dataset preview
  previewDataset: async (datasetId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    preview: any[];
    columns: Array<{ name: string; type: string }>;
    total_rows: number;
    message?: string;
  }> => {
    let endpoint = `/datasets/${datasetId}/preview`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  // Validate dataset query
  validateDataset: async (datasetId: string, query: string): Promise<{
    success: boolean;
    is_valid: boolean;
    errors?: string[];
    warnings?: string[];
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/validate`, { query });
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
      cache_info: {
        is_cached: boolean;
        cached_at?: string;
        expires_at?: string;
      };
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/stats`);
    return response.data;
  }
};

export default datasetAPI;