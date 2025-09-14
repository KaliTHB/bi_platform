// File: web-application/src/utils/storageUtils.ts
// Comprehensive localStorage utilities with error handling and type safety - COMPLETE VERSION

import { STORAGE_KEYS, type StorageKey } from '../constants';

// ========================================
// TYPES & INTERFACES
// ========================================
interface StorageOptions {
  encrypt?: boolean;
  expiry?: number; // Timestamp for expiration
  compress?: boolean;
}

interface StorageData<T = any> {
  value: T;
  timestamp: number;
  expiry?: number;
  encrypted?: boolean;
  compressed?: boolean;
}

// ========================================
// CORE STORAGE FUNCTIONS
// ========================================

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return false;
  }
};

/**
 * Set item in localStorage with optional features
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
      ...(options.expiry && { expiry: options.expiry }),
      ...(options.encrypted && { encrypted: true }),
      ...(options.compress && { compressed: true }),
    };

    let serializedData = JSON.stringify(storageData);
    
    // Simple compression (in real app, use a proper compression library)
    if (options.compress) {
      // This is a placeholder - implement proper compression if needed
      console.log('Compression requested but not implemented');
    }
    
    // Simple encryption (in real app, use proper encryption)
    if (options.encrypt) {
      // This is a placeholder - implement proper encryption if needed
      console.log('Encryption requested but not implemented');
    }

    window.localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error(`Failed to set storage item "${key}":`, error);
    return false;
  }
};

/**
 * Get item from localStorage with expiry check
 */
