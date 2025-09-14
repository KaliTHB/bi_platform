// web-application/src/context/PermissionContext.tsx - IMPROVED WITH LOCALSTORAGE PRIORITY
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { apiClient } from '@/utils/apiUtils';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Consolidated storage keys
const STORAGE_KEYS = {
  CURRENT_WORKSPACE: 'currentWorkspace',
  PERMISSIONS_PREFIX: 'permissions_', // permissions_userId_workspaceId
} as const;

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 15 * 60 * 1000, // 15 minutes (increased from 5)
  MAX_TTL: 60 * 60 * 1000,     // 1 hour maximum
  ERROR_TTL: 5 * 60 * 1000,    // 5 minutes for error cases
  DEBOUNCE_DELAY: 1000,        // 1 second debounce for API calls
};

interface CachedPermissions {
  permissions: string[];
  timestamp: number;
  ttl: number;
  version: string; // To handle cache invalidation
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // Ref to track API call debouncing
  const apiCallTimeoutRef = useRef<NodeJS.Timeout>();
  const lastApiCallRef = useRef<number>(0);

  // Generate cache key
  const getCacheKey = useCallback(() => {
    if (!user || !currentWorkspace) return null;
    return `${STORAGE_KEYS.PERMISSIONS_PREFIX}${user.id}_${currentWorkspace.id}`;
  }, [user?.id, currentWorkspace?.id]);

