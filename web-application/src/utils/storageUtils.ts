// web-application/src/utils/storageUtils.ts
// Enhanced Storage Utilities with Essential Cleanup

// Storage key types and constants
export type StorageKey = keyof typeof STORAGE_KEYS;

export const STORAGE_KEYS = {
  // Authentication keys
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',  
  USER: 'user_data',
  PERMISSIONS: 'user_permissions',
  
  // Workspace keys
  CURRENT_WORKSPACE: 'current_workspace',
  AVAILABLE_WORKSPACES: 'available_workspaces',
  WORKSPACE_PREFERENCES: 'workspace_preferences',
  
  // Session keys
  SESSION_DATA: 'session_data',
  RECENT_SEARCHES: 'recent_searches',
  
  // UI state keys
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  
  // Dashboard keys
  DASHBOARD_FAVORITES: 'dashboard_favorites',
  
  // Cache keys
  PLUGINS_CACHE: 'plugins_cache',
  DATA_SOURCES_CACHE: 'data_sources_cache',
  METADATA_CACHE: 'metadata_cache',
} as const;

// Storage data structure interface
interface StorageData<T = any> {
  value: T;
  timestamp: number;
  expiry?: number;
}

// Enhanced storage options
interface StorageOptions {
  expiry?: number; // TTL in milliseconds
  compress?: boolean; // For future use
}

// ========================================
// CORE STORAGE FUNCTIONS
// ========================================

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return false;
  }
};

/**
 * Enhanced setItem with TTL support
 */
export const setStorageItem = <T>(
  key: string | StorageKey, 
  value: T, 
  options: StorageOptions = {}
): boolean => {
  if (!isStorageAvailable()) return false;

  try {
    const storageData: StorageData<T> = {
      value,
      timestamp: Date.now(),
      ...(options.expiry && { expiry: options.expiry })
    };

    window.localStorage.setItem(key, JSON.stringify(storageData));
    return true;
  } catch (error) {
    console.error(`Failed to set storage item "${key}":`, error);
    return false;
  }
};

/**
 * Enhanced getItem with expiry check
 */
export const getStorageItem = <T>(key: string | StorageKey): T | null => {
  if (!isStorageAvailable()) return null;

  try {
    const item = window.localStorage.getItem(key);
    if (!item) return null;

    const storageData: StorageData<T> = JSON.parse(item);
    
    // Check for expiry
    if (storageData.expiry && Date.now() > storageData.expiry) {
      window.localStorage.removeItem(key);
      return null;
    }

    return storageData.value;
  } catch (error) {
    console.error(`Failed to get storage item "${key}":`, error);
    removeStorageItem(key);
    return null;
  }
};

/**
 * Remove item from localStorage
 */
