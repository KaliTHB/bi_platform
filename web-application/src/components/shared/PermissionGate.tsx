// web-application/src/components/shared/PermissionGate.tsx
import React from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Single permission string or array of permissions to check
   */
  permissions: string | string[];
  
  /**
   * Logic for multiple permissions:
   * - true: Require ALL permissions (AND logic)
   * - false: Require ANY permission (OR logic) - default
   */
  requireAll?: boolean;
  
  /**
   * Content to render when user has required permissions
   */
  children: React.ReactNode;
  
  /**
   * Content to render when user lacks permissions (optional)
   */
  fallback?: React.ReactNode;
  
  /**
   * Show loading spinner while permissions are being checked
   */
  showLoading?: boolean;
  
  /**
   * Show error message instead of hiding content
   */
  showError?: boolean;
}

/**
 * PermissionGate - Controls rendering of content based on user permissions
 * 
 * Usage Examples:
 * - Single permission: <PermissionGate permissions="dashboard.read">...</PermissionGate>
 * - Multiple (OR): <PermissionGate permissions={["dashboard.read", "dashboard.admin"]}>...</PermissionGate>
 * - Multiple (AND): <PermissionGate permissions={["dashboard.read", "dashboard.update"]} requireAll>...</PermissionGate>
 * - With fallback: <PermissionGate permissions="dashboard.create" fallback={<Alert>No access</Alert>}>...</PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  requireAll = false,
  children,
  fallback,
  showLoading = true,
  showError = false
}) => {
  const { hasPermission, hasAnyPermission, loading, error } = usePermissions();

  // Handle loading state
  if (loading && showLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Handle error state
  if (error && showError) {
    return (
      <Alert severity="error" sx={{ m: 1 }}>
        Failed to load permissions: {error}
      </Alert>
    );
  }

  // Normalize permissions to array
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  // Check permissions based on logic type
  let hasAccess = false;

  if (requireAll) {
    // AND logic - user must have ALL permissions
    hasAccess = permissionArray.every(permission => hasPermission(permission));
  } else {
    // OR logic - user must have ANY of the permissions
    hasAccess = hasAnyPermission ? 
      hasAnyPermission(permissionArray) : 
      permissionArray.some(permission => hasPermission(permission));
  }

  // Render content based on access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Return fallback content or null
  return <>{fallback || null}</>;
};

/**
 * Higher-Order Component version of PermissionGate
 * Wraps a component with permission checking
 */
export const withPermissionGate = <P extends object>(
  Component: React.ComponentType<P>,
  permissions: string | string[],
  options: {
    requireAll?: boolean;
    fallback?: React.ReactNode;
    showLoading?: boolean;
  } = {}
) => {
  const PermissionWrappedComponent: React.FC<P> = (props) => {
    return (
      <PermissionGate 
        permissions={permissions}
        requireAll={options.requireAll}
        fallback={options.fallback}
        showLoading={options.showLoading}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };

  PermissionWrappedComponent.displayName = `withPermissionGate(${Component.displayName || Component.name})`;
  
  return PermissionWrappedComponent;
};

/**
 * Hook for permission checking within components
 * Alternative to using PermissionGate component
 */
export const usePermissionGate = (
  permissions: string | string[],
  requireAll: boolean = false
): {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
} => {
  const { hasPermission, hasAnyPermission, loading, error } = usePermissions();

  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  
  let hasAccess = false;
  if (requireAll) {
    hasAccess = permissionArray.every(permission => hasPermission(permission));
  } else {
    hasAccess = hasAnyPermission ? 
      hasAnyPermission(permissionArray) : 
      permissionArray.some(permission => hasPermission(permission));
  }

  return {
    hasAccess,
    loading,
    error
  };
};

// Default export for backward compatibility
export default PermissionGate;