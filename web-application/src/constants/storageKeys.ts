// web-application/src/constants/storageKeys.ts
// ✅ UNIFIED storage keys used across ALL contexts and providers

export const STORAGE_KEYS = {
  // Auth-related keys
  TOKEN: 'token',
  USER: 'user',
  REFRESH_TOKEN: 'refreshToken',

  // Workspace-related keys
  CURRENT_WORKSPACE: 'currentWorkspace',
  AVAILABLE_WORKSPACES: 'availableWorkspaces', // Cache of user's workspaces
  
  // Permission-related keys  
  PERMISSIONS_PREFIX: 'permissions_', // Format: permissions_userId_workspaceId
  
  // UI/App state keys
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  
  // Cache keys with TTL
  WORKSPACE_CACHE: 'workspaceCache',
  USER_CACHE: 'userCache',
  
  // Legacy keys to clean up during migration
  LEGACY_KEYS: [
    'workspace',
    'auth_workspace', 
    'selected_workspace_id',
    'permissions',
    'user_permissions',
    // Old permission cache patterns
    'permissions_*_workspace_*',
    'user_permissions_*_*',
    'auth_permissions_*_*',
  ]
} as const;

// Storage utility functions
export class StorageManager {
  private static isClient = typeof window !== 'undefined';

  /**
   * Get item from localStorage with error handling
   */
  static getItem<T = string>(key: string): T | null {
    if (!this.isClient) return null;
    
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(item);
      } catch {
        return item as T;
      }
    } catch (error) {
      console.warn(`Failed to get '${key}' from localStorage:`, error);
      return null;
    }
  }

  /**
   * Set item in localStorage with error handling
   */
  static setItem(key: string, value: any): boolean {
    if (!this.isClient) return false;
    
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.warn(`Failed to set '${key}' in localStorage:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage with error handling
   */
  static removeItem(key: string): boolean {
    if (!this.isClient) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove '${key}' from localStorage:`, error);
      return false;
    }
  }

  /**
   * Get current workspace from storage
   */
  static getCurrentWorkspace(): any | null {
    return this.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);
  }

  /**
   * Set current workspace in storage
   */
  static setCurrentWorkspace(workspace: any): boolean {
    return this.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, workspace);
  }

  /**
   * Get user permissions from storage with proper key format
   */
  static getUserPermissions(userId: string, workspaceId: string): string[] | null {
    const key = `${STORAGE_KEYS.PERMISSIONS_PREFIX}${userId}_${workspaceId}`;
    const cached = this.getItem<{
      permissions: string[];
      timestamp: number;
      ttl: number;
    }>(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.permissions;
    }
    
    return null;
  }

  /**
   * Set user permissions in storage with TTL
   */
  static setUserPermissions(
    userId: string, 
    workspaceId: string, 
    permissions: string[], 
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ): boolean {
    const key = `${STORAGE_KEYS.PERMISSIONS_PREFIX}${userId}_${workspaceId}`;
    const cacheData = {
      permissions,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    return this.setItem(key, cacheData);
  }

  /**
   * Clean up legacy storage keys
   */
  static cleanupLegacyKeys(): void {
    if (!this.isClient) return;

    console.log('🧹 StorageManager: Cleaning up legacy keys');
    
    // Remove known legacy keys
    STORAGE_KEYS.LEGACY_KEYS.forEach(key => {
      if (!key.includes('*')) {
        this.removeItem(key);
      }
    });

    // Clean up pattern-based keys (permissions_*_workspace_*)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Clean up old permission cache patterns
          if (
            key.match(/^permissions_.+_workspace_.+$/) ||
            key.match(/^user_permissions_.+_.+$/) ||
            key.match(/^auth_permissions_.+_.+$/)
          ) {
            // Only remove if it doesn't match our new format
            if (!key.match(/^permissions_.+_.+$/)) {
              this.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error during legacy key cleanup:', error);
    }

    console.log('✅ StorageManager: Legacy key cleanup completed');
  }

  /**
   * Clear all app-related storage (for logout)
   */
  static clearAll(): void {
    if (!this.isClient) return;

    console.log('🗑️ StorageManager: Clearing all app storage');

    // Clear main app keys
    Object.values(STORAGE_KEYS).forEach(key => {
      if (typeof key === 'string' && !key.includes('_PREFIX')) {
        this.removeItem(key);
      }
    });

    // Clear permission cache keys
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.PERMISSIONS_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => this.removeItem(key));
    } catch (error) {
      console.warn('Error clearing permission cache:', error);
    }

    // Clean up any remaining legacy keys
    this.cleanupLegacyKeys();

    console.log('✅ StorageManager: Storage cleared');
  }

  /**
   * Debug: Log current storage state
   */
  static debugStorage(): void {
    if (!this.isClient || process.env.NODE_ENV !== 'development') return;

    console.group('🔍 StorageManager Debug');
    
    // Log main keys
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      if (typeof key === 'string' && !key.includes('_PREFIX') && !key.includes('*')) {
        const value = this.getItem(key);
        console.log(`${name} (${key}):`, value);
      }
    });

    // Log permission keys
    const permissionKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.PERMISSIONS_PREFIX)) {
        permissionKeys.push(key);
      }
    }
    if (permissionKeys.length > 0) {
      console.log('Permission cache keys:', permissionKeys);
    }

    console.groupEnd();
  }
}

// Export utilities for backward compatibility
export const getStorageItem = StorageManager.getItem;
export const setStorageItem = StorageManager.setItem;
export const removeStorageItem = StorageManager.removeItem;