  // Load permissions from localStorage
  const loadFromCache = useCallback((): CachedPermissions | null => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsedCache: CachedPermissions = JSON.parse(cached);
      
      // Check if cache is still valid
      const isValid = Date.now() - parsedCache.timestamp < parsedCache.ttl;
      
      if (isValid) {
        console.log('✅ PermissionContext: Loaded permissions from localStorage', {
          permissionCount: parsedCache.permissions.length,
          age: Date.now() - parsedCache.timestamp,
          ttl: parsedCache.ttl
        });
        return parsedCache;
      } else {
        console.log('⏰ PermissionContext: Cache expired, removing', {
          age: Date.now() - parsedCache.timestamp,
          ttl: parsedCache.ttl
        });
        localStorage.removeItem(cacheKey);
        return null;
      }
    } catch (error) {
      console.error('❌ PermissionContext: Error loading from cache:', error);
      // Remove corrupted cache
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {
        console.warn('Failed to remove corrupted cache');
      }
      return null;
    }
  }, [getCacheKey]);

  // Save permissions to localStorage
  const saveToCache = useCallback((perms: string[], ttl = CACHE_CONFIG.DEFAULT_TTL) => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    try {
      const cacheData: CachedPermissions = {
        permissions: perms,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('💾 PermissionContext: Permissions saved to localStorage', {
        permissionCount: perms.length,
        ttl,
        key: cacheKey
      });
    } catch (error) {
      console.error('❌ PermissionContext: Error saving to cache:', error);
    }
  }, [getCacheKey]);

  // Clear cache manually
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    try {
      localStorage.removeItem(cacheKey);
      console.log('🧹 PermissionContext: Cache cleared');
    } catch (error) {
      console.error('❌ PermissionContext: Error clearing cache:', error);
    }
  }, [getCacheKey]);

  // Fetch permissions from API (with rate limiting protection)
  const fetchFromAPI = useCallback(async (): Promise<string[]> => {
    if (!user || !currentWorkspace) {
      throw new Error('Missing user or workspace');
    }

    // Rate limiting protection
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallRef.current;
    const minInterval = CACHE_CONFIG.DEBOUNCE_DELAY;

    if (timeSinceLastCall < minInterval) {
      console.log('🚨 PermissionContext: API call rate limited, using cache');
      const cached = loadFromCache();
      if (cached) {
        return cached.permissions;
      }
      // If no cache, wait for rate limit to pass
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
    }

    console.log('🔄 PermissionContext: Fetching permissions from API');
    lastApiCallRef.current = Date.now();

    const response = await apiClient.get(`/permissions/my-permissions/${currentWorkspace.id}`);
    
    if (response.data.success) {
      const userPermissions = response.data.data.permissions || [];
      
      // Save to cache with extended TTL on successful API call
      saveToCache(userPermissions, CACHE_CONFIG.DEFAULT_TTL);
      
      console.log('✅ PermissionContext: Permissions fetched from API', {
        permissionCount: userPermissions.length
      });
      
      return userPermissions;
    } else {
      throw new Error(response.data.message || 'Failed to fetch permissions');
    }
  }, [user, currentWorkspace, loadFromCache, saveToCache]);

  // Main permission loading function with localStorage priority
  const loadPermissions = useCallback(async () => {
    if (!user || !currentWorkspace) {
      setPermissions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🔥 PRIORITY 1: Try localStorage first
      console.log('🔄 PermissionContext: Loading permissions...');
      const cachedPermissions = loadFromCache();
      
      if (cachedPermissions) {
        // Use cached permissions immediately
        setPermissions(cachedPermissions.permissions);
        setIsLoading(false);
        console.log('✅ PermissionContext: Using cached permissions');
        return;
      }

      // 🔥 PRIORITY 2: Only call API if localStorage is empty/expired
      console.log('💡 PermissionContext: No valid cache found, fetching from API');
      const apiPermissions = await fetchFromAPI();
      setPermissions(apiPermissions);

    } catch (err: any) {
      console.error('❌ PermissionContext: Error loading permissions:', err);
      
      // Check if it's a rate limiting error
      if (err.response?.status === 429) {
        setError('Rate limited - using cached permissions if available');
        
        // Try to load any cached permissions, even if expired, as fallback
        try {
          const cacheKey = getCacheKey();
          if (cacheKey) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsedCache: CachedPermissions = JSON.parse(cached);
              setPermissions(parsedCache.permissions);
              console.log('⚠️ PermissionContext: Using expired cache due to rate limit');
              
              // Extend the cache TTL to avoid immediate retry
              saveToCache(parsedCache.permissions, CACHE_CONFIG.ERROR_TTL);
              return;
            }
          }
        } catch (cacheError) {
          console.error('Error loading fallback cache:', cacheError);
        }
      }
      
      setError(err.message || 'Failed to load permissions');
      // Don't clear existing permissions on error
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, loadFromCache, fetchFromAPI, getCacheKey, saveToCache]);

  // Refresh permissions (force API call)
  const refreshPermissions = useCallback(async () => {
    if (!user || !currentWorkspace) return;

    console.log('🔄 PermissionContext: Refreshing permissions (force API call)');
    clearCache();
    
    try {
      setIsLoading(true);
      setError(null);
      
      const apiPermissions = await fetchFromAPI();
      setPermissions(apiPermissions);
    } catch (err: any) {
      console.error('❌ PermissionContext: Error refreshing permissions:', err);
      setError(err.message || 'Failed to refresh permissions');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, clearCache, fetchFromAPI]);

  // Load permissions when user or workspace changes
  useEffect(() => {
    // Clear any pending API call
    if (apiCallTimeoutRef.current) {
      clearTimeout(apiCallTimeoutRef.current);
    }

    // Debounce the permission loading
    apiCallTimeoutRef.current = setTimeout(() => {
      loadPermissions();
    }, 100);

    return () => {
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
    };
  }, [user?.id, currentWorkspace?.id]);

  // Clean up old permission cache keys when workspace changes
  useEffect(() => {
    if (currentWorkspace && user) {
      // Clean up old permission cache keys that might use different formats
      const oldKeys = [
        `permissions_${user.id}_workspace_${currentWorkspace.id}`,
        `user_permissions_${user.id}_${currentWorkspace.id}`,
        `auth_permissions_${user.id}_${currentWorkspace.id}`,
      ];
      
      oldKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove old permission cache key ${key}:`, error);
        }
      });
    }
  }, [currentWorkspace?.id, user?.id]);

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions]);

  const contextValue: PermissionContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error,
    refreshPermissions,
    clearCache,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}