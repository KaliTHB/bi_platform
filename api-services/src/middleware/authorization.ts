// api-services/src/middleware/authorization.ts - FIXED VERSION
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authentication';
import  databaseConfig from '../utils/database';

const db = databaseConfig;

/**
 * Permission-based authorization (requires at least ONE permission)
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

      // Check if user is admin first (admins bypass all permission checks)
      const isUserAdmin = await isAdmin(req);
      if (isUserAdmin) {
        next();
        return;
      }

      const userPermissions = await getUserPermissions(req.user.user_id, req.user.workspace_id);
      const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: 'Permission required',
          message: `Required at least one permission: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during permission authorization'
      });
    }
  };
};

/**
 * Role-based authorization (requires specific role)
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

      // Check if user is admin first (admins bypass role checks)
      const isUserAdmin = await isAdmin(req);
      if (isUserAdmin) {
        next();
        return;
      }

      // Get user roles from database
      const userRoles = await getUserRoles(req.user.user_id, req.user.workspace_id);

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

      // Check if user is admin first
      const isUserAdmin = await isAdmin(req);
      if (isUserAdmin) {
        next();
        return;
      }

      const userRoles = await getUserRoles(req.user.user_id, req.user.workspace_id);
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
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
      return;
    }

    const isUserAdmin = await isAdmin(req);
    if (!isUserAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'Administrative privileges required'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization error',
      message: 'Internal server error during admin authorization'
    });
  }
};

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

      // Check if user is admin first (admins can access any resource)
      const isUserAdmin = await isAdmin(req);
      if (isUserAdmin) {
        next();
        return;
      }

      const resourceId = req.params[resourceIdParam];
      const isOwner = await checkResourceOwnership(req.user.user_id, resourceId);

      if (!isOwner) {
        // Check if user has admin permissions as fallback
        const userPermissions = await getUserPermissions(req.user.user_id, req.user.workspace_id);
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

// ===== FIXED DATABASE FUNCTIONS (NO MORE PLACEHOLDERS) =====

/**
 * Get user permissions from database
 */
async function getUserPermissions(userId: string, workspaceId?: string): Promise<string[]> {
  if (!userId) return [];
  
  try {
    let query: string;
    let params: any[];

    if (workspaceId) {
      // Get workspace-specific permissions
      query = `
        SELECT DISTINCT p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_role_assignments ura ON rp.role_id = ura.role_id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2 
          AND ura.is_active = true
          AND p.is_system = true
      `;
      params = [userId, workspaceId];
    } else {
      // Get global permissions
      query = `
        SELECT DISTINCT p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_role_assignments ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
          AND p.is_system = true
      `;
      params = [userId];
    }

    const result = await db.query(query, params);
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('getUserPermissions database error:', error);
    return [];
  }
}

/**
 * Get user roles from database
 */
async function getUserRoles(userId: string, workspaceId?: string): Promise<string[]> {
  if (!userId) return [];
  
  try {
    let query: string;
    let params: any[];

    if (workspaceId) {
      // Get workspace-specific roles
      query = `
        SELECT DISTINCT cr.name 
        FROM custom_roles cr
        JOIN user_role_assignments ura ON cr.id = ura.role_id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2 
          AND ura.is_active = true
      `;
      params = [userId, workspaceId];
    } else {
      // Get global roles
      query = `
        SELECT DISTINCT r.name 
        FROM roles r
        JOIN user_role_assignments ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
      `;
      params = [userId];
    }

    const result = await db.query(query, params);
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('getUserRoles database error:', error);
    return [];
  }
}

/**
 * Check if user owns a resource
 */
async function checkResourceOwnership(userId: string, resourceId: string): Promise<boolean> {
  if (!userId || !resourceId) return false;
  
  try {
    // Check multiple resource types (dashboards, datasets, charts)
    const queries = [
      'SELECT COUNT(*) as count FROM dashboards WHERE id = $1 AND created_by = $2',
      'SELECT COUNT(*) as count FROM datasets WHERE id = $1 AND created_by = $2',
      'SELECT COUNT(*) as count FROM charts WHERE id = $1 AND created_by = $2'
    ];

    for (const query of queries) {
      const result = await db.query(query, [resourceId, userId]);
      if (parseInt(result.rows[0].count) > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('checkResourceOwnership database error:', error);
    return false;
  }
}

/**
 * Enhanced isAdmin check - checks multiple sources
 */
async function isAdmin(req: AuthenticatedRequest): Promise<boolean> {
  if (!req.user) return false;
  
  try {
    // Check 1: JWT token admin flag
    if (req.user.is_admin === true) {
      return true;
    }
    
    // Check 2: Role level (90+ = admin)
    if ((req.user.role_level || 0) >= 90) {
      return true;
    }
    
    // Check 3: Has admin role in current workspace
    if (req.user.workspace_id) {
      const roles = await getUserRoles(req.user.user_id, req.user.workspace_id);
      if (roles.includes('admin') || roles.includes('Administrator')) {
        return true;
      }
      
      // Check for admin permissions
      const permissions = await getUserPermissions(req.user.user_id, req.user.workspace_id);
      return permissions.includes('workspace.admin') || permissions.includes('user.admin');
    }
    
    return false;
  } catch (error) {
    console.error('isAdmin check error:', error);
    return false;
  }
}

/**
 * Helper to check if user has specific permission
 */
export async function hasPermission(
  userId: string, 
  workspaceId: string, 
  permission: string
): Promise<boolean> {
  try {
    // Admin users have all permissions
    const req = { user: { user_id: userId, workspace_id: workspaceId } } as AuthenticatedRequest;
    if (await isAdmin(req)) {
      return true;
    }

    const userPermissions = await getUserPermissions(userId, workspaceId);
    return userPermissions.includes(permission);
  } catch (error) {
    console.error('hasPermission check error:', error);
    return false;
  }
}