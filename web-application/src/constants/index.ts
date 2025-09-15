// File: web-application/src/constants/index.ts
// Centralized constants for the entire application - CORRECTED VERSION

// ========================================
// STORAGE CONSTANTS (UPDATED & CONSOLIDATED)
// ========================================

export const STORAGE_KEYS = {
  // 🔑 Authentication & Security
  TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'auth_user',
  SESSION_DATA: 'session_data',
  LAST_LOGIN: 'last_login',
  PERMISSIONS: 'user_permissions',
  USER_ROLES: 'user_roles',
  WORKSPACE_PERMISSIONS: 'workspace_permissions',

  // 🏢 Workspace Management
  CURRENT_WORKSPACE: 'current_workspace',
  AVAILABLE_WORKSPACES: 'available_workspaces',
  WORKSPACE_PREFERENCES: 'workspace_preferences',
  WORKSPACE_MEMBERS: 'workspace_members',

  // 🎨 Application State / UI
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  ACTIVE_TAB: 'active_tab',
  TOUR_COMPLETED: 'tour_completed',

  // 📊 Dashboard & Analytics
  DASHBOARD_LAYOUT: 'dashboard_layout',
  CHART_PREFERENCES: 'chart_preferences',
  FILTER_SETTINGS: 'filter_settings',
  SELECTED_DASHBOARD: 'selected_dashboard',
  DASHBOARD_FAVORITES: 'dashboard_favorites',

  // 🔌 Data Sources
  DATA_SOURCE_CONNECTIONS: 'datasource_connections',
  SELECTED_DATA_SOURCE: 'selected_datasource',
  CONNECTION_HISTORY: 'connection_history',

  // 👤 User Preferences
  NOTIFICATION_SETTINGS: 'notification_settings',
  VIEW_PREFERENCES: 'view_preferences',
  RECENT_SEARCHES: 'recent_searches',
  BOOKMARKS: 'bookmarks',
  SHORTCUTS: 'shortcuts',

  // ⚡ Cache Keys
  PLUGINS_CACHE: 'plugins_cache',
  DATA_SOURCES_CACHE: 'datasources_cache',
  METADATA_CACHE: 'metadata_cache',
  SCHEMA_CACHE: 'schema_cache',
  QUERY_CACHE: 'query_cache',

  // 📝 Form & Input States
  FORM_DRAFTS: 'form_drafts',
  UNSAVED_CHANGES: 'unsaved_changes',
  WIZARD_PROGRESS: 'wizard_progress',

  // 📥 Export & Import
  EXPORT_SETTINGS: 'export_settings',
  IMPORT_HISTORY: 'import_history',
  DOWNLOAD_PREFERENCES: 'download_preferences',

  // 🧪 Development & Debug
  DEBUG_MODE: 'debug_mode',
  FEATURE_FLAGS: 'feature_flags',
  EXPERIMENTAL_FEATURES: 'experimental_features',
} as const;



// ========================================
// API ENDPOINTS (Simplified version)
// ========================================
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
  },
  
  // Workspace Management
  WORKSPACES: {
    LIST: '/api/user/workspaces',
    SWITCH: '/api/workspace/switch',
    CREATE: '/api/workspace/create',
    UPDATE: '/api/workspace/update',
    DELETE: '/api/workspace/delete',
    INVITE: '/api/workspace/invite',
    MEMBERS: '/api/workspace/members',
  },
  
  // Data Sources
  DATA_SOURCES: {
    LIST: '/api/datasources',
    CREATE: '/api/datasources',
    UPDATE: '/api/datasources',
    DELETE: '/api/datasources',
    TEST: '/api/datasources/test',
    PLUGINS: '/api/datasources/plugins',
  },
  
  // Dashboards
  DASHBOARDS: {
    LIST: '/api/dashboards',
    CREATE: '/api/dashboards',
    UPDATE: '/api/dashboards',
    DELETE: '/api/dashboards',
    SHARE: '/api/dashboards/share',
  },
} as const;

// ========================================
// APPLICATION CONSTANTS
// ========================================
export const APP_CONFIG = {
  NAME: 'BI Platform',
  VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_THEME: 'light',
  ITEMS_PER_PAGE: 20,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FILE_TYPES: ['.csv', '.xlsx', '.json', '.parquet'],
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
} as const;

