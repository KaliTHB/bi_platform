// web-application/src/constants/index.ts
// Centralized constants file for the application

// ========================================
// STORAGE KEYS
// ========================================

export const STORAGE_KEYS = {
  // Authentication
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  TOKEN_EXPIRY: 'token_expiry',
  PERMISSIONS: 'user_permissions',
  
  // Workspace
  CURRENT_WORKSPACE: 'current_workspace',
  AVAILABLE_WORKSPACES: 'available_workspaces',
  WORKSPACE_PERMISSIONS: 'workspace_permissions',
  
  // UI State
  THEME: 'app_theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  DASHBOARD_LAYOUT: 'dashboard_layout',
  
  // Preferences
  USER_PREFERENCES: 'user_preferences',
  NOTIFICATION_SETTINGS: 'notification_settings',
  
  // Cache
  API_CACHE: 'api_cache',
  PERMISSION_CACHE: 'permission_cache',
} as const;

// ========================================
// API CONFIGURATION
// ========================================

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Request headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // API versions
  VERSION: 'v1',
  
  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    BURST_LIMIT: 10,
  }
} as const;

// ========================================
// API ENDPOINTS
// ========================================

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    CHANGE_PASSWORD: '/auth/change-password',
    
    // Permission endpoints
    PERMISSIONS: '/auth/permissions',
    REFRESH_PERMISSIONS: '/auth/permissions/refresh',
    CHECK_PERMISSIONS: '/auth/permissions/check',
    
    // Profile endpoints
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile/update',
  },
  
  // Workspace endpoints
  WORKSPACE: {
    LIST: '/workspaces',
    CREATE: '/workspaces',
    GET: '/workspaces/:id',
    UPDATE: '/workspaces/:id',
    DELETE: '/workspaces/:id',
    SWITCH: '/workspaces/switch',
    INVITE: '/workspaces/:id/invite',
    MEMBERS: '/workspaces/:id/members',
    SETTINGS: '/workspaces/:id/settings',
  },
  
  // User management endpoints
  USERS: {
    LIST: '/users',
    GET: '/users/:id',
    CREATE: '/users',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    BULK_INVITE: '/users/bulk-invite',
    SEARCH: '/users/search',
  },
  
  // Role and Permission endpoints
  ROLES: {
    LIST: '/roles',
    GET: '/roles/:id',
    CREATE: '/roles',
    UPDATE: '/roles/:id',
    DELETE: '/roles/:id',
    PERMISSIONS: '/roles/:id/permissions',
  },
  
  PERMISSIONS: {
    LIST: '/permissions',
    GET: '/permissions/:id',
    CREATE: '/permissions',
    UPDATE: '/permissions/:id',
    DELETE: '/permissions/:id',
    SEARCH: '/permissions/search',
    CATEGORIES: '/permissions/categories',
  },
  
  // Dashboard endpoints
  DASHBOARD: {
    GET: '/dashboard/:id',
    LIST: '/dashboards',
    CREATE: '/dashboards',
    UPDATE: '/dashboards/:id',
    DELETE: '/dashboards/:id',
    DUPLICATE: '/dashboards/:id/duplicate',
    SHARE: '/dashboards/:id/share',
    EXPORT: '/dashboards/:id/export',
  },
  
  // Dataset endpoints
  DATASETS: {
    LIST: '/datasets',
    GET: '/datasets/:id',
    CREATE: '/datasets',
    UPDATE: '/datasets/:id',
    DELETE: '/datasets/:id',
    QUERY: '/datasets/:id/query',
    PREVIEW: '/datasets/:id/preview',
    SCHEMA: '/datasets/:id/schema',
  }
} as const;

// ========================================
// HTTP STATUS CODES
// ========================================

export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
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
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

// ========================================
// AUTHENTICATION CONSTANTS
// ========================================

export const AUTH_CONSTANTS = {
  // Token configuration
  TOKEN_TYPE: 'Bearer',
  TOKEN_HEADER: 'Authorization',
  
  // Session timeouts
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in milliseconds
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: false,
  
  // Login attempts
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // OTP/2FA
  OTP_LENGTH: 6,
  OTP_EXPIRY: 5 * 60 * 1000, // 5 minutes
} as const;

// ========================================
// ROLE LEVELS AND PERMISSIONS
// ========================================

export const ROLE_LEVELS = {
  USER: 0,
  MODERATOR: 10,
  ADMIN: 20,
  SUPER_ADMIN: 30,
} as const;

