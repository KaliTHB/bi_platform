// web-application/src/components/shared/PermissionGate.tsx
import React, { useMemo, ReactNode } from 'react';
import { Box, CircularProgress, Alert, Typography, Button } from '@mui/material';
import { Lock as LockIcon, Warning as WarningIcon } from '@mui/icons-material';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';

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
  
  /**
   * Show detailed permission denied message with specific permissions
   */
  showPermissionDetails?: boolean;
  
  /**
   * Custom error message for permission denied
   */
  deniedMessage?: string;
  
  /**
   * Show contact admin button when access is denied
   */
  showContactAdmin?: boolean;
  
  /**
   * Minimum role required (optional - works with role hierarchy)
   */
  minRole?: 'reader' | 'contributor' | 'admin';
  
  /**
   * Workspace-specific permissions (if different from current workspace)
   */
  workspaceId?: string;
  
  /**
   * Enable debug mode to see permission checking details in console
   */
  debug?: boolean;
  
  /**
   * Custom loading component
   */
  loadingComponent?: ReactNode;
  
  /**
   * Skip permission check and always render children (for development/testing)
   */
  bypass?: boolean;
}

/**
 * PermissionGate - Enhanced version with better UX and debugging capabilities
 * 
 * Usage Examples:
 * - Single permission: <PermissionGate permissions="dashboard.read">...</PermissionGate>
 * - Multiple (OR): <PermissionGate permissions={["dashboard.read", "dashboard.admin"]}>...</PermissionGate>
 * - Multiple (AND): <PermissionGate permissions={["dashboard.read", "dashboard.update"]} requireAll>...</PermissionGate>
 * - With custom denied message: <PermissionGate permissions="dashboard.create" deniedMessage="Contact your admin for dashboard creation access">...</PermissionGate>
 * - With role requirement: <PermissionGate permissions="dashboard.read" minRole="contributor">...</PermissionGate>
 * - Debug mode: <PermissionGate permissions="dashboard.read" debug>...</PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  requireAll = false,
  children,
  fallback,
  showLoading = true,
  showError = false,
  showPermissionDetails = false,
  deniedMessage,
  showContactAdmin = false,
  minRole,
  workspaceId,
  debug = false,
  loadingComponent,
  bypass = false
}) => {
  const { hasPermission, hasAnyPermission, hasRole, loading, error } = usePermissions();
  const { user, workspace } = useAuth();

  // Normalize permissions to array for consistent processing
  const permissionArray = useMemo(() => {
    return Array.isArray(permissions) ? permissions : [permissions];
  }, [permissions]);

  // Check permissions with caching via useMemo
  const hasAccess = useMemo(() => {
    // Bypass check if specified (useful for development)
    if (bypass) {
      if (debug) console.log('[PermissionGate] Bypass mode enabled - allowing access');
      return true;
    }

    // Check minimum role requirement first
    if (minRole && !hasRole(minRole)) {
      if (debug) console.log(`[PermissionGate] User lacks minimum role: ${minRole}`);
      return false;
    }

    let access = false;

    if (requireAll) {
      // AND logic - user must have ALL permissions
      access = permissionArray.every(permission => {
        const hasP = hasPermission(permission, workspaceId);
        if (debug) console.log(`[PermissionGate] Checking permission '${permission}': ${hasP}`);
        return hasP;
      });
    } else {
      // OR logic - user must have ANY of the permissions
      access = hasAnyPermission ? 
        hasAnyPermission(permissionArray, workspaceId) : 
        permissionArray.some(permission => {
          const hasP = hasPermission(permission, workspaceId);
          if (debug) console.log(`[PermissionGate] Checking permission '${permission}': ${hasP}`);
          return hasP;
        });
    }

    if (debug) {
      console.log('[PermissionGate] Permission check result:', {
        permissions: permissionArray,
        requireAll,
        minRole,
        workspaceId: workspaceId || workspace?.id,
        hasAccess: access,
        user: user?.username
      });
    }

    return access;
  }, [permissionArray, requireAll, hasPermission, hasAnyPermission, hasRole, minRole, workspaceId, workspace?.id, user?.username, bypass, debug]);

  // Handle loading state
  if (loading && showLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }} color="text.secondary">
          Checking permissions...
        </Typography>
      </Box>
    );
  }

  // Handle error state
  if (error && showError) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 1 }}
        icon={<WarningIcon />}
        action={
          <Button 
            size="small" 
            onClick={() => window.location.reload()}
            color="inherit"
          >
            Retry
          </Button>
        }
      >
        <Typography variant="body2">
          Failed to load permissions: {error}
        </Typography>
      </Alert>
    );
  }

  // Render content if user has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Return custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Return null if no fallback and not showing details
  if (!showPermissionDetails && !deniedMessage && !showContactAdmin) {
    return null;
  }

  // Generate detailed permission denied message
  const generateDeniedContent = () => {
    const permissionList = permissionArray.join(requireAll ? ' AND ' : ' OR ');
    const defaultMessage = `You need ${requireAll ? 'all of these' : 'one of these'} permissions: ${permissionList}`;
    
    return (
      <Alert 
        severity="warning" 
        sx={{ m: 1 }}
        icon={<LockIcon />}
        action={
          showContactAdmin ? (
            <Button 
              size="small" 
              onClick={() => window.location.href = 'mailto:admin@yourcompany.com?subject=Access Request'}
              color="inherit"
            >
              Contact Admin
            </Button>
          ) : undefined
        }
      >
        <Typography variant="body2" fontWeight={500}>
          Access Denied
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {deniedMessage || (showPermissionDetails ? defaultMessage : 'You do not have permission to view this content.')}
        </Typography>
        {minRole && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Minimum role required: {minRole}
          </Typography>
        )}
      </Alert>
    );
  };

  return generateDeniedContent();
};

/**
 * Enhanced Higher-Order Component version with additional options
 */
