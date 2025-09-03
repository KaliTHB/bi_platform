// api-services/src/controllers/DataSourceController.ts
import { Request, Response } from 'express';
import { DataSourceService } from '../services/DataSourceService';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { AuthUserData } from '../types/auth.types';

interface AuthenticatedRequest extends Request {
  user: AuthUserData;
}

export class DataSourceController {
  private dataSourceService: DataSourceService;

  constructor() {
    this.dataSourceService = new DataSourceService();
    logger.info('DataSourceController initialized');
  }

  getDataSources = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      const { page, limit, search, type, status, tags } = req.query;
      
      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        type: type as string,
        status: status as string,
        tags: tags ? (tags as string).split(',') : undefined
      };

      const result = await this.dataSourceService.getDataSources(workspaceId, options);
      
      res.status(200).json({
        success: true,
        data: result.datasources,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      logger.error('Get datasources error:', error);
      
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  getDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      const { id } = req.params;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      if (!id) {
        throw new ValidationError('DataSource ID is required');
      }

      const datasource = await this.dataSourceService.getDataSource(id, workspaceId);
      
      if (!datasource) {
        throw new NotFoundError('DataSource not found');
      }

      res.status(200).json({
        success: true,
        data: datasource
      });
    } catch (error: any) {
      logger.error('Get datasource error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  createDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      const createdBy = authReq.user.user_id;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      const data = {
        ...req.body,
        workspace_id: workspaceId,
        created_by: createdBy
      };

      const datasource = await this.dataSourceService.createDataSource(data);
      
      res.status(201).json({
        success: true,
        data: datasource,
        message: 'DataSource created successfully'
      });
    } catch (error: any) {
      logger.error('Create datasource error:', error);
      
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  updateDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      const { id } = req.params;
      const updatedBy = authReq.user.user_id;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      if (!id) {
        throw new ValidationError('DataSource ID is required');
      }

      const updates = {
        ...req.body,
        updated_by: updatedBy
      };

      const datasource = await this.dataSourceService.updateDataSource(id, workspaceId, updates);
      
      res.status(200).json({
        success: true,
        data: datasource,
        message: 'DataSource updated successfully'
      });
    } catch (error: any) {
      logger.error('Update datasource error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  deleteDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      const { id } = req.params;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      if (!id) {
        throw new ValidationError('DataSource ID is required');
      }

      await this.dataSourceService.deleteDataSource(id, workspaceId);
      
      res.status(200).json({
        success: true,
        message: 'DataSource deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete datasource error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const workspaceId = authReq.user.workspace_id || req.headers['x-workspace-id'] as string;
      
      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      if (!id) {
        throw new ValidationError('DataSource ID is required');
      }

      const datasource = await this.dataSourceService.getDataSource(id, workspaceId);
      
      if (!datasource) {
        throw new NotFoundError('DataSource not found');
      }

      const testResult = await this.dataSourceService.testConnection(
        datasource.type,
        datasource.connection_config
      );

      res.status(200).json({
        success: true,
        data: testResult,
        message: 'Connection test completed'
      });
    } catch (error: any) {
      logger.error('Test connection error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  testCustomConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, connection_config } = req.body;

      if (!type || !connection_config) {
        throw new ValidationError('Type and connection_config are required');
      }

      logger.info('Testing custom connection', { type });

      const testResult = await this.dataSourceService.testConnection(type, connection_config);

      res.status(200).json({
        success: true,
        data: testResult,
        message: 'Connection test completed successfully'
      });
    } catch (error: any) {
      logger.error('Error testing custom connection:', error);
      
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  getDatasourceTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const types = await this.dataSourceService.getDatasourceTypes();
      
      res.status(200).json({
        success: true,
        data: types
      });
    } catch (error: any) {
      logger.error('Get datasource types error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}