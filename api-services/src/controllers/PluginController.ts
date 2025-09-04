// api-services/src/controllers/PluginController.ts
import { Request, Response } from 'express';
import { PluginService } from '../services/PluginService';
import { PluginManager } from '../plugins/manager/PluginManager';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    workspace_id: string;
    roles: string[];
  };
}

export class PluginController {
  private pluginService: PluginService;
  private pluginManager: PluginManager;
  private permissionService: PermissionService;

  constructor() {
    this.pluginService = new PluginService();
    this.pluginManager = PluginManager.getInstance();
    this.permissionService = new PermissionService();
  }

  // Get all available data source plugins
  async getDataSourcePlugins(req: Request, res: Response): Promise<void> {
    try {
      const { category, search } = req.query;

      const plugins = this.pluginManager.getDataSourcePlugins({
        category: category as string,
        search: search as string
      });

      // Return public plugin metadata without sensitive information
      const publicPlugins = plugins.map(plugin => ({
        name: plugin.name,
        displayName: plugin.displayName,
        category: plugin.category,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        license: plugin.license,
        capabilities: plugin.capabilities,
        configSchema: this.sanitizeConfigSchema(plugin.configSchema)
      }));

      res.status(200).json({
        success: true,
        plugins: publicPlugins,
        total: publicPlugins.length,
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
  }

  // Get all available chart plugins
  async getChartPlugins(req: Request, res: Response): Promise<void> {
    try {
      const { category, search } = req.query;

      const plugins = this.pluginManager.getChartPlugins({
        category: category as string,
        search: search as string
      });

      // Return public plugin metadata
      const publicPlugins = plugins.map(plugin => ({
        name: plugin.name,
        displayName: plugin.displayName,
        category: plugin.category,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        license: plugin.license,
        capabilities: plugin.capabilities,
        configSchema: plugin.configSchema,
        dataRequirements: plugin.dataRequirements,
        visualizationOptions: plugin.visualizationOptions
      }));

      res.status(200).json({
        success: true,
        plugins: publicPlugins,
        total: publicPlugins.length,
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
  }

  // Test data source connection with plugin
  async testDataSourceConnection(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_type, connection_config } = req.body;

      if (!plugin_type || !connection_config) {
        res.status(400).json({
          success: false,
          message: 'Plugin type and connection config are required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'plugin_type and connection_config fields are required' }]
        });
        return;
      }

      // Get plugin instance
      const plugin = this.pluginManager.getDataSourcePlugin(plugin_type);
      if (!plugin) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: `Plugin type '${plugin_type}' not found` }]
        });
        return;
      }

      // Validate configuration against schema
      const validationResult = this.pluginService.validateConnectionConfig(
        connection_config, 
        plugin.configSchema
      );
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid connection configuration',
          errors: validationResult.errors
        });
        return;
      }

      // Test connection
      const testResult = await this.pluginService.testConnection(plugin, connection_config);

      res.status(200).json({
        success: true,
        connection_test: testResult,
        message: testResult.success ? 'Connection test successful' : 'Connection test failed'
      });
    } catch (error: any) {
      logger.error('Test data source connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'TEST_CONNECTION_FAILED', message: error.message }]
      });
    }
  }

  // Get plugin configuration for workspace
  async getPluginConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const { workspace_id } = req.user;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const configuration = await this.pluginService.getPluginConfiguration(
        workspace_id,
        type as 'datasource' | 'chart',
        name
      );

      res.status(200).json({
        success: true,
        configuration,
        message: 'Plugin configuration retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin configuration error:', error);
      
      if (error.code === 'PLUGIN_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'Plugin not found',
          errors: [{ code: 'PLUGIN_NOT_FOUND', message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve plugin configuration',
          errors: [{ code: 'GET_PLUGIN_CONFIG_FAILED', message: error.message }]
        });
      }
    }
  }

  // Update plugin configuration for workspace
  async updatePluginConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const { workspace_id } = req.user;
      const configData = req.body;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      // Validate configuration data
      const plugin = type === 'datasource' 
        ? this.pluginManager.getDataSourcePlugin(name)
        : this.pluginManager.getChartPlugin(name);

      if (!plugin) {
        res.status(404).json({
          success: false,
          message: 'Plugin not found',
          errors: [{ code: 'PLUGIN_NOT_FOUND', message: `Plugin '${name}' not found` }]
        });
        return;
      }

      const configuration = await this.pluginService.updatePluginConfiguration(
        workspace_id,
        type as 'datasource' | 'chart',
        name,
        configData
      );

      res.status(200).json({
        success: true,
        configuration,
        message: 'Plugin configuration updated successfully'
      });
    } catch (error: any) {
      logger.error('Update plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plugin configuration',
        errors: [{ code: 'UPDATE_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  }

  // Delete plugin configuration for workspace
  async deletePluginConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const { workspace_id } = req.user;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const result = await this.pluginService.deletePluginConfiguration(
        workspace_id,
        type as 'datasource' | 'chart',
        name
      );

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: 'Plugin configuration not found',
          errors: [{ code: 'PLUGIN_CONFIG_NOT_FOUND', message: result.message }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Plugin configuration deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete plugin configuration',
        errors: [{ code: 'DELETE_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  }

  // Get plugin usage statistics
  async getPluginUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const { workspace_id } = req.user;
      const { 
        start_date, 
        end_date, 
        include_performance = false 
      } = req.query;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const usage = await this.pluginService.getPluginUsage(
        workspace_id,
        type as 'datasource' | 'chart',
        name,
        {
          start_date: start_date as string,
          end_date: end_date as string,
          include_performance: include_performance === 'true'
        }
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
        message: 'Failed to retrieve plugin usage',
        errors: [{ code: 'GET_PLUGIN_USAGE_FAILED', message: error.message }]
      });
    }
  }

  // Validate plugin configuration
  async validatePluginConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const configData = req.body;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      // Get plugin
      const plugin = type === 'datasource' 
        ? this.pluginManager.getDataSourcePlugin(name)
        : this.pluginManager.getChartPlugin(name);

      if (!plugin) {
        res.status(404).json({
          success: false,
          message: 'Plugin not found',
          errors: [{ code: 'PLUGIN_NOT_FOUND', message: `Plugin '${name}' not found` }]
        });
        return;
      }

      // Validate configuration
      const validation = this.pluginService.validateConfiguration(
        configData, 
        plugin.configSchema
      );

      res.status(200).json({
        success: true,
        validation,
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
  }

  // Get plugin health status
  async getPluginHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;
      const { workspace_id } = req.user;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const health = await this.pluginService.getPluginHealth(
        workspace_id,
        type as 'datasource' | 'chart',
        name
      );

      res.status(200).json({
        success: true,
        health,
        message: 'Plugin health status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin health',
        errors: [{ code: 'GET_PLUGIN_HEALTH_FAILED', message: error.message }]
      });
    }
  }

  // Get plugin system status (all plugins)
  async getPluginSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const systemStatus = await this.pluginService.getSystemStatus();

      res.status(200).json({
        success: true,
        system_status: systemStatus,
        message: 'Plugin system status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin system status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin system status',
        errors: [{ code: 'GET_SYSTEM_STATUS_FAILED', message: error.message }]
      });
    }
  }

  // Get plugin categories and metadata
  async getPluginCategories(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      if (type && !['datasource', 'chart'].includes(type as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const categories = this.pluginManager.getPluginCategories(type as 'datasource' | 'chart');

      res.status(200).json({
        success: true,
        categories,
        message: 'Plugin categories retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin categories',
        errors: [{ code: 'GET_PLUGIN_CATEGORIES_FAILED', message: error.message }]
      });
    }
  }

  // Get plugin documentation/help
  async getPluginDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { type, name } = req.params;

      if (!['datasource', 'chart'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: 'Plugin type must be either "datasource" or "chart"' }]
        });
        return;
      }

      const plugin = type === 'datasource' 
        ? this.pluginManager.getDataSourcePlugin(name)
        : this.pluginManager.getChartPlugin(name);

      if (!plugin) {
        res.status(404).json({
          success: false,
          message: 'Plugin not found',
          errors: [{ code: 'PLUGIN_NOT_FOUND', message: `Plugin '${name}' not found` }]
        });
        return;
      }

      const documentation = {
        name: plugin.name,
        displayName: plugin.displayName,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author,
        license: plugin.license,
        configSchema: this.sanitizeConfigSchema(plugin.configSchema),
        capabilities: plugin.capabilities,
        examples: plugin.examples || [],
        troubleshooting: plugin.troubleshooting || []
      };

      res.status(200).json({
        success: true,
        documentation,
        message: 'Plugin documentation retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get plugin documentation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plugin documentation',
        errors: [{ code: 'GET_PLUGIN_DOCS_FAILED', message: error.message }]
      });
    }
  }

  // Get workspace plugin settings
  async getWorkspacePluginSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;

      const settings = await this.pluginService.getWorkspacePluginSettings(workspace_id);

      res.status(200).json({
        success: true,
        settings,
        message: 'Workspace plugin settings retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get workspace plugin settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace plugin settings',
        errors: [{ code: 'GET_WORKSPACE_SETTINGS_FAILED', message: error.message }]
      });
    }
  }

  // Update workspace plugin settings
  async updateWorkspacePluginSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const settingsData = req.body;

      const settings = await this.pluginService.updateWorkspacePluginSettings(
        workspace_id, 
        settingsData
      );

      res.status(200).json({
        success: true,
        settings,
        message: 'Workspace plugin settings updated successfully'
      });
    } catch (error: any) {
      logger.error('Update workspace plugin settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workspace plugin settings',
        errors: [{ code: 'UPDATE_WORKSPACE_SETTINGS_FAILED', message: error.message }]
      });
    }
  }

  // Helper method to sanitize config schema (remove sensitive defaults)
  private sanitizeConfigSchema(configSchema: any): any {
    const sanitized: any = {};
    
    for (const [key, field] of Object.entries(configSchema as any)) {
      sanitized[key] = {
        type: field.type,
        required: field.required,
        description: field.description,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options,
        validation: field.validation
      };

      // Only include default values for non-sensitive fields
      if (field.type !== 'password' && field.default !== undefined) {
        sanitized[key].default = field.default;
      }
    }
    
    return sanitized;
  }
}