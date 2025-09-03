// web-application/src/hooks/usePermissions.ts
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface UsePermissionsReturn {
  // Basic permission checks
  permissions: string[];
  hasPermission: (permission: string, resourceId?: string, resourceType?: string) => boolean;
  hasAnyPermission: (permissions: string[], resourceId?: string, resourceType?: string) => boolean;
  hasAllPermissions: (permissions: string[], resourceId?: string, resourceType?: string) => boolean;

  // Workspace role checks
  hasWorkspaceRole: (roleName: string) => boolean;
  hasAnyWorkspaceRole: (roleNames: string[]) => boolean;
  getUserPermissionLevel: () => number;

  // Convenience methods
  canCreateDashboard: () => boolean;
  canManageUsers: () => boolean;
  canAccessAdmin: () => boolean;
  canManageCategories: () => boolean;
  canExportData: () => boolean;

  // Resource-specific methods
  isResourceOwner: (resourceOwnerId: string) => boolean;
  canAccessResource: (permission: string, resourceId: string, resourceType: string, resourceOwnerId?: string) => boolean;
  canEditResource: (resourceId: string, resourceType: string, resourceOwnerId?: string) => boolean;
  canDeleteResource: (resourceId: string, resourceType: string, resourceOwnerId?: string) => boolean;
  canShareResource: (resourceId: string, resourceType: string, resourceOwnerId?: string) => boolean;
}

/**
 * Enhanced usePermissions hook with resource-specific permission checking
 */
