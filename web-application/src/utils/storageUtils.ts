// web-application/src/utils/storageUtils.ts
// Consolidated localStorage utilities with type safety and error handling

/**
 * Consolidated storage keys to prevent key collisions and ensure consistency
 */

// Consolidated storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  PERMISSIONS: 'permissions',
  CURRENT_WORKSPACE: 'currentWorkspace', // ✅ Single workspace key
  AVAILABLE_WORKSPACES: 'workspaces'
} as const;

/**
 * Type-safe storage key type
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;

/**
 * Get item from localStorage with error handling
 * @param key - Storage key
 * @returns Parsed value or null if not found/error
 */
export const getStorageItem = <T = any>(key: StorageKey): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  } catch (error) {
    console.warn(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Set item in localStorage with automatic serialization
 * @param key - Storage key  
 * @param value - Value to store (will be JSON.stringified if not string)
 */
export const setStorageItem = (key: StorageKey, value: any): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.warn(`Failed to set ${key} in localStorage:`, error);
    return false;
  }
};

/**
 * Remove item from localStorage
 * @param key - Storage key to remove
 */
export const removeStorageItem = (key: StorageKey): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage:`, error);
    return false;
  }
};

/**
 * Check if localStorage item exists
 * @param key - Storage key to check
 */
export const hasStorageItem = (key: StorageKey): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.warn(`Failed to check ${key} in localStorage:`, error);
    return false;
  }
};

/**
 * Clear all app-related localStorage items
 * Uses the STORAGE_KEYS to ensure all app data is cleared
 */
export const clearAllStorage = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also clean up old workspace keys
    cleanupOldWorkspaceKeys();
    
    console.log('✅ All app storage cleared');
  } catch (error) {
    console.warn('Failed to clear all storage:', error);
  }
};

/**
 * Clean up old workspace-related keys from previous versions
 * This ensures migration compatibility and prevents storage bloat
 */
export const cleanupOldWorkspaceKeys = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  const oldWorkspaceKeys = [
    'workspace',
    'auth_workspace', 
    'selected_workspace_id',
    'selected_workspace',
    'user_workspace',
    'current_workspace_data',
    'active_workspace',
  ];
  
  // Clean up old permission cache keys pattern
  const oldPermissionKeyPatterns = [
    'permissions_',
    'user_permissions_',
    'auth_permissions_',
    'workspace_permissions_',
  ];
  
  try {
    // Remove old workspace keys
    oldWorkspaceKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Silently ignore errors for individual key removal
      }
    });
    
    // Clean up permission keys by pattern
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && oldPermissionKeyPatterns.some(pattern => key.startsWith(pattern))) {
        try {
          localStorage.removeItem(key);
          i--; // Adjust index since localStorage.length changed
        } catch (error) {
          // Silently ignore errors for individual key removal
        }
      }
    }
    
    console.log('🧹 Cleaned up old workspace keys');
  } catch (error) {
    console.warn('Failed to cleanup old workspace keys:', error);
  }
};

/**
 * Get all storage items for debugging
 * @returns Object with all localStorage items
 */
export const getAllStorageItems = (): Record<string, any> => {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const items: Record<string, any> = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items[key] = getStorageItem(key);
      }
    }
  } catch (error) {
    console.warn('Failed to get all storage items:', error);
  }
  
  return items;
};

/**
 * Get storage usage information
 * @returns Object with storage stats
 */
export const getStorageInfo = (): {
  used: number;
  total: number;
  available: number;
  itemCount: number;
} => {
  if (typeof window === 'undefined') {
    return { used: 0, total: 0, available: 0, itemCount: 0 };
  }
  
  try {
    let used = 0;
    const itemCount = localStorage.length;
    
    // Calculate used space (approximate)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        used += key.length + (value?.length || 0);
      }
    }
    
    // Most browsers have 5-10MB limit for localStorage
    const total = 5 * 1024 * 1024; // 5MB estimate
    const available = total - used;
    
    return {
      used,
      total,
      available,
      itemCount,
    };
  } catch (error) {
    console.warn('Failed to get storage info:', error);
    return { used: 0, total: 0, available: 0, itemCount: 0 };
  }
};

/**
 * Test localStorage availability
 * @returns true if localStorage is available and working
 */
export const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const testKey = '__storage_test__';
    const testValue = 'test';
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    return retrieved === testValue;
  } catch {
    return false;
  }
};

// Export default object with all functions for convenience
export default {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearAllStorage,
  cleanupOldWorkspaceKeys,
  getAllStorageItems,
  getStorageInfo,
  isStorageAvailable,
};