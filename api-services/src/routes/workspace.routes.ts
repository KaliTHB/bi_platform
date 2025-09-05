// api-services/src/routes/workspace.routes.ts - FIXED VERSION
import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const workspaceController = new WorkspaceController();

// Debug logging for route registration
console.log('=== Workspace Routes Debug ===');
console.log('workspaceController type:', typeof workspaceController);
console.log('getUserWorkspaces type:', typeof workspaceController.getUserWorkspaces);
console.log('createWorkspace type:', typeof workspaceController.createWorkspace);
console.log('getWorkspaceById type:', typeof workspaceController.getWorkspaceById);
console.log('updateWorkspace type:', typeof workspaceController.updateWorkspace);
console.log('deleteWorkspace type:', typeof workspaceController.deleteWorkspace);
console.log('==================================');

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

// 🔥 CRITICAL FIX: Get all workspaces for current user (handles /api/workspaces)
// This is the main endpoint that frontend workspaceAPI.ts calls
router.get('/', 
  asyncHandler(async (req, res) => {
    console.log('=== Workspace GET / Route Hit ===');
    console.log('User:', (req as any).user?.email);
    console.log('Method exists:', typeof workspaceController.getUserWorkspaces);
    
    try {
      // Call the controller method with proper binding
      await workspaceController.getUserWorkspaces(req as any, res);
    } catch (error) {
      console.error('Error in workspace / route:', error);
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
          }]
        });
      }
    }
  })
);

// Create new workspace
router.post('/',
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.createWorkspace(req as any, res);
    } catch (error) {
      logger.error('Create workspace error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create workspace',
          errors: [{ code: 'WORKSPACE_CREATION_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Get specific workspace by ID
router.get('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.getWorkspaceById(req as any, res);
    } catch (error) {
      logger.error('Get workspace by ID error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve workspace',
          errors: [{ code: 'WORKSPACE_RETRIEVAL_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Update workspace
router.put('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.updateWorkspace(req as any, res);
    } catch (error) {
      logger.error('Update workspace error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to update workspace',
          errors: [{ code: 'WORKSPACE_UPDATE_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Delete workspace
router.delete('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.deleteWorkspace(req as any, res);
    } catch (error) {
      logger.error('Delete workspace error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete workspace',
          errors: [{ code: 'WORKSPACE_DELETE_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Get workspace members
router.get('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.getWorkspaceMembers(req as any, res);
    } catch (error) {
      logger.error('Get workspace members error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve workspace members',
          errors: [{ code: 'WORKSPACE_MEMBERS_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Add member to workspace
router.post('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.addWorkspaceMember(req as any, res);
    } catch (error) {
      logger.error('Add workspace member error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to add workspace member',
          errors: [{ code: 'ADD_MEMBER_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Update member role
router.put('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.updateMemberRole(req as any, res);
    } catch (error) {
      logger.error('Update member role error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to update member role',
          errors: [{ code: 'UPDATE_ROLE_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

// Remove member from workspace
router.delete('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    try {
      await workspaceController.removeMember(req as any, res);
    } catch (error) {
      logger.error('Remove member error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to remove workspace member',
          errors: [{ code: 'REMOVE_MEMBER_ERROR', message: 'Internal server error' }]
        });
      }
    }
  })
);

export default router;