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
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ 
          code: 'CONNECTION_TEST_FAILED', 
          message: error.message,
          details: error.details 
        }]
      });
    }
  };

  // Get all datasources in workspace
  getDataSources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.user_id;
      const { page = 1, limit = 50, type, status, search } = req.query;

      if (!workspaceId) {
        throw new ValidationError('Workspace ID is required');
      }

      logger.info('Getting datasources', { workspaceId, user_id: userId });

      // Build filters
      const filters = {
        workspace_id: workspaceId,
        ...(type && { type: type as string }),
        ...(status && { status: status as string }),
        ...(search && { search: search as string })
      };

      // Get datasources
      const result = await this.dataSourceService.getDataSources(filters, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        datasources: result.datasources,
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
      const { name, description, type, connection_config, tags } = req.body;
      const userId = req.user?.user_id;

      if (!workspaceId || !name || !type || !connection_config) {
        throw new ValidationError('Workspace ID, name, type, and connection_config are required');
      }

      logger.info('Creating datasource', { workspaceId, name, type, user_id: userId });

      // Check for duplicate names in workspace
      const existingDataSource = await this.dataSourceService.findByName(workspaceId, name);
      if (existingDataSource) {
        throw new ConflictError(`Datasource with name '${name}' already exists in this workspace`);
      }

      // Create the datasource
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
        datasource,
        message: 'Datasource created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating datasource:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
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
        datasource,
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
        datasource,
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
      const { force = false } = req.query;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Deleting datasource', { workspaceId, id, force, user_id: userId });

      // Check if datasource exists
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Check dependencies unless force delete
      if (!force) {
        const dependencies = await this.dataSourceService.getDatasourceDependencies(id);
        if (dependencies.total > 0) {
          return res.status(409).json({
            success: false,
            message: 'Cannot delete datasource with active dependencies',
            errors: [{
              code: 'DEPENDENCY_CONFLICT',
              message: `Datasource has ${dependencies.total} active dependencies`,
              details: dependencies
            }]
          });
        }
      }

      // Delete the datasource
      await this.dataSourceService.deleteDataSource(id, workspaceId, userId!);

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

  // Test datasource connection
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
        errors: [{ 
          code: 'CONNECTION_TEST_FAILED', 
          message: error.message,
          details: error.details 
        }]
      });
    }
  };

  // Get datasource usage statistics
  getUsageStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user?.user_id;
      const { period = 'week', startDate, endDate } = req.query;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Getting datasource usage stats', { workspaceId, id, period, user_id: userId });

      // Check if datasource exists
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Get usage statistics
      const stats = await this.dataSourceService.getUsageStats(id, {
        period: period as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.status(200).json({
        success: true,
        stats,
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
      const userId = req.user?.user_id;
      const { refresh = false } = req.query;

      if (!workspaceId || !id) {
        throw new ValidationError('Workspace ID and datasource ID are required');
      }

      logger.info('Getting datasource schema', { workspaceId, id, refresh, user_id: userId });

      // Get the datasource
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Get schema (refresh if requested)
      const schema = await this.dataSourceService.getSchema(id, refresh === 'true');

      res.status(200).json({
        success: true,
        schema,
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
      const { query, limit = 1000 } = req.body;
      const userId = req.user?.user_id;

      if (!workspaceId || !id || !query) {
        throw new ValidationError('Workspace ID, datasource ID, and query are required');
      }

      logger.info('Executing query on datasource', { workspaceId, id, user_id: userId });

      // Get the datasource
      const datasource = await this.dataSourceService.getDataSourceById(id, workspaceId);
      if (!datasource) {
        throw new NotFoundError('Datasource not found');
      }

      // Execute the query
      const result = await this.dataSourceService.executeQuery(id, query, {
        limit: parseInt(limit as string),
        userId: userId!
      });

      res.status(200).json({
        success: true,
        result,
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
        errors: [{ 
          code: 'QUERY_EXECUTION_FAILED', 
          message: error.message,
          details: error.details 
        }]
      });
    }
  };
}