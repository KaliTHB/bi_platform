// web-application/src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string;
}

interface UsePermissionsResult {
  permissions: string[];
  roles: string[];
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsResult => {
  const { user, workspace, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch user permissions from API
  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !user || !workspace) {
      console.log('Cannot fetch permissions: not authenticated or missing user/workspace');
      setPermissions([]);
      setRoles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/permissions?workspace=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Permissions endpoint not implemented yet, use defaults
          console.warn('Permissions endpoint not available, using default permissions');
          
          // For admin users, give all permissions
          if (user.email?.includes('admin') || user.roles?.includes('admin')) {
            setPermissions([
              'workspace.read', 'workspace.admin',
              'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete', 'dashboard.admin',
              'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.admin',
              'chart.read', 'chart.create', 'chart.update', 'chart.delete', 'chart.admin',
              'datasource.read', 'datasource.create', 'datasource.update', 'datasource.delete',
              'user.read', 'user.create', 'user.update', 'user.delete',
              'category.read', 'category.create', 'category.update', 'category.delete',
              'sql_editor.access', 'sql_editor.execute',
              'export.pdf', 'export.excel', 'export.csv', 'export.image'
            ]);
            setRoles(['admin']);
          } else {
            // Regular users get basic permissions
            setPermissions([
              'workspace.read',
              'dashboard.read',
              'dataset.read',
              'chart.read',
              'export.csv', 'export.image'
            ]);
            setRoles(['viewer']);
          }
          return;
        }
        throw new Error(`Failed to fetch permissions: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.permissions || []);
        setRoles(data.roles || []);
      } else {
        throw new Error(data.message || 'Failed to fetch permissions');
      }

    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      
      // Fallback permissions for development
      if (user?.email?.includes('admin')) {
        setPermissions([
          'workspace.read', 'workspace.admin',
          'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete',
          'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
          'chart.read', 'chart.create', 'chart.update', 'chart.delete',
          'datasource.read', 'datasource.create', 'datasource.update', 'datasource.delete',
          'user.read', 'user.create', 'user.update', 'user.delete',
          'sql_editor.access', 'sql_editor.execute'
        ]);
        setRoles(['admin']);
      }
    } finally {
      setLoading(false);
    }
  }, [user, workspace, isAuthenticated]);

  // Load permissions when auth state changes
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Permission checking functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permission) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return permissions.includes(permission);
  }, [permissions, roles]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions, roles]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions, roles]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    roles,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };
};

export default usePermissions;