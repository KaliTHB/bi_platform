// web-application/src/hooks/usePermissions.ts
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const usePermissions = () => {
  const auth = useSelector((state: RootState) => state.auth);

  const hasPermission = (permission: string): boolean => {
    return auth.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => auth.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => auth.permissions.includes(permission));
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

  return {
    permissions: auth.permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreateDashboard,
    canManageUsers,
    canAccessAdmin,
    canManageCategories,
    canExportData,
  };
};