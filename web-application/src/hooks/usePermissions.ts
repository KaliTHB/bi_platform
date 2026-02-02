// src/hooks/usePermissions.ts - COMPLETE FIXED VERSION

import { useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import {
  useLazySearchPermissionsQuery,
  useGetPermissionsQuery
} from '@/store/api/permissionApi';
import {
  useGetCurrentUserPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useRefreshUserPermissionsMutation,
  useLazyCheckUserPermissionsQuery
} from '@/store/api/authApi';
import {
  setPermissions,
  setPermissionLoading,
  clearPermissionError,
  setPermissionError
} from '@/store/slices/permissionSlice';
import {
  setPermissions as setAuthPermissions,
  clearError as clearAuthError,
  refreshUserPermissions,
  loadUserPermissions
} from '@/store/slices/authSlice';
import { authStorage } from '@/utils/storageUtils';

// ========================================
// TYPES AND INTERFACES
// ========================================

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

// ========================================
// MAIN HOOK IMPLEMENTATION
// ========================================

export const usePermissions = (options: UsePermissionsOptions = {}): UsePermissionsReturn => {
  const {
    autoLoad = true,
    enableCaching = true,
    cacheTimeout = 30 * 60 * 1000 // 30 minutes
  } = options;

  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // ✅ FIXED: Redux state selectors with correct slice name and property names
  const {
    userPermissions,           // ✅ Use userPermissions from permissionSlice
    loading: permissionLoading,
    error: permissionError
  } = useAppSelector((state) => state.permission); // ✅ Use 'permission' (singular)
  
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
  } = useGetPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [loadPermissionsLazy, { 
    isLoading: lazyPermissionsLoading 
  }] = useLazyGetCurrentUserPermissionsQuery();

  const [refreshPermissionsMutation, { 
    isLoading: refreshingPermissions 
  }] = useRefreshUserPermissionsMutation();

  const [checkUserPermissionsQuery] = useLazyCheckUserPermissionsQuery();
  
  const [searchPermissionsQuery] = useLazySearchPermissionsQuery();

  // ✅ FIXED: Combined permission data with correct variable names
  const permissions = useMemo(() => {
    const allPermissions = new Set([
      ...(authPermissions || []),
      ...(userPermissions || []),              // ✅ Use userPermissions
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

  // Permission loaded check
  const permissionsLoaded = (
    (permissions.length > 0) || 
    (isAuthenticated && !isLoading && currentWorkspace?.id)
  );

  // All system permissions
  const allSystemPermissions = useMemo(() => {
    return allPermissionsData?.data || [];
  }, [allPermissionsData?.data]);

  // ========================================
  // PERMISSION MANAGEMENT METHODS
  // ========================================

  // Load permissions
  const loadPermissions = useCallback(async (): Promise<string[]> => {
    try {
      if (!isAuthenticated || !currentWorkspace?.id) {
        console.log('⚠️ usePermissions: Cannot load - not authenticated or no workspace');
        return [];
      }

      console.log('🔄 usePermissions: Loading permissions via lazy query...');
      dispatch(setPermissionLoading(true));
      dispatch(clearPermissionError());

      const result = await loadPermissionsLazy({ 
        workspaceId: currentWorkspace.id 
      }).unwrap();

      const loadedPermissions = result?.permissions || [];
      
      // Update Redux state
      dispatch(setPermissions(loadedPermissions));
      
      console.log('✅ usePermissions: Permissions loaded:', {
        count: loadedPermissions.length,
        workspaceId: currentWorkspace.id
      });

      return loadedPermissions;
    } catch (error: any) {
      console.error('❌ usePermissions: Load failed:', error);
      const errorMessage = error.message || 'Failed to load permissions';
      dispatch(setPermissionError(errorMessage));
      return [];
    } finally {
      dispatch(setPermissionLoading(false));
    }
  }, [dispatch, loadPermissionsLazy, isAuthenticated, currentWorkspace?.id]);

  // Refresh permissions
  const refreshPermissions = useCallback(async (): Promise<void> => {
    try {
      if (!isAuthenticated || !currentWorkspace?.id) {
        console.log('⚠️ usePermissions: Cannot refresh - not authenticated or no workspace');
        return;
      }

      console.log('🔄 usePermissions: Refreshing permissions...');
      dispatch(setPermissionLoading(true));
      dispatch(clearPermissionError());

      // Call refresh mutation
      const result = await refreshPermissionsMutation({ 
        workspaceId: currentWorkspace.id 
      }).unwrap();

      const refreshedPermissions = result?.permissions || [];
      
      // Update Redux state
      dispatch(setPermissions(refreshedPermissions));
      
      // Also update auth permissions if available
      if (result?.permissions) {
        dispatch(setAuthPermissions(result.permissions));
      }

      console.log('✅ usePermissions: Permissions refreshed:', {
        count: refreshedPermissions.length,
        workspaceId: currentWorkspace.id
      });
    } catch (error: any) {
      console.error('❌ usePermissions: Refresh failed:', error);
      const errorMessage = error.message || 'Failed to refresh permissions';
      dispatch(setPermissionError(errorMessage));
    } finally {
      dispatch(setPermissionLoading(false));
    }
  }, [dispatch, refreshPermissionsMutation, isAuthenticated, currentWorkspace?.id, setAuthPermissions]);

  // Clear permissions
  const clearPermissions = useCallback(() => {
    console.log('🧹 usePermissions: Clearing permissions');
    dispatch(setPermissions([]));
    dispatch(clearPermissionError());
  }, [dispatch]);

  // ========================================
  // AUTO-LOAD EFFECT
  // ========================================

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
  }, [isAuthenticated, currentWorkspace?.id, permissions.length, isLoading, permissionsData, autoLoad, loadPermissions]);

  // ========================================
  // PERMISSION CHECKING METHODS
  // ========================================

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permission || !permissions.length) return false;
    
    // Direct match
    if (permissions.includes(permission)) return true;
    
    // Wildcard match (e.g., 'admin.*' matches 'admin.users')
    const wildcardPermissions = permissions.filter(p => p.endsWith('.*'));
    return wildcardPermissions.some(wildcard => {
      const prefix = wildcard.slice(0, -2); // Remove '.*'
      return permission.startsWith(prefix + '.');
    });
  }, [permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissionsToCheck: string[]): boolean => {
    if (!permissionsToCheck.length || !permissions.length) return false;
    return permissionsToCheck.some(permission => hasPermission(permission));
  }, [hasPermission, permissions]);

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback((permissionsToCheck: string[]): boolean => {
    if (!permissionsToCheck.length) return true;
    if (!permissions.length) return false;
    return permissionsToCheck.every(permission => hasPermission(permission));
  }, [hasPermission, permissions]);

  // Check if user has permissions matching a pattern
  const hasPermissionPattern = useCallback((pattern: string): boolean => {
    if (!pattern || !permissions.length) return false;
    
    // Convert pattern to regex (e.g., 'admin.*' becomes /^admin\..+$/)
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.+');
    const regex = new RegExp(`^${regexPattern}$`);
    
    return permissions.some(permission => regex.test(permission));
  }, [permissions]);

  // Batch check permissions
  const checkPermissionsBatch = useCallback(async (permissionsToCheck: string[]): Promise<PermissionCheck[]> => {
    if (!permissionsToCheck.length) return [];

    try {
      const result = await checkUserPermissionsQuery({
        permissions: permissionsToCheck,
        workspaceId: currentWorkspace?.id
      }).unwrap();

      return result?.checks || permissionsToCheck.map(permission => ({
        permission,
        granted: hasPermission(permission),
        reason: hasPermission(permission) ? 'Direct match' : 'Permission not found'
      }));
    } catch (error) {
      console.warn('⚠️ usePermissions: Batch check failed, using local check:', error);
      return permissionsToCheck.map(permission => ({
        permission,
        granted: hasPermission(permission),
        reason: hasPermission(permission) ? 'Local check - granted' : 'Local check - denied'
      }));
    }
  }, [checkUserPermissionsQuery, currentWorkspace?.id, hasPermission]);

  // ========================================
  // SEARCH AND DISCOVERY METHODS
  // ========================================

  // Search permissions
  const searchPermissions = useCallback(async (query: string): Promise<PermissionSearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const result = await searchPermissionsQuery({ query }).unwrap();
      return result?.data || [];
    } catch (error) {
      console.error('❌ usePermissions: Search failed:', error);
      return [];
    }
  }, [searchPermissionsQuery]);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((category: string): string[] => {
    if (!category) return [];
    
    return allSystemPermissions
      .filter((p: any) => p.category === category)
      .map((p: any) => p.name);
  }, [allSystemPermissions]);

  // Get permissions by resource
  const getPermissionsByResource = useCallback((resource: string): string[] => {
    if (!resource) return [];
    
    return permissions.filter(permission => 
      permission.startsWith(`${resource}.`) || permission === resource
    );
  }, [permissions]);

  // Get all categories
  const getAllCategories = useCallback((): string[] => {
    const categories = new Set(
      allSystemPermissions.map((p: any) => p.category).filter(Boolean)
    );
    return Array.from(categories);
  }, [allSystemPermissions]);

  // ========================================
  // UTILITY METHODS
  // ========================================

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return hasPermission('admin') || hasPermissionPattern('admin.*');
  }, [hasPermission, hasPermissionPattern]);

  // Check if user is super admin
  const isSuperAdmin = useCallback((): boolean => {
    return hasPermission('super_admin') || hasPermission('system.admin') || hasPermissionPattern('system.*');
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
    if (hasPermission('workspace.owner')) return 'owner';
    if (hasPermission('workspace.manager')) return 'manager';
    if (hasPermissionPattern('*.create')) return 'contributor';
    if (hasPermissionPattern('*.view')) return 'reader';
    return null;
  }, [isSuperAdmin, isAdmin, hasPermission, hasPermissionPattern]);

  // Get user role level (higher number = more permissions)
  const getUserRoleLevel = useCallback((): number => {
    if (isSuperAdmin()) return 100;
    if (isAdmin()) return 90;
    if (hasPermission('workspace.owner')) return 80;
    if (hasPermission('workspace.manager')) return 70;
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
    searchPermissions,
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