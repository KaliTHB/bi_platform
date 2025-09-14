// File: web-application/src/constants/api.ts
// Complete API-related constants and configurations

// ========================================
// BASE CONFIGURATION
// ========================================
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Request/Response Configuration
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Pagination Defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Cache Configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  STALE_TIME: 2 * 60 * 1000, // 2 minutes
} as const;

// ========================================
// COMPLETE ENDPOINT DEFINITIONS
// ========================================
export const API_ENDPOINTS = {
  // Authentication & User Management
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    UPDATE_PROFILE: '/auth/update-profile',
    VERIFY_TOKEN: '/auth/verify',
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile',
    DEFAULT_WORKSPACE: '/user/default-workspace',
    WORKSPACES: '/user/workspaces',
    GET: (id: string) => `/user/${id}`,
    UPDATE: (id: string) => `/user/${id}`,
    DELETE: (id: string) => `/user/${id}`,
    PREFERENCES: '/user/preferences',
    AVATAR: '/user/avatar',
  },
  
  // Workspace Management
  WORKSPACES: {
    LIST: '/user/workspaces',
    CREATE: '/workspace/create',
    GET: (id: string) => `/workspace/${id}`,
    UPDATE: (id: string) => `/workspace/${id}`,
    DELETE: (id: string) => `/workspace/${id}`,
    SWITCH: '/workspace/switch',
    INVITE: (id: string) => `/workspace/${id}/invite`,
    MEMBERS: (id: string) => `/workspace/${id}/members`,
    ROLES: (id: string) => `/workspace/${id}/roles`,
    PERMISSIONS: (id: string) => `/workspace/${id}/permissions`,
    SETTINGS: (id: string) => `/workspace/${id}/settings`,
    LEAVE: (id: string) => `/workspace/${id}/leave`,
  },
  
  // Data Sources Management
  DATA_SOURCES: {
    LIST: '/datasources',
    CREATE: '/datasources',
    GET: (id: string) => `/datasources/${id}`,
    UPDATE: (id: string) => `/datasources/${id}`,
    DELETE: (id: string) => `/datasources/${id}`,
    TEST: (id: string) => `/datasources/${id}/test`,
    SCHEMA: (id: string) => `/datasources/${id}/schema`,
    PREVIEW: (id: string) => `/datasources/${id}/preview`,
    TABLES: (id: string) => `/datasources/${id}/tables`,
    COLUMNS: (id: string) => `/datasources/${id}/columns`,
    PLUGINS: '/datasources/plugins',
    CATEGORIES: '/datasources/categories',
  },
  
  // Dataset Management
  DATASETS: {
    LIST: '/datasets',
    CREATE: '/datasets',
    GET: (id: string) => `/datasets/${id}`,
    UPDATE: (id: string) => `/datasets/${id}`,
    DELETE: (id: string) => `/datasets/${id}`,
    EXECUTE: (id: string) => `/datasets/${id}/execute`,
    PREVIEW: (id: string) => `/datasets/${id}/preview`,
    VALIDATE: (id: string) => `/datasets/${id}/validate`,
    DUPLICATE: (id: string) => `/datasets/${id}/duplicate`,
    EXPORT: (id: string) => `/datasets/${id}/export`,
    TRANSFORMATIONS: (id: string) => `/datasets/${id}/transformations`,
    CACHE_REFRESH: (id: string) => `/datasets/${id}/cache/refresh`,
  },
  
  // Dashboard Management
  DASHBOARDS: {
    LIST: '/dashboards',
    CREATE: '/dashboards',
    GET: (id: string) => `/dashboards/${id}`,
    UPDATE: (id: string) => `/dashboards/${id}`,
    DELETE: (id: string) => `/dashboards/${id}`,
    DUPLICATE: (id: string) => `/dashboards/${id}/duplicate`,
    SHARE: '/dashboards/share',
    UNSHARE: (id: string) => `/dashboards/${id}/unshare`,
    PUBLIC: (slug: string) => `/dashboards/public/${slug}`,
    EXPORT: (id: string) => `/dashboards/${id}/export`,
    PUBLISH: (id: string) => `/dashboards/${id}/publish`,
    UNPUBLISH: (id: string) => `/dashboards/${id}/unpublish`,
    FAVORITES: '/dashboards/favorites',
    ADD_FAVORITE: (id: string) => `/dashboards/${id}/favorite`,
    REMOVE_FAVORITE: (id: string) => `/dashboards/${id}/unfavorite`,
    RECENT: '/dashboards/recent',
    FILTERS: (id: string) => `/dashboards/${id}/filters`,
    LAYOUT: (id: string) => `/dashboards/${id}/layout`,
  },
  
  // Chart Management
  CHARTS: {
    LIST: '/charts',
    CREATE: '/charts',
    GET: (id: string) => `/charts/${id}`,
    UPDATE: (id: string) => `/charts/${id}`,
    DELETE: (id: string) => `/charts/${id}`,
    DATA: (id: string) => `/charts/${id}/data`,
    PREVIEW: '/charts/preview',
    DUPLICATE: (id: string) => `/charts/${id}/duplicate`,
    EXPORT: (id: string) => `/charts/${id}/export`,
    TYPES: '/charts/types',
    TEMPLATES: '/charts/templates',
    VALIDATE: (id: string) => `/charts/${id}/validate`,
    REFRESH: (id: string) => `/charts/${id}/refresh`,
  },
  
  // Category Management
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    GET: (id: string) => `/categories/${id}`,
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
    REORDER: '/categories/reorder',
    DASHBOARDS: (id: string) => `/categories/${id}/dashboards`,
    MOVE_DASHBOARD: (id: string) => `/categories/${id}/move-dashboard`,
  },
  
  // Plugin Management
  PLUGINS: {
    LIST: '/plugins',
    CONFIGURE: '/plugins/configure',
    GET: (id: string) => `/plugins/${id}`,
    UPDATE: (id: string) => `/plugins/${id}`,
    ENABLE: (id: string) => `/plugins/${id}/enable`,
    DISABLE: (id: string) => `/plugins/${id}/disable`,
    INSTALL: '/plugins/install',
    UNINSTALL: (id: string) => `/plugins/${id}/uninstall`,
    MARKETPLACE: '/plugins/marketplace',
    CONFIGURATION: (id: string) => `/plugins/${id}/configuration`,
  },
  
  // Role & Permission Management
  ROLES: {
    LIST: '/roles',
    CREATE: '/roles',
    GET: (id: string) => `/roles/${id}`,
    UPDATE: (id: string) => `/roles/${id}`,
    DELETE: (id: string) => `/roles/${id}`,
    PERMISSIONS: (id: string) => `/roles/${id}/permissions`,
    USERS: (id: string) => `/roles/${id}/users`,
  },
  
  PERMISSIONS: {
    LIST: '/permissions',
    CHECK: '/permissions/check',
    USER_PERMISSIONS: (userId: string) => `/permissions/user/${userId}`,
    WORKSPACE_PERMISSIONS: (workspaceId: string) => `/permissions/workspace/${workspaceId}`,
  },
  
  // Export & Import
  EXPORT: {
    DASHBOARD: (id: string) => `/export/dashboard/${id}`,
    CHART: (id: string) => `/export/chart/${id}`,
    DATASET: (id: string) => `/export/dataset/${id}`,
    WORKSPACE: '/export/workspace',
    BULK: '/export/bulk',
  },
  
  IMPORT: {
    DASHBOARD: '/import/dashboard',
    CHART: '/import/chart',
    DATASET: '/import/dataset',
    WORKSPACE: '/import/workspace',
    VALIDATE: '/import/validate',
  },
  
  // System & Health
  SYSTEM: {
    HEALTH: '/system/health',
    STATUS: '/system/status',
    VERSION: '/system/version',
    METRICS: '/system/metrics',
    LOGS: '/system/logs',
    CACHE: '/system/cache',
    CLEAR_CACHE: '/system/cache/clear',
  },
  
  // WebView Panel
  WEBVIEW: {
    CATEGORIES: '/webview/categories',
    DASHBOARDS: (categoryId?: string) => 
      categoryId ? `/webview/dashboards?category=${categoryId}` : '/webview/dashboards',
    DASHBOARD: (id: string) => `/webview/dashboard/${id}`,
    NAVIGATION: '/webview/navigation',
    SEARCH: '/webview/search',
    RECENT: '/webview/recent',
    FAVORITES: '/webview/favorites',
  },
  
  // Analytics & Audit
  ANALYTICS: {
    USAGE: '/analytics/usage',
    DASHBOARD_VIEWS: '/analytics/dashboard-views',
    USER_ACTIVITY: '/analytics/user-activity',
    PERFORMANCE: '/analytics/performance',
    REPORTS: '/analytics/reports',
  },
  
  AUDIT: {
    LOGS: '/audit/logs',
    USER_ACTIONS: (userId: string) => `/audit/user/${userId}`,
    WORKSPACE_ACTIONS: (workspaceId: string) => `/audit/workspace/${workspaceId}`,
    EXPORT_LOGS: '/audit/export',
  },
} as const;

