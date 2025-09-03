// web-application/src/components/shared/PermissionGate.tsx
'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/index';
import { User, Workspace } from '@/types/auth.types';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  workspaceRole?: string;
  workspaceRoles?: string[];
  minLevel?: number;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  
  // Enhanced props for resource-specific permissions
  resourceId?: string;
  resourceType?: string;
  resourceOwnerId?: string;
}

/**
 * Enhanced PermissionGate component that conditionally renders children based on user permissions
 * Now supports resource-specific permission checking
 * 
 * Usage examples:
 * 
 * // Basic permission
 * <PermissionGate permission="dashboard.read">
 *   <DashboardList />
 * </PermissionGate>
 * 
 * // Resource-specific permission
 * <PermissionGate 
 *   permission="dashboard.update" 
 *   resourceId="dashboard-123"
 *   resourceType="dashboard"
 * >
 *   <EditDashboardButton />
 * </PermissionGate>
 * 
 * // Multiple permissions with resource
 * <PermissionGate 
 *   permissions={['dashboard.read', 'dashboard.update']} 
 *   resourceId="dashboard-123"
 *   requireAll
 * >
 *   <AdminDashboardActions />
 * </PermissionGate>
 * 
 * // Resource ownership check
 * <PermissionGate 
 *   permission="dashboard.delete"
 *   resourceId="dashboard-123"
 *   resourceOwnerId="user-456"
 * >
 *   <DeleteButton />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  workspaceRole,
  workspaceRoles,
  minLevel,
  requireAll = false,
  fallback = null,
  children,
  resourceId,
  resourceType,
  resourceOwnerId
}) => {
  const { user, permissions: userPermissions } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // If user is not authenticated, deny access
  if (!user) {
    return <>{fallback}</>;
  }

  // Enhanced permission checking function
  const hasEnhancedPermission = (permissionToCheck: string): boolean => {
    // Basic permission check first
    const hasBasicPermission = (userPermissions || []).includes(permissionToCheck);
    
    // If no resource-specific checks needed, return basic permission
    if (!resourceId && !resourceOwnerId) {
      return hasBasicPermission;
    }

    // Resource ownership check
    if (resourceOwnerId) {
      const isOwner = user.id === resourceOwnerId;
      if (isOwner) {
        // Owner has implicit permissions for their own resources
        return true;
      }
    }

    // Admin override - admins can do anything
    if ((userPermissions || []).includes('workspace.admin') || 
        (userPermissions || []).includes('system.admin')) {
      return true;
    }

    // Resource-specific permission logic
    if (resourceId && resourceType) {
      // Check if user has resource-specific permissions
      const resourceSpecificPermission = `${resourceType}.${permissionToCheck.split('.')[1]}.${resourceId}`;
      if ((userPermissions || []).includes(resourceSpecificPermission)) {
        return true;
      }

      // Check workspace-level permissions for the resource
      if (currentWorkspace) {
        const workspaceResourcePermission = `${currentWorkspace.id}.${permissionToCheck}`;
        if ((userPermissions || []).includes(workspaceResourcePermission)) {
          return true;
        }
      }
    }

    // Fall back to basic permission
    return hasBasicPermission;
  };

  // Check workspace-specific permissions with resource support
  const checkWorkspacePermissions = (config: {
    user: User;
    workspace: Workspace;
    userPermissions: string[];
    permission?: string;
    permissions?: string[];
    workspaceRole?: string;
    workspaceRoles?: string[];
    minLevel?: number;
    requireAll?: boolean;
    resourceId?: string;
    resourceType?: string;
    resourceOwnerId?: string;
  }): boolean => {
    const {
      user,
      workspace,
      userPermissions,
      permission,
      permissions,
      workspaceRole,
      workspaceRoles,
      minLevel,
      requireAll = false,
      resourceId,
      resourceType,
      resourceOwnerId
    } = config;

    // Single permission check
    if (permission) {
      return hasEnhancedPermission(permission);
    }

    // Multiple permissions check
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        return permissions.every(perm => hasEnhancedPermission(perm));
      } else {
        return permissions.some(perm => hasEnhancedPermission(perm));
      }
    }

    // Workspace role check
    if (workspaceRole) {
      return checkRoleByPermissions(userPermissions, workspaceRole);
    }

    // Multiple workspace roles check
    if (workspaceRoles && workspaceRoles.length > 0) {
      return workspaceRoles.some(role => checkRoleByPermissions(userPermissions, role));
    }

    // Minimum level check
    if (minLevel !== undefined) {
      return getUserPermissionLevel(userPermissions) >= minLevel;
    }

    return false;
  };

  // Helper function to determine user permission level based on permissions
  const getUserPermissionLevel = (permissions: string[]): number => {
    // System admin level (100)
    if (permissions.includes('system.admin')) {
      return 100;
    }

    // Workspace owner level (90)
    if (permissions.includes('workspace.owner')) {
      return 90;
    }

    // Workspace admin level (80)
    if (permissions.includes('workspace.admin')) {
      return 80;
    }

    // Editor level (60) - can create/edit content
    if (permissions.includes('dashboard.create') && 
        permissions.includes('dataset.create')) {
      return 60;
    }

    // Analyst level (40) - can edit existing content
    if (permissions.includes('dashboard.update') || 
        permissions.includes('chart.create')) {
      return 40;
    }

    // Viewer level (20) - read-only access
    if (permissions.includes('dashboard.read')) {
      return 20;
    }

    // No permissions (0)
    return 0;
  };

  // Helper function to check role by permissions
  const checkRoleByPermissions = (permissions: string[], roleName: string): boolean => {
    const roleLevel = getUserPermissionLevel(permissions);

    switch (roleName.toLowerCase()) {
      case 'system_admin':
        return roleLevel >= 100;
      case 'workspace_owner':
      case 'owner':
        return roleLevel >= 90;
      case 'workspace_admin':
      case 'admin':
        return roleLevel >= 80;
      case 'editor':
        return roleLevel >= 60;
      case 'analyst':
        return roleLevel >= 40;
      case 'viewer':
        return roleLevel >= 20;
      default:
        return false;
    }
  };

  // Main permission check with resource support
  if (currentWorkspace && (permission || permissions || workspaceRole || workspaceRoles || minLevel !== undefined)) {
    const hasAccess = checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      userPermissions: userPermissions || [],
      permission,
      permissions,
      workspaceRole,
      workspaceRoles,
      minLevel,
      requireAll,
      resourceId,
      resourceType,
      resourceOwnerId
    });

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * Enhanced hook to check permissions programmatically with resource support
 */
