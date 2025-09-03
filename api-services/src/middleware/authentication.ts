// api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    workspace_id?: string;
    email: string;
    first_name: string;
    last_name: string;
    roles?: string[];
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required'
        }]
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        errors: [{
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Token must be provided in Bearer format'
        }]
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret') as any;
      
      // Mock user data - replace with actual user lookup
      const user = {
        user_id: decoded.user_id || decoded.sub || '1',
        email: decoded.email || 'user@example.com',
        first_name: decoded.first_name || 'Test',
        last_name: decoded.last_name || 'User',
        workspace_id: decoded.workspace_id,
        roles: decoded.roles || []
      };

      req.user = user;
      
      logger.debug('User authenticated', {
        user_id: user.user_id,
        email: user.email,
        workspace_id: user.workspace_id
      });
      
      next();
    } catch (jwtError: any) {
      logger.warn('JWT verification failed', {
        error: jwtError.message,
        token: token.substring(0, 20) + '...',
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errors: [{
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'The provided token is invalid or has expired'
        }]
      });
      return;
    }
  } catch (error: any) {
    logger.error('Authentication middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      errors: [{
        code: 'AUTHENTICATION_ERROR',
        message: 'An error occurred during authentication'
      }]
    });
    return;
  }
};

// Export as default as well for compatibility
export default authenticate;