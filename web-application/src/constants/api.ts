// web-application/src/constants/api.ts
// Complete API-related constants and configurations

// ========================================
// BASE CONFIGURATION
// ========================================
const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const API_CONFIG = {
  // ✅ FIXED: Ensure correct API base URL with /api prefix
  BASE_URL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Request/Response Configuration
  DEFAULT_HEADERS: HEADERS ,
  
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
    SWITCH_WORKSPACE: '/auth/switch-workspace', // ✅ Added missing endpoint
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile',
    DEFAULT_WORKSPACE: '/user/default-workspace',
    WORKSPACES: '/user/workspaces', // ✅ This is the correct endpoint for user workspaces
    GET: (id: string) => `/user/${id}`,
    UPDATE: (id: string) => `/user/${id}`,
    DELETE: (id: string) => `/user/${id}`,
    PREFERENCES: '/user/preferences',
    AVATAR: '/user/avatar',
  },
  
  // Workspace Management
  WORKSPACES: {
    LIST: '/workspaces', // ✅ FIXED: Direct workspace endpoint
    CREATE: '/workspaces',
    SWITCH: '/workspaces/switch',
    GET: (id: string) => `/workspaces/${id}`,
    UPDATE: (id: string) => `/workspaces/${id}`,
    DELETE: (id: string) => `/workspaces/${id}`,
    MEMBERS: (id: string) => `/workspaces/${id}/members`,
    INVITE: (id: string) => `/workspaces/${id}/invite`,
    SETTINGS: (id: string) => `/workspaces/${id}/settings`,
    STATS: (id: string) => `/workspaces/${id}/stats`,
    EXPORT: (id: string) => `/workspaces/${id}/export`,
  },
  
  // Dataset Management
  DATASETS: {
    LIST: '/datasets',
    CREATE: '/datasets',
    GET: (id: string) => `/datasets/${id}`,
    UPDATE: (id: string) => `/datasets/${id}`,
    DELETE: (id: string) => `/datasets/${id}`,
    PREVIEW: (id: string) => `/datasets/${id}/preview`,
    SCHEMA: (id: string) => `/datasets/${id}/schema`,
    EXPORT: (id: string) => `/datasets/${id}/export`,
    QUERY: (id: string) => `/datasets/${id}/query`,
    REFRESH: (id: string) => `/datasets/${id}/refresh`,
  },
  
  // Dashboard Management
  DASHBOARDS: {
    LIST: '/dashboards',
    CREATE: '/dashboards',
    GET: (id: string) => `/dashboards/${id}`,
    UPDATE: (id: string) => `/dashboards/${id}`,
    DELETE: (id: string) => `/dashboards/${id}`,
    CLONE: (id: string) => `/dashboards/${id}/clone`,
    SHARE: (id: string) => `/dashboards/${id}/share`,
    EXPORT: (id: string) => `/dashboards/${id}/export`,
    WIDGETS: (id: string) => `/dashboards/${id}/widgets`,
  },
  
  // Chart/Widget Management
  CHARTS: {
    LIST: '/charts',
    CREATE: '/charts',
    GET: (id: string) => `/charts/${id}`,
    UPDATE: (id: string) => `/charts/${id}`,
    DELETE: (id: string) => `/charts/${id}`,
    DATA: (id: string) => `/charts/${id}/data`,
    REFRESH: (id: string) => `/charts/${id}/refresh`,
    EXPORT: (id: string) => `/charts/${id}/export`,
  },
  
  // Data Source Management
  DATASOURCES: {
    LIST: '/datasources',
    CREATE: '/datasources',
    GET: (id: string) => `/datasources/${id}`,
    UPDATE: (id: string) => `/datasources/${id}`,
    DELETE: (id: string) => `/datasources/${id}`,
    TEST: '/datasources/test',
    SCHEMA: (id: string) => `/datasources/${id}/schema`,
    QUERY: (id: string) => `/datasources/${id}/query`,
    TABLES: (id: string) => `/datasources/${id}/tables`,
  },
  
  // Plugin Management
  PLUGINS: {
    LIST: '/plugins',
    GET: (name: string) => `/plugins/${name}`,
    INSTALL: '/plugins/install',
    UNINSTALL: (name: string) => `/plugins/${name}/uninstall`,
    UPDATE: (name: string) => `/plugins/${name}/update`,
    CONFIG: (name: string) => `/plugins/${name}/config`,
    STATUS: (name: string) => `/plugins/${name}/status`,
  },
  
  // File Management
  FILES: {
    UPLOAD: '/files/upload',
    GET: (id: string) => `/files/${id}`,
    DELETE: (id: string) => `/files/${id}`,
    LIST: '/files',
    DOWNLOAD: (id: string) => `/files/${id}/download`,
  },
  
  // Notification Management
  NOTIFICATIONS: {
    LIST: '/notifications',
    GET: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id: string) => `/notifications/${id}`,
    SETTINGS: '/notifications/settings',
  },
  
  // Admin Management
  ADMIN: {
    USERS: '/admin/users',
    WORKSPACES: '/admin/workspaces',
    SYSTEM: '/admin/system',
    SETTINGS: '/admin/settings',
    LOGS: '/admin/logs',
    STATS: '/admin/stats',
    BACKUP: '/admin/backup',
    RESTORE: '/admin/restore',
  },
  
  // Health & Monitoring
  HEALTH: '/health',
  METRICS: '/metrics',
  VERSION: '/version',
  STATUS: '/status',
  
} as const;