// ========================================
// HTTP STATUS CODES
// ========================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ========================================
// REQUEST METHODS
// ========================================
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const;

// ========================================
// CONTENT TYPES
// ========================================
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html',
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
  IMAGE: 'image/*',
} as const;

// ========================================
// API ERROR CODES
// ========================================
export const API_ERROR_CODES = {
  // Authentication Errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Authorization Errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  
  // Validation Errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT',
  
  // Resource Errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  
  // System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

// ========================================
// TYPE EXPORTS
// ========================================
export type ApiEndpoint = keyof typeof API_ENDPOINTS;
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];
export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Build full API URL from endpoint path
 */
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

/**
 * Get API endpoint with parameters
 */
export const getEndpoint = (
  category: keyof typeof API_ENDPOINTS,
  action: string,
  params?: string | string[]
): string => {
  const endpoints = API_ENDPOINTS[category] as any;
  const endpoint = endpoints[action];
  
  if (typeof endpoint === 'function') {
    if (Array.isArray(params)) {
      return endpoint(...params);
    } else if (params) {
      return endpoint(params);
    } else {
      throw new Error(`Endpoint ${category}.${action} requires parameters`);
    }
  }
  
  return endpoint;
};

/**
 * Check if status code indicates success
 */
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * Check if status code indicates client error
 */
export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

/**
 * Check if status code indicates server error
 */
export const isServerError = (status: number): boolean => {
  return status >= 500;
};

// Export everything as default for convenience
export default {
  API_CONFIG,
  API_ENDPOINTS,
  HTTP_STATUS,
  HTTP_METHODS,
  CONTENT_TYPES,
  API_ERROR_CODES,
  buildApiUrl,
  getEndpoint,
  isSuccessStatus,
  isClientError,
  isServerError,
};