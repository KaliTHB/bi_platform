import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface PermissionGateProps {
  permissions: string[];
  operation?: 'AND' | 'OR';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  operation = 'OR',
  fallback = null,
  children,
}) => {
  const userPermissions = useSelector((state: RootState) => state.auth.permissions);

  const hasPermission = operation === 'AND'
    ? permissions.every(permission => userPermissions.includes(permission))
    : permissions.some(permission => userPermissions.includes(permission));

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};