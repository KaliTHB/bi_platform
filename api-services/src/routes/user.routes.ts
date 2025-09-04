// api-services/src/routes/user.routes.ts - Complete Updated Version
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const userController = new UserController();

// Debug logging for route registration
console.log('=== User Routes Debug ===');
console.log('userController:', typeof userController);
console.log('getDefaultWorkspace:', typeof userController.getDefaultWorkspace);
console.log('getUserWorkspaces:', typeof userController.getUserWorkspaces);
console.log('getUsers:', typeof userController.getUsers);
console.log('createUser:', typeof userController.createUser);
console.log('updateUser:', typeof userController.updateUser);
console.log('deleteUser:', typeof userController.deleteUser);
console.log('========================');

// Apply authentication to all routes
router.use(authenticate);

// Middleware for request logging
router.use((req, res, next) => {
  logger.info('User API request', {
    method: req.method,
    path: req.path,
    user_id: (req as any).user?.user_id,
    user_email: (req as any).user?.email,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    service: 'bi-platform-api'
  });
  next();
});

// NEW ENDPOINTS - Default Workspace & User Workspaces
// These must be defined BEFORE the parameterized routes

/**
 * GET /api/user/default-workspace
 * Get user's default workspace (returns THB for admin users)
 */
router.get('/default-workspace', asyncHandler(async (req, res, next) => {
  try {
    await userController.getDefaultWorkspace(req as any, res);
  } catch (error) {
    logger.error('Route handler error for default-workspace:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving default workspace',
        error: 'INTERNAL_SERVER_ERROR',
        workspace: null,
        details: 'Please try again or contact support'
      });
    }
  }
}));

/**
 * GET /api/user/workspaces
 * Get all workspaces available to the current user
 */
router.get('/workspaces', asyncHandler(async (req, res, next) => {
  try {
    await userController.getUserWorkspaces(req as any, res);
  } catch (error) {
    logger.error('Route handler error for user workspaces:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving workspaces',
        error: 'INTERNAL_SERVER_ERROR',
        workspaces: [],
        details: 'Please try again or contact support'
      });
    }
  }
}));

// EXISTING ROUTES - User Management

/**
 * GET /api/user/
 * Get all users (admin functionality)
 */
router.get('/', asyncHandler(async (req, res, next) => {
  try {
    await userController.getUsers(req as any, res);
  } catch (error) {
    logger.error('Route handler error for get users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving users',
        error: 'INTERNAL_SERVER_ERROR',
        data: []
      });
    }
  }
}));

/**
 * POST /api/user/
 * Create new user
 */
router.post('/', asyncHandler(async (req, res, next) => {
  try {
    await userController.createUser(req as any, res);
  } catch (error) {
    logger.error('Route handler error for create user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      request_body: req.body,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error creating user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * PUT /api/user/:userId
 * Update existing user
 */
router.put('/:userId', asyncHandler(async (req, res, next) => {
  try {
    await userController.updateUser(req as any, res);
  } catch (error) {
    logger.error('Route handler error for update user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      target_user_id: req.params.userId,
      request_body: req.body,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error updating user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

/**
 * DELETE /api/user/:userId
 * Delete user
 */
router.delete('/:userId', asyncHandler(async (req, res, next) => {
  try {
    await userController.deleteUser(req as any, res);
  } catch (error) {
    logger.error('Route handler error for delete user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user_id: (req as any).user?.user_id,
      target_user_id: req.params.userId,
      service: 'bi-platform-api'
    });
    
    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error deleting user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}));

// Global error handler for this router
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error in user routes:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    user_id: req.user?.user_id,
    service: 'bi-platform-api'
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact system administrator'
    });
  }
});

export default router;