export const removeStorageItem = (key: string | StorageKey): boolean => {
  if (!isStorageAvailable()) return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove storage item "${key}":`, error);
    return false;
  }
};

/**
 * Clear all localStorage items
 */
export const clearAllStorage = (): boolean => {
  if (!isStorageAvailable()) return false;

  try {
    window.localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear all storage:', error);
    return false;
  }
};

// ========================================
// ENHANCED AUTHENTICATION STORAGE
// ========================================

export const authStorage = {
  // Token methods
  setToken: (token: string, expiry?: number): boolean => 
    setStorageItem(STORAGE_KEYS.TOKEN, token, { expiry }),
  
  getToken: (): string | null => 
    getStorageItem<string>(STORAGE_KEYS.TOKEN),
  
  setRefreshToken: (token: string, expiry?: number): boolean => 
    setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, token, { expiry }),
  
  getRefreshToken: (): string | null => 
    getStorageItem<string>(STORAGE_KEYS.REFRESH_TOKEN),
  
  setUser: (user: any): boolean => 
    setStorageItem(STORAGE_KEYS.USER, user),
  
  getUser: (): any | null => 
    getStorageItem(STORAGE_KEYS.USER),

  // Permission methods
  setPermissions: (permissions: string[], workspaceId?: string): boolean => {
    const key = workspaceId 
      ? `${STORAGE_KEYS.PERMISSIONS}_${workspaceId}` 
      : STORAGE_KEYS.PERMISSIONS;
    
    return setStorageItem(key, permissions, {
      expiry: Date.now() + (30 * 60 * 1000) // 30 minutes TTL
    });
  },
  
  getPermissions: (workspaceId?: string): string[] | null => {
    const key = workspaceId 
      ? `${STORAGE_KEYS.PERMISSIONS}_${workspaceId}` 
      : STORAGE_KEYS.PERMISSIONS;
    
    return getStorageItem<string[]>(key) || [];
  },
  
  clearPermissions: (workspaceId?: string): void => {
    if (workspaceId) {
      removeStorageItem(`${STORAGE_KEYS.PERMISSIONS}_${workspaceId}`);
    } else {
      // Clear all permission keys
      if (isStorageAvailable()) {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key?.startsWith(STORAGE_KEYS.PERMISSIONS)) {
            keys.push(key);
          }
        }
        keys.forEach(key => removeStorageItem(key));
      }
    }
  },

  clearAuth: (): void => {
    removeStorageItem(STORAGE_KEYS.TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    removeStorageItem(STORAGE_KEYS.USER);
    authStorage.clearPermissions();
  },
  
  isAuthenticated: (): boolean => {
    const token = authStorage.getToken();
    return !!token;
  },
};

// ========================================
// WORKSPACE STORAGE
// ========================================

export const workspaceStorage = {
  setCurrentWorkspace: (workspace: any): boolean => 
    setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, workspace),
  
  getCurrentWorkspace: (): any | null => 
    getStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE),
  
  setAvailableWorkspaces: (workspaces: any[]): boolean => 
    setStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES, workspaces),
  
  getAvailableWorkspaces: (): any[] | null => 
    getStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES),
  
  setWorkspacePreferences: (preferences: any): boolean => 
    setStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES, preferences),
  
  getWorkspacePreferences: (): any | null => 
    getStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES),

  clearWorkspace: (): void => {
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    
    removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE);
    removeStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES);
    removeStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES);
    
    // Clear permissions for the current workspace
    if (currentWorkspace?.id) {
      authStorage.clearPermissions(currentWorkspace.id);
    }
  },

  clearCurrentWorkspace: (): void => {
    const currentWorkspace = workspaceStorage.getCurrentWorkspace();
    removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE);
    
    // Clear permissions for this workspace
    if (currentWorkspace?.id) {
      authStorage.clearPermissions(currentWorkspace.id);
    }
  },
  
  clearAvailableWorkspaces: (): void => 
    removeStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES),
  
  clearWorkspacePreferences: (): void => 
    removeStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES),
};

// ========================================
// SESSION STORAGE
// ========================================

export const sessionStorage = {
  addRecentSearch: (search: string): void => {
    const recent = sessionStorage.getRecentSearches() || [];
    const updated = [search, ...recent.filter(s => s !== search)].slice(0, 10);
    setStorageItem(STORAGE_KEYS.RECENT_SEARCHES, updated);
  },
  
  getRecentSearches: (): string[] | null => 
    getStorageItem(STORAGE_KEYS.RECENT_SEARCHES),
  
  clearRecentSearches: (): void => 
    removeStorageItem(STORAGE_KEYS.RECENT_SEARCHES),

  setSessionData: (sessionData: any): boolean => 
    setStorageItem(STORAGE_KEYS.SESSION_DATA, sessionData),
  
  getSessionData: (): any | null => 
    getStorageItem(STORAGE_KEYS.SESSION_DATA),
  
  clearSessionData: (): void => 
    removeStorageItem(STORAGE_KEYS.SESSION_DATA),
};

// ========================================
// UI STORAGE
// ========================================

export const uiStorage = {
  setSidebarCollapsed: (collapsed: boolean): boolean => 
    setStorageItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed),
  
  getSidebarCollapsed: (): boolean | null => 
    getStorageItem(STORAGE_KEYS.SIDEBAR_COLLAPSED),
  
  setThemeMode: (mode: 'light' | 'dark'): boolean => 
    setStorageItem(STORAGE_KEYS.THEME_MODE, mode),
  
  getThemeMode: (): 'light' | 'dark' | null => 
    getStorageItem(STORAGE_KEYS.THEME_MODE),
  
  setLanguage: (language: string): boolean => 
    setStorageItem(STORAGE_KEYS.LANGUAGE, language),
  
  getLanguage: (): string | null => 
    getStorageItem(STORAGE_KEYS.LANGUAGE),
};

// ========================================
// DASHBOARD STORAGE
// ========================================

export const dashboardStorage = {
  addToFavorites: (dashboardId: string): boolean => {
    const favorites = dashboardStorage.getFavorites() || [];
    if (!favorites.includes(dashboardId)) {
      favorites.push(dashboardId);
      return setStorageItem(STORAGE_KEYS.DASHBOARD_FAVORITES, favorites);
    }
    return true;
  },
  
  removeFromFavorites: (dashboardId: string): boolean => {
    const favorites = dashboardStorage.getFavorites() || [];
    const updated = favorites.filter(id => id !== dashboardId);
    return setStorageItem(STORAGE_KEYS.DASHBOARD_FAVORITES, updated);
  },
  
  getFavorites: (): string[] | null => 
    getStorageItem(STORAGE_KEYS.DASHBOARD_FAVORITES),
};

// ========================================
// CACHE STORAGE
// ========================================

export const cacheStorage = {
  setPluginsCache: (plugins: any, ttl: number = 30 * 60 * 1000): boolean => 
    setStorageItem(STORAGE_KEYS.PLUGINS_CACHE, plugins, { expiry: Date.now() + ttl }),
  
  getPluginsCache: (): any | null => 
    getStorageItem(STORAGE_KEYS.PLUGINS_CACHE),
  
  setDataSourcesCache: (dataSources: any, ttl: number = 30 * 60 * 1000): boolean => 
    setStorageItem(STORAGE_KEYS.DATA_SOURCES_CACHE, dataSources, { expiry: Date.now() + ttl }),
  
  getDataSourcesCache: (): any | null => 
    getStorageItem(STORAGE_KEYS.DATA_SOURCES_CACHE),
  
  setMetadataCache: (metadata: any, ttl: number = 30 * 60 * 1000): boolean => 
    setStorageItem(STORAGE_KEYS.METADATA_CACHE, metadata, { expiry: Date.now() + ttl }),
  
  getMetadataCache: (): any | null => 
    getStorageItem(STORAGE_KEYS.METADATA_CACHE),
  
  clearAllCache: (): void => {
    removeStorageItem(STORAGE_KEYS.PLUGINS_CACHE);
    removeStorageItem(STORAGE_KEYS.DATA_SOURCES_CACHE);
    removeStorageItem(STORAGE_KEYS.METADATA_CACHE);
  },
};

// ========================================
// CLEANUP UTILITIES
// ========================================

/**
 * Clean stale permission entries
 */
export const cleanStalePermissions = (): number => {
  if (!isStorageAvailable()) return 0;

  let cleaned = 0;
  const keysToRemove: string[] = [];
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_KEYS.PERMISSIONS)) {
        const item = window.localStorage.getItem(key);
        if (item) {
          try {
            const storageData: StorageData = JSON.parse(item);
            // Remove if expired or older than 24 hours
            if (storageData.expiry && Date.now() > storageData.expiry) {
              keysToRemove.push(key);
            } else if (storageData.timestamp && Date.now() - storageData.timestamp > maxAge) {
              keysToRemove.push(key);
            }
          } catch {
            // Remove corrupted permission data
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach(key => {
      window.localStorage.removeItem(key);
      cleaned++;
    });
  } catch (error) {
    console.error('Failed to clean stale permissions:', error);
  }

  return cleaned;
};

/**
 * Get all storage items with optional prefix filter
 */
export const getAllStorageItems = (prefix?: string): Record<string, any> => {
  if (!isStorageAvailable()) return {};

  const items: Record<string, any> = {};
  
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (!prefix || key.startsWith(prefix))) {
        const value = getStorageItem(key);
        if (value !== null) {
          items[key] = value;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all storage items:', error);
  }

  return items;
};

/**
 * Get storage usage information
 */
export const getStorageInfo = () => {
  if (!isStorageAvailable()) return null;

  try {
    const usage = new Blob(Object.values(window.localStorage)).size;
    const quota = 5 * 1024 * 1024; // Approximate 5MB limit for localStorage
    
    return {
      used: usage,
      quota: quota,
      available: quota - usage,
      percentage: Math.round((usage / quota) * 100),
      items: window.localStorage.length,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return null;
  }
};

/**
 * Clean expired items from localStorage
 */
export const cleanExpiredItems = (): number => {
  if (!isStorageAvailable()) return 0;

  let cleaned = 0;
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const item = window.localStorage.getItem(key);
        if (item) {
          try {
            const storageData: StorageData = JSON.parse(item);
            if (storageData.expiry && Date.now() > storageData.expiry) {
              keysToRemove.push(key);
            }
          } catch {
            // Skip items that aren't in our format
          }
        }
      }
    }

    keysToRemove.forEach(key => {
      window.localStorage.removeItem(key);
      cleaned++;
    });
  } catch (error) {
    console.error('Failed to clean expired items:', error);
  }

  return cleaned;
};

// ========================================
// ✅ CORRECTED INITIALIZATION WITH ESSENTIAL CLEANUP
// ========================================

/**
 * Enhanced storage initialization with essential cleanup
 */
export const initializeStorage = (): void => {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available');
    return;
  }

  // ✅ ENABLED: Clean expired items on initialization
  const cleaned = cleanExpiredItems();
  if (cleaned > 0) {
    console.log(`🗑️ Cleaned ${cleaned} expired storage items`);
  }

  // ✅ ENABLED: Clean stale permissions
  const permissionsCleaned = cleanStalePermissions();
  if (permissionsCleaned > 0) {
    console.log(`🔐 Cleaned ${permissionsCleaned} stale permission entries`);
  }
  
  console.log('✅ Storage utilities initialized with essential cleanup');
};

// ========================================
// EXPORTS
// ========================================

export default {
  // Core functions
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  clearAllStorage,
  isStorageAvailable,
  
  // Specialized utilities
  auth: authStorage,
  workspace: workspaceStorage,
  session: sessionStorage,
  ui: uiStorage,
  dashboard: dashboardStorage,
  cache: cacheStorage,
  
  // Utility functions
  getAllStorageItems,
  getStorageInfo,
  cleanExpiredItems,
  cleanStalePermissions,
  initializeStorage,
};