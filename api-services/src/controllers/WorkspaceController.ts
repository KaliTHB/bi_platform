// api-services/src/controllers/WorkspaceController.ts
import { Request, Response } from 'express';
import { WorkspaceService } from '../services/WorkspaceService';
import { logger } from '../utils/logger';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

  constructor() {
    this.workspaceService = new WorkspaceService();
  }

  // Get all workspaces for current user
  getUserWorkspaces = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      
      const workspaces = await this.workspaceService.getUserWorkspaces(userId);
      
      res.status(200).json({
        success: true,
        data: workspaces
      });
    } catch (error: any) {
      logger.error('Get user workspaces error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'WORKSPACES_FETCH_FAILED', message: error.message }]
      });
    }
  };

  // Create new workspace
  createWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const workspaceData = req.body;
      
      const workspace = await this.workspaceService.createWorkspace(workspaceData, userId);
      
      res.status(201).json({
        success: true,
        data: workspace,
        message: 'Workspace created successfully'
      });
    } catch (error: any) {
      logger.error('Create workspace error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'WORKSPACE_CREATE_FAILED', message: error.message }]
      });
    }
  };

  // Get specific workspace
  getWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).user?.id;
      
      const workspace = await this.workspaceService.getWorkspaceById(workspaceId, userId);
      
      res.status(200).json({
        success: true,
        data: workspace
      });
    } catch (error: any) {
      logger.error('Get workspace error:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        errors: [{ code: 'WORKSPACE_NOT_FOUND', message: error.message }]
      });
    }
  };

  // Update workspace
  updateWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).user?.id;
      const updates = req.body;
      
      const workspace = await this.workspaceService.updateWorkspace(workspaceId, updates, userId);
      
      res.status(200).json({
        success: true,
        data: workspace,
        message: 'Workspace updated successfully'
      });
    } catch (error: any) {
      logger.error('Update workspace error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'WORKSPACE_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  // Delete workspace
  deleteWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).user?.id;
      
      await this.workspaceService.deleteWorkspace(workspaceId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Workspace deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete workspace error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'WORKSPACE_DELETE_FAILED', message: error.message }]
      });
    }
  };

  // Get workspace members
  getWorkspaceMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      
      const members = await this.workspaceService.getWorkspaceMembers(workspaceId);
      
      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error: any) {
      logger.error('Get workspace members error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'MEMBERS_FETCH_FAILED', message: error.message }]
      });
    }
  };

  // Add member to workspace
  addWorkspaceMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).user?.id;
      const { email, role } = req.body;
      
      const member = await this.workspaceService.addWorkspaceMember(workspaceId, email, role, userId);
      
      res.status(201).json({
        success: true,
        data: member,
        message: 'Member added successfully'
      });
    } catch (error: any) {
      logger.error('Add workspace member error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'MEMBER_ADD_FAILED', message: error.message }]
      });
    }
  };

  // Update member role
  updateMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId, userId } = req.params;
      const currentUserId = (req as any).user?.id;
      const { role } = req.body;
      
      await this.workspaceService.updateMemberRole(workspaceId, userId, role, currentUserId);
      
      res.status(200).json({
        success: true,
        message: 'Member role updated successfully'
      });
    } catch (error: any) {
      logger.error('Update member role error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'ROLE_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  // Remove member from workspace
  removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId, userId } = req.params;
      const currentUserId = (req as any).user?.id;
      
      await this.workspaceService.removeMember(workspaceId, userId, currentUserId);
      
      res.status(200).json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error: any) {
      logger.error('Remove member error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'MEMBER_REMOVE_FAILED', message: error.message }]
      });
    }
  };
}