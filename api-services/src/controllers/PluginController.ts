// api-services/src/controllers/PluginController.ts
import { Request, Response } from 'express';
import { PluginService } from '../services/PluginService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

export class PluginController {
  private pluginService: PluginService;
  private permissionService: PermissionService;

  constructor() {
    this.pluginService = new PluginService();
    this.permissionService = new PermissionService();
  }

  getDataSourcePlugins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { category } = req.query;

      const plugins = await this.pluginService.getDataSourcePlugins(category as string);

      res.status(200).json({
        success: true,
        plugins,
        message: 'Data source plugins retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data source plugins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data source plugins',
        errors: [{ code: 'GET_DATASOURCE_PLUGINS_FAILED', message: error.message }]
      });
    }
  };

  getChartPlugins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { category } = req.query;

      const plugins = await this.pluginService.getChartPlugins(category as string);

      res.status(200).json({
        success: true,
        plugins,
        message: 'Chart plugins retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get chart plugins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart plugins',
        errors: [{ code: 'GET_CHART_PLUGINS_FAILED', message: error.message }]
      });
    }
  };

  testDataSourceConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, connection_config } = req.body;

      if (!type || !connection_config) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Type and connection_config are required' }]
        });
        return;
      }

      const testResult = await this.pluginService.testDataSourceConnection(type, connection_config);

      res.status(200).json({
        success: true,
        connection_valid: testResult.isValid,
        message: testResult.message,
        error: testResult.error,
        details: testResult.details
      });
    } catch (error: any) {
      logger.error('Test data source connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test data source connection',
        errors: [{ code: 'CONNECTION_TEST_FAILED', message: error.message }]
      });
    }
  };

  getPluginConfiguration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, name } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate plugin type
      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be "datasource" or "chart"' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'plugin.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view plugin configurations' }]
        });
        return;
      }

      const configuration = await this.pluginService.getPluginConfiguration(
        workspaceId,
        type as 'datasource' | 'chart',
        name
      );

      if (!configuration) {
        res.status(404).json({
          success: false,
          message: 'Plugin configuration not found',
          errors: [{ code: 'CONFIGURATION_NOT_FOUND', message: `Configuration for ${type} plugin "${name}" not found` }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        configuration,
        message: 'Plugin configuration retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin configuration',
        errors: [{ code: 'GET_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  };

  updatePluginConfiguration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, name } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const configurationData = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate plugin type
      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be "datasource" or "chart"' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'plugin.configure'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to configure plugins' }]
        });
        return;
      }

      const updatedConfiguration = await this.pluginService.updatePluginConfiguration(
        workspaceId,
        type as 'datasource' | 'chart',
        name,
        configurationData,
        userId!
      );

      res.status(200).json({
        success: true,
        configuration: updatedConfiguration,
        message: 'Plugin configuration updated successfully'
      });
    } catch (error: any) {
      logger.error('Update plugin configuration error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update plugin configuration',
        errors: [{ code: 'UPDATE_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  };

  resetPluginConfiguration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, name } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate plugin type
      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be "datasource" or "chart"' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'plugin.configure'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to configure plugins' }]
        });
        return;
      }

      await this.pluginService.resetPluginConfiguration(
        workspaceId,
        type as 'datasource' | 'chart',
        name
      );

      res.status(200).json({
        success: true,
        message: 'Plugin configuration reset to defaults successfully'
      });
    } catch (error: any) {
      logger.error('Reset plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset plugin configuration',
        errors: [{ code: 'RESET_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  };

  getPluginUsage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, name } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { period = 'month' } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate plugin type
      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be "datasource" or "chart"' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'plugin.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view plugin usage' }]
        });
        return;
      }

      const usage = await this.pluginService.getPluginUsage(
        workspaceId,
        type as 'datasource' | 'chart',
        name,
        period as string
      );

      res.status(200).json({
        success: true,
        usage,
        message: 'Plugin usage statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin usage statistics',
        errors: [{ code: 'GET_PLUGIN_USAGE_FAILED', message: error.message }]
      });
    }
  };

  validatePluginConfiguration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, name } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const configurationData = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate plugin type
      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be "datasource" or "chart"' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'plugin.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to validate plugin configurations' }]
        });
        return;
      }

      const validation = await this.pluginService.validatePluginConfiguration(
        type as 'datasource' | 'chart',
        name,
        configurationData
      );

      res.status(200).json({
        success: true,
        valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        message: validation.isValid ? 'Configuration is valid' : 'Configuration validation failed'
      });
    } catch (error: any) {
      logger.error('Validate plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate plugin configuration',
        errors: [{ code: 'VALIDATE_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  };
}