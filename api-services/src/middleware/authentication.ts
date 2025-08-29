// api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';

const cache = new CacheService();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    workspaceId: string;
    workspaceSlug: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        errors: [{ code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token required' }]
      });
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        errors: [{ code: 'TOKEN_REVOKED', message: 'Token is no longer valid' }]
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key') as any;
    
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type',
        errors: [{ code: 'INVALID_TOKEN_TYPE', message: 'Access token required' }]
      });
      return;
    }

    req.user = {
      id: decoded.userId,
      username: decoded.username,
      workspaceId: decoded.workspaceId,
      workspaceSlug: decoded.workspaceSlug
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired',
        errors: [{ code: 'TOKEN_EXPIRED', message: 'Please refresh your token' }]
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        errors: [{ code: 'INVALID_TOKEN', message: 'Token is malformed or invalid' }]
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        errors: [{ code: 'AUTH_ERROR', message: 'Internal authentication error' }]
      });
    }
  }
};

export const optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  // If token is provided, validate it
  await authenticate(req, res, next);
};