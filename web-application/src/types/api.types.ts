// web-application/src/types/api.types.ts

// Generic API response structure with success property
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: ApiError[];
  meta?: ResponseMetadata;
}

export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Alternative response structure for some APIs
export interface SimpleApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Paginated response structure
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message?: string;
}

// Response metadata
export interface ResponseMetadata {
  timestamp: string;
  request_id: string;
  version: string;
  execution_time_ms: number;
  cached?: boolean;
  cache_ttl?: number;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  path?: string;
}

export interface ValidationError extends ApiError {
  field: string;
  value: any;
  constraint?: string;
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Request configuration
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheConfig;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: 'fixed' | 'exponential';
  condition?: (error: any) => boolean;
}

export interface CacheConfig {
  ttl: number;
  key?: string;
  tags?: string[];
}

// API client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  auth?: AuthConfig;
  retry?: RetryConfig;
  interceptors?: {
    request?: Array<(config: RequestConfig) => RequestConfig>;
    response?: Array<(response: any) => any>;
    error?: Array<(error: any) => any>;
  };
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api_key';
  token?: string;
  username?: string;
  password?: string;
  api_key?: string;
  header?: string;
}

// Query parameters for list endpoints
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
  include?: string[];
  exclude?: string[];
}

// Bulk operation types
export interface BulkOperation<T = any> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
}

export interface BulkOperationResult<T = any> {
  success_count: number;
  error_count: number;
  results: Array<{
    success: boolean;
    item: T;
    error?: ApiError;
  }>;
}

// Upload types
export interface UploadConfig {
  max_size: number;
  allowed_types: string[];
  multiple: boolean;
  directory?: string;
}

export interface UploadResult {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
  thumbnail_url?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  workspace_id: string;
  user_id?: string;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// Rate limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
}

// Health check response
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, ComponentHealth>;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  response_time_ms?: number;
}

// API versioning
export interface ApiVersion {
  version: string;
  supported: boolean;
  deprecated: boolean;
  sunset_date?: string;
  migration_guide?: string;
}

// Request/Response logging
export interface RequestLog {
  id: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
  user_id?: string;
  workspace_id?: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

export interface ResponseLog {
  request_id: string;
  status_code: number;
  headers: Record<string, string>;
  body?: any;
  response_time_ms: number;
  cached: boolean;
  timestamp: string;
}

// API quota and usage
export interface ApiQuota {
  requests_per_hour: number;
  requests_per_day: number;
  requests_per_month: number;
  data_transfer_mb: number;
  storage_mb: number;
}

export interface ApiUsage {
  period: 'hour' | 'day' | 'month';
  requests_used: number;
  requests_limit: number;
  data_transfer_used_mb: number;
  data_transfer_limit_mb: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  reset_at: string;
}