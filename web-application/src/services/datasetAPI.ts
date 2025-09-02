// web-application/src/services/datasetAPI.ts - UPDATED WITH MISSING FUNCTIONS
import { apiClient } from '../utils/apiUtils';
import { 
  Dataset, 
  DatasetSchema,
  CreateDatasetRequest,
  UpdateDatasetRequest 
} from '../types/dataset.types';

export const datasetAPI = {
  // ✅ EXISTING FUNCTIONS (Already Implemented)
  getDatasets: async (workspaceId: string, params?: any): Promise<{
    success: boolean;
    datasets: Dataset[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    message?: string;
  }> => {
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

  getDataset: async (datasetId: string): Promise<{
    success: boolean;
    dataset: Dataset;
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}`);
    return response.data;
  },

  createDataset: async (data: CreateDatasetRequest): Promise<{
    success: boolean;
    dataset: Dataset;
    message: string;
  }> => {
    const response = await apiClient.post('/datasets', data);
    return response.data;
  },

  updateDataset: async (datasetId: string, data: UpdateDatasetRequest): Promise<{
    success: boolean;
    dataset: Dataset;
    message: string;
  }> => {
    const response = await apiClient.put(`/datasets/${datasetId}`, data);
    return response.data;
  },

  deleteDataset: async (datasetId: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await apiClient.delete(`/datasets/${datasetId}`);
    return response.data;
  },

  getDatasetSchema: async (datasetId: string): Promise<{
    success: boolean;
    schema: {
      columns: Array<{ 
        name: string; 
        type: string; 
        nullable?: boolean;
        primaryKey?: boolean;
        description?: string;
      }>;
      table_info?: {
        name: string;
        row_count?: number;
        size?: string;
      };
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/schema`);
    return response.data;
  },

  refreshDataset: async (datasetId: string): Promise<{
    success: boolean;
    refresh_id: string;
    status: 'initiated' | 'processing' | 'completed' | 'failed';
    started_at: Date;
    estimated_completion_time?: Date;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/refresh`, {});
    return response.data;
  },

  queryDataset: async (datasetId: string, queryOptions: {
    limit?: number;
    offset?: number;
    filters?: any[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    columns?: string[];
    [key: string]: any;
  }): Promise<{
    success: boolean;
    data: any[];
    columns: Array<{ name: string; type: string }>;
    total_rows: number;
    execution_time: number;
    cached: boolean;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/query`, queryOptions);
    return response.data;
  },

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

  testDataset: async (datasetId: string): Promise<{
    success: boolean;
    is_valid: boolean;
    preview?: any[];
    columns?: Array<{ name: string; type: string }>;
    execution_time?: number;
    error?: string;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/test`, {});
    return response.data;
  },

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

  // 🚀 NEW FUNCTIONS - MISSING CRITICAL CACHE & FILTER OPERATIONS

  getDatasetData: async (datasetId: string, params?: {
    refresh?: boolean;
    filters?: any[];
    limit?: number;
    offset?: number;
    columns?: string[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    [key: string]: any;
  }): Promise<{
    success: boolean;
    data: any[];
    columns: Array<{ name: string; type: string; format?: string }>;
    metadata: {
      row_count: number;
      total_rows: number;
      execution_time_ms: number;
      cache_hit: boolean;
      query_hash: string;
      generated_sql?: string;
    };
    cached?: boolean;
    message?: string;
  }> => {
    let endpoint = `/datasets/${datasetId}/data`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'filters') {
            queryParams.append(key, JSON.stringify(value));
          } else if (key === 'columns' && Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  validateDatasetQuery: async (datasetId: string, query?: string): Promise<{
    success: boolean;
    is_valid: boolean;
    errors?: Array<{
      type: 'syntax' | 'semantic' | 'permission' | 'performance';
      message: string;
      line?: number;
      column?: number;
    }>;
    warnings?: Array<{
      type: 'performance' | 'deprecated' | 'best_practice';
      message: string;
      suggestion?: string;
    }>;
    estimated_execution_time?: number;
    estimated_row_count?: number;
    message?: string;
  }> => {
    const body = query ? { query } : {};
    const response = await apiClient.post(`/datasets/${datasetId}/validate`, body);
    return response.data;
  },

  getDatasetStats: async (datasetId: string): Promise<{
    success: boolean;
    stats: {
      row_count: number;
      column_count: number;
      size_bytes: number;
      size_formatted: string;
      last_updated: string;
      last_accessed?: string;
      access_count: number;
      cache_info: {
        is_cached: boolean;
        cached_at?: string;
        expires_at?: string;
        cache_size_bytes?: number;
        cache_hit_rate?: number;
      };
      performance_metrics: {
        avg_query_time_ms: number;
        slowest_query_time_ms?: number;
        fastest_query_time_ms?: number;
        total_queries_executed: number;
      };
      data_quality: {
        null_percentage: number;
        duplicate_rows: number;
        data_types_detected: Record<string, number>;
      };
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/stats`);
    return response.data;
  },

  clearDatasetCache: async (datasetId: string): Promise<{
    success: boolean;
    cache_cleared: boolean;
    cache_size_cleared_bytes?: number;
    affected_queries: number;
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/cache/clear`, {});
    return response.data;
  },

  // 🔧 ADDITIONAL UTILITY FUNCTIONS

  getDatasetUsage: async (datasetId: string): Promise<{
    success: boolean;
    usage: {
      charts_using: Array<{ id: string; name: string; dashboard_id?: string }>;
      dashboards_using: Array<{ id: string; name: string }>;
      transformations_using: Array<{ id: string; name: string }>;
      total_dependencies: number;
      can_delete: boolean;
      deletion_blockers?: string[];
    };
    message?: string;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}/usage`);
    return response.data;
  },

  exportDataset: async (datasetId: string, options: {
    format: 'csv' | 'xlsx' | 'json' | 'parquet';
    include_headers?: boolean;
    limit?: number;
    filters?: any[];
    columns?: string[];
  }): Promise<{
    success: boolean;
    export: {
      export_id: string;
      format: string;
      file_path?: string;
      download_url?: string;
      file_size_bytes?: number;
      row_count: number;
      status: 'processing' | 'completed' | 'failed';
      created_at: Date;
    };
    message?: string;
  }> => {
    const response = await apiClient.post(`/datasets/${datasetId}/export`, options);
    return response.data;
  },

  getDatasetHistory: async (datasetId: string, params?: {
    limit?: number;
    offset?: number;
    action_type?: string;
  }): Promise<{
    success: boolean;
    history: Array<{
      id: string;
      action_type: 'created' | 'updated' | 'refreshed' | 'queried' | 'exported';
      user_id: string;
      user_name: string;
      timestamp: Date;
      details: any;
      execution_time_ms?: number;
    }>;
    total: number;
    message?: string;
  }> => {
    let endpoint = `/datasets/${datasetId}/history`;
    
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

  updateDatasetSchema: async (datasetId: string, schema: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    primaryKey?: boolean;
    description?: string;
  }>): Promise<{
    success: boolean;
    schema: any;
    message: string;
  }> => {
    const response = await apiClient.put(`/datasets/${datasetId}/schema`, { schema });
    return response.data;
  },

  // 📊 DATASET PERFORMANCE MONITORING

  getDatasetPerformanceMetrics: async (datasetId: string, params?: {
    start_date?: string;
    end_date?: string;
    granularity?: 'hour' | 'day' | 'week';
  }): Promise<{
    success: boolean;
    metrics: {
      query_performance: Array<{
        timestamp: Date;
        avg_execution_time_ms: number;
        query_count: number;
        cache_hit_rate: number;
      }>;
      usage_patterns: {
        peak_usage_hours: number[];
        most_accessed_columns: string[];
        common_filter_patterns: any[];
      };
      resource_usage: {
        avg_memory_usage_mb: number;
        avg_cpu_usage_percent: number;
        total_data_transferred_mb: number;
      };
    };
    message?: string;
  }> => {
    let endpoint = `/datasets/${datasetId}/metrics`;
    
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
  }
};