export const PERMISSION_CONSTANTS = {
  // Permission patterns
  PATTERNS: {
    ADMIN: 'admin.*',
    READ_ALL: '*.read',
    WRITE_ALL: '*.write',
    DELETE_ALL: '*.delete',
  },
  
  // Common permissions
  COMMON: {
    // Dashboard permissions
    DASHBOARD_CREATE: 'dashboard.create',
    DASHBOARD_READ: 'dashboard.read',
    DASHBOARD_UPDATE: 'dashboard.update',
    DASHBOARD_DELETE: 'dashboard.delete',
    DASHBOARD_SHARE: 'dashboard.share',
    
    // User management permissions
    USER_CREATE: 'user.create',
    USER_READ: 'user.read',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    USER_INVITE: 'user.invite',
    
    // Workspace permissions
    WORKSPACE_CREATE: 'workspace.create',
    WORKSPACE_READ: 'workspace.read',
    WORKSPACE_UPDATE: 'workspace.update',
    WORKSPACE_DELETE: 'workspace.delete',
    WORKSPACE_SWITCH: 'workspace.switch',
    
    // Admin permissions
    ADMIN_PANEL: 'admin.panel',
    ADMIN_SETTINGS: 'admin.settings',
    ADMIN_USERS: 'admin.users',
    ADMIN_ROLES: 'admin.roles',
    ADMIN_PERMISSIONS: 'admin.permissions',
  },
  
  // Permission categories
  CATEGORIES: {
    DASHBOARD: 'dashboard',
    USER: 'user',
    WORKSPACE: 'workspace',
    ADMIN: 'admin',
    DATASET: 'dataset',
    REPORT: 'report',
  }
} as const;

// ========================================
// CACHE CONSTANTS
// ========================================

export const CACHE_CONSTANTS = {
  // Default TTL values (in milliseconds)
  DEFAULT_TTL: 30 * 60 * 1000, // 30 minutes
  SHORT_TTL: 5 * 60 * 1000, // 5 minutes
  LONG_TTL: 2 * 60 * 60 * 1000, // 2 hours
  
  // Specific cache TTL
  USER_PERMISSIONS_TTL: 15 * 60 * 1000, // 15 minutes
  USER_PROFILE_TTL: 60 * 60 * 1000, // 1 hour
  WORKSPACE_DATA_TTL: 30 * 60 * 1000, // 30 minutes
  DASHBOARD_LIST_TTL: 10 * 60 * 1000, // 10 minutes
  
  // Cache keys
  KEYS: {
    USER_PERMISSIONS: 'user_permissions',
    USER_PROFILE: 'user_profile',
    WORKSPACE_LIST: 'workspace_list',
    DASHBOARD_LIST: 'dashboard_list',
    SYSTEM_PERMISSIONS: 'system_permissions',
  },
  
  // Cache sizes
  MAX_CACHE_SIZE: 50, // Maximum number of cached items
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
} as const;

// ========================================
// ERROR MESSAGES
// ========================================

export const ERROR_MESSAGES = {
  // Generic errors
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  
  // Authentication errors
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  LOGOUT_FAILED: 'Logout failed. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_REFRESH_FAILED: 'Failed to refresh token. Please log in again.',
  NO_REFRESH_TOKEN: 'No refresh token available.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address.',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed attempts.',
  PASSWORD_TOO_WEAK: 'Password does not meet security requirements.',
  
  // Permission errors
  PERMISSIONS_LOAD_FAILED: 'Failed to load user permissions.',
  PERMISSIONS_REFRESH_FAILED: 'Failed to refresh user permissions.',
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions.',
  
  // Workspace errors
  WORKSPACE_SWITCH_FAILED: 'Failed to switch workspace.',
  WORKSPACE_NOT_FOUND: 'Workspace not found.',
  WORKSPACES_FETCH_FAILED: 'Failed to fetch available workspaces.',
  NO_WORKSPACES_AVAILABLE: 'No workspaces available.',
  WORKSPACE_CREATE_FAILED: 'Failed to create workspace.',
  
  // General API errors
  API_ERROR: 'API request failed.',
  VALIDATION_ERROR: 'Validation failed.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  
  // Initialization errors
  AUTH_INIT_FAILED: 'Failed to initialize authentication.',
  APP_INIT_FAILED: 'Failed to initialize application.',
  
  // Data errors
  DATA_LOAD_FAILED: 'Failed to load data.',
  DATA_SAVE_FAILED: 'Failed to save data.',
  DATA_DELETE_FAILED: 'Failed to delete data.',
  
  // Form errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  
  // File errors
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed size.',
  INVALID_FILE_TYPE: 'Invalid file type.',
  FILE_UPLOAD_FAILED: 'File upload failed.',
  
  // Connection errors
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  OFFLINE: 'You are currently offline.',
  
  // Feature errors
  FEATURE_NOT_AVAILABLE: 'This feature is not available.',
  FEATURE_DISABLED: 'This feature is currently disabled.',
} as const;

// ========================================
// SUCCESS MESSAGES
// ========================================

