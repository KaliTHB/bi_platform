// api-services/src/routes/auth.routes.ts - FIXED TYPESCRIPT TYPES
import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authenticate, optionalAuthenticate, authenticateForRefresh } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

// ✅ FIXED: Import the correct type
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    username?: string;
    workspace_id?: string;
    workspace_slug?: string;
    workspace_role?: string;
    is_admin?: boolean;
    role_level?: number;
  };
}

const router = Router();

// Create AuthService instance with database dependency
const authService = new AuthService(db);
const authController = new AuthController(authService);

// Middleware for request logging
router.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Auth API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    service: 'bi-platform-api'
  });
  next();
});

// ==================== PUBLIC ROUTES (NO AUTH) ====================

/**
 * POST /api/auth/login
 * Login with email/username and password
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.login(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for login:', {
      error: error instanceof Error ? error.message : 'Unknown error',
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
 * POST /api/auth/refresh
 * Refresh expired token (allows expired tokens)
 */
router.post('/refresh', authenticateForRefresh, asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.refreshToken(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for refresh:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
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

// ==================== PROTECTED ROUTES (REQUIRE AUTH) ====================

// Apply authentication middleware to all routes below
router.use(authenticate);

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.logout(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for logout:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
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
 * Get current user profile
 */
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.getCurrentUser(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for profile:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
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
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.verifyToken(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for verify:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * ✅ SINGLE PERMISSIONS ENDPOINT
 * GET /api/auth/permissions?workspace_id=xxx
 * Get current user's permissions
 */
router.get('/permissions', asyncHandler(async (req: Request, res: Response) => {
  try {
    await authController.getPermissions(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for permissions:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
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

/**
 * ✅ PAYLOAD-BASED WORKSPACE SWITCHING
 * POST /api/auth/switch-workspace
 * Switch user's active workspace
 * Payload: { workspaceId }
 */
router.post('/switch-workspace', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'Workspace ID is required',
        error: 'MISSING_WORKSPACE_ID'
      });
      return;
    }

    // Add workspaceId to body as workspace_id for backward compatibility with existing controller
    req.body.workspace_id = workspaceId;
    
    await authController.switchWorkspace(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for switch-workspace:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
      workspace_id: req.body.workspaceId,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to switch workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

// ==================== PASSWORD MANAGEMENT (PAYLOAD-BASED) ====================

/**
 * POST /api/auth/change-password
 * Change current user's password
 * Payload: { currentPassword, newPassword }
 */
router.post('/change-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        error: 'MISSING_PASSWORDS'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'WEAK_PASSWORD'
      });
      return;
    }

    // Add to body for backward compatibility with existing controller
    req.body.current_password = currentPassword;
    req.body.new_password = newPassword;
    
    await authController.changePassword(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for change password:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as AuthenticatedRequest).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 * Payload: { email }
 */
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      });
      return;
    }

    await authController.forgotPassword(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for forgot password:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 * Payload: { token, newPassword }
 */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'WEAK_PASSWORD'
      });
      return;
    }

    // Add to body for backward compatibility with existing controller
    req.body.new_password = newPassword;
    
    await authController.resetPassword(req as AuthenticatedRequest, res);
  } catch (error) {
    logger.error('Route handler error for reset password:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

export default router;