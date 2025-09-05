// api-services/src/routes/auth.routes.ts - Fixed database import
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../utils/database'; // ✅ Fixed: Import from utils/database instead of config/database
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
 * Logout current user
 */
router.post('/logout', asyncHandler(async (req, res) => {
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
 * GET /api/auth/me
 * Get current user profile with workspace info using AuthService
 */
router.get('/me', asyncHandler(async (req, res) => {
  try {
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