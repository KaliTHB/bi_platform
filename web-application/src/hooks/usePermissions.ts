// =============================================================================
// FILE: web-application/src/hooks/usePermissions.ts (FIXED IMPORTS)
// =============================================================================

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setError, // ✅ FIXED: Use setError instead of setPermissionsError
  clearError,
} from '../store/slices/authSlice';
import {
  setPermissions,
  setPermissionError,
  clearPermissionError,
  setPermissionLoading,
} from '../store/slices/permissionSlice';

// ✅ FIXED: Import correct RTK Query hooks
import { 
  useGetCurrentUserPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useRefreshUserPermissionsMutation,
} from '../store/api/authApi';

// ✅ ALTERNATIVE: If you need permissions-specific queries, use the correct exports from permissionApi
import { 
  useLazySearchPermissionsQuery, // ✅ FIXED: Use correct export name
  useGetPermissionsQuery,
  useGetPermissionsByCategoryQuery,
} from '../store/api/permissionApi';

// Types
interface PermissionHookState {
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  permissionsLoaded: boolean;
}

interface PermissionHookActions {
  loadPermissions: () => Promise<string[]>;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasPermissionPattern: (pattern: string) => boolean;
  getPermissionsByCategory: (category: string) => string[];
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  canManageUsers: () => boolean;
  canManageWorkspaces: () => boolean;
  canViewAnalytics: () => boolean;
  clearError: () => void;
}

