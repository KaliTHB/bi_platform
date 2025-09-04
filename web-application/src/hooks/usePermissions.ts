// web-application/src/hooks/usePermissions.ts - Updated for new flow
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Permission {
  id: string;
  name: string;
  description?: string;
  resource_type?: string;
  action?: string;
}

export const usePermissions = () => {
  const { user, workspace, token, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user permissions for current workspace
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isAuthenticated || !token) {
        setPermissions([]);
        return;
      }

      // If no workspace, user has minimal permissions
      if (!workspace) {
        setPermissions(['workspace.read', 'profile.read', 'profile.update']);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/v1/user/permissions?workspace_id=${workspace.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || []);
        } else {
          console.error('Failed to fetch permissions');
          setPermissions([]);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, workspace, token, isAuthenticated]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!isAuthenticated) return false;
    
    // If no workspace, only allow basic permissions
    if (!workspace) {
      const allowedWithoutWorkspace = [
        'workspace.read',
        'profile.read', 
        'profile.update',
        'workspace.switch'
      ];
      return allowedWithoutWorkspace.includes(permission);
    }

    return permissions.includes(permission);
  }, [permissions, isAuthenticated, workspace]);

  // Check if user has any of the provided permissions
  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!isAuthenticated) return false;
    return permissionList.some(permission => hasPermission(permission));
  }, [hasPermission, isAuthenticated]);

  // Check if user has all of the provided permissions
  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!isAuthenticated) return false;
    return permissionList.every(permission => hasPermission(permission));
  }, [hasPermission, isAuthenticated]);

  // Get user's role level (useful for hierarchical permissions)
  const getRoleLevel = useCallback((): number => {
    if (!isAuthenticated || !workspace) return 0;
    
    // Define role hierarchy
    const roleHierarchy: Record<string, number> = {
      'viewer': 1,
      'analyst': 2,
      'editor': 3,
      'admin': 4,
      'owner': 5
    };

    return roleHierarchy[workspace.role || ''] || 0;
  }, [isAuthenticated, workspace]);

  // Check if user meets minimum role level
  const hasMinimumRole = useCallback((minimumLevel: number): boolean => {
    return getRoleLevel() >= minimumLevel;
  }, [getRoleLevel]);

  // Convenience methods for common permission checks
  const canCreateDashboard = hasPermission('dashboard.create');
  const canEditDashboard = hasPermission('dashboard.update');
  const canDeleteDashboard = hasPermission('dashboard.delete');
  const canViewDashboard = hasPermission('dashboard.read');
  const canShareDashboard = hasPermission('dashboard.share');

  const canCreateDataset = hasPermission('dataset.create');
  const canEditDataset = hasPermission('dataset.update');
  const canDeleteDataset = hasPermission('dataset.delete');
  const canViewDataset = hasPermission('dataset.read');

  const canAccessSQLEditor = hasPermission('sql_editor.access');
  const canExecuteQueries = hasPermission('query.execute');

  const canManageUsers = hasPermission('user.manage');
  const canManageRoles = hasPermission('role.manage');
  const canAccessAdmin = hasPermission('workspace.admin');
  const canManageCategories = hasPermission('category.manage');

  const canExportData = hasPermission('data.export');
  const canViewAuditLogs = hasPermission('audit.read');

  // Check if user can access workspace features
  const canAccessWorkspace = useCallback((workspaceSlug?: string): boolean => {
    if (!workspaceSlug) return true; // Allow access to general pages
    if (!workspace) return false; // No workspace access
    return workspace.slug === workspaceSlug;
  }, [workspace]);

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRoleLevel,
    hasMinimumRole,
    canAccessWorkspace,

    // Dashboard permissions
    canCreateDashboard,
    canEditDashboard,
    canDeleteDashboard,
    canViewDashboard,
    canShareDashboard,

    // Dataset permissions
    canCreateDataset,
    canEditDataset,
    canDeleteDataset,
    canViewDataset,

    // SQL Editor permissions
    canAccessSQLEditor,
    canExecuteQueries,

    // Admin permissions
    canManageUsers,
    canManageRoles,
    canAccessAdmin,
    canManageCategories,

    // Data permissions
    canExportData,
    canViewAuditLogs,

    // Workspace info
    currentWorkspace: workspace,
    userRole: workspace?.role || null,
    roleLevel: getRoleLevel()
  };
};