// ========================================
// STORAGE CATEGORIES
// ========================================
export const STORAGE_CATEGORIES = {
  CLOUD_STORAGE: ['azure_storage', 's3', 'google_storage'],
  FILE_SHARING: ['google_drive', 'one_drive'],
  FILE_TRANSFER: ['ftp'],
  DATABASE: ['postgres', 'mysql', 'mongodb', 'snowflake'],
  DATA_LAKES: ['delta_table_aws', 'delta_table_azure', 'iceberg'],
} as const;

// ========================================
// UI CONSTANTS
// ========================================
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    XS: 0,
    SM: 600,
    MD: 960,
    LG: 1280,
    XL: 1920,
  },
  
  Z_INDEX: {
    DRAWER: 1200,
    MODAL: 1300,
    SNACKBAR: 1400,
    TOOLTIP: 1500,
  },
  
  ANIMATION_DURATION: {
    SHORT: 150,
    STANDARD: 300,
    COMPLEX: 500,
  },
} as const;

// ========================================
// ERROR MESSAGES - CORRECTED WITH WORKSPACE SECTION
// ========================================
export const ERROR_MESSAGES = {
  AUTHENTICATION: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Session expired. Please login again.',
    UNAUTHORIZED: 'You are not authorized to access this resource',
  },
  
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  },
  
  NETWORK: {
    CONNECTION_FAILED: 'Connection failed. Please check your internet connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    TIMEOUT: 'Request timeout. Please try again.',
  },
  
  // ✅ ADDED MISSING WORKSPACE SECTION
  WORKSPACE: {
    SWITCH_FAILED: 'Failed to switch workspace',
    NOT_FOUND: 'Workspace not found',
    ACCESS_DENIED: 'Access denied to workspace',
    CREATION_FAILED: 'Failed to create workspace',
    UPDATE_FAILED: 'Failed to update workspace',
    DELETE_FAILED: 'Failed to delete workspace',
    INVALID_SLUG: 'Invalid workspace slug',
    ALREADY_EXISTS: 'Workspace already exists',
  },
  
  // Data Source errors
  DATA_SOURCE: {
    CONNECTION_FAILED: 'Failed to connect to data source',
    INVALID_CREDENTIALS: 'Invalid data source credentials',
    TEST_FAILED: 'Data source test failed',
    CREATION_FAILED: 'Failed to create data source',
    UPDATE_FAILED: 'Failed to update data source',
    DELETE_FAILED: 'Failed to delete data source',
  },
  
  // Dashboard errors
  DASHBOARD: {
    LOAD_FAILED: 'Failed to load dashboard',
    SAVE_FAILED: 'Failed to save dashboard',
    DELETE_FAILED: 'Failed to delete dashboard',
    SHARE_FAILED: 'Failed to share dashboard',
    EXPORT_FAILED: 'Failed to export dashboard',
  },
} as const;

// ========================================
// SUCCESS MESSAGES - CORRECTED WITH WORKSPACE SECTION
// ========================================
export const SUCCESS_MESSAGES = {
  AUTHENTICATION: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
  },
  
  // ✅ ADDED MISSING WORKSPACE SECTION
  WORKSPACE: {
    CREATED: 'Workspace created successfully',
    UPDATED: 'Workspace updated successfully',
    SWITCHED: 'Workspace switched successfully',
    DELETED: 'Workspace deleted successfully',
    INVITED: 'User invited successfully',
  },
  
  DATA_SOURCE: {
    CONNECTED: 'Data source connected successfully',
    UPDATED: 'Data source updated successfully',
    DELETED: 'Data source deleted successfully',
    TEST_SUCCESS: 'Data source test successful',
  },
  
  DASHBOARD: {
    CREATED: 'Dashboard created successfully',
    UPDATED: 'Dashboard updated successfully',
    DELETED: 'Dashboard deleted successfully',
    SHARED: 'Dashboard shared successfully',
    EXPORTED: 'Dashboard exported successfully',
  },
  
  CHART: {
    CREATED: 'Chart created successfully',
    UPDATED: 'Chart updated successfully',
    DELETED: 'Chart deleted successfully',
    SAVED: 'Chart saved successfully',
  },
} as const;

// Type exports for better TypeScript support
export type StorageKey = keyof typeof STORAGE_KEYS;
export type StorageCategory = keyof typeof STORAGE_CATEGORIES;
export type ErrorMessageCategory = keyof typeof ERROR_MESSAGES;
export type SuccessMessageCategory = keyof typeof SUCCESS_MESSAGES;