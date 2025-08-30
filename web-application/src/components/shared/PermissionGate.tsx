# web-application/src/components/shared/PermissionGate.tsx
'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { User, Workspace } from '@/types/auth.types';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  workspaceRole?: string;
  workspaceRoles?: string[];
  minLevel?: number;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate component that conditionally renders children based on user permissions
 * 
 * Usage examples:
 * 
 * // Single permission
 * <PermissionGate permission="dashboard.read">
 *   <DashboardList />
 * </PermissionGate>
 * 
 * // Multiple permissions (any one required)
 * <PermissionGate permissions={['dashboard.read', 'dashboard.write']}>
 *   <DashboardActions />
 * </PermissionGate>
 * 
 * // Multiple permissions (all required)
 * <PermissionGate permissions={['dashboard.read', 'dashboard.write']} requireAll>
 *   <AdminDashboardActions />
 * </PermissionGate>
 * 
 * // System role check
 * <PermissionGate role="SUPER_ADMIN">
 *   <SystemSettings />
 * </PermissionGate>
 * 
 * // Workspace role check
 * <PermissionGate workspaceRole="admin">
 *   <WorkspaceSettings />
 * </PermissionGate>
 * 
 * // Minimum role level
 * <PermissionGate minLevel={50}>
 *   <EditorFeatures />
 * </PermissionGate>
 * 
 * // With fallback content
 * <PermissionGate 
 *   permission="dashboard.write" 
 *   fallback={<ReadOnlyDashboard />}
 * >
 *   <EditableDashboard />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  role,
  roles,
  workspaceRole,
  workspaceRoles,
  minLevel,
  requireAll = false,
  fallback = null,
  children
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // If user is not authenticated, deny access
  if (!user) {
    return <>{fallback}</>;
  }

  // Super admin has access to everything
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Check system role
  if (role && user.role !== role) {
    return <>{fallback}</>;
  }

  if (roles && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // Check workspace-specific permissions
  if (currentWorkspace && (permission || permissions || workspaceRole || workspaceRoles || minLevel !== undefined)) {
    const hasAccess = checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      permission,
      permissions,
      workspaceRole,
      workspaceRoles,
      minLevel,
      requireAll
    });

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * Hook to check permissions programmatically
 */
export const usePermissions = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!currentWorkspace) return false;

    return checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      permission
    });
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!currentWorkspace) return false;

    return checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      permissions,
      requireAll: false
    });
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!currentWorkspace) return false;

    return checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      permissions,
      requireAll: true
    });
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasWorkspaceRole = (roleName: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!currentWorkspace) return false;

    return checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      workspaceRole: roleName
    });
  };

  const hasAnyWorkspaceRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!currentWorkspace) return false;

    return checkWorkspacePermissions({
      user,
      workspace: currentWorkspace,
      workspaceRoles: roleNames
    });
  };

  const getHighestRoleLevel = (): number => {
    if (!user) return 0;
    if (user.role === 'SUPER_ADMIN') return 100;
    if (!currentWorkspace) return 0;

    return currentWorkspace.highest_role_level || 0;
  };

  const hasMinLevel = (level: number): boolean => {
    return getHighestRoleLevel() >= level;
  };

  const getUserRoles = (): string[] => {
    if (!currentWorkspace || !currentWorkspace.user_roles) return [];
    return currentWorkspace.user_roles.map(r => r.role_name);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasWorkspaceRole,
    hasAnyWorkspaceRole,
    hasMinLevel,
    getHighestRoleLevel,
    getUserRoles,
    user,
    currentWorkspace
  };
};

/**
 * Check workspace-specific permissions
 */
function checkWorkspacePermissions({
  user,
  workspace,
  permission,
  permissions,
  workspaceRole,
  workspaceRoles,
  minLevel,
  requireAll = false
}: {
  user: User;
  workspace: Workspace;
  permission?: string;
  permissions?: string[];
  workspaceRole?: string;
  workspaceRoles?: string[];
  minLevel?: number;
  requireAll?: boolean;
}): boolean {
  // Get user roles in workspace
  const userRoles = workspace.user_roles || [];
  const userRoleNames = userRoles.map(r => r.role_name);
  const highestLevel = workspace.highest_role_level || 0;

  // Check minimum level
  if (minLevel !== undefined && highestLevel < minLevel) {
    return false;
  }

  // Check workspace role
  if (workspaceRole && !userRoleNames.includes(workspaceRole)) {
    return false;
  }

  if (workspaceRoles) {
    const hasAnyRole = workspaceRoles.some(role => userRoleNames.includes(role));
    if (!hasAnyRole) {
      return false;
    }
  }

  // For permission checks, we would need to fetch user permissions
  // In a real implementation, you would have permission data available
  // For now, we'll use role-based permission mapping
  if (permission) {
    return hasPermissionByRole(userRoleNames, permission);
  }

  if (permissions) {
    if (requireAll) {
      return permissions.every(perm => hasPermissionByRole(userRoleNames, perm));
    } else {
      return permissions.some(perm => hasPermissionByRole(userRoleNames, perm));
    }
  }

  return true;
}

/**
 * Simple role-based permission mapping
 * In a real implementation, this would be more sophisticated
 */
function hasPermissionByRole(roles: string[], permission: string): boolean {
  // Owner has all permissions
  if (roles.includes('owner')) {
    return true;
  }

  // Admin has most permissions
  if (roles.includes('admin')) {
    const adminDeniedPermissions = []; // Define permissions that even admins don't have
    return !adminDeniedPermissions.includes(permission);
  }

  // Editor permissions
  if (roles.includes('editor')) {
    const editorPermissions = [
      'workspace.read',
      'user.read',
      'dataset.read',
      'dataset.query',
      'dataset.write',
      'dataset.transform',
      'dashboard.read',
      'dashboard.write',
      'dashboard.share',
      'dashboard.publish',
      'data_source.read',
      'data_source.write',
      'data_source.test',
      'export.data',
      'export.dashboard',
      'plugin.read',
      'plugin.configure',
      'webview.read',
      'webview.write',
      'webview.access',
      'analytics.read'
    ];
    return editorPermissions.includes(permission);
  }

  // Analyst permissions
  if (roles.includes('analyst')) {
    const analystPermissions = [
      'workspace.read',
      'dataset.read',
      'dataset.query',
      'dataset.write',
      'dataset.transform',
      'dashboard.read',
      'dashboard.write',
      'data_source.read',
      'data_source.test',
      'export.data',
      'export.dashboard',
      'plugin.read',
      'webview.access'
    ];
    return analystPermissions.includes(permission);
  }

  // Viewer permissions
  if (roles.includes('viewer')) {
    const viewerPermissions = [
      'workspace.read',
      'dataset.read',
      'dataset.query',
      'dashboard.read',
      'export.data',
      'export.dashboard',
      'webview.access'
    ];
    return viewerPermissions.includes(permission);
  }

  return false;
}

/**
 * HOC version of PermissionGate for class components
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