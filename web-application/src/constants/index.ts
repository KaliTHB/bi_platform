// File: web-application/src/constants/index.ts
// Centralized constants for the entire application - CORRECTED VERSION

// ========================================
// STORAGE KEYS - Local Storage Keys
// ========================================
export const STORAGE_KEYS = {
  // Authentication & Security
  TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  SESSION_DATA: 'sessionData',
  LAST_LOGIN: 'lastLogin',
  
  // User Permissions & Roles
  USER_PERMISSIONS: 'userPermissions',
  USER_ROLES: 'userRoles',
  WORKSPACE_PERMISSIONS: 'workspacePermissions',
  
  // Workspace Management
  CURRENT_WORKSPACE: 'currentWorkspace',
  AVAILABLE_WORKSPACES: 'availableWorkspaces',
  WORKSPACE_PREFERENCES: 'workspacePreferences',
  WORKSPACE_MEMBERS: 'workspaceMembers',
  
  // Application State
  THEME_MODE: 'themeMode',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  ACTIVE_TAB: 'activeTab',
  TOUR_COMPLETED: 'tourCompleted',
  
  // Dashboard & Analytics
  DASHBOARD_LAYOUT: 'dashboardLayout',
  CHART_PREFERENCES: 'chartPreferences',
  FILTER_SETTINGS: 'filterSettings',
  SELECTED_DASHBOARD: 'selectedDashboard',
  DASHBOARD_FAVORITES: 'dashboardFavorites',
  
  // Data Sources
  DATA_SOURCE_CONNECTIONS: 'dataSourceConnections',
  SELECTED_DATA_SOURCE: 'selectedDataSource',
  CONNECTION_HISTORY: 'connectionHistory',
  
  // User Preferences
  NOTIFICATION_SETTINGS: 'notificationSettings',
  VIEW_PREFERENCES: 'viewPreferences',
  RECENT_SEARCHES: 'recentSearches',
  BOOKMARKS: 'bookmarks',
  SHORTCUTS: 'shortcuts',
  
  // Cache Keys
  PLUGINS_CACHE: 'pluginsCache',
  DATA_SOURCES_CACHE: 'dataSourcesCache',
  METADATA_CACHE: 'metadataCache',
  SCHEMA_CACHE: 'schemaCache',
  QUERY_CACHE: 'queryCache',
  
  // Form & Input States
  FORM_DRAFTS: 'formDrafts',
  UNSAVED_CHANGES: 'unsavedChanges',
  WIZARD_PROGRESS: 'wizardProgress',
  
  // Export & Import
  EXPORT_SETTINGS: 'exportSettings',
  IMPORT_HISTORY: 'importHistory',
  DOWNLOAD_PREFERENCES: 'downloadPreferences',
  
  // Development & Debug
  DEBUG_MODE: 'debugMode',
  FEATURE_FLAGS: 'featureFlags',
  EXPERIMENTAL_FEATURES: 'experimentalFeatures',
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