// ========================================
// API UTILITY FUNCTIONS
// ========================================

// Build full API URL
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Build query string from parameters
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
};

// Get authorization headers
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers = { ...API_CONFIG.DEFAULT_HEADERS };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Create fetch configuration
export const createFetchConfig = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  data?: any,
  token?: string,
  customHeaders?: Record<string, string>
): RequestInit => {
  const config: RequestInit = {
    method,
    headers: {
      ...getAuthHeaders(token),
      ...customHeaders,
    },
  };
  
  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, browser will set it with boundary
      delete (config.headers as any)['Content-Type'];
      config.body = data;
    } else {
      config.body = JSON.stringify(data);
    }
  }
  
  return config;
};

// ========================================
// ERROR HANDLING
// ========================================

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  statusCode?: number;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// ========================================
// HTTP METHODS
// ========================================
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
  CONNECT: 'CONNECT',
  TRACE: 'TRACE',
} as const;

export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];

// ========================================
// HTTP STATUS CODES
// ========================================
export const HTTP_STATUS = {
  // 1xx Informational responses
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  // 2xx Success responses
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTI_STATUS: 207,
  ALREADY_REPORTED: 208,
  IM_USED: 226,

  // 3xx Redirection messages
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  USE_PROXY: 305,
  SWITCH_PROXY: 306,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  // 4xx Client error responses
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  IM_A_TEAPOT: 418,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  // 5xx Server error responses
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NOT_EXTENDED: 510,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// ========================================
// HTTP STATUS CODE RANGES
// ========================================
export const HTTP_STATUS_RANGES = {
  INFORMATIONAL: {
    min: 100,
    max: 199
  },
  SUCCESS: {
    min: 200,
    max: 299
  },
  REDIRECTION: {
    min: 300,
    max: 399
  },
  CLIENT_ERROR: {
    min: 400,
    max: 499
  },
  SERVER_ERROR: {
    min: 500,
    max: 599
  }
} as const;

export type HttpStatusRange = typeof HTTP_STATUS_RANGES[keyof typeof HTTP_STATUS_RANGES];

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if status code indicates success (2xx)
 */
export const isSuccessStatus = (status: number): boolean => {
  return status >= HTTP_STATUS_RANGES.SUCCESS.min && status <= HTTP_STATUS_RANGES.SUCCESS.max;
};

/**
 * Check if status code indicates informational (1xx)
 */
export const isInformationalStatus = (status: number): boolean => {
  return status >= HTTP_STATUS_RANGES.INFORMATIONAL.min && status <= HTTP_STATUS_RANGES.INFORMATIONAL.max;
};

/**
 * Check if status code indicates redirection (3xx)
 */
export const isRedirectionStatus = (status: number): boolean => {
  return status >= HTTP_STATUS_RANGES.REDIRECTION.min && status <= HTTP_STATUS_RANGES.REDIRECTION.max;
};

/**
 * Check if status code indicates client error (4xx)
 */
export const isClientError = (status: number): boolean => {
  return status >= HTTP_STATUS_RANGES.CLIENT_ERROR.min && status <= HTTP_STATUS_RANGES.CLIENT_ERROR.max;
};

/**
 * Check if status code indicates server error (5xx)
 */
export const isServerError = (status: number): boolean => {
  return status >= HTTP_STATUS_RANGES.SERVER_ERROR.min && status <= HTTP_STATUS_RANGES.SERVER_ERROR.max;
};

/**
 * Check if status code indicates any error (4xx or 5xx)
 */
export const isErrorStatus = (status: number): boolean => {
  return isClientError(status) || isServerError(status);
};

/**
 * Get status code category name
 */
export const getStatusCategory = (status: number): string => {
  if (isInformationalStatus(status)) return 'Informational';
  if (isSuccessStatus(status)) return 'Success';
  if (isRedirectionStatus(status)) return 'Redirection';
  if (isClientError(status)) return 'Client Error';
  if (isServerError(status)) return 'Server Error';
  return 'Unknown';
};

/**
 * Get human-readable status message
 */
export const getStatusMessage = (status: number): string => {
  const statusMap: Record<number, string> = {
    // 2xx Success
    [HTTP_STATUS.OK]: 'OK',
    [HTTP_STATUS.CREATED]: 'Created',
    [HTTP_STATUS.ACCEPTED]: 'Accepted',
    [HTTP_STATUS.NO_CONTENT]: 'No Content',

    // 4xx Client Error
    [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
    [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
    [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
    [HTTP_STATUS.NOT_FOUND]: 'Not Found',
    [HTTP_STATUS.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
    [HTTP_STATUS.CONFLICT]: 'Conflict',
    [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too Many Requests',

    // 5xx Server Error
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    [HTTP_STATUS.NOT_IMPLEMENTED]: 'Not Implemented',
    [HTTP_STATUS.BAD_GATEWAY]: 'Bad Gateway',
    [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    [HTTP_STATUS.GATEWAY_TIMEOUT]: 'Gateway Timeout',
  };

  return statusMap[status] || `HTTP ${status}`;
};

// ========================================
// COMMON STATUS CODE GROUPS
// ========================================
export const COMMON_SUCCESS_CODES = [
  HTTP_STATUS.OK,
  HTTP_STATUS.CREATED,
  HTTP_STATUS.ACCEPTED,
  HTTP_STATUS.NO_CONTENT,
] as const;

export const COMMON_CLIENT_ERROR_CODES = [
  HTTP_STATUS.BAD_REQUEST,
  HTTP_STATUS.UNAUTHORIZED,
  HTTP_STATUS.FORBIDDEN,
  HTTP_STATUS.NOT_FOUND,
  HTTP_STATUS.METHOD_NOT_ALLOWED,
  HTTP_STATUS.CONFLICT,
  HTTP_STATUS.UNPROCESSABLE_ENTITY,
  HTTP_STATUS.TOO_MANY_REQUESTS,
] as const;

export const COMMON_SERVER_ERROR_CODES = [
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.NOT_IMPLEMENTED,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
] as const;

// ========================================
// RETRY-ABLE STATUS CODES
// ========================================
export const RETRYABLE_STATUS_CODES = [
  HTTP_STATUS.REQUEST_TIMEOUT,
  HTTP_STATUS.TOO_MANY_REQUESTS,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
] as const;

/**
 * Check if a status code is retryable
 */
export const isRetryableStatus = (status: number): boolean => {
  return RETRYABLE_STATUS_CODES.includes(status as any);
};


// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

export const ENV_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  VERSION: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
} as const;

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  API_CONFIG,
  API_ENDPOINTS,
  buildApiUrl,
  buildQueryString,
  getAuthHeaders,
  createFetchConfig,
  ENV_CONFIG,
};