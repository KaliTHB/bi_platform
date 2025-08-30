import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface JWTPayload {
  userId: string;
  workspaceId: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        username: string;
        email: string;
        workspace_id: string;
        workspace_slug: string;
        role_id: string;
        role_name: string;
        permissions: string[];
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Authentication token required' }
      });
    }

    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Get user details from database
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        w.id as workspace_id,
        w.slug as workspace_slug,
        wu.role_id,
        r.name as role_name
      FROM users u
      JOIN workspace_users wu ON u.id = wu.user_id
      JOIN workspaces w ON wu.workspace_id = w.id
      JOIN custom_roles r ON wu.role_id = r.id
      WHERE u.id = $1 AND w.id = $2 AND u.is_active = true AND wu.is_active = true
    `;

    const userResult = await db.query(userQuery, [payload.userId, payload.workspaceId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    const user = userResult.rows[0];

    // Get user permissions
    const permissionsQuery = `
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;

    const permissionsResult = await db.query(permissionsQuery, [user.role_id]);
    const permissions = permissionsResult.rows.map(row => row.name);

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      workspace_id: user.workspace_id,
      workspace_slug: user.workspace_slug,
      role_id: user.role_id,
      role_name: user.role_name,
      permissions
    };

    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication error' }
    });
  }
};

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  
  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    await authMiddleware(req, res, next);
  } catch (error) {
    // If authentication fails, continue without user info
    next();
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
    }

    // Check if user has the required permission or wildcard permission
    if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('*')) {
      return res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Permission '${permission}' required` }
      });
    }

    next();
  };
};

export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
    }

    // Check if user has any of the required permissions or wildcard permission
    const hasPermission = req.user.permissions.includes('*') || 
                         permissions.some(perm => req.user.permissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: `One of these permissions required: ${permissions.join(', ')}` 
        }
      });
    }

    next();
  };
};

export const requireWorkspaceAccess = (workspaceParam: string = 'workspace_id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
    }

    const requestedWorkspaceId = req.params[workspaceParam] || req.body[workspaceParam] || req.query[workspaceParam];
    
    if (requestedWorkspaceId && requestedWorkspaceId !== req.user.workspace_id) {
      return res.status(403).json({
        success: false,
        error: { code: 'WORKSPACE_ACCESS_DENIED', message: 'Access to this workspace is denied' }
      });
    }

    next();
  };
};

// Helper function to extract token from request
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.auth_token;
  if (cookieToken) {
    return cookieToken;
  }

  // Check query parameter (not recommended for production)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }

  return null;
}
