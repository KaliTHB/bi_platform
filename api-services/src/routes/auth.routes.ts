// api-services/src/routes/auth.routes.ts - FIXED VERSION
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authenticate, optionalAuthenticate, authenticateForRefresh } from '../middleware/authentication';
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
 */
router.post('/logout', optionalAuthenticate, asyncHandler(async (req, res) => {
  try {
    await authController.logout(req as any, res);
  } catch (error) {
    logger.error('Route handler error for logout:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to logout',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * GET /api/auth/profile
 */
router.get('/profile', optionalAuthenticate, asyncHandler(async (req, res) => {
  try {
    await authController.getCurrentUser(req as any, res);
  } catch (error) {
    logger.error('Route handler error for profile:', {
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

/**
 * ✅ NEW: GET /api/auth/permissions
 * Get user permissions for current or specified workspace
 * Query parameters:
 * - workspace_id: optional workspace ID, if not provided uses user's first workspace
 */
router.get('/permissions', asyncHandler(async (req, res) => {
  try {
    await authController.getUserPermissions(req as any, res);
  } catch (error) {
    logger.error('Route handler error for permissions:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      workspace_id: req.query.workspace_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving permissions',
        error: 'INTERNAL_SERVER_ERROR',
        permissions: [],
        roles: []
      });
    }
  }
}));

// ✅ CRITICAL FIX: Refresh endpoint with special middleware that allows expired tokens
/**
 * POST /api/auth/refresh
 * This endpoint MUST use authenticateForRefresh to allow expired tokens!
 */
router.post('/refresh', authenticateForRefresh, asyncHandler(async (req, res) => {
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

// Protected routes (authentication required) - placed AFTER refresh endpoint
router.use(authenticate);

/**
 * POST /api/auth/switch-workspace
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

export default router;