export const usePermissions = (): PermissionHookState & PermissionHookActions => {
  const dispatch = useAppDispatch();
  
  // Get auth state
  const { 
    user, 
    token, 
    permissions: authPermissions, 
    isAuthenticated 
  } = useAppSelector(state => state.auth);
  
  // Get workspace state
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  
  // Get permission-specific state
  const {
    userPermissions,
    loading: permissionLoading,
    error: permissionError,
  } = useAppSelector(state => state.permission);

  // ✅ FIXED: RTK Query permissions hooks - using correct exports
  const { 
    data: permissionsData,
    isLoading: permissionsQueryLoading,
    error: permissionsQueryError,
    refetch: refetchPermissions
  } = useGetCurrentUserPermissionsQuery(
    { workspaceId: currentWorkspace?.id },
    {
      skip: !isAuthenticated || !token || !currentWorkspace?.id,
    }
  );
  
  const [loadPermissionsLazy, { 
    isLoading: lazyPermissionsLoading 
  }] = useLazyGetCurrentUserPermissionsQuery();

  const [refreshPermissionsMutation, { 
    isLoading: refreshingPermissions 
  }] = useRefreshUserPermissionsMutation();

  // ✅ FIXED: Use correct search permissions hook
  const [searchPermissions] = useLazySearchPermissionsQuery();

  // Memoized combined permissions (from auth and permission slices)
  const permissions = useMemo(() => {
    const allPermissions = new Set([
      ...(authPermissions || []),
      ...(userPermissions || []),
      ...(permissionsData?.permissions || [])
    ]);
    return Array.from(allPermissions);
  }, [authPermissions, userPermissions, permissionsData?.permissions]);

  // Combined loading state
  const isLoading = permissionLoading || permissionsQueryLoading || lazyPermissionsLoading || refreshingPermissions;

  // Combined error state
  const error = permissionError || null;

  // Check if permissions are loaded
  const permissionsLoaded = !!(permissions.length > 0 || (!isLoading && isAuthenticated));

  // Auto-load permissions when authenticated
  useEffect(() => {
    if (isAuthenticated && currentWorkspace?.id && !permissionsLoaded && !isLoading) {
      loadPermissions();
    }
  }, [isAuthenticated, currentWorkspace?.id, permissionsLoaded, isLoading]);

  // Load permissions manually
  const loadPermissions = async (): Promise<string[]> => {
    if (!isAuthenticated || !token) {
      console.warn('⚠️ Cannot load permissions: user not authenticated');
      return [];
    }

    try {
      console.log('🔍 Permissions Hook: Loading user permissions...');
      dispatch(setPermissionLoading(true));
      dispatch(clearPermissionError());

      const result = await loadPermissionsLazy({ 
        workspaceId: currentWorkspace?.id 
      }).unwrap();
      
      const loadedPermissions = result.permissions || [];
      
      // Update both slices
      dispatch(setPermissions(loadedPermissions));
      dispatch(setPermissions(loadedPermissions)); // Also update permission slice
      
      console.log('✅ Permissions Hook: Permissions loaded:', loadedPermissions);
      return loadedPermissions;
    } catch (error: any) {
      console.error('❌ Permissions Hook: Failed to load permissions:', error);
      dispatch(setPermissionError(error.message || 'Failed to load permissions'));
      dispatch(setError(error.message || 'Failed to load permissions')); // ✅ FIXED: Use setError
      return [];
    } finally {
      dispatch(setPermissionLoading(false));
    }
  };

  // Refresh permissions (now with localStorage cache invalidation)
  const refreshPermissions = async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      console.log('🔄 Permissions Hook: Refreshing permissions...');
      dispatch(setPermissionLoading(true));
      
      // ✅ NEW: Clear cached permissions before refresh
      authStorage.clearPermissions(currentWorkspace?.id);
      
      await refreshPermissionsMutation({ 
        workspaceId: currentWorkspace?.id 
      }).unwrap();
      
      await refetchPermissions();
      
      // Reload permissions (will cache automatically)
      await loadPermissions();
      
      console.log('✅ Permissions Hook: Permissions refreshed successfully');
    } catch (error: any) {
      console.error('❌ Permissions Hook: Failed to refresh permissions:', error);
      dispatch(setPermissionError(error.message || 'Failed to refresh permissions'));
      dispatch(setError(error.message || 'Failed to refresh permissions'));
    } finally {
      dispatch(setPermissionLoading(false));
    }
  };

  // Permission check functions
  const hasPermission = (permission: string): boolean => {
    if (!permissions.length) return false;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.every(perm => permissions.includes(perm));
  };

  // Pattern-based permission checking (e.g., "dashboard.*", "user.create")
  const hasPermissionPattern = (pattern: string): boolean => {
    if (!permissions.length) return false;
    
    const regexPattern = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
    );
    
    return permissions.some(permission => regexPattern.test(permission));
  };

  // Get permissions by category/prefix
  const getPermissionsByCategory = (category: string): string[] => {
    if (!permissions.length) return [];
    return permissions.filter(permission => 
      permission.startsWith(category + '.') || 
      permission.startsWith(category + ':')
    );
  };

  // Specific role/permission helpers
  const isAdmin = (): boolean => {
    return hasPermission('admin_access') || hasPermission('super_admin');
  };

  const isSuperAdmin = (): boolean => {
    return hasPermission('super_admin') || hasPermission('system_admin');
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission([
      'user.manage',
      'user.create',
      'user.update',
      'user.delete',
      'admin_access'
    ]);
  };

  const canManageWorkspaces = (): boolean => {
    return hasAnyPermission([
      'workspace.manage',
      'workspace.create',
      'workspace.update',
      'workspace.delete',
      'admin_access'
    ]);
  };

  const canViewAnalytics = (): boolean => {
    return hasAnyPermission([
      'analytics.view',
      'dashboard.view',
      'reports.view',
      'admin_access'
    ]);
  };

  // Clear error function
  const clearErrorState = () => {
    dispatch(clearError());
    dispatch(clearPermissionError());
  };

  return {
    // State
    permissions,
    isLoading,
    error,
    permissionsLoaded,

    // Actions
    loadPermissions,
    refreshPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionPattern,
    getPermissionsByCategory,
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canManageWorkspaces,
    canViewAnalytics,
    clearError: clearErrorState,
  };
};

export default usePermissions;

// Export types
export type { PermissionHookState, PermissionHookActions };