export const withPermissionGate = <P extends object>(
  Component: React.ComponentType<P>,
  permissions: string | string[],
  options: {
    requireAll?: boolean;
    fallback?: React.ReactNode;
    showLoading?: boolean;
    showPermissionDetails?: boolean;
    deniedMessage?: string;
    minRole?: 'reader' | 'contributor' | 'admin';
    debug?: boolean;
  } = {}
) => {
  const PermissionWrappedComponent: React.FC<P> = (props) => {
    return (
      <PermissionGate 
        permissions={permissions}
        requireAll={options.requireAll}
        fallback={options.fallback}
        showLoading={options.showLoading}
        showPermissionDetails={options.showPermissionDetails}
        deniedMessage={options.deniedMessage}
        minRole={options.minRole}
        debug={options.debug}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };

  PermissionWrappedComponent.displayName = `withPermissionGate(${Component.displayName || Component.name})`;
  
  return PermissionWrappedComponent;
};

/**
 * Enhanced hook for permission checking within components
 */
export const usePermissionGate = (
  permissions: string | string[],
  options: {
    requireAll?: boolean;
    minRole?: 'reader' | 'contributor' | 'admin';
    workspaceId?: string;
    debug?: boolean;
  } = {}
): {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  permissions: string[];
  checkDetails: {
    requireAll: boolean;
    minRole?: string;
    workspaceId?: string;
  };
} => {
  const { hasPermission, hasAnyPermission, hasRole, loading, error } = usePermissions();
  const { workspace } = useAuth();

  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const { requireAll = false, minRole, workspaceId, debug = false } = options;
  
  const hasAccess = useMemo(() => {
    // Check minimum role requirement first
    if (minRole && !hasRole(minRole)) {
      if (debug) console.log(`[usePermissionGate] User lacks minimum role: ${minRole}`);
      return false;
    }

    let access = false;

    if (requireAll) {
      access = permissionArray.every(permission => hasPermission(permission, workspaceId));
    } else {
      access = hasAnyPermission ? 
        hasAnyPermission(permissionArray, workspaceId) : 
        permissionArray.some(permission => hasPermission(permission, workspaceId));
    }

    if (debug) {
      console.log('[usePermissionGate] Permission check:', {
        permissions: permissionArray,
        requireAll,
        minRole,
        workspaceId: workspaceId || workspace?.id,
        hasAccess: access
      });
    }

    return access;
  }, [permissionArray, requireAll, hasPermission, hasAnyPermission, hasRole, minRole, workspaceId, workspace?.id, debug]);

  return {
    hasAccess,
    loading,
    error,
    permissions: permissionArray,
    checkDetails: {
      requireAll,
      minRole,
      workspaceId: workspaceId || workspace?.id
    }
  };
};

/**
 * Utility function to check permissions without React context (for utility functions)
 */
export const checkPermissions = (
  userPermissions: string[],
  requiredPermissions: string | string[],
  requireAll: boolean = false
): boolean => {
  const permissionArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  if (requireAll) {
    return permissionArray.every(permission => userPermissions.includes(permission));
  } else {
    return permissionArray.some(permission => userPermissions.includes(permission));
  }
};

/**
 * Development helper component to show all available permissions
 */
export const PermissionDebugger: React.FC<{ 
  showUserPermissions?: boolean;
  showRoles?: boolean;
}> = ({ 
  showUserPermissions = true, 
  showRoles = true 
}) => {
  const { getAllPermissions, getAllRoles } = usePermissions();
  const { user } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, m: 1 }}>
      <Typography variant="h6" gutterBottom>
        Permission Debugger (Development Only)
      </Typography>
      
      {showUserPermissions && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current User Permissions:
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
            {JSON.stringify(getAllPermissions?.() || [], null, 2)}
          </Typography>
        </Box>
      )}
      
      {showRoles && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Current User Roles:
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
            {JSON.stringify(getAllRoles?.() || [], null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Default export for backward compatibility
export default PermissionGate;