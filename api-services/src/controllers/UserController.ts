// api-services/src/controllers/UserController.ts
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { AuthUserData } from '../types/auth.types';

interface AuthenticatedRequest extends Request {
  user: AuthUserData;
}

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
    logger.info('UserController initialized');
  }

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Type assertion for authenticated request
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

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
      
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: [{ code: error.code, message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [{ code: 'GET_USERS_FAILED', message: error.message }]
        });
      }
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Type assertion for authenticated request
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      const createdBy = authReq.user.user_id;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      if (!createdBy) {
        throw new ValidationError('User ID is required');
      }

      const userData = req.body;
      
      const user = await this.userService.createUser(userData, workspaceId, createdBy);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error: any) {
      logger.error('Create user error:', error);
      
      if (error instanceof ValidationError || error instanceof ConflictError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: [{ code: error.code, message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [{ code: 'USER_CREATE_FAILED', message: error.message }]
        });
      }
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Type assertion for authenticated request
      const authReq = req as AuthenticatedRequest;
      const { userId } = req.params;
      const updatedBy = authReq.user.user_id;
      const updates = req.body;
      
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!updatedBy) {
        throw new ValidationError('Updater ID is required');
      }
      
      const user = await this.userService.updateUser(userId, updates, updatedBy);
      
      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      logger.error('Update user error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: [{ code: error.code, message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [{ code: 'USER_UPDATE_FAILED', message: error.message }]
        });
      }
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Type assertion for authenticated request
      const authReq = req as AuthenticatedRequest;
      const { userId } = req.params;
      const deletedBy = authReq.user.user_id;
      
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!deletedBy) {
        throw new ValidationError('Deleter ID is required');
      }
      
      await this.userService.deleteUser(userId, deletedBy);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete user error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: [{ code: error.code, message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [{ code: 'USER_DELETE_FAILED', message: error.message }]
        });
      }
    }
  };
}