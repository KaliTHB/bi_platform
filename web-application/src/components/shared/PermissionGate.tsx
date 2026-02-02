// =============================================================================
// FILE: web-application/src/components/shared/PermissionGate.tsx (UPDATE existing)
// =============================================================================

import React, { useMemo, ReactNode } from 'react';
import { Box, CircularProgress, Alert, Typography, Button } from '@mui/material';
import { Lock as LockIcon, Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
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
   * Minimum role required (optional - for backward compatibility)
   * @deprecated Use permissions instead of roles
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

  /**
   * Show refresh button in error states
   */
  showRefresh?: boolean;
}

/**
 * PermissionGate - Updated version that integrates with RTK Query permissions
 * 
 * Usage Examples:
 * - Single permission: <PermissionGate permissions="admin_access">...</PermissionGate>
 * - Multiple (OR): <PermissionGate permissions={["dashboard_view", "dashboard_admin"]}>...</PermissionGate>
 * - Multiple (AND): <PermissionGate permissions={["dashboard_create", "workspace_edit"]} requireAll>...</PermissionGate>
 * - With fallback: <PermissionGate permissions="admin_access" fallback={<div>Access Denied</div>}>...</PermissionGate>
 * - Debug mode: <PermissionGate permissions="admin_access" debug>...</PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  requireAll = false,
  children,
  fallback,
  showLoading = true,
  showError = true,
  showPermissionDetails = false,
  deniedMessage,
  showContactAdmin = false,
  minRole, // Deprecated but kept for backward compatibility
  workspaceId,
  debug = false,
  loadingComponent,
  bypass = false,
  showRefresh = true,
}) => {
  // Use both hooks for maximum compatibility
  const { 
    hasPermission: authHasPermission, 
    hasAnyPermission: authHasAnyPermission, 
    hasAllPermissions: authHasAllPermissions,
    isAuthenticated, 
    user,
    isLoading: authLoading,
    error: authError,
  } = useAuth();

  const { 
    hasPermission: permHasPermission,
    hasAnyPermission: permHasAnyPermission,
    hasAllPermissions: permHasAllPermissions,
    permissions: userPermissions,
    isLoading: permLoading,
    permissionsError,
    refreshPermissions,
    loadPermissions,
  } = usePermissions({ workspaceId });

  // Normalize permissions to array for consistent processing
  const permissionArray = useMemo(() => {
    return Array.isArray(permissions) ? permissions : [permissions];
  }, [permissions]);

  // Use the most reliable permission check function available
  const hasPermission = (permission: string): boolean => {
    // Try usePermissions hook first (RTK Query-based)
    if (permHasPermission) {
      return permHasPermission(permission);
    }
    // Fallback to useAuth hook
    return authHasPermission(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (permHasAnyPermission) {
      return permHasAnyPermission(perms);
    }
    return authHasAnyPermission(perms);
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (permHasAllPermissions) {
      return permHasAllPermissions(perms);
    }
    return authHasAllPermissions(perms);
  };

  // Check permissions with caching via useMemo
  const hasAccess = useMemo(() => {
    // Bypass check if specified (useful for development)
    if (bypass) {
      if (debug) console.log('[PermissionGate] Bypass mode enabled - allowing access');
      return true;
    }

    // Must be authenticated first
    if (!isAuthenticated || !user) {
      if (debug) console.log('[PermissionGate] User not authenticated');
      return false;
    }

    // Legacy role check (deprecated but maintained for backward compatibility)
    if (minRole) {
      console.warn('[PermissionGate] minRole prop is deprecated. Use permissions instead.');
      const rolePermissions = {
        'reader': ['dashboard_view', 'dataset_view'],
        'contributor': ['dashboard_view', 'dashboard_create', 'dataset_view', 'dataset_create'],
        'admin': ['admin_access']
      };
      
      const requiredRolePermissions = rolePermissions[minRole] || [];
      if (!hasAnyPermission(requiredRolePermissions)) {
        if (debug) console.log(`[PermissionGate] User lacks minimum role permissions for: ${minRole}`);
        return false;
      }
    }

    let access = false;

    if (requireAll) {
      // AND logic - user must have ALL permissions
      access = hasAllPermissions(permissionArray);
      if (debug) {
        console.log(`[PermissionGate] Checking ALL permissions ${JSON.stringify(permissionArray)}: ${access}`);
        permissionArray.forEach(permission => {
          const hasP = hasPermission(permission);
          console.log(`  - ${permission}: ${hasP}`);
        });
      }
    } else {
      // OR logic - user must have ANY of the permissions
      access = hasAnyPermission(permissionArray);
      if (debug) {
        console.log(`[PermissionGate] Checking ANY permissions ${JSON.stringify(permissionArray)}: ${access}`);
        permissionArray.forEach(permission => {
          const hasP = hasPermission(permission);
          console.log(`  - ${permission}: ${hasP}`);
        });
      }
    }

    if (debug) {
      console.log('[PermissionGate] Final permission check result:', {
        permissions: permissionArray,
        requireAll,
        minRole,
        workspaceId,
        userPermissions,
        hasAccess: access,
        user: user?.email
      });
    }

    return access;
  }, [
    bypass,
    isAuthenticated,
    user,
    minRole,
    permissionArray,
    requireAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions,
    workspaceId,
    debug
  ]);

  // Calculate loading state
  const isLoading = authLoading || permLoading;

  // Handle loading state
  if (isLoading && showLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }} color="text.secondary">
          Loading permissions...
        </Typography>
      </Box>
    );
  }

  // Handle error state
  const errorMessage = permissionsError || authError;
  if (errorMessage && showError) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 1 }}
        icon={<WarningIcon />}
        action={
          showRefresh ? (
            <Box>
              <Button 
                size="small" 
                onClick={loadPermissions}
                color="inherit"
                startIcon={<RefreshIcon />}
                sx={{ mr: 1 }}
              >
                Reload
              </Button>
              <Button 
                size="small" 
                onClick={refreshPermissions}
                color="inherit"
              >
                Refresh
              </Button>
            </Box>
          ) : undefined
        }
      >
        <Typography variant="body2">
          Failed to load permissions: {errorMessage}
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
          <Box>
            {showContactAdmin && (
              <Button 
                size="small" 
                onClick={() => window.location.href = 'mailto:admin@yourcompany.com?subject=Permission Request'}
                color="inherit"
                sx={{ mr: 1 }}
              >
                Contact Admin
              </Button>
            )}
            {showRefresh && (
              <Button 
                size="small" 
                onClick={refreshPermissions}
                color="inherit"
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            )}
          </Box>
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
            Minimum role required: {minRole} (deprecated)
          </Typography>
        )}
        {debug && (
          <Typography variant="caption" component="pre" sx={{ mt: 1, fontSize: '0.7rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            Debug Info:{'\n'}
            Required: {JSON.stringify(permissionArray, null, 2)}{'\n'}
            User has: {JSON.stringify(userPermissions, null, 2)}{'\n'}
            Logic: {requireAll ? 'AND' : 'OR'}
          </Typography>
        )}
      </Alert>
    );
  };

  return generateDeniedContent();
};

/**
 * Enhanced Higher-Order Component version with RTK Query integration
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
    workspaceId?: string;
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
        workspaceId={options.workspaceId}
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
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  checkDetails: {
    requireAll: boolean;
    minRole?: string;
    workspaceId?: string;
  };
} => {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    isLoading: authLoading,
    error: authError,
  } = useAuth();

  const {
    permissions: userPermissions,
    isLoading: permLoading,
    permissionsError,
  } = usePermissions({ workspaceId: options.workspaceId });

  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  const hasAccess = useMemo(() => {
    const { requireAll = false } = options;
    
    if (requireAll) {
      return hasAllPermissions(permissionArray);
    } else {
      return hasAnyPermission(permissionArray);
    }
  }, [permissionArray, options.requireAll, hasAnyPermission, hasAllPermissions]);

  return {
    hasAccess,
    isLoading: authLoading || permLoading,
    error: permissionsError || authError,
    permissions: userPermissions,
    checkDetails: {
      requireAll: options.requireAll || false,
      minRole: options.minRole,
      workspaceId: options.workspaceId,
    },
  };
};

/**
 * Simple permission check utility function
 */
export const checkPermission = (
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
  showLoadingState?: boolean;
}> = ({ 
  showUserPermissions = true, 
  showLoadingState = true 
}) => {
  const { user, permissions, isLoading } = useAuth();
  const { permissions: rtkPermissions, isLoading: rtkLoading } = usePermissions();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, m: 1 }}>
      <Typography variant="h6" gutterBottom>
        Permission Debugger (Development Only)
      </Typography>
      
      {showLoadingState && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Loading States:
          </Typography>
          <Typography variant="body2">
            Auth Loading: {isLoading ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            RTK Loading: {rtkLoading ? 'Yes' : 'No'}
          </Typography>
        </Box>
      )}
      
      {showUserPermissions && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            User: {user?.email || 'Not authenticated'}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Auth Permissions ({permissions.length}):
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', mb: 1 }}>
            {JSON.stringify(permissions, null, 2)}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            RTK Permissions ({rtkPermissions.length}):
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
            {JSON.stringify(rtkPermissions, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Default export for backward compatibility
export default PermissionGate;