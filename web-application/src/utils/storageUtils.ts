// File: web-application/src/utils/storageUtils.ts
// Comprehensive localStorage utilities with error handling and type safety - CORRECTED VERSION

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
// SPECIALIZED STORAGE FUNCTIONS
// ========================================

/**
 * Authentication storage utilities
 */
export const authStorage = {
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
  
  clearAuth: (): void => {
    removeStorageItem(STORAGE_KEYS.TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    removeStorageItem(STORAGE_KEYS.USER);
  },
  
  isAuthenticated: (): boolean => {
    const token = authStorage.getToken();
    return !!token;
  },
};

/**
 * Workspace storage utilities - CORRECTED WITH ALL NEEDED METHODS
 */
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
  
  // ✅ ADDED MISSING SESSION DATA METHODS
  setSessionData: (sessionData: any): boolean => 
    setStorageItem(STORAGE_KEYS.SESSION_DATA, sessionData),
  
  getSessionData: (): any | null => 
    getStorageItem(STORAGE_KEYS.SESSION_DATA),
  
  clearSessionData: (): void => 
    removeStorageItem(STORAGE_KEYS.SESSION_DATA),
  
  // ✅ EXISTING clearWorkspace method (clears current, available, and preferences)
  clearWorkspace: (): void => {
    removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE);
    removeStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES);
    removeStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES);
  },
  
  // ✅ ADDED INDIVIDUAL CLEAR METHODS FOR FLEXIBILITY
  clearCurrentWorkspace: (): void => 
    removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE),
  
  clearAvailableWorkspaces: (): void => 
    removeStorageItem(STORAGE_KEYS.AVAILABLE_WORKSPACES),
  
  clearWorkspacePreferences: (): void => 
    removeStorageItem(STORAGE_KEYS.WORKSPACE_PREFERENCES),
  
  // Migration helper for old workspace keys
  migrateOldWorkspaceKeys: (): void => {
    const oldKeys = ['workspace', 'auth_workspace', 'selected_workspace_id'];
    oldKeys.forEach(key => {
      try {
        const oldValue = window.localStorage.getItem(key);
        if (oldValue) {
          console.log(`Migrating old workspace key: ${key}`);
          // You can add migration logic here if needed
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Failed to migrate old key ${key}:`, error);
      }
    });
  },
};

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
// INITIALIZATION & CLEANUP
// ========================================

/**
 * Initialize storage utilities
 */
export const initializeStorage = (): void => {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available');
    return;
  }

  // Clean expired items on initialization
  const cleaned = cleanExpiredItems();
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired storage items`);
  }

  // Migrate old workspace keys
  workspaceStorage.migrateOldWorkspaceKeys();
  
  console.log('Storage utilities initialized');
};

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
  initializeStorage,
};