// ./src/hooks/useAuth.ts
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from './redux';
import { logout } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const auth = useAppSelector((state) => state.auth);

  const signOut = async () => {
    try {
      // Call logout API if token exists
      if (auth.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      dispatch(logout());
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!auth.permissions) return false;
    return auth.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.some(permission => auth.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.every(permission => auth.permissions.includes(permission));
  };

  // Updated to use permissions instead of roles since roles aren't stored in user object
  const hasRole = (role: string): boolean => {
    if (!auth.permissions) return false;
    // Check if user has admin permission or role-specific permission
    return auth.permissions.includes(`role.${role}`) || 
           auth.permissions.includes('workspace.admin') ||
           auth.permissions.includes('user.admin');
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!auth.permissions) return false;
    return roles.some(role => 
      auth.permissions.includes(`role.${role}`) || 
      auth.permissions.includes('workspace.admin') ||
      auth.permissions.includes('user.admin')
    );
  };

  const isWorkspaceAdmin = (): boolean => {
    return hasPermission('workspace.admin') || hasPermission('user.admin');
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission(['user.create', 'user.update', 'user.delete']);
  };

  const canManageDatasets = (): boolean => {
    return hasAnyPermission(['dataset.create', 'dataset.update', 'dataset.delete']);
  };

  const canManageDashboards = (): boolean => {
    return hasAnyPermission(['dashboard.create', 'dashboard.update', 'dashboard.delete']);
  };

  const canManageCategories = (): boolean => {
    return hasAnyPermission(['category.create', 'category.update', 'category.delete']);
  };

  const canManageWebviews = (): boolean => {
    return hasAnyPermission(['webview.create', 'webview.update', 'webview.delete']);
  };

  const canExportData = (): boolean => {
    return hasPermission('data.export');
  };

  return {
    ...auth,
    signOut,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isWorkspaceAdmin,
    canManageUsers,
    canManageDatasets,
    canManageDashboards,
    canManageCategories,
    canManageWebviews,
    canExportData,
  };
};