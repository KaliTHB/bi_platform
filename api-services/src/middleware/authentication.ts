// api-services/src/middleware/authentication.ts - Fixed with proper exports
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthService } from '../services/AuthService';
import { db } from '../utils/database';

// Create AuthService instance for admin checks
const authService = new AuthService(db);

// JWT Payload interface
export interface JWTPayload {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  iat?: number;
  exp?: number;
}

// User data interface
export interface AuthUserData {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
}

// Extended Request interface - EXPORTED
export interface AuthenticatedRequest extends Request {
  user?: AuthUserData;
}

// Extend Express Request globally for compatibility
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserData;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and extracts user information
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        service: 'bi-platform-api'
      });
      
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        error: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as JWTPayload;
      
      // Check if token is about to expire (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp! - now;
      
      if (timeUntilExpiry < 300) { // Less than 5 minutes
        logger.info('Token expiring soon', {
          user_id: decoded.user_id,
          expires_in: timeUntilExpiry,
          service: 'bi-platform-api'
        });
        
        // Add header to indicate token should be refreshed
        res.set('X-Token-Refresh-Required', 'true');
      }
      
      // Extract user data from token
      const userData: AuthUserData = {
        user_id: decoded.user_id,
        email: decoded.email,
        username: decoded.username,
        workspace_id: decoded.workspace_id,
        workspace_slug: decoded.workspace_slug,
        workspace_role: decoded.workspace_role,
        is_admin: decoded.is_admin || false,
        role_level: decoded.role_level || 0
      };
      
      req.user = userData;
      
      logger.debug('User authenticated successfully', {
        user_id: userData.user_id,
        email: userData.email,
        workspace_id: userData.workspace_id,
        expires_in: timeUntilExpiry,
        service: 'bi-platform-api'
      });
      
      next();
      
    } catch (jwtError: any) {
      logger.warn('JWT verification failed', {
        error: jwtError.message,
        name: jwtError.name,
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        service: 'bi-platform-api'
      });

      // Provide specific error codes for different JWT errors
      let errorCode = 'TOKEN_VERIFICATION_FAILED';
      let message = 'Invalid or expired token';
      
      if (jwtError.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Access token has expired. Please refresh your token.';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid access token format or signature.';
      } else if (jwtError.name === 'NotBeforeError') {
        errorCode = 'TOKEN_NOT_ACTIVE';
        message = 'Token is not yet active.';
      }

      res.status(401).json({
        success: false,
        message,
        error: errorCode,
        can_refresh: jwtError.name === 'TokenExpiredError' // Indicate if refresh is possible
      });
      return;
    }
    
  } catch (error: any) {
    logger.error('Authentication middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      service: 'bi-platform-api'
    });
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error',
      error: 'AUTHENTICATION_ERROR'
    });
    return;
  }
};

/**
 * Optional authentication middleware
 * Does not fail if no token provided, but extracts user if token exists
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    next();
    return;
  }

  try {
    // Try to authenticate, but don't fail if it doesn't work
    await authenticate(req, res, next);
  } catch (error) {
    logger.warn('Optional authentication failed, continuing without auth:', error);
    // Continue without authentication
    next();
  }
};

/**
 * Helper function to generate JWT tokens
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-jwt-secret',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'bi-platform-api'
    }
  );
};

/**
 * Helper function to verify JWT tokens without middleware
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-jwt-secret'
    ) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Extract token from request headers
 */
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: AuthenticatedRequest): boolean => {
  return req.user?.is_admin === true || 
         (req.user?.role_level || 0) >= 90;
};


/**
 * Check if token needs refresh (within 10 minutes of expiry)
 */
export const shouldRefreshToken = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Refresh if token expires within 10 minutes
    return timeUntilExpiry < 600;
  } catch {
    return false;
  }
};

/**
 * Middleware to check if token refresh is recommended
 */
export const checkTokenRefresh = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    if (shouldRefreshToken(token)) {
      res.set('X-Token-Refresh-Recommended', 'true');
    }
  }
  
  next();
};

/**
 * Require admin access middleware
 */
/**
 * Require admin access middleware - UPDATED to use AuthService
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }
  
  // Use AuthService to check if user is admin in any workspace they have access to
  checkAdminStatus(req, res, next);
};

/**
 * Check admin status using AuthService
 */
const checkAdminStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    console.log('🔍 requireAdmin: Checking admin status for user:', userId);

    // Get user's workspaces and check if they're admin in any
    const workspacesQuery = `
      SELECT DISTINCT w.id as workspace_id, r.name as role_name
      FROM user_role_assignments ura
      JOIN workspaces w ON ura.workspace_id = w.id
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
        AND (r.name ILIKE '%admin%' OR r.name ILIKE '%owner%')
    `;

    const result = await authService['database'].query(workspacesQuery, [userId]);

    if (result.rows.length > 0) {
      console.log('✅ requireAdmin: User is admin in', result.rows.length, 'workspace(s)');
      next();
      return;
    }

    // Alternative check: use AuthService to check admin status in a specific workspace
    // Try to find any workspace where user has admin permissions
    const allWorkspacesQuery = `
      SELECT DISTINCT ura.workspace_id
      FROM user_role_assignments ura
      JOIN workspaces w ON ura.workspace_id = w.id
      WHERE ura.user_id = $1 AND ura.is_active = true AND w.is_active = true
      LIMIT 3
    `;

    const workspacesResult = await authService['database'].query(allWorkspacesQuery, [userId]);
    
    for (const workspace of workspacesResult.rows) {
      try {
        const permissions = await authService.getUserPermissions(userId, workspace.workspace_id);
        if (permissions.is_admin) {
          console.log('✅ requireAdmin: User is admin in workspace:', workspace.workspace_id);
          next();
          return;
        }
      } catch (error) {
        console.warn('Error checking permissions for workspace:', workspace.workspace_id, error.message);
      }
    }

    console.log('❌ requireAdmin: User is not admin in any workspace');
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_ACCESS_REQUIRED'
    });

  } catch (error: any) {
    console.error('❌ requireAdmin: Error checking admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating admin access',
      error: 'ADMIN_VALIDATION_ERROR'
    });
  }
};

/**
 * Require workspace context middleware
 */
export const requireWorkspace = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }
  
  if (!req.user.workspace_id) {
    res.status(400).json({
      success: false,
      message: 'Workspace context required',
      error: 'WORKSPACE_REQUIRED'
    });
    return;
  }
  
  next();
};

// Default export for backward compatibility
export default authenticate;