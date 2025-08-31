// web-application/src/hooks/useAuth.ts
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

  const hasRole = (role: string): boolean => {
    if (!auth.user?.roles) return false;
    return auth.user.roles.some((userRole: any) => userRole.role_name === role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!auth.user?.roles) return false;
    return roles.some(role => auth.user.roles.some((userRole: any) => userRole.role_name === role));
  };

  const isWorkspaceAdmin = (): boolean => {
    return hasRole('admin') || hasPermission('workspace.admin');
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
  };
};