export const usePermissions = () => {
  const { user, permissions: userPermissions } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  const hasPermission = (permission: string, resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;

    // Basic permission check
    const hasBasicPermission = (userPermissions || []).includes(permission);

    // If no resource specified, return basic permission
    if (!resourceId) {
      return hasBasicPermission;
    }

    // Admin override
    if ((userPermissions || []).includes('workspace.admin') || 
        (userPermissions || []).includes('system.admin')) {
      return true;
    }

    // Resource-specific permission
    if (resourceType) {
      const resourceSpecificPermission = `${resourceType}.${permission.split('.')[1]}.${resourceId}`;
      if ((userPermissions || []).includes(resourceSpecificPermission)) {
        return true;
      }
    }

    // Workspace-level resource permission
    if (currentWorkspace) {
      const workspaceResourcePermission = `${currentWorkspace.id}.${permission}.${resourceId}`;
      if ((userPermissions || []).includes(workspaceResourcePermission)) {
        return true;
      }
    }

    // Fall back to basic permission
    return hasBasicPermission;
  };

  const hasAnyPermission = (permissions: string[], resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission, resourceId, resourceType));
  };

  const hasAllPermissions = (permissions: string[], resourceId?: string, resourceType?: string): boolean => {
    if (!user) return false;
    return permissions.every(permission => hasPermission(permission, resourceId, resourceType));
  };

  const hasWorkspaceRole = (roleName: string): boolean => {
    if (!user) return false;
    if (!currentWorkspace) return false;

    const roleLevel = getUserPermissionLevel(userPermissions || []);
    
    switch (roleName.toLowerCase()) {
      case 'system_admin':
        return roleLevel >= 100;
      case 'workspace_owner':
      case 'owner':
        return roleLevel >= 90;
      case 'workspace_admin':
      case 'admin':
        return roleLevel >= 80;
      case 'editor':
        return roleLevel >= 60;
      case 'analyst':
        return roleLevel >= 40;
      case 'viewer':
        return roleLevel >= 20;
      default:
        return false;
    }
  };

  const hasAnyWorkspaceRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    return roleNames.some(role => hasWorkspaceRole(role));
  };

  const getUserPermissionLevel = (permissions: string[]): number => {
    // System admin level (100)
    if (permissions.includes('system.admin')) {
      return 100;
    }

    // Workspace owner level (90)
    if (permissions.includes('workspace.owner')) {
      return 90;
    }

    // Workspace admin level (80)
    if (permissions.includes('workspace.admin')) {
      return 80;
    }

    // Editor level (60)
    if (permissions.includes('dashboard.create') && 
        permissions.includes('dataset.create')) {
      return 60;
    }

    // Analyst level (40)
    if (permissions.includes('dashboard.update') || 
        permissions.includes('chart.create')) {
      return 40;
    }

    // Viewer level (20)
    if (permissions.includes('dashboard.read')) {
      return 20;
    }

    // No permissions (0)
    return 0;
  };

  const canCreateDashboard = (): boolean => {
    return hasPermission('dashboard.create');
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission(['user.create', 'user.update', 'user.delete']);
  };

  const canAccessAdmin = (): boolean => {
    return hasPermission('workspace.admin');
  };

  const canManageCategories = (): boolean => {
    return hasAnyPermission(['category.create', 'category.update', 'category.delete']);
  };

  const canExportData = (): boolean => {
    return hasAnyPermission(['export.pdf', 'export.excel', 'export.csv', 'export.image']);
  };

  // Resource ownership checks
  const isResourceOwner = (resourceOwnerId: string): boolean => {
    return user?.id === resourceOwnerId;
  };

  const canAccessResource = (permission: string, resourceId: string, resourceType: string, resourceOwnerId?: string): boolean => {
    // Owner can always access their own resources
    if (resourceOwnerId && isResourceOwner(resourceOwnerId)) {
      return true;
    }

    // Check regular permissions
    return hasPermission(permission, resourceId, resourceType);
  };

  return {
    // Basic permission checks
    permissions: userPermissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Workspace role checks
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
  };
};

/**
 * HOC version of PermissionGate for class components with resource support
 */
export const withPermissions = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissionConfig: Omit<PermissionGateProps, 'children'>
) => {
  const WithPermissionsComponent: React.FC<P> = (props) => (
    <PermissionGate {...permissionConfig}>
      <WrappedComponent {...props} />
    </PermissionGate>
  );

  WithPermissionsComponent.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPermissionsComponent;
};

export default PermissionGate;