// File: api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { User } from '../types/auth.types';

export interface AuthenticatedRequest extends Request {
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

export interface WorkspaceRequest extends Request {
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
  workspace?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticate: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false,
        error: { code: 'NO_TOKEN', message: 'No token provided' } 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if token is blacklisted
      const isBlacklisted = await cache.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({ 
          success: false,
          error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' } 
        });
        return;
      }

      // Try to get user from cache first
      let user = await cache.get(`user:${decoded.userId}`);
      
      if (!user) {
        // Get user from database
        const result = await db.query(
          `SELECT u.*, 
                  w.id as workspace_id,
                  w.slug as workspace_slug,
                  r.id as role_id,
                  r.name as role_name,
                  array_agg(DISTINCT p.name) as permissions
           FROM users u
           LEFT JOIN user_workspaces uw ON u.id = uw.user_id
           LEFT JOIN workspaces w ON uw.workspace_id = w.id
           LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id AND w.id = uwr.workspace_id
           LEFT JOIN roles r ON uwr.role_id = r.id
           LEFT JOIN role_permissions rp ON r.id = rp.role_id
           LEFT JOIN permissions p ON rp.permission_id = p.id
           WHERE u.id = $1 AND u.is_active = true
           GROUP BY u.id, w.id, w.slug, r.id, r.name`,
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          res.status(401).json({ 
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' } 
          });
          return;
        }

        user = result.rows[0];
        
        // Cache user for 15 minutes
        await cache.set(`user:${decoded.userId}`, user, 900);
      }

      (req as AuthenticatedRequest).user = user;
      next();
    } catch (jwtError) {
      res.status(401).json({ 
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' } 
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication error' } 
    });
    return;
  }
};

export const requirePermission = (permission: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
      return;
    }

    // Check if user has the required permission or wildcard permission
    if (!authReq.user.permissions.includes(permission) && !authReq.user.permissions.includes('*')) {
      res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Permission '${permission}' required` }
      });
      return;
    }

    next();
  };
};

export const requireRole = (roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
      return;
    }

    if (!roles.includes(authReq.user.role_name)) {
      res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_ROLE', message: 'Insufficient role permissions' }
      });
      return;
    }

    next();
  };
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      workspaceId: user.workspace_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cache.set(`blacklist:${token}`, '1', ttl);
      }
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
  }
};