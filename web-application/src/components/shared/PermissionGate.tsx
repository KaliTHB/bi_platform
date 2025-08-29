// web-application/src/components/shared/PermissionGate.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';

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
  children
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (operation === 'AND') {
    hasAccess = hasAllPermissions(permissions);
  } else {
    hasAccess = hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;