// api-services/src/routes/auth.routes.ts - Fixed Database Import
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Try different possible database import paths
let db: any;
try {
  // Try the most common paths
  try {
    db = require('../config/database').db;
    console.log('✅ Database imported from ../config/database');
  } catch (e1) {
    try {
      db = require('../config/database').default;
      console.log('✅ Database imported as default from ../config/database');
    } catch (e2) {
      try {
        // Try looking for db.ts instead of database.ts
        db = require('../config/db').db;
        console.log('✅ Database imported from ../config/db');
      } catch (e3) {
        try {
          db = require('../config/db').default;
          console.log('✅ Database imported as default from ../config/db');
        } catch (e4) {
          try {
            // Try utils folder
            db = require('../utils/database').db;
            console.log('✅ Database imported from ../utils/database');
          } catch (e5) {
            console.error('❌ Could not import database from any location:', {
              config_database: e1.message,
              config_database_default: e2.message,
              config_db: e3.message,
              config_db_default: e4.message,
              utils_database: e5.message
            });
            throw new Error('Database connection could not be imported');
          }
        }
      }
    }
  }
} catch (importError) {
  console.error('❌ Fatal: Could not import database connection:', importError);
  throw importError;
}

// Validate that db is actually a database connection
if (!db) {
  console.error('❌ Database connection is null or undefined');
  throw new Error('Database connection is null');
}

if (typeof db.query !== 'function') {
  console.error('❌ Database connection does not have a query method');
  console.log('Database object:', db);
  throw new Error('Invalid database connection - missing query method');
}

console.log('✅ Database connection validated successfully');

// Create AuthService and AuthController instances
let authService: AuthService;
let authController: AuthController;

try {
  console.log('🔧 Initializing AuthService with database connection...');
  authService = new AuthService(db);
  authController = new AuthController(authService);
  console.log('✅ AuthService and AuthController initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize AuthService:', error);
  logger.error('Failed to initialize AuthService:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    service: 'bi-platform-api'
  });
  throw error;
}

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
    console.log('🔑 Login route hit');
    await authController.login(req as any, res);
  } catch (error) {
    console.error('❌ Login route error:', error);
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
    console.log('🔄 Switch workspace route hit');
    await authController.switchWorkspace(req as any, res);
  } catch (error) {
    console.error('❌ Switch workspace route error:', error);
    logger.error('Route handler error for switch-workspace:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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