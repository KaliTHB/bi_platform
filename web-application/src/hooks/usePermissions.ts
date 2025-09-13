// web-application/src/hooks/usePermissions.ts - FINAL FIXED VERSION
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from './redux';

interface UsePermissionsResult {
  permissions: string[];
  roles: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth state from Redux
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace.currentWorkspace);

  // Only proceed if we have both user and workspace
  const canFetchPermissions = auth.isAuthenticated && auth.user && workspace?.id && auth.token;

  const fetchPermissions = useCallback(async () => {
    // Early return if we don't have required data
    if (!canFetchPermissions) {
      console.log('🔐 usePermissions: Cannot fetch permissions - missing auth or workspace', {
        isAuthenticated: auth.isAuthenticated,
        hasUser: !!auth.user,
        hasWorkspace: !!workspace?.id,
        hasToken: !!auth.token
      });
      
      // Clear permissions if we don't have required data
      setPermissions([]);
      setRoles([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 usePermissions: Fetching permissions', {
        userId: auth.user.user_id || auth.user.id,
        workspaceId: workspace.id
      });

      // ✅ FIXED: Use only the user route endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/user/permissions?workspace=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Id': workspace.id,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        } else if (response.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        } else if (response.status === 404) {
          throw new Error('Permissions endpoint not found - check backend routes');
        } else {
          throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      console.log('🔐 usePermissions: Permissions response', data);

      if (data.success) {
        const userPermissions = data.permissions || [];
        const userRoles = data.roles || [];
        
        setPermissions(userPermissions);
        setRoles(userRoles);
        
        console.log('✅ usePermissions: Permissions loaded', {
          permissionCount: userPermissions.length,
          roleCount: userRoles.length,
          permissions: userPermissions,
          roles: userRoles
        });
      } else {
        throw new Error(data.message || 'Failed to fetch permissions');
      }

    } catch (err: any) {
      console.error('❌ usePermissions: Error fetching permissions:', err);
      setError(err.message || 'Failed to fetch permissions');
      
      // Don't clear permissions on error - keep previous ones if available
    } finally {
      setIsLoading(false);
    }
  }, [canFetchPermissions, auth.user, workspace, auth.token]);

  // Fetch permissions when dependencies change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (canFetchPermissions) {
      // Add a small delay to ensure all auth state is settled
      timeoutId = setTimeout(() => {
        fetchPermissions();
      }, 500); // Increased delay to 500ms
    } else {
      // Clear permissions if we can't fetch them
      setPermissions([]);
      setRoles([]);
      setError(null);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchPermissions, canFetchPermissions]);

  // Permission check functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permissions.length) {
      console.log('🔐 usePermissions: No permissions available for check:', permission);
      return false;
    }
    
    const hasAccess = permissions.includes(permission);
    console.log(`🔐 usePermissions: Permission check "${permission}":`, hasAccess);
    return hasAccess;
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionsToCheck: string[]): boolean => {
    if (!permissions.length) {
      console.log('🔐 usePermissions: No permissions available for any check:', permissionsToCheck);
      return false;
    }
    
    const hasAccess = permissionsToCheck.some(permission => permissions.includes(permission));
    console.log(`🔐 usePermissions: Any permission check [${permissionsToCheck.join(', ')}]:`, hasAccess);
    return hasAccess;
  }, [permissions]);

  const hasAllPermissions = useCallback((permissionsToCheck: string[]): boolean => {
    if (!permissions.length) {
      console.log('🔐 usePermissions: No permissions available for all check:', permissionsToCheck);
      return false;
    }
    
    const hasAccess = permissionsToCheck.every(permission => permissions.includes(permission));
    console.log(`🔐 usePermissions: All permissions check [${permissionsToCheck.join(', ')}]:`, hasAccess);
    return hasAccess;
  }, [permissions]);

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error,
    refetch: fetchPermissions,
  };
};