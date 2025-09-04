import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

/**
 * Permission-based authorization middleware factory
 * Fixed TypeScript compatibility
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

      // Check workspace context
      const workspaceId = req.headers['x-workspace-id'] as string;
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: { code: 'WORKSPACE_CONTEXT_REQUIRED' }
        });
        return;
      }

      // Get permission service from app locals
      const permissionService: PermissionService = req.app.locals.permissionService;
      if (!permissionService) {
        console.error('PermissionService not initialized in app.locals');
        res.status(500).json({
          success: false,
          message: 'Authorization service unavailable',
          error: { code: 'SERVICE_UNAVAILABLE' }
        });
        return;
      }

      // Get user permissions (cached)
      const userPermissions = await permissionService.getUserEffectivePermissions(
        req.user.user_id, 
        workspaceId
      );

      // Check if user has required permissions
      const hasPermission = await permissionService.hasAnyPermission(
        req.user.user_id,
        workspaceId,
        permissionsArray
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          user_id: req.user.user_id,
          workspace_id: workspaceId,
          required_permissions: permissionsArray,
          user_permissions: userPermissions.slice(0, 10), // Log only first 10 for brevity
          ip: req.ip,
          user_agent: req.get('User-Agent')
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: { 
            code: 'INSUFFICIENT_PERMISSIONS',
            details: `Required: ${permissionsArray.join(' OR ')}`
          }
        });
        return;
      }

      // Attach permissions to request for use in controllers
      req.userPermissions = userPermissions;

      logger.debug('Permission check passed', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        required_permissions: permissionsArray
      });

      next();
    } catch (error: any) {
      logger.error('RBAC middleware error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: { code: 'RBAC_ERROR', details: error.message }
      });
      return;
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

    const workspaceId = req.headers['x-workspace-id'] as string;
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