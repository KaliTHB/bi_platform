// File: web-application/src/constants/api.ts
// API-related constants and configurations

// ========================================
// BASE CONFIGURATION
// ========================================
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// ========================================
// ENDPOINT DEFINITIONS
// ========================================
export const API_ENDPOINTS = {
  // Authentication & User Management
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    UPDATE_PROFILE: '/api/auth/update-profile',
  },
  
  // Workspace Management
  WORKSPACES: {
    LIST: '/api/user/workspaces',
    CREATE: '/api/workspace/create',
    GET: (id: string) => `/api/workspace/${id}`,
    UPDATE: (id: string) => `/api/workspace/${id}`,
    DELETE: (id: string) => `/api/workspace/${id}`,
    SWITCH: '/api/workspace/switch',
    INVITE: (id: string) => `/api/workspace/${id}/invite`,
    MEMBERS: (id: string) => `/api/workspace/${id}/members`,
    ROLES: (id: string) => `/api/workspace/${id}/roles`,
    PERMISSIONS: (id: string) => `/api/workspace/${id}/permissions`,
  },
  
  // Data Sources Management
  DATA_SOURCES: {
    LIST: '/api/datasources',
    CREATE: '/api/datasources',
    GET: (id: string) => `/api/datasources/${id}`,
    UPDATE: (id: string) => `/api/datasources/${id}`,
    DELETE: (id: string) => `/api/datasources/${id}`,
    TEST: (id: string) => `/api/datasources/${id}/test`,
    SCHEMA: (id: string) => `/api/datasources/${id}/schema`,
    PREVIEW: (id: string) => `/api/datasources/${id}/preview`,
    PLUGINS: '/api/datasources/plugins',
    CATEGORIES: '/api/datasources/categories',
  },
  
  // Dataset Management
  DATASETS: {
    LIST: '/api/datasets',
    CREATE: '/api/datasets',
    GET: (id: string) => `/api/datasets/${id}`,
    UPDATE: (id: string) => `/api/datasets/${id}`,
    DELETE: (id: string) => `/api/datasets/${id}`,
    PREVIEW: (id: string) => `/api/datasets/${id}/preview`,
    EXECUTE: (id: string) => `/api/datasets/${id}/execute`,
    METADATA: (id: string) => `/api/datasets/${id}/metadata`,
    HISTORY: (id: string) => `/api/datasets/${id}/history`,
  },
  
  // Dashboard Management
  DASHBOARDS: {
    LIST: '/api/dashboards',
    CREATE: '/api/dashboards',
    GET: (id: string) => `/api/dashboards/${id}`,
    UPDATE: (id: string) => `/api/dashboards/${id}`,
    DELETE: (id: string) => `/api/dashboards/${id}`,
    DUPLICATE: (id: string) => `/api/dashboards/${id}/duplicate`,
    SHARE: (id: string) => `/api/dashboards/${id}/share`,
    EXPORT: (id: string) => `/api/dashboards/${id}/export`,
    EMBED: (id: string) => `/api/dashboards/${id}/embed`,
    VERSIONS: (id: string) => `/api/dashboards/${id}/versions`,
  },
  
  // Widget/Chart Management
  WIDGETS: {
    LIST: (dashboardId: string) => `/api/dashboards/${dashboardId}/widgets`,
    CREATE: (dashboardId: string) => `/api/dashboards/${dashboardId}/widgets`,
    GET: (dashboardId: string, widgetId: string) => `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
    UPDATE: (dashboardId: string, widgetId: string) => `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
    DELETE: (dashboardId: string, widgetId: string) => `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
    MOVE: (dashboardId: string) => `/api/dashboards/${dashboardId}/widgets/move`,
    RESIZE: (dashboardId: string) => `/api/dashboards/${dashboardId}/widgets/resize`,
  },
  
  // File Management
  FILES: {
    UPLOAD: '/api/files/upload',
    DOWNLOAD: (id: string) => `/api/files/${id}/download`,
    DELETE: (id: string) => `/api/files/${id}`,
    METADATA: (id: string) => `/api/files/${id}/metadata`,
    LIST: '/api/files',
    PREVIEW: (id: string) => `/api/files/${id}/preview`,
  },
  
  // Export & Import
  EXPORT: {
    DASHBOARD: (id: string, format: string) => `/api/export/dashboard/${id}/${format}`,
    DATASET: (id: string, format: string) => `/api/export/dataset/${id}/${format}`,
    WORKSPACE: (id: string) => `/api/export/workspace/${id}`,
  },
  
  IMPORT: {
    DASHBOARD: '/api/import/dashboard',
    DATASET: '/api/import/dataset',
    WORKSPACE: '/api/import/workspace',
  },
  
  // Analytics & Monitoring
  ANALYTICS: {
    USAGE: '/api/analytics/usage',
    PERFORMANCE: '/api/analytics/performance',
    USER_ACTIVITY: '/api/analytics/user-activity',
    DASHBOARD_VIEWS: (id: string) => `/api/analytics/dashboard/${id}/views`,
    POPULAR_DASHBOARDS: '/api/analytics/popular-dashboards',
  },
  
  // System & Health
  SYSTEM: {
    HEALTH: '/api/system/health',
    STATUS: '/api/system/status',
    VERSION: '/api/system/version',
    METRICS: '/api/system/metrics',
    LOGS: '/api/system/logs',
  },
} as const;

// ========================================
// HTTP METHODS
// ========================================
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// ========================================
// HTTP STATUS CODES
// ========================================
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ========================================
// REQUEST HEADERS
// ========================================
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  USER_AGENT: 'User-Agent',
  CACHE_CONTROL: 'Cache-Control',
  IF_NONE_MATCH: 'If-None-Match',
  X_REQUEST_ID: 'X-Request-ID',
  X_WORKSPACE_ID: 'X-Workspace-ID',
} as const;

// ========================================
// CONTENT TYPES
// ========================================
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
} as const;

// ========================================
// CACHE STRATEGIES
// ========================================
export const CACHE_STRATEGIES = {
  NO_CACHE: 'no-cache',
  NO_STORE: 'no-store',
  MUST_REVALIDATE: 'must-revalidate',
  MAX_AGE: (seconds: number) => `max-age=${seconds}`,
  STALE_WHILE_REVALIDATE: (stale: number, revalidate: number) => 
    `max-age=${stale}, stale-while-revalidate=${revalidate}`,
} as const;

// ========================================
// ERROR TYPES
// ========================================
export const API_ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ========================================
// RETRY STRATEGIES
// ========================================
export const RETRY_STRATEGIES = {
  EXPONENTIAL_BACKOFF: 'exponential_backoff',
  LINEAR_BACKOFF: 'linear_backoff',
  FIXED_DELAY: 'fixed_delay',
  NO_RETRY: 'no_retry',
} as const;

// ========================================
// TYPE EXPORTS
// ========================================
export type ApiEndpoint = typeof API_ENDPOINTS;
export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
export type ApiErrorType = typeof API_ERROR_TYPES[keyof typeof API_ERROR_TYPES];