// File: api-services/src/controllers/DataSourceController.ts
import { Request, Response } from 'express';
import { DataSourceService } from '../services/DataSourceService';
import { logger, logAudit } from '../utils/logger';
import { AuthenticatedRequest, WorkspaceRequest } from '../middleware/authentication';

export class DataSourceController {
  private dataSourceService: DataSourceService;

  constructor() {
    this.dataSourceService = new DataSourceService();
  }

  /**
   * Create a new datasource
   */
  async createDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const userId = req.user.id;
      
      const {
        name,
        display_name,
        description,
        plugin_name,
        connection_config,
        test_query,
        connection_pool_config,
        performance_config
      } = req.body;

      // Validate required fields
      if (!name || !plugin_name || !connection_config) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, plugin_name, and connection_config are required'
          }
        });
        return;
      }

      const datasource = await this.dataSourceService.createDataSource(
        workspace_id,
        {
          name,
          display_name,
          description,
          plugin_name,
          connection_config,
          test_query,
          connection_pool_config,
          performance_config
        },
        userId
      );

      // Log audit event
      logAudit('DATASOURCE_CREATE', 'datasource', datasource.id, userId, {
        datasource_name: datasource.name,
        plugin_name: datasource.plugin_name
      });

      res.status(201).json({
        success: true,
        data: { datasource }
      });
    } catch (error) {
      logger.error('Error creating datasource:', error);
      
      const message = error instanceof Error ? error.message : 'Failed to create datasource';
      const statusCode = message.includes('already exists') ? 409 : 
                        message.includes('validation failed') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DATASOURCE_CREATE_ERROR',
          message
        }
      });
    }
  }

  /**
   * Get all datasources for workspace
   */
  async getDataSources(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const datasources = await this.dataSourceService.getDataSources(workspace_id);

      res.json({
        success: true,
        data: { datasources }
      });
    } catch (error) {
      logger.error('Error fetching datasources:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATASOURCE_FETCH_ERROR',
          message: 'Failed to fetch datasources'
        }
      });
    }
  }

  /**
   * Get datasource by ID
   */
  async getDataSourceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;

      const datasource = await this.dataSourceService.getDataSourceById(datasourceId, workspace_id);

      if (!datasource) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DATASOURCE_NOT_FOUND',
            message: 'Datasource not found'
          }
        });
        return;
      }

      // Get usage statistics
      const usage = await this.dataSourceService.getDataSourceUsage(datasourceId);

      res.json({
        success: true,
        data: { 
          datasource,
          usage 
        }
      });
    } catch (error) {
      logger.error('Error fetching datasource:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATASOURCE_FETCH_ERROR',
          message: 'Failed to fetch datasource'
        }
      });
    }
  }

  /**
   * Update datasource
   */
  async updateDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;
      const userId = req.user.id;

      const {
        name,
        display_name,
        description,
        connection_config,
        test_query,
        connection_pool_config,
        performance_config,
        is_active
      } = req.body;

      const datasource = await this.dataSourceService.updateDataSource(
        datasourceId,
        workspace_id,
        {
          name,
          display_name,
          description,
          connection_config,
          test_query,
          connection_pool_config,
          performance_config,
          is_active
        },
        userId
      );

      // Log audit event
      logAudit('DATASOURCE_UPDATE', 'datasource', datasourceId, userId, {
        datasource_name: datasource.name,
        changes: Object.keys(req.body)
      });

      res.json({
        success: true,
        data: { datasource }
      });
    } catch (error) {
      logger.error('Error updating datasource:', error);
      
      const message = error instanceof Error ? error.message : 'Failed to update datasource';
      const statusCode = message.includes('not found') ? 404 :
                        message.includes('already exists') ? 409 :
                        message.includes('validation failed') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DATASOURCE_UPDATE_ERROR',
          message
        }
      });
    }
  }

  /**
   * Delete datasource
   */
  async deleteDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;
      const userId = req.user.id;

      // Get datasource name for audit log
      const datasource = await this.dataSourceService.getDataSourceById(datasourceId, workspace_id);
      if (!datasource) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DATASOURCE_NOT_FOUND',
            message: 'Datasource not found'
          }
        });
        return;
      }

      await this.dataSourceService.deleteDataSource(datasourceId, workspace_id, userId);

      // Log audit event
      logAudit('DATASOURCE_DELETE', 'datasource', datasourceId, userId, {
        datasource_name: datasource.name,
        plugin_name: datasource.plugin_name
      });

      res.json({
        success: true,
        data: { message: 'Datasource deleted successfully' }
      });
    } catch (error) {
      logger.error('Error deleting datasource:', error);
      
      const message = error instanceof Error ? error.message : 'Failed to delete datasource';
      const statusCode = message.includes('not found') ? 404 :
                        message.includes('currently being used') ? 409 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DATASOURCE_DELETE_ERROR',
          message
        }
      });
    }
  }

  /**
   * Test datasource connection
   */
  async testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;
      const userId = req.user.id;

      const result = await this.dataSourceService.testConnection(datasourceId, workspace_id);

      // Log audit event
      logAudit('DATASOURCE_TEST', 'datasource', datasourceId, userId, {
        test_result: result.success,
        response_time: result.response_time
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONNECTION_TEST_ERROR',
          message: 'Failed to test connection'
        }
      });
    }
  }

  /**
   * Test connection configuration without saving
   */
  async testConnectionConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plugin_name, connection_config } = req.body;
      const userId = req.user.id;

      if (!plugin_name || !connection_config) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'plugin_name and connection_config are required'
          }
        });
        return;
      }

      const result = await this.dataSourceService.testConnectionConfig(plugin_name, connection_config);

      // Log audit event
      logAudit('DATASOURCE_TEST_CONFIG', 'datasource', 'config-test', userId, {
        plugin_name,
        test_result: result.success,
        response_time: result.response_time
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error testing connection config:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONNECTION_CONFIG_TEST_ERROR',
          message: 'Failed to test connection configuration'
        }
      });
    }
  }

  /**
   * Get datasource usage statistics
   */
  async getUsageStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;

      // Verify datasource belongs to workspace
      const datasource = await this.dataSourceService.getDataSourceById(datasourceId, workspace_id);
      if (!datasource) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DATASOURCE_NOT_FOUND',
            message: 'Datasource not found'
          }
        });
        return;
      }

      const usage = await this.dataSourceService.getDataSourceUsage(datasourceId);

      res.json({
        success: true,
        data: { usage }
      });
    } catch (error) {
      logger.error('Error fetching usage statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USAGE_STATS_ERROR',
          message: 'Failed to fetch usage statistics'
        }
      });
    }
  }

  /**
   * Get datasource schema information
   */
  async getSchema(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { datasourceId } = req.params;
      const { workspace_id } = req.user;

      const datasource = await this.dataSourceService.getDataSourceById(datasourceId, workspace_id);
      if (!datasource) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DATASOURCE_NOT_FOUND',
            message: 'Datasource not found'
          }
        });
        return;
      }

      // Get plugin and establish connection
      const { DataSourcePlugins } = await import('../plugins/datasources');
      const plugin = DataSourcePlugins.get(datasource.plugin_name);
      
      if (!plugin) {
        res.status(500).json({
          success: false,
          error: {
            code: 'PLUGIN_NOT_FOUND',
            message: `Plugin '${datasource.plugin_name}' not found`
          }
        });
        return;
      }

      const connection = await plugin.connect(datasource.connection_config);
      const schema = await plugin.getSchema(connection);
      await plugin.disconnect(connection);

      res.json({
        success: true,
        data: { schema }
      });
    } catch (error) {
      logger.error('Error fetching schema:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEMA_FETCH_ERROR',
          message: 'Failed to fetch datasource schema'
        }
      });
    }
  }
}