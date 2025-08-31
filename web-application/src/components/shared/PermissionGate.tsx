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
 * // Workspace role check
 * <PermissionGate workspaceRole="admin">
 *   <WorkspaceSettings />
 * </PermissionGate>
 * 
 * // Multiple workspace roles (any one required)
 * <PermissionGate workspaceRoles={['admin', 'owner']}>
 *   <AdminFeatures />
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
  workspaceRole,
  workspaceRoles,
  minLevel,
  requireAll = false,
  fallback = null,
  children
}) => {
  const { user, permissions: userPermissions } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // If user is not authenticated, deny access
  if (!user) {
    return <>{fallback}</>;
  }

  // Check workspace-specific permissions
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
  const { user, permissions: userPermissions } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return (userPermissions || []).includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => (userPermissions || []).includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => (userPermissions || []).includes(permission));
  };

  const hasWorkspaceRole = (roleName: string): boolean => {
    if (!user) return false;
    if (!currentWorkspace) return false;

    return checkRoleByPermissions(userPermissions || [], roleName);
  };

  const hasAnyWorkspaceRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    if (!currentWorkspace) return false;

    return roleNames.some(role => checkRoleByPermissions(userPermissions || [], role));
  };

  const getHighestRoleLevel = (): number => {
    if (!user) return 0;
    return getRoleLevelByPermissions(userPermissions || []);
  };

  const hasMinLevel = (level: number): boolean => {
    return getHighestRoleLevel() >= level;
  };

  const getUserRoles = (): string[] => {
    // Extract roles from permissions (simplified approach)
    if (!userPermissions) return [];
    
    const roles: string[] = [];
    if (hasAllPermissions(['workspace.admin', 'user.admin', 'role.admin'])) roles.push('owner');
    else if (hasAnyPermission(['workspace.admin', 'user.create', 'role.create'])) roles.push('admin');
    else if (hasAllPermissions(['dashboard.write', 'dataset.write'])) roles.push('editor');
    else if (hasAnyPermission(['dashboard.write', 'dataset.query'])) roles.push('analyst');
    else if (hasPermission('dashboard.read')) roles.push('viewer');
    
    return roles;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasWorkspaceRole,
    hasAnyWorkspaceRole,
    hasMinLevel,
    getHighestRoleLevel,
    getUserRoles,
    user,
    currentWorkspace,
    permissions: userPermissions
  };
};

/**
 * Check workspace-specific permissions using auth state
 */
function checkWorkspacePermissions({
  user,
  workspace,
  userPermissions,
  permission,
  permissions,
  workspaceRole,
  workspaceRoles,
  minLevel,
  requireAll = false
}: {
  user: User;
  workspace: Workspace;
  userPermissions: string[];
  permission?: string;
  permissions?: string[];
  workspaceRole?: string;
  workspaceRoles?: string[];
  minLevel?: number;
  requireAll?: boolean;
}): boolean {
  // For workspace role and level checks, we'd need additional data
  // For now, we'll focus on permission-based checks using the auth state

  // Direct permission checks using auth state permissions
  if (permission) {
    return userPermissions.includes(permission);
  }

  if (permissions) {
    if (requireAll) {
      return permissions.every(perm => userPermissions.includes(perm));
    } else {
      return permissions.some(perm => userPermissions.includes(perm));
    }
  }

  // For workspace role checks, we'll use a simplified mapping
  // In a real implementation, you'd have this data from the backend
  if (workspaceRole) {
    return checkRoleByPermissions(userPermissions, workspaceRole);
  }

  if (workspaceRoles) {
    return workspaceRoles.some(role => checkRoleByPermissions(userPermissions, role));
  }

  // For minimum level checks, we'll use permission-based approximation
  if (minLevel !== undefined) {
    return hasMinimumLevelByPermissions(userPermissions, minLevel);
  }

  return true;
}

/**
 * Check if user has a specific role based on their permissions
 */
function checkRoleByPermissions(userPermissions: string[], roleName: string): boolean {
  switch (roleName.toLowerCase()) {
    case 'owner':
      return userPermissions.includes('workspace.admin') && 
             userPermissions.includes('user.admin') && 
             userPermissions.includes('role.admin');
    
    case 'admin':
      return userPermissions.includes('workspace.admin') || 
             userPermissions.includes('user.create') || 
             userPermissions.includes('role.create');
    
    case 'editor':
      return userPermissions.includes('dashboard.write') && 
             userPermissions.includes('dataset.write');
    
    case 'analyst':
      return userPermissions.includes('dashboard.write') || 
             userPermissions.includes('dataset.query');
    
    case 'viewer':
      return userPermissions.includes('dashboard.read');
    
    default:
      return false;
  }
}

/**
 * Check if user has minimum level based on permissions
 */
function hasMinimumLevelByPermissions(userPermissions: string[], minLevel: number): boolean {
  const currentLevel = getRoleLevelByPermissions(userPermissions);
  return currentLevel >= minLevel;
}

/**
 * Get user's role level based on permissions
 */
function getRoleLevelByPermissions(userPermissions: string[]): number {
  // Owner level (100)
  if (userPermissions.includes('workspace.admin') && 
      userPermissions.includes('user.admin') && 
      userPermissions.includes('role.admin')) {
    return 100;
  }
  
  // Admin level (80)
  if (userPermissions.includes('workspace.admin') || 
      userPermissions.includes('user.create') || 
      userPermissions.includes('role.create')) {
    return 80;
  }
  
  // Editor level (60)
  if (userPermissions.includes('dashboard.write') && 
      userPermissions.includes('dataset.write')) {
    return 60;
  }
  
  // Analyst level (40)
  if (userPermissions.includes('dashboard.write') || 
      userPermissions.includes('dataset.query')) {
    return 40;
  }
  
  // Viewer level (20)
  if (userPermissions.includes('dashboard.read')) {
    return 20;
  }
  
  // No permissions (0)
  return 0;
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