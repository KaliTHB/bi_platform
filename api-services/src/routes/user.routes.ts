// api-services/src/routes/user.routes.ts - Updated to also use AuthService for permissions
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../utils/database';

const router = Router();

// Create services
const authService = new AuthService(db);
const userController = new UserController(db, authService); // Pass AuthService to UserController

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


/**
 * GET /api/user/default-workspace
 * Get user's default workspace using AuthService
 */
router.get('/default-workspace', asyncHandler(async (req, res) => {
  try {
    await userController.getDefaultWorkspace(req as any, res);
  } catch (error) {
    logger.error('Route handler error for default-workspace:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving default workspace',
        error: 'INTERNAL_SERVER_ERROR',
        workspace: null
      });
    }
  }
}));

/**
 * GET /api/user/workspaces
 * Get all workspaces available to the current user using AuthService
 */
router.get('/workspaces', asyncHandler(async (req, res) => {
  try {
    await userController.getUserWorkspaces(req as any, res);
  } catch (error) {
    logger.error('Route handler error for user workspaces:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
      service: 'bi-platform-api'
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error retrieving workspaces',
        error: 'INTERNAL_SERVER_ERROR',
        workspaces: []
      });
    }
  }
}));

/**
 * GET /api/user/permissions
 * Get user permissions for current workspace using AuthService
 */
router.get('/permissions', asyncHandler(async (req, res) => {
  try {
    await userController.getUserPermissions(req as any, res);
  } catch (error) {
    logger.error('Route handler error for user permissions:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: (req as any).user?.user_id,
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

// User management routes (placeholders for now)
router.get('/users', asyncHandler(userController.getUsers));
router.post('/users', asyncHandler(userController.createUser));
router.get('/users/:id', asyncHandler(userController.getUser));
router.put('/users/:id', asyncHandler(userController.updateUser));
router.delete('/users/:id', asyncHandler(userController.deleteUser));

export default router;
