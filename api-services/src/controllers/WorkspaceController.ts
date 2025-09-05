// api-services/src/controllers/WorkspaceController.ts
import { Response } from 'express';
import { WorkspaceService, Workspace } from '../services/WorkspaceService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

  constructor() {
    this.workspaceService = new WorkspaceService();
  }

  /**
   * Get user workspaces
   * GET /api/workspaces
   */
  getUserWorkspaces = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      logger.debug('Getting user workspaces via WorkspaceController', { 
        userId: req.user.user_id,
        email: req.user.email 
      });

      const workspaces = await this.workspaceService.getUserWorkspaces(req.user.user_id);

      // Transform workspaces for frontend
      const transformedWorkspaces = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        display_name: workspace.display_name,
        description: workspace.description,
        logo_url: workspace.logo_url,
        settings: workspace.settings,
        is_active: workspace.is_active,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        role: workspace.user_role || workspace.highest_role || 'member',
        user_role: workspace.user_role,
        user_roles: workspace.user_roles,
        highest_role: workspace.highest_role,
        member_count: workspace.member_count || 0,
        dashboard_count: workspace.dashboard_count || 0,
        dataset_count: workspace.dataset_count || 0,
        joined_at: workspace.joined_at,
      }));

      logger.info('Retrieved user workspaces successfully', { 
        userId: req.user.user_id,
        workspaceCount: workspaces.length 
      });

      res.status(200).json({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: transformedWorkspaces,
        workspaces: transformedWorkspaces, // For backward compatibility
        count: transformedWorkspaces.length
      });

    } catch (error: any) {
      logger.error('Get user workspaces error:', {
        userId: req.user?.user_id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspaces',
        errors: [{
          code: 'WORKSPACE_RETRIEVAL_ERROR',
          message: error.message || 'An error occurred while retrieving workspaces'
        }]
      });
    }
  };

  /**
   * Get workspace by ID
   * GET /api/workspaces/:workspaceId
   */
  getWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      const { workspaceId } = req.params;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{
            code: 'MISSING_WORKSPACE_ID',
            message: 'Workspace ID parameter is required'
          }]
        });
        return;
      }

      // Check if user has access to this workspace
      const hasAccess = await this.workspaceService.hasWorkspaceAccess(req.user.user_id, workspaceId);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to workspace',
          errors: [{
            code: 'WORKSPACE_ACCESS_DENIED',
            message: 'You do not have access to this workspace'
          }]
        });
        return;
      }

      const workspace = await this.workspaceService.getWorkspaceById(workspaceId, req.user.user_id);

      if (!workspace) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          errors: [{
            code: 'WORKSPACE_NOT_FOUND',
            message: 'The requested workspace was not found'
          }]
        });
        return;
      }

      // Get workspace statistics
      const stats = await this.workspaceService.getWorkspaceStats(workspaceId);

      logger.info('Retrieved workspace by ID', { 
        workspaceId,
        userId: req.user.user_id 
      });

      res.status(200).json({
        success: true,
        message: 'Workspace retrieved successfully',
        data: {
          ...workspace,
          stats
        }
      });

    } catch (error: any) {
      logger.error('Get workspace by ID error:', {
        workspaceId: req.params.workspaceId,
        userId: req.user?.user_id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace',
        errors: [{
          code: 'WORKSPACE_RETRIEVAL_ERROR',
          message: error.message || 'An error occurred while retrieving the workspace'
        }]
      });
    }
  };

  /**
   * Create new workspace
   * POST /api/workspaces
   */
  createWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      const { name, slug, description, settings } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Workspace name is required',
          errors: [{
            code: 'INVALID_WORKSPACE_NAME',
            message: 'Workspace name must be a non-empty string'
          }]
        });
        return;
      }

      const workspace = await this.workspaceService.createWorkspace({
        name: name.trim(),
        slug,
        description,
        settings
      }, req.user.user_id);

      logger.info('Created workspace', { 
        workspaceId: workspace.id,
        userId: req.user.user_id 
      });

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace
      });

    } catch (error: any) {
      logger.error('Create workspace error:', {
        userId: req.user?.user_id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create workspace',
        errors: [{
          code: 'WORKSPACE_CREATION_ERROR',
          message: error.message || 'An error occurred while creating the workspace'
        }]
      });
    }
  };

  /**
   * Update workspace
   * PUT /api/workspaces/:workspaceId
   */
  updateWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      const { workspaceId } = req.params;
      const { name, description, settings, logo_url } = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{
            code: 'MISSING_WORKSPACE_ID',
            message: 'Workspace ID parameter is required'
          }]
        });
        return;
      }

      const workspace = await this.workspaceService.updateWorkspace(
        workspaceId,
        { name, description, settings, logo_url },
        req.user.user_id
      );

      if (!workspace) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          errors: [{
            code: 'WORKSPACE_NOT_FOUND',
            message: 'The requested workspace was not found'
          }]
        });
        return;
      }

      logger.info('Updated workspace', { 
        workspaceId,
        userId: req.user.user_id 
      });

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: workspace
      });

    } catch (error: any) {
      logger.error('Update workspace error:', {
        workspaceId: req.params.workspaceId,
        userId: req.user?.user_id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace',
        errors: [{
          code: 'WORKSPACE_UPDATE_ERROR',
          message: error.message || 'An error occurred while updating the workspace'
        }]
      });
    }
  };

  /**
   * Delete workspace
   * DELETE /api/workspaces/:workspaceId
   */
  deleteWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Implementation for workspace deletion
      res.status(501).json({
        success: false,
        message: 'Workspace deletion not yet implemented',
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: 'This feature will be available in a future update'
        }]
      });
    } catch (error: any) {
      logger.error('Delete workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workspace',
        errors: [{
          code: 'WORKSPACE_DELETION_ERROR',
          message: 'An error occurred while deleting the workspace'
        }]
      });
    }
  };

  /**
   * Get workspace members
   * GET /api/workspaces/:workspaceId/members
   */
  getWorkspaceMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Implementation for getting workspace members
      res.status(501).json({
        success: false,
        message: 'Workspace members feature not yet implemented',
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: 'This feature will be available in a future update'
        }]
      });
    } catch (error: any) {
      logger.error('Get workspace members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workspace members',
        errors: [{
          code: 'WORKSPACE_MEMBERS_ERROR',
          message: 'An error occurred while retrieving workspace members'
        }]
      });
    }
  };

  /**
   * Add workspace member
   * POST /api/workspaces/:workspaceId/members
   */
  addWorkspaceMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Implementation for adding workspace member
      res.status(501).json({
        success: false,
        message: 'Add workspace member feature not yet implemented',
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: 'This feature will be available in a future update'
        }]
      });
    } catch (error: any) {
      logger.error('Add workspace member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add workspace member',
        errors: [{
          code: 'WORKSPACE_MEMBER_ADD_ERROR',
          message: 'An error occurred while adding workspace member'
        }]
      });
    }
  };

  /**
   * Update member role
   * PUT /api/workspaces/:workspaceId/members/:userId
   */
  updateMemberRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Implementation for updating member role
      res.status(501).json({
        success: false,
        message: 'Update member role feature not yet implemented',
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: 'This feature will be available in a future update'
        }]
      });
    } catch (error: any) {
      logger.error('Update member role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update member role',
        errors: [{
          code: 'WORKSPACE_MEMBER_UPDATE_ERROR',
          message: 'An error occurred while updating member role'
        }]
      });
    }
  };

  /**
   * Remove member
   * DELETE /api/workspaces/:workspaceId/members/:userId
   */
  removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Implementation for removing member
      res.status(501).json({
        success: false,
        message: 'Remove member feature not yet implemented',
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: 'This feature will be available in a future update'
        }]
      });
    } catch (error: any) {
      logger.error('Remove member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member',
        errors: [{
          code: 'WORKSPACE_MEMBER_REMOVE_ERROR',
          message: 'An error occurred while removing member'
        }]
      });
    }
  };
}