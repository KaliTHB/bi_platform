// web-application/src/hooks/usePermissions.ts - COMPLETE VERSION

import { useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import {
  useGetCurrentUserPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useRefreshUserPermissionsMutation,
  useLazySearchPermissionsQuery,
  useGetAllPermissionsQuery,
  useCheckPermissionsMutation
} from '@/store/api/permissionApi';
import {
  setPermissions,
  setLoading as setPermissionLoading,
  clearError as clearPermissionError,
  setError as setPermissionError
} from '@/store/slices/permissionSlice';
import {
  setPermissions as setAuthPermissions,
  setError as setAuthError,
  refreshUserPermissions,
  loadUserPermissions
} from '@/store/slices/authSlice';
import { authStorage } from '@/utils/storageUtils';

// Types
interface PermissionCheck {
  permission: string;
  granted: boolean;
  reason?: string;
}

interface PermissionSearchResult {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  resource_type: string;
  action: string;
}

interface UsePermissionsOptions {
  autoLoad?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

interface UsePermissionsReturn {
  // Permission data
  permissions: string[];
  allSystemPermissions: any[];
  isLoading: boolean;
  error: string | null;
  permissionsLoaded: boolean;
  
  // Permission checking methods
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasPermissionPattern: (pattern: string) => boolean;
  checkPermissionsBatch: (permissions: string[]) => Promise<PermissionCheck[]>;
  
  // Permission management methods
  loadPermissions: () => Promise<string[]>;
  refreshPermissions: () => Promise<void>;
  clearPermissions: () => void;
  
  // Search and discovery methods
  searchPermissions: (query: string) => Promise<PermissionSearchResult[]>;
  getPermissionsByCategory: (category: string) => string[];
  getPermissionsByResource: (resource: string) => string[];
  getAllCategories: () => string[];
  
  // Utility methods
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  canAccess: (resource: string, action?: string) => boolean;
  getHighestRole: () => string | null;
  getUserRoleLevel: () => number;
}

export const usePermissions = (options: UsePermissionsOptions = {}): UsePermissionsReturn => {
  const {
    autoLoad = true,
    enableCaching = true,
    cacheTimeout = 30 * 60 * 1000 // 30 minutes
  } = options;

  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Redux state
  const {
    permissions: userPermissions,
    loading: permissionLoading,
    error: permissionError
  } = useAppSelector((state) => state.permissions);
  
  const { permissions: authPermissions } = useAppSelector((state) => state.auth);

  // RTK Query hooks
  const {
    data: permissionsData,
    isLoading: permissionsQueryLoading,
    error: permissionsQueryError,
    refetch: refetchPermissions
  } = useGetCurrentUserPermissionsQuery(
    { workspaceId: currentWorkspace?.id },
    {
      skip: !isAuthenticated || !token || !currentWorkspace?.id || !autoLoad,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  
  const {
    data: allPermissionsData,
    isLoading: allPermissionsLoading
  } = useGetAllPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [loadPermissionsLazy, { 
    isLoading: lazyPermissionsLoading 
  }] = useLazyGetCurrentUserPermissionsQuery();

  const [refreshPermissionsMutation, { 
    isLoading: refreshingPermissions 
  }] = useRefreshUserPermissionsMutation();

  const [checkPermissionsMutation] = useCheckPermissionsMutation();
  const [searchPermissions] = useLazySearchPermissionsQuery();

  // ✅ Combined permission data with proper deduplication
  const permissions = useMemo(() => {
    const allPermissions = new Set([
      ...(authPermissions || []),
      ...(userPermissions || []),
      ...(permissionsData?.permissions || [])
    ]);
    const result = Array.from(allPermissions);
    
    console.log('🔄 usePermissions: Combined permissions:', {
      authPermissions: authPermissions?.length || 0,
      userPermissions: userPermissions?.length || 0,
      apiPermissions: permissionsData?.permissions?.length || 0,
      totalUnique: result.length,
      permissions: result.slice(0, 5) // Show first 5 for debugging
    });
    
    return result;
  }, [authPermissions, userPermissions, permissionsData?.permissions]);

  // Combined loading state
  const isLoading = permissionLoading || permissionsQueryLoading || lazyPermissionsLoading || refreshingPermissions || allPermissionsLoading;

  // Combined error state
  const error = permissionError || (permissionsQueryError as any)?.message || null;

  // ✅ Better permission loaded check
  const permissionsLoaded = !!(
    (permissions.length > 0) || 
    (isAuthenticated && !isLoading && currentWorkspace?.id)
  );

  // All system permissions
  const allSystemPermissions = useMemo(() => {
    return allPermissionsData?.permissions || [];
  }, [allPermissionsData?.permissions]);

  // ✅ CRITICAL: Auto-load permissions on initial authentication
  useEffect(() => {
    if (!autoLoad) return;

    const shouldLoadPermissions = (
      isAuthenticated && 
      currentWorkspace?.id && 
      permissions.length === 0 && 
      !isLoading &&
      !permissionsData // No data from RTK Query yet
    );

    if (shouldLoadPermissions) {
      console.log('🔄 usePermissions: Auto-loading permissions on initial auth...');
      loadPermissions();
    }
  }, [isAuthenticated, currentWorkspace?.id, permissions.length, isLoading, permissionsData, autoLoad]);

  // ========================================
  // PERMISSION MANAGEMENT METHODS
  // ========================================

  // Load permissions manually with caching using storage utilities
  const loadPermissions = useCallback(async (): Promise<string[]> => {
    if (!isAuthenticated || !token) {
      console.warn('⚠️ usePermissions: Cannot load - user not authenticated');
      return [];
    }

    try {
      console.log('🔍 usePermissions: Loading permissions...', {
        userId: user?.id,
        workspaceId: currentWorkspace?.id,
        hasToken: !!token
      });

      dispatch(setPermissionLoading(true));
      dispatch(clearPermissionError());

      // ✅ First try to get from cache using authStorage
      if (enableCaching) {
        const cachedPermissions = authStorage.getPermissions(currentWorkspace?.id);
        if (cachedPermissions && cachedPermissions.length > 0) {
          console.log('✅ usePermissions: Using cached permissions:', cachedPermissions.length);
          dispatch(setPermissions(cachedPermissions));
          dispatch(setAuthPermissions(cachedPermissions));
          dispatch(setPermissionLoading(false));
          return cachedPermissions;
        }
      }

      // ✅ Load from API if no cache
      const result = await loadPermissionsLazy({ 
        workspaceId: currentWorkspace?.id 
      }).unwrap();
      
      const loadedPermissions = result.permissions || [];
      
      // ✅ Cache the results using authStorage
      if (enableCaching && loadedPermissions.length > 0) {
        authStorage.setPermissions(loadedPermissions, currentWorkspace?.id);
      }
      
      // Update both slices
      dispatch(setPermissions(loadedPermissions));
      dispatch(setAuthPermissions(loadedPermissions));
      
      console.log('✅ usePermissions: Permissions loaded successfully:', {
        count: loadedPermissions.length,
        sample: loadedPermissions.slice(0, 3)
      });

      return loadedPermissions;
    } catch (error: any) {
      console.error('❌ usePermissions: Failed to load permissions:', error);
      
      const errorMessage = error.message || 'Failed to load permissions';
      dispatch(setPermissionError(errorMessage));
      dispatch(setAuthError(errorMessage));
      return [];
    } finally {
      dispatch(setPermissionLoading(false));
    }
  }, [isAuthenticated, token, user?.id, currentWorkspace?.id, enableCaching, dispatch, loadPermissionsLazy]);

  // Refresh permissions with cache invalidation using storage utilities
  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      console.log('🔄 usePermissions: Refreshing permissions...');
      dispatch(setPermissionLoading(true));
      
      // Clear cached permissions using authStorage
      if (enableCaching) {
        authStorage.clearPermissions(currentWorkspace?.id);
      }
      
      // Use the auth slice refresh method
      await dispatch(refreshUserPermissions({ workspaceId: currentWorkspace?.id })).unwrap();
      
      await refetchPermissions();
      
      // Reload permissions
      await loadPermissions();
      
      console.log('✅ usePermissions: Permissions refreshed successfully');
    } catch (error: any) {
      console.error('❌ usePermissions: Failed to refresh permissions:', error);
      const errorMessage = error.message || 'Failed to refresh permissions';
      dispatch(setPermissionError(errorMessage));
      dispatch(setAuthError(errorMessage));
    } finally {
      dispatch(setPermissionLoading(false));
    }
  }, [isAuthenticated, enableCaching, currentWorkspace?.id, dispatch, refreshUserPermissions, refetchPermissions, loadPermissions]);

  // Clear permissions
  const clearPermissions = useCallback((): void => {
    console.log('🔄 usePermissions: Clearing permissions...');
    
    if (enableCaching) {
      authStorage.clearPermissions(currentWorkspace?.id);
    }
    
    dispatch(setPermissions([]));
    dispatch(setAuthPermissions([]));
  }, [enableCaching, currentWorkspace?.id, dispatch]);

  // ========================================
  // PERMISSION CHECK METHODS
  // ========================================

  // Check single permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permissions.length) {
      console.warn(`⚠️ usePermissions: No permissions loaded when checking: ${permission}`);
      return false;
    }
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of the required permissions
  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.some(perm => permissions.includes(perm));
  }, [permissions]);

  // Check if user has all required permissions
  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.every(perm => permissions.includes(perm));
  }, [permissions]);

  // Pattern-based permission checking (e.g., "dashboard.*", "user.create")
  const hasPermissionPattern = useCallback((pattern: string): boolean => {
    if (!permissions.length) return false;
    
    const regexPattern = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
    );
    
    return permissions.some(permission => regexPattern.test(permission));
  }, [permissions]);

  // Batch permission checking
  const checkPermissionsBatch = useCallback(async (permissionsToCheck: string[]): Promise<PermissionCheck[]> => {
    try {
      const result = await checkPermissionsMutation({
        permissions: permissionsToCheck,
        workspaceId: currentWorkspace?.id
      }).unwrap();

      return result.data?.results || permissionsToCheck.map(permission => ({
        permission,
        granted: hasPermission(permission),
        reason: hasPermission(permission) ? 'Granted' : 'Not granted'
      }));
    } catch (error) {
      console.error('❌ usePermissions: Batch check failed:', error);
      
      // Fallback to local checking
      return permissionsToCheck.map(permission => ({
        permission,
        granted: hasPermission(permission),
        reason: hasPermission(permission) ? 'Granted' : 'Not granted'
      }));
    }
  }, [checkPermissionsMutation, currentWorkspace?.id, hasPermission]);

  // ========================================
  // SEARCH AND DISCOVERY METHODS
  // ========================================

  // Search permissions by query
  const searchPermissionsQuery = useCallback(async (query: string): Promise<PermissionSearchResult[]> => {
    try {
      const result = await searchPermissions({ query }).unwrap();
      return result.permissions || [];
    } catch (error) {
      console.error('❌ usePermissions: Search failed:', error);
      
      // Fallback to local filtering
      return allSystemPermissions.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.display_name?.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);
    }
  }, [searchPermissions, allSystemPermissions]);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((category: string): string[] => {
    if (!permissions.length) return [];
    return permissions.filter(permission => 
      permission.startsWith(category + '.') || 
      allSystemPermissions.find(p => p.name === permission)?.category === category
    );
  }, [permissions, allSystemPermissions]);

  // Get permissions by resource
  const getPermissionsByResource = useCallback((resource: string): string[] => {
    if (!permissions.length) return [];
    return permissions.filter(permission => 
      permission.includes(resource) ||
      allSystemPermissions.find(p => p.name === permission)?.resource_type === resource
    );
  }, [permissions, allSystemPermissions]);

  // Get all permission categories
  const getAllCategories = useCallback((): string[] => {
    const categories = new Set<string>();
    
    permissions.forEach(permission => {
      const parts = permission.split('.');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });
    
    allSystemPermissions.forEach(permission => {
      if (permission.category) {
        categories.add(permission.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [permissions, allSystemPermissions]);

  // ========================================
  // UTILITY METHODS
  // ========================================

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return hasPermission('admin_access') || 
           hasPermission('workspace_admin') || 
           hasPermissionPattern('admin.*');
  }, [hasPermission, hasPermissionPattern]);

  // Check if user is super admin
  const isSuperAdmin = useCallback((): boolean => {
    return hasPermission('super_admin') || 
           hasPermission('system_admin') ||
           hasPermissionPattern('super.*');
  }, [hasPermission, hasPermissionPattern]);

  // Check if user can access a resource with optional action
  const canAccess = useCallback((resource: string, action?: string): boolean => {
    if (action) {
      return hasPermission(`${resource}.${action}`) || 
             hasPermission(`${resource}.*`) ||
             hasPermissionPattern(`${resource}.*`);
    }
    
    return hasPermissionPattern(`${resource}.*`) || 
           permissions.some(p => p.includes(resource));
  }, [hasPermission, hasPermissionPattern, permissions]);

  // Get highest role based on permissions
  const getHighestRole = useCallback((): string | null => {
    if (isSuperAdmin()) return 'super_admin';
    if (isAdmin()) return 'admin';
    if (hasPermission('workspace_owner')) return 'owner';
    if (hasPermission('workspace_manager')) return 'manager';
    if (hasPermissionPattern('*.create')) return 'contributor';
    if (hasPermissionPattern('*.view')) return 'reader';
    return null;
  }, [isSuperAdmin, isAdmin, hasPermission, hasPermissionPattern]);

  // Get user role level (higher number = more permissions)
  const getUserRoleLevel = useCallback((): number => {
    if (isSuperAdmin()) return 100;
    if (isAdmin()) return 90;
    if (hasPermission('workspace_owner')) return 80;
    if (hasPermission('workspace_manager')) return 70;
    if (hasPermissionPattern('*.delete')) return 60;
    if (hasPermissionPattern('*.create')) return 50;
    if (hasPermissionPattern('*.update')) return 40;
    if (hasPermissionPattern('*.view')) return 30;
    return 10;
  }, [isSuperAdmin, isAdmin, hasPermission, hasPermissionPattern]);

  // ========================================
  // RETURN OBJECT
  // ========================================

  return {
    // Permission data
    permissions,
    allSystemPermissions,
    isLoading,
    error,
    permissionsLoaded,
    
    // Permission checking methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionPattern,
    checkPermissionsBatch,
    
    // Permission management methods
    loadPermissions,
    refreshPermissions,
    clearPermissions,
    
    // Search and discovery methods
    searchPermissions: searchPermissionsQuery,
    getPermissionsByCategory,
    getPermissionsByResource,
    getAllCategories,
    
    // Utility methods
    isAdmin,
    isSuperAdmin,
    canAccess,
    getHighestRole,
    getUserRoleLevel,
  };
};

// ========================================
// SPECIALIZED HOOKS
// ========================================

/**
 * Hook for checking specific permissions without loading overhead
 */
export const usePermissionCheck = (permissionsToCheck: string | string[]) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissionsLoaded } = usePermissions();
  
  const permissions = Array.isArray(permissionsToCheck) ? permissionsToCheck : [permissionsToCheck];
  
  return {
    hasPermission: (permission: string) => hasPermission(permission),
    hasAny: hasAnyPermission(permissions),
    hasAll: hasAllPermissions(permissions),
    isLoaded: permissionsLoaded,
  };
};

/**
 * Hook for role-based checks
 */
export const useRoleCheck = () => {
  const { isAdmin, isSuperAdmin, getHighestRole, getUserRoleLevel } = usePermissions();
  
  return {
    isAdmin,
    isSuperAdmin,
    getHighestRole,
    getUserRoleLevel,
    isRole: (role: string) => getHighestRole() === role,
    hasMinRole: (minLevel: number) => getUserRoleLevel() >= minLevel,
  };
};

export default usePermissions;