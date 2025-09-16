// api-services/src/controllers/PluginController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { PluginService } from '../services/PluginService';
import { PluginManager } from '../plugins/manager/PluginManager';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

// Import database connection directly (same pattern as WorkspaceController)
import { db } from '../utils/database';

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
    console.log('🔧 PluginController: Starting initialization...');
    
    // Validate database connection first
    if (!db) {
      const error = new Error('PluginController: Database connection is required but was null/undefined');
      logger.error('❌ PluginController constructor error:', error.message);
      throw error;
    }
    
    if (typeof db.query !== 'function') {
      const error = new Error(`PluginController: Invalid database connection - query method is ${typeof db.query}, expected function`);
      logger.error('❌ PluginController constructor error:', {
        message: error.message,
        databaseType: typeof db,
        hasQuery: typeof db.query,
        constructorName: db.constructor?.name
      });
      throw error;
    }

    console.log('✅ PluginController: Database connection validated');
    
    // Initialize services with validated database connection
    this.pluginService = new PluginService();
    this.pluginManager = PluginManager.getInstance();
    this.permissionService = new PermissionService(db); // ✅ Pass database connection
    
    logger.info('✅ PluginController: Initialized successfully', {
      hasPluginService: !!this.pluginService,
      hasPluginManager: !!this.pluginManager,
      hasPermissionService: !!this.permissionService,
      service: 'bi-platform-api'
    });
    
    console.log('✅ PluginController: Initialization complete');
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
        data: {
          plugins: publicPlugins,
          total: publicPlugins.length
        },
        message: 'Available data source plugins retrieved'
      });
    } catch (error: any) {
      logger.error('Get data source plugins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data source plugins',
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
        data: {
          plugins: publicPlugins,
          total: publicPlugins.length
        },
        message: 'Available chart plugins retrieved'
      });
    } catch (error: any) {
      logger.error('Get chart plugins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chart plugins',
        errors: [{ code: 'GET_CHART_PLUGINS_FAILED', message: error.message }]
      });
    }
  }

  // Test data source connection with custom configuration
  async testDataSourceConnection(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_name, config } = req.body;

      if (!plugin_name || !config) {
        res.status(400).json({
          success: false,
          message: 'Plugin name and configuration are required',
          errors: [{ code: 'MISSING_PARAMETERS', message: 'plugin_name and config are required' }]
        });
        return;
      }

      // Get the plugin
      const plugin = this.pluginManager.getDataSourcePlugin(plugin_name);
      if (!plugin) {
        res.status(404).json({
          success: false,
          message: 'Plugin not found',
          errors: [{ code: 'PLUGIN_NOT_FOUND', message: `Plugin '${plugin_name}' not found` }]
        });
        return;
      }

      // Test the connection
      const testResult = await this.pluginService.testConnection(plugin_name, config);

      res.status(200).json({
        success: true,
        data: testResult,
        message: testResult.success ? 'Connection test successful' : 'Connection test failed'
      });
    } catch (error: any) {
      logger.error('Test data source connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'CONNECTION_TEST_FAILED', message: error.message }]
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
        data: configuration,
        message: 'Plugin configuration retrieved'
      });
    } catch (error: any) {
      logger.error('Get plugin configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get plugin configuration',
        errors: [{ code: 'GET_PLUGIN_CONFIG_FAILED', message: error.message }]
      });
    }
  }

  // Validate plugin configuration
  async validatePluginConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        data: validation,
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
        data: health,
        message: 'Plugin health status retrieved'
      });
    } catch (error: any) {
      logger.error('Get plugin health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get plugin health',
        errors: [{ code: 'GET_PLUGIN_HEALTH_FAILED', message: error.message }]
      });
    }
  }

  // Helper method to sanitize config schema (remove sensitive defaults)
  private sanitizeConfigSchema(configSchema: any): any {
    const sanitized = { ...configSchema };
    
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key].type === 'password') {
        delete sanitized[key].default;
      }
    });

    return sanitized;
  }
}