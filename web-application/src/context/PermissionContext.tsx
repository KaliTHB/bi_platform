// web-application/src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';

interface PermissionContextType {
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccessWorkspace: (workspaceId?: string) => boolean;
  canManageWorkspace: (workspaceId?: string) => boolean;
  canViewDashboard: (dashboardId?: string) => boolean;
  canEditDashboard: (dashboardId?: string) => boolean;
  canCreateDashboard: () => boolean;
  canDeleteDashboard: (dashboardId?: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppSelector(state => state.auth);
  const { current: currentWorkspace } = useAppSelector(state => state.workspace);

  const contextValue: PermissionContextType = useMemo(() => {
    const hasPermission = (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    };

    const hasRole = (role: string): boolean => {
      if (!user) return false;
      return user.roles.includes(role);
    };

    const hasAnyPermission = (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.some(permission => user.permissions.includes(permission));
    };

    const hasAllPermissions = (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.every(permission => user.permissions.includes(permission));
    };

    const hasAnyRole = (roles: string[]): boolean => {
      if (!user) return false;
      return roles.some(role => user.roles.includes(role));
    };

    const canAccessWorkspace = (workspaceId?: string): boolean => {
      if (!user) return false;
      if (!workspaceId && !currentWorkspace) return false;
      
      const targetWorkspaceId = workspaceId || currentWorkspace?.id;
      return user.workspace_id === targetWorkspaceId;
    };

    const canManageWorkspace = (workspaceId?: string): boolean => {
      if (!canAccessWorkspace(workspaceId)) return false;
      return hasAnyRole(['admin', 'owner']) || hasPermission('manage_workspace');
    };

    const canViewDashboard = (dashboardId?: string): boolean => {
      if (!user) return false;
      return hasAnyRole(['viewer', 'analyst', 'editor', 'admin', 'owner']) || 
             hasPermission('view_dashboard');
    };

    const canEditDashboard = (dashboardId?: string): boolean => {
      if (!user) return false;
      return hasAnyRole(['editor', 'admin', 'owner']) || 
             hasPermission('edit_dashboard');
    };

    const canCreateDashboard = (): boolean => {
      if (!user) return false;
      return hasAnyRole(['editor', 'admin', 'owner']) || 
             hasPermission('create_dashboard');
    };

    const canDeleteDashboard = (dashboardId?: string): boolean => {
      if (!user) return false;
      return hasAnyRole(['admin', 'owner']) || 
             hasPermission('delete_dashboard');
    };

    return {
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAllPermissions,
      hasAnyRole,
      canAccessWorkspace,
      canManageWorkspace,
      canViewDashboard,
      canEditDashboard,
      canCreateDashboard,
      canDeleteDashboard,
    };
  }, [user, currentWorkspace]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};