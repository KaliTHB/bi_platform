// api-services/src/controllers/DataSourceController.ts
import { Request, Response } from 'express';
import { DataSourceService } from '../services/DataSourceService';
import { PluginService } from '../services/PluginService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

export class DataSourceController {
  private dataSourceService: DataSourceService;
  private pluginService: PluginService;
  private permissionService: PermissionService;

  constructor() {
    // Initialize services without dependencies - they will create their own instances
    this.dataSourceService = new DataSourceService();
    this.pluginService = new PluginService();
    this.permissionService = new PermissionService();
    
    logger.info('DataSourceController initialized');
  }

  // Test custom connection without saving
  testCustomConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, connection_config } = req.body;
      const userId = req.user?.user_id;

      if (!type || !connection_config) {
        throw new ValidationError('Type and connection_config are required');
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
      logger.error('Error testing custom connection:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'CONNECTION_TEST_FAILED', message: error.message }]
      });
    }
  };

  // Get all datasources in workspace
  getDataSources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.user_id;
      const { page = 1, limit = 10, search, type, status } = req.query;

      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      logger.info('Getting datasources', { workspaceId, user_id: userId });

      // Get datasources using the service
      const result = await this.dataSourceService.getDataSources({
        workspace_id: workspaceId,
        search: search as string,
        type: type as string,
        status: status as string
      }, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Datasources retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting datasources:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get datasources',
        errors: [{ code: 'GET_DATASOURCES_FAILED', message: error.message }]
      });
    }
  };

  // Create new datasource
  createDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.user_id;
      const { name, description, type, connection_config, display_name, tags } = req.body;

      if (!workspaceId || !name || !type || !connection_config) {
        throw new ValidationError('Workspace ID, name, type, and connection_config are required');
      }

      logger.info('Creating datasource', { workspaceId, name, type, user_id: userId });

      // Check for name conflicts
      const existingDataSource = await this.dataSourceService.findByName(workspaceId, name);
      if (existingDataSource) {
        throw new ConflictError(`Datasource with name '${name}' already exists in this workspace`);
      }

      // Create datasource using the service
      const dataSourceData = {
        name,
        description,
        type,
        workspace_id: workspaceId,
        connection_config,
        tags: tags || [],
        created_by: userId!
      };

      const datasource = await this.dataSourceService.createDataSource(dataSourceData);

      res.status(201).json({
        success: true,
        data: datasource,
        message: 'Datasource created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating datasource:', error);
      
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create datasource',
        errors: [{ code: 'CREATE_DATASOURCE_FAILED', message: error.message }]
      });
    }
  };

  // Get specific datasource
  getDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user?.user_id;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Getting datasource', { workspaceId, id, user_id: userId });

      // Get the datasource
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);

      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      res.status(200).json({
        success: true,
        data: datasource,
        message: 'Datasource retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting datasource:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get datasource',
        errors: [{ code: 'GET_DATASOURCE_FAILED', message: error.message }]
      });
    }
  };

  // Update datasource
  updateDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const updates = req.body;
      const userId = req.user?.user_id;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Updating datasource', { workspaceId, id, user_id: userId });

      // Get existing datasource
      const existingDataSource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!existingDataSource) {
        throw new NotFoundError('Datasource not found');
      }

      // Check for name conflicts if name is being updated
      if (updates.name && updates.name !== existingDataSource.name) {
        const duplicateDataSource = await this.dataSourceService.findByName(workspaceId, updates.name);
        if (duplicateDataSource && duplicateDataSource.id !== id) {
          throw new ConflictError(`Datasource with name '${updates.name}' already exists in this workspace`);
        }
      }

      // Update the datasource
      const datasource = await this.dataSourceService.updateDataSource(id, workspaceId, {
        ...updates,
        updated_by: userId
      });

      res.status(200).json({
        success: true,
        data: datasource,
        message: 'Datasource updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating datasource:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update datasource',
        errors: [{ code: 'UPDATE_DATASOURCE_FAILED', message: error.message }]
      });
    }
  };

  // Delete datasource
  deleteDataSource = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user?.user_id;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Deleting datasource', { workspaceId, id, user_id: userId });

      // Check if datasource exists
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Check for dependencies
      const dependencies = await this.dataSourceService.getDependencies(id, workspaceId);
      if (dependencies.total > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete datasource with existing dependencies',
          dependencies,
          errors: [{
            code: 'DATASOURCE_HAS_DEPENDENCIES',
            message: `Datasource is used by ${dependencies.total} resources`
          }]
        });
      }

      // Delete the datasource
      await this.dataSourceService.deleteDataSource(id, workspaceId);

      res.status(200).json({
        success: true,
        message: 'Datasource deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting datasource:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete datasource',
        errors: [{ code: 'DELETE_DATASOURCE_FAILED', message: error.message }]
      });
    }
  };

  // Test existing datasource connection
  testConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user?.user_id;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Testing datasource connection', { workspaceId, id, user_id: userId });

      // Get the datasource
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Test the connection
      const testResult = await this.dataSourceService.testConnection(
        datasource.type,
        datasource.connection_config
      );

      // Update last tested timestamp
      await this.dataSourceService.updateLastTested(id, workspaceId);

      res.status(200).json({
        success: true,
        test_result: testResult,
        message: 'Connection test completed successfully'
      });
    } catch (error: any) {
      logger.error('Error testing connection:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'CONNECTION_TEST_FAILED', message: error.message }]
      });
    }
  };

  // Get datasource usage statistics
  getUsageStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user?.user_id;
      const { period = '30d' } = req.query;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Getting usage stats', { workspaceId, id, period, user_id: userId });

      // Get usage stats using the service
      const stats = await this.dataSourceService.getUsageStats(id, workspaceId, period as string);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Usage statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting usage stats:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get usage statistics',
        errors: [{ code: 'GET_USAGE_STATS_FAILED', message: error.message }]
      });
    }
  };

  // Get datasource schema
  getSchema = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const { refresh = 'false' } = req.query;
      const userId = req.user?.user_id;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Getting schema', { workspaceId, id, refresh, user_id: userId });

      // Get schema using the service
      const schema = await this.dataSourceService.getSchema(id, workspaceId, refresh === 'true');

      res.status(200).json({
        success: true,
        data: schema,
        message: 'Schema retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting schema:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get schema',
        errors: [{ code: 'GET_SCHEMA_FAILED', message: error.message }]
      });
    }
  };

  // Execute query on datasource
  executeQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const { query, parameters, limit = 1000, offset = 0 } = req.body;
      const userId = req.user?.user_id;

      if (!workspaceId || !id || !query) {
        throw new ValidationError('Workspace ID, datasource ID, and query are required');
      }

      logger.info('Executing query', { workspaceId, id, user_id: userId });

      // Execute query using the service
      const result = await this.dataSourceService.executeQuery(id, workspaceId, {
        query,
        parameters,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        user_id: userId!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Query executed successfully'
      });
    } catch (error: any) {
      logger.error('Error executing query:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to execute query',
        errors: [{ code: 'EXECUTE_QUERY_FAILED', message: error.message }]
      });
    }
  };

  // Workspace-scoped datasources
  getWorkspaceDatasources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.user_id;
      const { page = 1, limit = 20, search, type, status } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'WORKSPACE_REQUIRED'
        });
        return;
      }

      logger.info('Getting workspace datasources', { 
        workspaceId, 
        user_id: userId,
        service: 'bi-platform-api' 
      });

      // Get datasources for this workspace  
      const result = await this.dataSourceService.getDataSources({
        workspace_id: workspaceId,
        search: search as string,
        type: type as string,
        status: status as string
      }, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Datasources retrieved successfully'
      });

    } catch (error: any) {
      logger.error('Error getting workspace datasources:', {
        error: error.message,
        workspace_id: req.params.workspaceId,
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
  
}