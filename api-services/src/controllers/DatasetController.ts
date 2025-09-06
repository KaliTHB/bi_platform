// api-services/src/controllers/DataSourceController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { DataSourceService } from '../services/DataSourceService';
import { logger } from '../utils/logger';
import { db } from '../utils/database'; // ✅ Import the database instance

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
  workspace?: {
    id: string;
    slug: string;
    name: string;
  };
}

export class DataSourceController {
  private dataSourceService: DataSourceService;

  constructor() {
    try {
      console.log('🔧 DataSourceController: Initializing...');
      
      // ✅ Pass the database instance to the service
      this.dataSourceService = new DataSourceService(db);
      
      console.log('✅ DataSourceController: Initialized successfully');
      logger.info('DataSourceController initialized successfully');
    } catch (error: any) {
      console.error('❌ DataSourceController: Initialization failed:', error);
      logger.error('DataSourceController initialization failed:', {
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      throw error;
    }
  }

  // Test custom connection without saving
  testCustomConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, connection_config } = req.body;
      const userId = req.user?.user_id;

      if (!type || !connection_config) {
        res.status(400).json({
          success: false,
          message: 'Type and connection_config are required',
          error: 'VALIDATION_ERROR'
        });
        return;
      }

      logger.info('Testing custom connection', { type, user_id: userId });

      // Test the connection using the service
      const testResult = await this.dataSourceService.testConnection(type, connection_config);

      res.status(200).json({
        success: true,
        test_result: testResult,
        message: 'Connection test completed successfully'
      });
    } catch (error: any) {
      logger.error('Error testing custom connection:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: 'CONNECTION_TEST_ERROR',
        details: error.message
      });
    }
  };

  // Get all datasources for workspace
  getDataSources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const { type, status, search, page = 1, limit = 20 } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      const filters = {
        workspace_id: workspaceId,
        type: type as string,
        status: status as string,
        search: search as string
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await this.dataSourceService.getDataSources(filters, pagination);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'DataSources retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting datasources:', {
        error: error.message,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve datasources',
        error: 'GET_DATASOURCES_ERROR',
        details: error.message
      });
    }
  };

  // Create new datasource
  createDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const userId = req.user?.user_id;
      const { name, type, connection_config, description } = req.body;

      if (!workspaceId || !userId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context and user authentication required',
          error: 'CONTEXT_REQUIRED'
        });
        return;
      }

      if (!name || !type || !connection_config) {
        res.status(400).json({
          success: false,
          message: 'Name, type, and connection_config are required',
          error: 'VALIDATION_ERROR'
        });
        return;
      }

      const createData = {
        name,
        type,
        workspace_id: workspaceId,
        connection_config,
        created_by: userId
      };

      const datasource = await this.dataSourceService.createDataSource(createData);

      res.status(201).json({
        success: true,
        data: datasource,
        message: 'DataSource created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating datasource:', {
        error: error.message,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create datasource',
        error: 'CREATE_DATASOURCE_ERROR',
        details: error.message
      });
    }
  };

  // Get specific datasource
  getDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const { id } = req.params;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      const datasource = await this.dataSourceService.getDataSource(id, workspaceId);

      if (!datasource) {
        res.status(404).json({
          success: false,
          message: 'DataSource not found',
          error: 'DATASOURCE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: datasource,
        message: 'DataSource retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting datasource:', {
        error: error.message,
        datasource_id: req.params.id,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve datasource',
        error: 'GET_DATASOURCE_ERROR',
        details: error.message
      });
    }
  };

  // Update datasource
  updateDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const { id } = req.params;
      const updateData = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      const datasource = await this.dataSourceService.updateDataSource(id, workspaceId, updateData);

      if (!datasource) {
        res.status(404).json({
          success: false,
          message: 'DataSource not found',
          error: 'DATASOURCE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: datasource,
        message: 'DataSource updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating datasource:', {
        error: error.message,
        datasource_id: req.params.id,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update datasource',
        error: 'UPDATE_DATASOURCE_ERROR',
        details: error.message
      });
    }
  };

  // Delete datasource
  deleteDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const { id } = req.params;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      const success = await this.dataSourceService.deleteDataSource(id, workspaceId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'DataSource not found',
          error: 'DATASOURCE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'DataSource deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting datasource:', {
        error: error.message,
        datasource_id: req.params.id,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete datasource',
        error: 'DELETE_DATASOURCE_ERROR',
        details: error.message
      });
    }
  };

  // Test existing datasource connection
  testConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace?.id;
      const { id } = req.params;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      // Get the datasource first
      const datasource = await this.dataSourceService.getDataSource(id, workspaceId);

      if (!datasource) {
        res.status(404).json({
          success: false,
          message: 'DataSource not found',
          error: 'DATASOURCE_NOT_FOUND'
        });
        return;
      }

      // Test the connection
      const testResult = await this.dataSourceService.testConnection(
        datasource.type, 
        datasource.connection_config
      );

      res.status(200).json({
        success: true,
        test_result: testResult,
        message: 'Connection test completed successfully'
      });
    } catch (error: any) {
      logger.error('Error testing datasource connection:', {
        error: error.message,
        datasource_id: req.params.id,
        workspace_id: req.workspace?.id,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: 'CONNECTION_TEST_ERROR',
        details: error.message
      });
    }
  };
}