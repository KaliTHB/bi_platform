// File: web-application/src/types/api-responses.types.ts

import { Dataset, DatasetSchema } from './dataset.types';

// ============================================================================
// Dataset API Response Types
// ============================================================================

export interface DatasetListResponse {
  success: boolean;
  datasets: Dataset[];
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DatasetResponse {
  success: boolean;
  dataset: Dataset;
  message?: string;
}

export interface DatasetSchemaResponse {
  success: boolean;
  schema: DatasetSchema;
  message?: string;
}

export interface DatasetQueryResponse {
  success: boolean;
  data: any[];
  columns: Array<{ 
    name: string; 
    type: string;
    display_name?: string;
  }>;
  total_rows: number;
  execution_time: number;
  cached: boolean;
  message?: string;
}

export interface DatasetTestResponse {
  success: boolean;
  preview?: any[];
  columns?: Array<{ name: string; type: string }>;
  execution_time?: number;
  error?: string;
  message?: string;
}

export interface DatasetCreateResponse {
  success: boolean;
  dataset: Dataset;
  message: string;
}

export interface DatasetUpdateResponse {
  success: boolean;
  dataset: Dataset;
  message: string;
}

export interface DatasetDeleteResponse {
  success: boolean;
  message: string;
}


// ============================================================================
// Dashboard API Response Types
// ============================================================================

export interface DashboardListResponse {
  success: boolean;
  dashboards: any[];
  message?: string;
}

export interface DashboardResponse {
  success: boolean;
  dashboard: any;
  message?: string;
}

// ============================================================================
// Chart API Response Types
// ============================================================================

export interface ChartListResponse {
  success: boolean;
  charts: any[];
  message?: string;
}

export interface ChartResponse {
  success: boolean;
  chart: any;
  message?: string;
}

// ============================================================================
// Workspace API Response Types
// ============================================================================

export interface WorkspaceListResponse {
  success: boolean;
  workspaces: any[];
  message?: string;
}

export interface WorkspaceResponse {
  success: boolean;
  workspace: any;
  message?: string;
}

// ============================================================================
// Generic API Response Types
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Type Guards for API Responses
// ============================================================================

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

export function isDatasetResponse(response: any): response is DatasetResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         'dataset' in response;
}

export function isDatasetSchemaResponse(response: any): response is DatasetSchemaResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         'schema' in response;
}

export function isDatasetQueryResponse(response: any): response is DatasetQueryResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         'data' in response &&
         'columns' in response;
}

// ============================================================================
// Helper Functions for Safe Response Handling
// ============================================================================

export function extractDatasetFromResponse(response: DatasetResponse): Dataset {
  if (!isDatasetResponse(response)) {
    throw new Error('Invalid dataset response format');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'Dataset request failed');
  }
  
  return response.dataset;
}

export function extractSchemaFromResponse(response: DatasetSchemaResponse): DatasetSchema {
  if (!isDatasetSchemaResponse(response)) {
    throw new Error('Invalid schema response format');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'Schema request failed');
  }
  
  return response.schema;
}

export function extractQueryDataFromResponse(response: DatasetQueryResponse): any[] {
  if (!isDatasetQueryResponse(response)) {
    throw new Error('Invalid query response format');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'Query request failed');
  }
  
  return response.data;
}

export interface BackendApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}