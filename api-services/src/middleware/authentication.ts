# api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { User } from '../types/auth.types';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if token is blacklisted
    const isBlacklisted = await CacheService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Try to get user from cache first
    let user = await CacheService.get(`user:${decoded.userId}`);
    
    if (!user) {
      // Get user from database
      const result = await DatabaseConfig.query(
        `SELECT u.*, array_agg(DISTINCT uw.workspace_id) as workspace_ids
         FROM users u
         LEFT JOIN user_workspaces uw ON u.id = uw.user_id
         WHERE u.id = $1 AND u.is_active = true
         GROUP BY u.id`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      user = result.rows[0];
      
      // Cache user for 15 minutes
      await CacheService.set(`user:${decoded.userId}`, user, 900);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await CacheService.set(`blacklist:${token}`, true, ttl);
      }
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
  }
};

export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Super admin has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      // Check user permissions in workspace
      const result = await DatabaseConfig.query(
        `SELECT p.name 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_workspace_roles uwr ON rp.role_id = uwr.role_id
         WHERE uwr.user_id = $1 AND uwr.workspace_id = $2 AND p.name = $3`,
        [req.user.id, workspaceId, permission]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (roles.includes(req.user.role)) {
        return next();
      }

      return res.status(403).json({ error: 'Insufficient role' });
    } catch (error) {
      logger.error('Role check error:', error);
      return res.status(500).json({ error: 'Role check failed' });
    }
  };
};