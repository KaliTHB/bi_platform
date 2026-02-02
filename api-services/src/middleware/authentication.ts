// api-services/src/middleware/authentication.ts - Fixed with proper exports
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthService } from '../services/AuthService';
import { db } from '../utils/database';
import { AuthUserData, MaybeAuthenticatedRequest } from '../types/express';

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
/**
 * Enhanced Authentication middleware with better error handling and refresh recommendations
 */
export const authenticate = async (
  req: MaybeAuthenticatedRequest,
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
        error: 'MISSING_TOKEN',
        can_refresh: false
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        error: 'INVALID_TOKEN_FORMAT',
        can_refresh: false
      });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as JWTPayload;
      
      // Check token expiration and set refresh headers
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp! - now;
      
      // Set refresh recommendation headers
      if (timeUntilExpiry < 300) { // Less than 5 minutes
        logger.info('Token expiring soon', {
          user_id: decoded.user_id,
          expires_in: timeUntilExpiry,
          service: 'bi-platform-api'
        });
        
        res.set('X-Token-Refresh-Required', 'true');
        res.set('X-Token-Expires-In', timeUntilExpiry.toString());
      } else if (timeUntilExpiry < 600) { // Less than 10 minutes
        res.set('X-Token-Refresh-Recommended', 'true');
        res.set('X-Token-Expires-In', timeUntilExpiry.toString());
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
      let canRefresh = false;
      
      if (jwtError.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Access token has expired. Please refresh your token.';
        canRefresh = true;
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid access token format or signature.';
        canRefresh = false;
      } else if (jwtError.name === 'NotBeforeError') {
        errorCode = 'TOKEN_NOT_ACTIVE';
        message = 'Token is not yet active.';
        canRefresh = false;
      }

      res.status(401).json({
        success: false,
        message,
        error: errorCode,
        can_refresh: canRefresh,
        refresh_endpoint: canRefresh ? '/api/auth/refresh' : undefined
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
      error: 'AUTHENTICATION_ERROR',
      can_refresh: false
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
 * Get JWT expiration time based on environment
 */
const getJwtExpirationTime = (): string => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Development: Long-lived tokens for convenience
  if (nodeEnv === 'development') {
    return process.env.JWT_EXPIRES_IN || '24h'; // 24 hours default
  }
  
  // Staging: Medium-lived tokens
  if (nodeEnv === 'staging') {
    return process.env.JWT_EXPIRES_IN || '2h'; // 2 hours default
  }
  
  // Production: Short-lived tokens for security
  return process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes default
};

/**
 * Helper function to generate JWT tokens
 */
/**
 * Enhanced token generation with environment-aware expiration
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const expiresIn = getJwtExpirationTime();
  
  console.log(`🔑 Generating JWT token with expiration: ${expiresIn} (env: ${process.env.NODE_ENV})`);
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-jwt-secret',
    { 
      expiresIn,
      issuer: 'bi-platform-api'
    }
  );
};


/**
 * Get refresh token expiration based on environment  
 */
const getRefreshTokenExpirationTime = (): string => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'development') {
    return process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'; // 30 days
  }
  
  if (nodeEnv === 'staging') {
    return process.env.REFRESH_TOKEN_EXPIRES_IN || '14d'; // 14 days
  }
  
  // Production
  return process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // 7 days
};

/**
 * Generate refresh token with environment-aware expiration
 */
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const expiresIn = getRefreshTokenExpirationTime();
  
  return jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { 
      expiresIn,
      issuer: 'bi-platform-api'
    }
  );
};

/**
 * Graceful authentication middleware - allows expired tokens for refresh endpoint
 * Use this for the refresh endpoint to allow expired tokens through
 */
export const authenticateForRefresh = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required for refresh',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      // Try to verify the token normally first
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as JWTPayload;
      
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        username: decoded.username,
        workspace_id: decoded.workspace_id,
        workspace_slug: decoded.workspace_slug,
        workspace_role: decoded.workspace_role,
        is_admin: decoded.is_admin || false,
        role_level: decoded.role_level || 0
      };
      
      next();
      
    } catch (jwtError: any) {
      // If token is expired, still allow it for refresh
      if (jwtError.name === 'TokenExpiredError') {
        try {
          // Decode without verification to get user info
          const decoded = jwt.decode(token) as JWTPayload;
          
          if (decoded && decoded.user_id) {
            req.user = {
              user_id: decoded.user_id,
              email: decoded.email,
              username: decoded.username,
              workspace_id: decoded.workspace_id,
              workspace_slug: decoded.workspace_slug,
              workspace_role: decoded.workspace_role,
              is_admin: decoded.is_admin || false,
              role_level: decoded.role_level || 0
            };
            
            logger.info('Allowing expired token for refresh', {
              user_id: decoded.user_id,
              service: 'bi-platform-api'
            });
            
            next();
            return;
          }
        } catch {
          // If we can't decode at all, reject
        }
      }
      
      // For other JWT errors, reject
      res.status(401).json({
        success: false,
        message: 'Invalid token for refresh',
        error: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }
    
  } catch (error: any) {
    logger.error('Refresh authentication middleware error:', {
      error: error.message,
      service: 'bi-platform-api'
    });
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed during refresh',
      error: 'REFRESH_AUTH_ERROR'
    });
  }
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