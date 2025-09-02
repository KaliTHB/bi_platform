// api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    workspace_id?: string;
    roles?: string[];
    permissions?: string[];
    iat?: number;
    exp?: number;
  };
}

interface JWTPayload {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  workspace_id?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// Mock user database for development
const mockUsers = new Map([
  ['sample-user', {
    user_id: 'sample-user',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    is_active: true,
    created_at: new Date(),
    last_login_at: new Date()
  }],
  ['viewer-user', {
    user_id: 'viewer-user', 
    email: 'viewer@example.com',
    first_name: 'Viewer',
    last_name: 'User',
    is_active: true,
    created_at: new Date(),
    last_login_at: new Date()
  }]
]);

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authorization header is required'
        }]
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

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

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

    try {
      // Verify and decode JWT token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Check if token has expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          errors: [{
            code: 'TOKEN_EXPIRED',
            message: 'JWT token has expired'
          }]
        });
        return;
      }

      // Verify user still exists and is active
      const user = mockUsers.get(decoded.user_id);
      if (!user || !user.is_active) {
        res.status(401).json({
          success: false,
          message: 'User not found or inactive',
          errors: [{
            code: 'USER_NOT_FOUND_OR_INACTIVE',
            message: 'User account not found or has been deactivated'
          }]
        });
        return;
      }

      // Attach user information to request
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        first_name: decoded.first_name,
        last_name: decoded.last_name,
        workspace_id: decoded.workspace_id,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        iat: decoded.iat,
        exp: decoded.exp
      };

      // Log successful authentication
      logger.debug('User authenticated successfully', {
        user_id: decoded.user_id,
        email: decoded.email,
        ip: req.ip,
        user_agent: req.get('User-Agent')
      });

      next();
    } catch (jwtError: any) {
      // Handle different JWT errors
      let errorMessage = 'Invalid token';
      let errorCode = 'INVALID_TOKEN';

      if (jwtError.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'Malformed token';
        errorCode = 'MALFORMED_TOKEN';
      } else if (jwtError.name === 'NotBeforeError') {
        errorMessage = 'Token not active yet';
        errorCode = 'TOKEN_NOT_ACTIVE';
      }

      logger.warn('Authentication failed', {
        error: jwtError.message,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        token_preview: token.substring(0, 20) + '...'
      });

      res.status(401).json({
        success: false,
        message: errorMessage,
        errors: [{
          code: errorCode,
          message: errorMessage
        }]
      });
      return;
    }
  } catch (error: any) {
    logger.error('Authentication middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      errors: [{
        code: 'AUTHENTICATION_SERVICE_ERROR',
        message: 'An error occurred during authentication'
      }]
    });
    return;
  }
}

// Optional authentication middleware (doesn't fail if no token provided)
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user context
    if (!authHeader) {
      next();
      return;
    }

    // Try to authenticate, but don't fail if it doesn't work
    await authenticate(req, res, (error?: any) => {
      if (error) {
        // Log the error but continue without authentication
        logger.debug('Optional authentication failed', {
          error: error.message,
          ip: req.ip
        });
      }
      next();
    });
  } catch (error) {
    // Continue without authentication on any error
    logger.debug('Optional authentication error', { error });
    next();
  }
}

// Middleware to require specific roles
export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access this resource'
        }]
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Insufficient role access', {
        user_id: req.user.user_id,
        required_roles: roles,
        user_roles: userRoles,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [{
          code: 'INSUFFICIENT_ROLES',
          message: `User must have one of the following roles: ${roles.join(', ')}`
        }]
      });
      return;
    }

    next();
  };
}

// Middleware to require specific permissions
export function requirePermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access this resource'
        }]
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      logger.warn('Insufficient permission access', {
        user_id: req.user.user_id,
        required_permissions: permissions,
        user_permissions: userPermissions,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [{
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `User must have the following permissions: ${permissions.join(', ')}`
        }]
      });
      return;
    }

    next();
  };
}

// Utility function to generate JWT token (for login endpoints)
export function generateToken(user: {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  workspace_id?: string;
  roles?: string[];
  permissions?: string[];
}): string {
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const payload: JWTPayload = {
    user_id: user.user_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    workspace_id: user.workspace_id,
    roles: user.roles || [],
    permissions: user.permissions || []
  };

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

// Utility function to refresh token
export function refreshToken(currentToken: string): string | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    
    // Decode without verifying expiration
    const decoded = jwt.decode(currentToken) as JWTPayload;
    
    if (!decoded) {
      return null;
    }

    // Generate new token with same payload but fresh expiration
    const newPayload: JWTPayload = {
      user_id: decoded.user_id,
      email: decoded.email,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      workspace_id: decoded.workspace_id,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(newPayload, jwtSecret, { expiresIn });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    return null;
  }
}

// Utility function to extract user from token without validation (for logging)
export function extractUserFromToken(token: string): Partial<JWTPayload> | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded ? {
      user_id: decoded.user_id,
      email: decoded.email
    } : null;
  } catch (error) {
    return null;
  }
}