export const usePermissions = (): UsePermissionsReturn => {
  const auth = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);
  
  const userPermissions = auth.permissions || [];
  const user = auth.user;

  /**
   * Check if user has a specific permission, optionally for a specific resource
   */
  const hasPermission = (permission: string, resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;

    // Basic permission check
    const hasBasicPermission = userPermissions.includes(permission);

    // If no resource specified, return basic permission
    if (!resourceId) {
      return hasBasicPermission;
    }

    // Admin override - admins can do anything
    if (userPermissions.includes('workspace.admin') || 
        userPermissions.includes('system.admin')) {
      return true;
    }

    // Resource-specific permission checking
    if (resourceType) {
      // Check specific resource permission: e.g., "dashboard.update.dashboard-123"
      const resourceSpecificPermission = `${resourceType}.${permission.split('.')[1]}.${resourceId}`;
      if (userPermissions.includes(resourceSpecificPermission)) {
        return true;
      }

      // Check workspace-level resource permission: e.g., "workspace-456.dashboard.update.dashboard-123"
      if (currentWorkspace) {
        const workspaceResourcePermission = `${currentWorkspace.id}.${permission}.${resourceId}`;
        if (userPermissions.includes(workspaceResourcePermission)) {
          return true;
        }
      }
    }

    // Fall back to basic permission
    return hasBasicPermission;
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[], resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission, resourceId, resourceType));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions: string[], resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;
    return permissions.every(permission => hasPermission(permission, resourceId, resourceType));
  };

  /**
   * Get user's permission level as a numeric value
   */
  const getUserPermissionLevel = (): number => {
    // System admin level (100)
    if (userPermissions.includes('system.admin')) {
      return 100;
    }

    // Workspace owner level (90)
    if (userPermissions.includes('workspace.owner')) {
      return 90;
    }

    // Workspace admin level (80)
    if (userPermissions.includes('workspace.admin')) {
      return 80;
    }

    // Editor level (60) - can create/edit content
    if (userPermissions.includes('dashboard.create') && 
        userPermissions.includes('dataset.create')) {
      return 60;
    }

    // Analyst level (40) - can edit existing content
    if (userPermissions.includes('dashboard.update') || 
        userPermissions.includes('chart.create')) {
      return 40;
    }

    // Viewer level (20) - read-only access
    if (userPermissions.includes('dashboard.read')) {
      return 20;
    }

    // No permissions (0)
    return 0;
  };

  /**
   * Check if user has a specific workspace role
   */
  const hasWorkspaceRole = (roleName: string): boolean => {
    if (!user || !currentWorkspace) return false;

    const userLevel = getUserPermissionLevel();
    
    switch (roleName.toLowerCase()) {
      case 'system_admin':
        return userLevel >= 100;
      case 'workspace_owner':
      case 'owner':
        return userLevel >= 90;
      case 'workspace_admin':
      case 'admin':
        return userLevel >= 80;
      case 'editor':
        return userLevel >= 60;
      case 'analyst':
        return userLevel >= 40;
      case 'viewer':
        return userLevel >= 20;
      default:
        return false;
    }
  };

  /**
   * Check if user has any of the specified workspace roles
   */
  const hasAnyWorkspaceRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    return roleNames.some(role => hasWorkspaceRole(role));
  };

  /**
   * Check if user can create dashboards
   */
  const canCreateDashboard = (): boolean => {
    return hasPermission('dashboard.create');
  };

  /**
   * Check if user can manage other users
   */
  const canManageUsers = (): boolean => {
    return hasAnyPermission(['user.create', 'user.update', 'user.delete']);
  };

  /**
   * Check if user can access admin features
   */
  const canAccessAdmin = (): boolean => {
    return hasPermission('workspace.admin');
  };

  /**
   * Check if user can manage categories
   */
  const canManageCategories = (): boolean => {
    return hasAnyPermission(['category.create', 'category.update', 'category.delete']);
  };

  /**
   * Check if user can export data
   */
  const canExportData = (): boolean => {
    return hasAnyPermission(['export.pdf', 'export.excel', 'export.csv', 'export.image']);
  };

  /**
   * Check if user is the owner of a resource
   */
  const isResourceOwner = (resourceOwnerId: string): boolean => {
    return user?.id === resourceOwnerId;
  };

  /**
   * Check if user can access a specific resource
   * Takes into account ownership and permissions
   */
  const canAccessResource = (permission: string, resourceId: string, resourceType: string, resourceOwnerId?: string): boolean => {
    // Owner can always access their own resources (with read permission)
    if (resourceOwnerId && isResourceOwner(resourceOwnerId) && permission.includes('.read')) {
      return true;
    }

    // For non-read permissions, still check if owner has the permission
    if (resourceOwnerId && isResourceOwner(resourceOwnerId)) {
      // Owners have implicit update permissions for their own resources
      if (permission.includes('.update') || permission.includes('.delete')) {
        return true;
      }
    }

    // Check regular permissions
    return hasPermission(permission, resourceId, resourceType);
  };

  /**
   * Check if user can edit a specific resource
   */
  const canEditResource = (resourceId: string, resourceType: string, resourceOwnerId?: string): boolean => {
    const permission = `${resourceType}.update`;
    return canAccessResource(permission, resourceId, resourceType, resourceOwnerId);
  };

  /**
   * Check if user can delete a specific resource
   */
  const canDeleteResource = (resourceId: string, resourceType: string, resourceOwnerId?: string): boolean => {
    const permission = `${resourceType}.delete`;
    return canAccessResource(permission, resourceId, resourceType, resourceOwnerId);
  };

  /**
   * Check if user can share a specific resource
   */
  const canShareResource = (resourceId: string, resourceType: string, resourceOwnerId?: string): boolean => {
    const permission = `${resourceType}.share`;
    return canAccessResource(permission, resourceId, resourceType, resourceOwnerId);
  };

  return {
    // Basic properties and methods
    permissions: userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Workspace role methods
    hasWorkspaceRole,
    hasAnyWorkspaceRole,
    getUserPermissionLevel,

    // Convenience methods
    canCreateDashboard,
    canManageUsers,
    canAccessAdmin,
    canManageCategories,
    canExportData,

    // Resource-specific methods
    isResourceOwner,
    canAccessResource,
    canEditResource,
    canDeleteResource,
    canShareResource,
  };
};