// api-services/src/controllers/WorkspaceController.ts
import { Request, Response } from 'express';
import { WorkspaceService } from '../services/WorkspaceService';
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

      logger.debug('Getting user workspaces', { 
        userId: req.user.user_id,
        email: req.user.email 
      });

      const workspaces = await this.workspaceService.getUserWorkspaces(req.user.user_id);

      // Transform workspaces for frontend
      const transformedWorkspaces = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
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
   * GET /api/workspaces/:id
   */
  getWorkspaceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const { id } = req.params;

      if (!id) {
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
      const hasAccess = await this.workspaceService.hasWorkspaceAccess(req.user.user_id, id);
      
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

      const workspace = await this.workspaceService.getWorkspaceById(id, req.user.user_id);

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
      const stats = await this.workspaceService.getWorkspaceStats(id);

      logger.info('Retrieved workspace by ID', { 
        workspaceId: id,
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
        workspaceId: req.params.id,
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

      const { name, slug, description, settings, logo_url } = req.body;

      if (!name || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Workspace name is required',
          errors: [{
            code: 'MISSING_WORKSPACE_NAME',
            message: 'Workspace name cannot be empty'
          }]
        });
        return;
      }

      const workspaceData = {
        name: name.trim(),
        slug: slug?.trim(),
        description: description?.trim(),
        settings: settings || {},
        logo_url: logo_url?.trim(),
      };

      const workspace = await this.workspaceService.createWorkspace(workspaceData, req.user.user_id);

      logger.info('Created new workspace', { 
        workspaceId: workspace.id,
        name: workspace.name,
        ownerId: req.user.user_id 
      });

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace
      });

    } catch (error: any) {
      logger.error('Create workspace error:', {
        userId: req.user?.user_id,
        workspaceData: req.body,
        error: error.message,
        stack: error.stack
      });

      const statusCode = error.message.includes('already exists') ? 409 : 500;

      res.status(statusCode).json({
        success: false,
        message: 'Failed to create workspace',
        errors: [{
          code: statusCode === 409 ? 'WORKSPACE_EXISTS' : 'WORKSPACE_CREATION_ERROR',
          message: error.message || 'An error occurred while creating the workspace'
        }]
      });
    }
  };

  /**
   * Update workspace
   * PUT /api/workspaces/:id
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

      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
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

      const workspace = await this.workspaceService.updateWorkspace(id, updateData, req.user.user_id);

      logger.info('Updated workspace', { 
        workspaceId: id,
        userId: req.user.user_id,
        updateData 
      });

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: workspace
      });

    } catch (error: any) {
      logger.error('Update workspace error:', {
        workspaceId: req.params.id,
        userId: req.user?.user_id,
        updateData: req.body,
        error: error.message,
        stack: error.stack
      });

      const statusCode = error.message.includes('permission') ? 403 : 
                        error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
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
   * DELETE /api/workspaces/:id
   */
  deleteWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const { id } = req.params;

      if (!id) {
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

      await this.workspaceService.deleteWorkspace(id, req.user.user_id);

      logger.info('Deleted workspace', { 
        workspaceId: id,
        userId: req.user.user_id 
      });

      res.status(200).json({
        success: true,
        message: 'Workspace deleted successfully'
      });

    } catch (error: any) {
      logger.error('Delete workspace error:', {
        workspaceId: req.params.id,
        userId: req.user?.user_id,
        error: error.message,
        stack: error.stack
      });

      const statusCode = error.message.includes('owner') ? 403 : 
                        error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete workspace',
        errors: [{
          code: 'WORKSPACE_DELETE_ERROR',
          message: error.message || 'An error occurred while deleting the workspace'
        }]
      });
    }
  };

  /**
   * Get all workspaces (admin only)
   * GET /api/admin/workspaces
   */
  getAllWorkspaces = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check if user has admin permissions
      // This would typically check against a role or permission system
      // For now, we'll just implement the basic functionality

      const { limit = 50, offset = 0, include_inactive = 'false' } = req.query;
      
      const workspaces = await this.workspaceService.getAllWorkspaces(
        parseInt(limit as string),
        parseInt(offset as string),
        include_inactive === 'true'
      );

      logger.info('Retrieved all workspaces', { 
        userId: req.user.user_id,
        count: workspaces.length 
      });

      res.status(200).json({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: workspaces,
        count: workspaces.length
      });

    } catch (error: any) {
      logger.error('Get all workspaces error:', {
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
}

export default WorkspaceController;