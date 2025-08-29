// api-services/src/controllers/WorkspaceController.ts
import { Request, Response } from 'express';
import { WorkspaceService } from '../services/WorkspaceService';
import { logger } from '../utils/logger';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

  constructor() {
    this.workspaceService = new WorkspaceService();
  }

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
}