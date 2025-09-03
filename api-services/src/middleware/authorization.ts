// api-services/src/middleware/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authentication';

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
        return;
      }

      // Get user permissions from database or cache
      const userPermissions = await getUserPermissions(req.user.id, req.workspace?.id);

      if (!userPermissions.includes(permission)) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: `Required permission: ${permission}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Multiple permissions authorization (requires ALL permissions)
 */
export const requirePermissions = (permissions: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
        return;
      }

      const userPermissions = await getUserPermissions(req.user.id, req.workspace?.id);
      const missingPermissions = permissions.filter(p => !userPermissions.includes(p));

      if (missingPermissions.length > 0) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: `Required permissions: ${missingPermissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Any permission authorization (requires at least ONE permission)
 */
export const requireAnyPermission = (permissions: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
        return;
      }

      const userPermissions = await getUserPermissions(req.user.id, req.workspace?.id);
      const hasAnyPermission = permissions.some(p => userPermissions.includes(p));

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: `Required at least one of: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Role-based authorization middleware
 * @deprecated - Use permission-based authorization instead
 */
export const requireRole = (role: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
        return;
      }

      // Get user roles from database
      const userRoles = await getUserRoles(req.user.id, req.workspace?.id);

      if (!userRoles.includes(role)) {
        res.status(403).json({
          success: false,
          error: 'Role required',
          message: `Required role: ${role}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during role authorization'
      });
    }
  };
};

/**
 * Multiple roles authorization (requires at least ONE role)
 */
export const requireAnyRole = (roles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource'
        });
        return;
      }

      const userRoles = await getUserRoles(req.user.id, req.workspace?.id);
      const hasAnyRole = roles.some(role => userRoles.includes(role));

      if (!hasAnyRole) {
        res.status(403).json({
          success: false,
          error: 'Role required',
          message: `Required at least one role: ${roles.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during role authorization'
      });
    }
  };
};

/**
 * Admin role requirement
 */
export const requireAdmin = requireRole('admin');

/**
 * Workspace admin requirement
 */
export const requireWorkspaceAdmin = requireAnyPermission(['workspace.admin', 'workspace.update']);

/**
 * Resource owner authorization
 */
export const requireResourceOwner = (resourceIdParam: string = 'id') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      const isOwner = await checkResourceOwnership(req.user.id, resourceId);

      if (!isOwner) {
        // Check if user has admin permissions as fallback
        const userPermissions = await getUserPermissions(req.user.id, req.workspace?.id);
        const hasAdminAccess = userPermissions.includes('workspace.admin') || 
                              userPermissions.includes('user.admin');

        if (!hasAdminAccess) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access your own resources'
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error'
      });
    }
  };
};

// Placeholder functions - replace with your actual database queries
async function getUserPermissions(userId: string, workspaceId?: string): Promise<string[]> {
  // TODO: Replace with actual database query
  // Example:
  // const permissions = await db.query(`
  //   SELECT DISTINCT p.name 
  //   FROM permissions p
  //   JOIN role_permissions rp ON p.id = rp.permission_id
  //   JOIN user_roles ur ON rp.role_id = ur.role_id
  //   WHERE ur.user_id = $1 AND ur.workspace_id = $2
  // `, [userId, workspaceId]);
  // return permissions.rows.map(p => p.name);
  
  console.warn('getUserPermissions is a placeholder - implement your database query');
  return [];
}

async function getUserRoles(userId: string, workspaceId?: string): Promise<string[]> {
  // TODO: Replace with actual database query
  // Example:
  // const roles = await db.query(`
  //   SELECT r.name 
  //   FROM roles r
  //   JOIN user_roles ur ON r.id = ur.role_id
  //   WHERE ur.user_id = $1 AND ur.workspace_id = $2
  // `, [userId, workspaceId]);
  // return roles.rows.map(r => r.name);
  
  console.warn('getUserRoles is a placeholder - implement your database query');
  return [];
}

async function checkResourceOwnership(userId: string, resourceId: string): Promise<boolean> {
  // TODO: Replace with actual database query
  // Example: Check if user owns the resource
  console.warn('checkResourceOwnership is a placeholder - implement your database query');
  return false;
}