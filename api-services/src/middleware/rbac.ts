import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';
import { AuthService } from '../services/AuthService';
import { db } from '../utils/database';

// Create AuthService instance for middleware
const authService = new AuthService(db);


/**
 * Permission-based authorization middleware factory
 * Fixed TypeScript compatibility
 */
/**
 * Permission-based authorization middleware factory
 */
export function requirePermission(permissions: string | string[]): RequestHandler {
  const permissionsArray = Array.isArray(permissions) ? permissions : [permissions];
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: { code: 'AUTHENTICATION_REQUIRED' }
        });
        return;
      }

      // Get workspace ID from headers or request
      const workspaceId = req.headers['X-Workspace-ID'] as string || 
                         req.user.workspace_id ||
                         req.params.workspaceId;
                         
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: { code: 'WORKSPACE_CONTEXT_REQUIRED' }
        });
        return;
      }

      // Use AuthService to check permissions
      const userPermissions = await authService.getUserPermissions(req.user.user_id, workspaceId);

      // Check if user is admin (admins have all permissions)
      if (userPermissions.is_admin) {
        next();
        return;
      }

      // Check if user has any of the required permissions
      const hasPermission = permissionsArray.some(permission => 
        userPermissions.permissions.includes(permission) ||
        userPermissions.permissions.includes('*')
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user.user_id,
          workspaceId,
          requiredPermissions: permissionsArray,
          userPermissions: userPermissions.permissions,
          service: 'bi-platform-api'
        });

        res.status(403).json({
          success: false,
          message: `Required permission: ${permissionsArray.join(' or ')}`,
          error: { code: 'INSUFFICIENT_PERMISSIONS' }
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Permission check error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Permission validation failed',
        error: { code: 'PERMISSION_CHECK_ERROR' }
      });
    }
  };
}

/**
 * Middleware to load user permissions into request
 * Fixed TypeScript compatibility
 */
export const loadUserPermissions: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next();
      return;
    }

    const workspaceId = req.headers['X-Workspace-ID'] as string;
    if (!workspaceId) {
      next();
      return;
    }

    const permissionService: PermissionService = req.app.locals.permissionService;
    if (!permissionService) {
      next();
      return;
    }

    req.userPermissions = await permissionService.getUserEffectivePermissions(
      req.user.user_id,
      workspaceId
    );

    next();
  } catch (error) {
    logger.error('Error loading user permissions:', error);
    next(); // Continue without permissions
  }
};

/**
 * Helper function to check permissions in controllers
 */
export function hasPermissionInRequest(req: Request, permission: string): boolean {
  return req.userPermissions?.includes(permission) || false;
}

/**
 * Helper function to check multiple permissions with AND logic
 */
export function hasAllPermissionsInRequest(req: Request, permissions: string[]): boolean {
  if (!req.userPermissions) return false;
  return permissions.every(perm => req.userPermissions!.includes(perm));
}

/**
 * Helper function to check multiple permissions with OR logic
 */
export function hasAnyPermissionInRequest(req: Request, permissions: string[]): boolean {
  if (!req.userPermissions) return false;
  return permissions.some(perm => req.userPermissions!.includes(perm));
}


/**
 * Role-based authorization middleware factory
 */
export function requireRole(roles: string | string[]): RequestHandler {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: { code: 'AUTHENTICATION_REQUIRED' }
        });
        return;
      }

      const workspaceId = req.headers['X-Workspace-ID'] as string || 
                         req.user.workspace_id ||
                         req.params.workspaceId;
                         
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: { code: 'WORKSPACE_CONTEXT_REQUIRED' }
        });
        return;
      }

      const userPermissions = await authService.getUserPermissions(req.user.user_id, workspaceId);

      // Check if user has any of the required roles
      const hasRole = rolesArray.some(role => 
        userPermissions.roles.includes(role) ||
        userPermissions.is_admin // Admins bypass role checks
      );

      if (!hasRole) {
        res.status(403).json({
          success: false,
          message: `Required role: ${rolesArray.join(' or ')}`,
          error: { code: 'INSUFFICIENT_ROLE' }
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Role check error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Role validation failed',
        error: { code: 'ROLE_CHECK_ERROR' }
      });
    }
  };
}

/**
 * Check if user is admin middleware
 */
export function requireAdmin(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: { code: 'AUTHENTICATION_REQUIRED' }
        });
        return;
      }

      const workspaceId = req.headers['X-Workspace-ID'] as string || 
                         req.user.workspace_id ||
                         req.params.workspaceId;

      // For system-wide admin operations, we can check without workspace
      if (workspaceId) {
        const userPermissions = await authService.getUserPermissions(req.user.user_id, workspaceId);
        if (!userPermissions.is_admin) {
          res.status(403).json({
            success: false,
            message: 'Admin access required',
            error: { code: 'ADMIN_ACCESS_REQUIRED' }
          });
          return;
        }
      } else {
        // For system-wide admin, check if user has admin role in any workspace
        // This is a simplified check - you might want to make it more sophisticated
        res.status(403).json({
          success: false,
          message: 'System admin access required',
          error: { code: 'SYSTEM_ADMIN_REQUIRED' }
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Admin check error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Admin validation failed',
        error: { code: 'ADMIN_CHECK_ERROR' }
      });
    }
  };
}