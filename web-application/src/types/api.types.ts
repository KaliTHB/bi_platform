// File: web-application/src/types/api.types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  metadata?: ResponseMetadata;
  errors?: ApiError[];
}

export interface ResponseMetadata {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  execution_time?: number;
  version?: string;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, any>;
}

export interface DateRange {
  start: string;
  end: string;
}
