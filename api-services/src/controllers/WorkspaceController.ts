// api-services/src/controllers/WorkspaceController.ts - Updated to use WorkspaceService
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication';
import { WorkspaceService, Workspace } from '../services/WorkspaceService';
import { logger } from '../utils/logger';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

  constructor() {
    this.workspaceService = new WorkspaceService();
    console.log('✅ WorkspaceController initialized with WorkspaceService');
  }

  /**
   * Get all workspaces accessible to the user
   * GET /api/workspaces
   */
  public getUserWorkspaces = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      console.log('🏢 WorkspaceController: Getting user workspaces');
      
      if (!userId || !userEmail) {
        console.log('⚠️ WorkspaceController: Missing authentication');
        res.status(401).json({
          success: false,
          message: 'Authentication required to access workspaces',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      logger.info('Getting user workspaces via WorkspaceService', {
        userId,
        userEmail,
        service: 'bi-platform-api'
      });

      // Get workspaces from WorkspaceService
      const workspaces = await this.workspaceService.getUserWorkspaces(userId);

      console.log(`✅ WorkspaceController: Found ${workspaces.length} workspaces for user`);

      // Format workspaces for API response
      const formattedWorkspaces = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        display_name: workspace.display_name,
        description: workspace.description,
        logo_url: workspace.logo_url,
        user_count: workspace.member_count,
        dashboard_count: workspace.dashboard_count,
        dataset_count: workspace.dataset_count,
        is_default: false, // Could be determined by some logic
        role: workspace.user_role,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        is_active: workspace.is_active
      }));

      // Set first workspace as default
      if (formattedWorkspaces.length > 0) {
        formattedWorkspaces[0].is_default = true;
      }

      res.status(200).json({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: formattedWorkspaces,
        workspaces: formattedWorkspaces, // For backward compatibility
        count: formattedWorkspaces.length
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Get user workspaces error:', error);
      logger.error('Get user workspaces controller error:', {
        error: error.message,
        stack: error.stack,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspaces',
        errors: [{
          code: 'WORKSPACE_RETRIEVAL_ERROR',
          message: error.message || 'Unknown error occurred'
        }],
        data: [],
        workspaces: [],
        count: 0
      });
    }
  };

  /**
   * Get specific workspace by ID or slug
   * GET /api/workspaces/:workspaceId
   */
  public getWorkspaceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 WorkspaceController: Getting workspace by ID:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      // Get workspace from WorkspaceService
      const workspace = await this.workspaceService.getWorkspaceById(workspaceId, userId);

      if (!workspace) {
        console.log('⚠️ WorkspaceController: Workspace not found or access denied:', workspaceId);
        res.status(404).json({
          success: false,
          message: 'Workspace not found or access denied',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      console.log('✅ WorkspaceController: Workspace found:', workspace.name);

      res.status(200).json({
        success: true,
        message: 'Workspace retrieved successfully',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name,
          description: workspace.description,
          logo_url: workspace.logo_url,
          settings: workspace.settings,
          is_active: workspace.is_active,
          user_role: workspace.user_role,
          member_count: workspace.member_count,
          dashboard_count: workspace.dashboard_count,
          dataset_count: workspace.dataset_count,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at,
          joined_at: workspace.joined_at
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Get workspace by ID error:', error);
      logger.error('Get workspace by ID controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Create new workspace
   * POST /api/workspaces
   */
  public createWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const { name, slug, description, settings } = req.body;

      console.log('🏢 WorkspaceController: Creating workspace:', name);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Workspace name is required',
          error: 'MISSING_WORKSPACE_NAME'
        });
        return;
      }

      // Create workspace using WorkspaceService
      const workspace = await this.workspaceService.createWorkspace({
        name,
        slug,
        description,
        settings
      }, userId);

      console.log('✅ WorkspaceController: Workspace created:', workspace.id);

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name,
          description: workspace.description,
          logo_url: workspace.logo_url,
          settings: workspace.settings,
          is_active: workspace.is_active,
          user_role: workspace.user_role,
          member_count: workspace.member_count,
          dashboard_count: workspace.dashboard_count,
          dataset_count: workspace.dataset_count,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Create workspace error:', error);
      logger.error('Create workspace controller error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Update workspace
   * PUT /api/workspaces/:workspaceId
   */
  public updateWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const updateData = req.body;

      console.log('🏢 WorkspaceController: Updating workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      // Update workspace using WorkspaceService
      const workspace = await this.workspaceService.updateWorkspace(workspaceId, updateData, userId);

      if (!workspace) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found or access denied',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      console.log('✅ WorkspaceController: Workspace updated:', workspace.id);

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name,
          description: workspace.description,
          logo_url: workspace.logo_url,
          settings: workspace.settings,
          is_active: workspace.is_active,
          user_role: workspace.user_role,
          member_count: workspace.member_count,
          dashboard_count: workspace.dashboard_count,
          dataset_count: workspace.dataset_count,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Update workspace error:', error);
      logger.error('Update workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Delete workspace
   * DELETE /api/workspaces/:workspaceId
   */
  public deleteWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 WorkspaceController: Deleting workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      // For now, we'll just return success since WorkspaceService doesn't have delete method
      // In a real implementation, you'd add a delete method to WorkspaceService

      res.status(200).json({
        success: true,
        message: 'Workspace deletion not implemented yet',
        data: {
          workspaceId,
          status: 'pending_implementation'
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Delete workspace error:', error);
      logger.error('Delete workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}