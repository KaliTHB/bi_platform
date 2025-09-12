// api-services/src/routes/auth.routes.ts - FIXED VERSION
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authenticate, optionalAuthenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

const router = Router();

// Create AuthService instance with database dependency
const authService = new AuthService(db);

// Create AuthController with AuthService dependency
const authController = new AuthController(authService);

// Middleware for request logging
router.use((req, res, next) => {
  logger.info('Auth API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    service: 'bi-platform-api'
  });
  next();
});

// Public routes (no authentication required)
/**
 * POST /api/auth/login
 * Login with email/username and password, optionally with workspace
 */
router.post('/login', asyncHandler(async (req, res) => {
  try {
    await authController.login(req as any, res);
  } catch (error) {
    logger.error('Route handler error for login:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * POST /api/auth/logout
 * Logout current user (optional auth - if no token, just return success)
 */
router.post('/logout', optionalAuthenticate, asyncHandler(async (req, res) => {
  try {
    await authController.logout(req as any, res);
  } catch (error) {
    logger.error('Route handler error for logout:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error during logout',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * GET /api/auth/verify
 * Verify token validity (requires authentication)
 */
router.get('/verify', authenticate, asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        valid: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'Token is valid',
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        workspace_id: user.workspace_id,
        workspace_slug: user.workspace_slug,
        is_admin: user.is_admin
      },
      workspace: user.workspace_id ? {
        id: user.workspace_id,
        slug: user.workspace_slug
      } : null,
      permissions: [] // You can add permission logic here
    });
  } catch (error) {
    logger.error('Route handler error for verify:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        valid: false,
        message: 'Server error during token verification',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * GET /api/auth/me
 * Get current user profile - FIXED: Use optional auth to prevent errors on app startup
 */
router.get('/me', optionalAuthenticate, asyncHandler(async (req, res) => {
  try {
    // If no user authenticated, return appropriate response
    if (!req.user?.user_id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    await authController.getCurrentUser(req as any, res);
  } catch (error) {
    logger.error('Route handler error for me:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

// Protected routes (authentication required)
router.use(authenticate);

/**
 * POST /api/auth/switch-workspace
 * Switch user's active workspace using AuthService
 */
router.post('/switch-workspace', asyncHandler(async (req, res) => {
  try {
    await authController.switchWorkspace(req as any, res);
  } catch (error) {
    logger.error('Route handler error for switch-workspace:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error during workspace switch',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * POST /api/auth/refresh
 * Refresh authentication token using AuthService
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    await authController.refreshToken(req as any, res);
  } catch (error) {
    logger.error('Route handler error for refresh:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

export default router;