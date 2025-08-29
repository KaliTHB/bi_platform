// api-services/src/controllers/UserController.ts
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const { page = 1, limit = 20, search } = req.query;
      
      const result = await this.userService.getUsers(workspaceId, {
        page: Number(page),
        limit: Number(limit),
        search: search as string
      });
      
      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ code: 'GET_USERS_FAILED', message: error.message }]
      });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const createdBy = (req as any).user?.id;
      const userData = req.body;
      
      const user = await this.userService.createUser(userData, workspaceId, createdBy);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error: any) {
      logger.error('Create user error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'USER_CREATE_FAILED', message: error.message }]
      });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const updatedBy = (req as any).user?.id;
      const updates = req.body;
      
      const user = await this.userService.updateUser(userId, updates, updatedBy);
      
      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      logger.error('Update user error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'USER_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const deletedBy = (req as any).user?.id;
      
      await this.userService.deleteUser(userId, deletedBy);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete user error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'USER_DELETE_FAILED', message: error.message }]
      });
    }
  };
}