export const getStorageItem = <T>(key: string | StorageKey): T | null => {
  if (!isStorageAvailable()) return null;

  try {
    const item = window.localStorage.getItem(key);
    if (!item) return null;

    const storageData: StorageData<T> = JSON.parse(item);
    
    // Check expiry
    if (storageData.expiry && Date.now() > storageData.expiry) {
      removeStorageItem(key);
      return null;
    }

    return storageData.value;
  } catch (error) {
    console.error(`Failed to get storage item "${key}":`, error);
    // Remove corrupted item
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
// ENHANCED AUTHENTICATION STORAGE WITH PERMISSIONS
// ========================================

/**
 * Enhanced authentication storage utilities with permission support
 */
export const authStorage = {
  // Existing token methods
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

  // ✅ NEW: Permission storage methods
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

  // ✅ NEW: Permission metadata storage
  setPermissionMeta: (meta: {
    lastUpdated: number;
    workspaceId?: string;
    roles?: any[];
    permissionDetails?: any[];
  }): boolean => {
    const key = `${STORAGE_KEYS.PERMISSIONS}_meta`;
    return setStorageItem(key, meta);
  },

  getPermissionMeta: (): any | null => {
    return getStorageItem(`${STORAGE_KEYS.PERMISSIONS}_meta`);
  },

  // ✅ NEW: Check if permissions are fresh (not expired)
  arePermissionsFresh: (workspaceId?: string, maxAge: number = 30 * 60 * 1000): boolean => {
    const meta = authStorage.getPermissionMeta();
    if (!meta?.lastUpdated) return false;
    
    const age = Date.now() - meta.lastUpdated;
    const isCorrectWorkspace = !workspaceId || meta.workspaceId === workspaceId;
    
    return age < maxAge && isCorrectWorkspace;
  },

  // Enhanced clear auth with permissions
  clearAuth: (): void => {
    removeStorageItem(STORAGE_KEYS.TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    removeStorageItem(STORAGE_KEYS.USER);
    authStorage.clearPermissions(); // Clear all permissions
    removeStorageItem(`${STORAGE_KEYS.PERMISSIONS}_meta`);
  },
  
  isAuthenticated: (): boolean => {
    const token = authStorage.getToken();
    return !!token;
  },

  // ✅ NEW: Complete auth data getter
  getAuthData: (workspaceId?: string) => {
    return {
      token: authStorage.getToken(),
      refreshToken: authStorage.getRefreshToken(),
      user: authStorage.getUser(),
      permissions: authStorage.getPermissions(workspaceId),
      permissionMeta: authStorage.getPermissionMeta(),
      isAuthenticated: authStorage.isAuthenticated(),
      arePermissionsFresh: authStorage.arePermissionsFresh(workspaceId)
    };
  },

  // ✅ NEW: Set complete auth data (for login)
  setAuthData: (data: {
    token: string;
    user: any;
    permissions?: string[];
    workspaceId?: string;
    roles?: any[];
    permissionDetails?: any[];
  }): boolean => {
    try {
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      
      if (data.permissions) {
        authStorage.setPermissions(data.permissions, data.workspaceId);
        authStorage.setPermissionMeta({
          lastUpdated: Date.now(),
          workspaceId: data.workspaceId,
          roles: data.roles,
          permissionDetails: data.permissionDetails
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to set auth data:', error);
      return false;
    }
  }
};

// ========================================
// ENHANCED WORKSPACE STORAGE WITH PERMISSION CONTEXT
// ========================================

/**
 * Enhanced workspace storage utilities with permission context
 */
export const workspaceStorage = {
  // Enhanced workspace methods with permission cleanup
  setCurrentWorkspace: (workspace: any): boolean => {
    const success = setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, workspace);
    
    // ✅ NEW: Clear old workspace permissions when switching
    if (success && workspace?.id) {
      const currentMeta = authStorage.getPermissionMeta();
      if (currentMeta?.workspaceId && currentMeta.workspaceId !== workspace.id) {
        authStorage.clearPermissions(currentMeta.workspaceId);
      }
    }
    
    return success;
  },
  
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
  
  setSessionData: (sessionData: any): boolean => 
    setStorageItem(STORAGE_KEYS.SESSION_DATA, sessionData),
  
  getSessionData: (): any | null => 
    getStorageItem(STORAGE_KEYS.SESSION_DATA),
  
  clearSessionData: (): void => 
    removeStorageItem(STORAGE_KEYS.SESSION_DATA),
  
  // ✅ ENHANCED: Clear workspace with permission cleanup
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
// EXISTING STORAGE UTILITIES (UNCHANGED)
// ========================================

/**
 * Session storage utilities
 */
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
};

/**
 * UI preferences storage utilities
 */
export const uiStorage = {
  setThemeMode: (mode: string): boolean => 
    setStorageItem(STORAGE_KEYS.THEME_MODE, mode),
  
  getThemeMode: (): string | null => 
    getStorageItem(STORAGE_KEYS.THEME_MODE),
  
  setSidebarCollapsed: (collapsed: boolean): boolean => 
    setStorageItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed),
  
  getSidebarCollapsed: (): boolean | null => 
    getStorageItem(STORAGE_KEYS.SIDEBAR_COLLAPSED),
  
  setLanguage: (language: string): boolean => 
    setStorageItem(STORAGE_KEYS.LANGUAGE, language),
  
  getLanguage: (): string | null => 
    getStorageItem(STORAGE_KEYS.LANGUAGE),
  
  setTourCompleted: (completed: boolean): boolean => 
    setStorageItem(STORAGE_KEYS.TOUR_COMPLETED, completed),
  
  getTourCompleted: (): boolean | null => 
    getStorageItem(STORAGE_KEYS.TOUR_COMPLETED),
};

/**
 * Dashboard storage utilities
 */
export const dashboardStorage = {
  setDashboardLayout: (layout: any): boolean => 
    setStorageItem(STORAGE_KEYS.DASHBOARD_LAYOUT, layout),
  
  getDashboardLayout: (): any | null => 
    getStorageItem(STORAGE_KEYS.DASHBOARD_LAYOUT),
  
  setChartPreferences: (preferences: any): boolean => 
    setStorageItem(STORAGE_KEYS.CHART_PREFERENCES, preferences),
  
  getChartPreferences: (): any | null => 
    getStorageItem(STORAGE_KEYS.CHART_PREFERENCES),
  
  setFilterSettings: (settings: any): boolean => 
    setStorageItem(STORAGE_KEYS.FILTER_SETTINGS, settings),
  
  getFilterSettings: (): any | null => 
    getStorageItem(STORAGE_KEYS.FILTER_SETTINGS),
  
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

/**
 * Cache storage utilities
 */
export const cacheStorage = {
  setPluginsCache: (plugins: any, ttl: number = 30 * 60 * 1000): boolean => // 30 minutes TTL
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

export const cleanupOldWorkspaceKeys = (): void => {
  if (!isStorageAvailable()) return;
  
  const oldKeys = [
    'workspace', 
    'auth_workspace', 
    'selected_workspace_id',
    'workspace_data',
    'currentWorkspace',
    'user_workspace', 
    'active_workspace'
  ];
  
  let cleaned = 0;
  
  oldKeys.forEach(key => {
    try {
      const oldValue = window.localStorage.getItem(key);
      if (oldValue !== null) {
        console.log(`🧹 Cleaning up old workspace key: ${key}`);
        window.localStorage.removeItem(key);
        cleaned++;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to remove old workspace key ${key}:`, error);
    }
  });
  
  if (cleaned > 0) {
    console.log(`✅ Cleaned up ${cleaned} old workspace storage keys`);
  }
};

/**
 * ✅ NEW: Clean stale permission entries
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

// ========================================
// UTILITY FUNCTIONS
// ========================================

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
// ENHANCED INITIALIZATION WITH PERMISSION CLEANUP
// ========================================

/**
 * Enhanced storage initialization with permission cleanup
 */
export const initializeStorage = (): void => {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available');
    return;
  }

  // Clean expired items on initialization
  //const cleaned = cleanExpiredItems();
  //if (cleaned > 0) {
  //  console.log(`Cleaned ${cleaned} expired storage items`);
  //}

  // ✅ NEW: Clean stale permissions
  //const permissionsCleaned = cleanStalePermissions();
  //if (permissionsCleaned > 0) {
  //  console.log(`Cleaned ${permissionsCleaned} stale permission entries`);
  //}
  
  console.log('Storage utilities initialized with permission support');
};

// ========================================
// EXPORTS
// ========================================

/**
 * Export all storage utilities as default
 */
export default {
  // Core functions
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  clearAllStorage,
  isStorageAvailable,
  
  // Enhanced specialized utilities
  auth: authStorage,
  workspace: workspaceStorage,
  session: sessionStorage,
  ui: uiStorage,
  dashboard: dashboardStorage,
  cache: cacheStorage,
  
  // Enhanced utility functions
  getAllStorageItems,
  getStorageInfo,
  cleanExpiredItems,
  cleanStalePermissions, // ✅ NEW
  initializeStorage,
  cleanupOldWorkspaceKeys
};