export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Welcome back! You have successfully logged in.',
  LOGOUT_SUCCESS: 'You have been successfully logged out.',
  REGISTRATION_SUCCESS: 'Account created successfully! Please verify your email.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  EMAIL_VERIFIED: 'Email verified successfully.',
  PASSWORD_RESET: 'Password reset successfully.',
  
  // Profile
  PROFILE_UPDATED: 'Profile updated successfully.',
  PREFERENCES_SAVED: 'Preferences saved successfully.',
  
  // Workspace
  WORKSPACE_SWITCHED: 'Workspace switched successfully.',
  WORKSPACE_CREATED: 'Workspace created successfully.',
  WORKSPACE_UPDATED: 'Workspace updated successfully.',
  WORKSPACE_DELETED: 'Workspace deleted successfully.',
  
  // Permissions
  PERMISSIONS_LOADED: 'Permissions loaded successfully.',
  PERMISSIONS_REFRESHED: 'Permissions refreshed successfully.',
  
  // General
  DATA_SAVED: 'Data saved successfully.',
  DATA_DELETED: 'Data deleted successfully.',
  CHANGES_SAVED: 'Changes saved successfully.',
  OPERATION_COMPLETED: 'Operation completed successfully.',
  
  // Invitations
  INVITATION_SENT: 'Invitation sent successfully.',
  INVITATION_ACCEPTED: 'Invitation accepted successfully.',
  
  // File operations
  FILE_UPLOADED: 'File uploaded successfully.',
  FILE_DELETED: 'File deleted successfully.',
  
  // Dashboard
  DASHBOARD_CREATED: 'Dashboard created successfully.',
  DASHBOARD_UPDATED: 'Dashboard updated successfully.',
  DASHBOARD_DELETED: 'Dashboard deleted successfully.',
  DASHBOARD_SHARED: 'Dashboard shared successfully.',
} as const;

// ========================================
// UI CONSTANTS
// ========================================

export const UI_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    XS: 0,
    SM: 600,
    MD: 900,
    LG: 1200,
    XL: 1536,
  },
  
  // Z-index layers
  Z_INDEX: {
    DRAWER: 1200,
    APP_BAR: 1100,
    MODAL: 1300,
    SNACKBAR: 1400,
    TOOLTIP: 1500,
  },
  
  // Animation durations
  ANIMATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  
  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    INPUT: 500,
    RESIZE: 100,
  }
} as const;

// ========================================
// VALIDATION CONSTANTS
// ========================================

export const VALIDATION_CONSTANTS = {
  // String lengths
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // File sizes (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Patterns
  PATTERNS: {
    EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    URL: /^https?:\/\/.+/,
    USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
    SLUG: /^[a-z0-9-]+$/,
  }
} as const;

// ========================================
// FEATURE FLAGS
// ========================================

export const FEATURE_FLAGS = {
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  ENABLE_OFFLINE_SUPPORT: process.env.NEXT_PUBLIC_ENABLE_OFFLINE === 'true',
  ENABLE_EXPERIMENTAL_FEATURES: process.env.NEXT_PUBLIC_EXPERIMENTAL_FEATURES === 'true',
  
  // Feature-specific flags
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_ADVANCED_PERMISSIONS: true,
  ENABLE_WORKSPACE_SWITCHING: true,
  ENABLE_FILE_UPLOADS: true,
  ENABLE_REAL_TIME_UPDATES: true,
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

// HTTP status code utilities
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

export const isServerError = (status: number): boolean => {
  return status >= 500 && status < 600;
};

// Permission level utilities
export const hasAdminLevel = (roleLevel: number): boolean => {
  return roleLevel >= ROLE_LEVELS.ADMIN;
};

export const isSuperAdmin = (roleLevel: number): boolean => {
  return roleLevel >= ROLE_LEVELS.SUPER_ADMIN;
};

// ========================================
// TYPE DEFINITIONS
// ========================================

// Storage key types
export type StorageKeyType = keyof typeof STORAGE_KEYS;

// HTTP method types
export type HttpMethodType = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];

// Permission level types
export type RoleLevelType = typeof ROLE_LEVELS[keyof typeof ROLE_LEVELS];

// Status code types
export type HttpStatusType = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// Export all constants as default
export default {
  STORAGE_KEYS,
  API_CONFIG,
  API_ENDPOINTS,
  HTTP_STATUS,
  HTTP_METHODS,
  AUTH_CONSTANTS,
  ROLE_LEVELS,
  PERMISSION_CONSTANTS,
  CACHE_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  UI_CONSTANTS,
  VALIDATION_CONSTANTS,
  FEATURE_FLAGS,
  // Utility functions
  isSuccessStatus,
  isClientError,
  isServerError,
  hasAdminLevel,
  isSuperAdmin,
};