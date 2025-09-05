// api-services/src/routes/workspace.routes.ts - Updated to use new WorkspaceController
import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Create WorkspaceController instance
let workspaceController: WorkspaceController;

try {
  console.log('🔧 Initializing WorkspaceController...');
  workspaceController = new WorkspaceController();
  console.log('✅ WorkspaceController initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize WorkspaceController:', error);
  logger.error('Failed to initialize WorkspaceController:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    service: 'bi-platform-api'
  });
  throw error;
}

// Apply authentication to all routes
router.use(authenticate);

// Middleware for request logging
router.use((req, res, next) => {
  logger.info('Workspace API request', {
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
 * GET /api/workspaces
 * Get all workspaces for current user
 */
router.get('/', 
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace GET / route hit');
    try {
      await workspaceController.getUserWorkspaces(req as any, res);
    } catch (error) {
      console.error('❌ Error in workspace / route:', error);
      logger.error('Workspace route error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        user_id: (req as any).user?.user_id,
        service: 'bi-platform-api'
      });
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve workspaces',
          errors: [{
            code: 'WORKSPACE_RETRIEVAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }],
          data: [],
          workspaces: [],
          count: 0
        });
      }
    }
  })
);

/**
 * POST /api/workspaces
 * Create new workspace
 */
router.post('/',
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace POST / route hit');
    try {
      await workspaceController.createWorkspace(req as any, res);
    } catch (error) {
      console.error('❌ Error in create workspace route:', error);
      logger.error('Create workspace route error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create workspace',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);

/**
 * GET /api/workspaces/:workspaceId
 * Get specific workspace by ID or slug
 */
router.get('/:workspaceId',
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace GET /:workspaceId route hit:', req.params.workspaceId);
    try {
      await workspaceController.getWorkspaceById(req as any, res);
    } catch (error) {
      console.error('❌ Error in get workspace by ID route:', error);
      logger.error('Get workspace by ID route error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve workspace',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);

/**
 * PUT /api/workspaces/:workspaceId
 * Update workspace
 */
router.put('/:workspaceId',
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace PUT /:workspaceId route hit:', req.params.workspaceId);
    try {
      await workspaceController.updateWorkspace(req as any, res);
    } catch (error) {
      console.error('❌ Error in update workspace route:', error);
      logger.error('Update workspace route error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to update workspace',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);

/**
 * DELETE /api/workspaces/:workspaceId
 * Delete workspace
 */
router.delete('/:workspaceId',
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace DELETE /:workspaceId route hit:', req.params.workspaceId);
    try {
      await workspaceController.deleteWorkspace(req as any, res);
    } catch (error) {
      console.error('❌ Error in delete workspace route:', error);
      logger.error('Delete workspace route error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete workspace',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);


/**
 * GET /api/workspaces/:workspaceId/stats
 * Get workspace statistics
 */
router.get('/:workspaceId/stats', 
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace stats route hit for:', req.params.workspaceId);
    try {
      await workspaceController.getWorkspaceStats(req as any, res);
    } catch (error) {
      console.error('❌ Error in workspace stats route:', error);
      logger.error('Workspace stats route error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId: req.params.workspaceId,
        user_id: (req as any).user?.user_id,
        service: 'bi-platform-api'
      });
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve workspace statistics',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);

/**
 * GET /api/workspaces/:workspaceId/access
 * Check workspace access
 */
router.get('/:workspaceId/access', 
  asyncHandler(async (req, res) => {
    console.log('🏢 Workspace access check route hit for:', req.params.workspaceId);
    try {
      await workspaceController.checkWorkspaceAccess(req as any, res);
    } catch (error) {
      console.error('❌ Error in workspace access check route:', error);
      logger.error('Workspace access check route error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workspaceId: req.params.workspaceId,
        user_id: (req as any).user?.user_id,
        service: 'bi-platform-api'
      });
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to check workspace access',
          error: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  })
);

export default router;