// File: api-services/src/controllers/PluginController.ts

import { Request, Response } from 'express';
import { PluginService } from '../services/PluginService';
import { PermissionService } from '../services/PermissionService';

export class PluginController {
  constructor(
    private pluginService: PluginService,
    private permissionService: PermissionService
  ) {}

  async getAvailableDataSourcePlugins(req: Request, res: Response) {
    try {
      const plugins = await this.pluginService.getAvailableDataSourcePlugins();
      
      res.json({
        success: true,
        data: plugins
      });
    } catch (error) {
      console.error('Error fetching data source plugins:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load plugins' }
      });
    }
  }

  async getWorkspacePluginConfigs(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const configs = await this.pluginService.getWorkspacePluginConfigs(workspace_id);

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      console.error('Error fetching plugin configs:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load plugin configurations' }
      });
    }
  }

  async updatePluginConfiguration(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { plugin_type, plugin_name, configuration, is_enabled } = req.body;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.update')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const config = await this.pluginService.updatePluginConfiguration(
        workspace_id,
        plugin_type,
        plugin_name,
        configuration,
        is_enabled,
        req.user.id
      );

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error updating plugin config:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update plugin configuration' }
      });
    }
  }

  async enablePlugin(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { plugin_type, plugin_name } = req.body;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.update')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      await this.pluginService.enablePlugin(workspace_id, plugin_type, plugin_name, req.user.id);

      res.json({
        success: true,
        message: 'Plugin enabled successfully'
      });
    } catch (error) {
      console.error('Error enabling plugin:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to enable plugin' }
      });
    }
  }

  async disablePlugin(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { plugin_type, plugin_name } = req.body;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.update')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      await this.pluginService.disablePlugin(workspace_id, plugin_type, plugin_name);

      res.json({
        success: true,
        message: 'Plugin disabled successfully'
      });
    } catch (error) {
      console.error('Error disabling plugin:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to disable plugin' }
      });
    }
  }

  async testDataSourceConnection(req: Request, res: Response) {
    try {
      const { plugin_name, configuration } = req.body;

      const isValid = await this.pluginService.testDataSourceConnection(plugin_name, configuration);

      res.json({
        success: true,
        data: {
          connection_valid: isValid,
          tested_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error testing data source connection:', error);
      res.status(400).json({
        success: false,
        error: { code: 'CONNECTION_FAILED', message: error.message }
      });
    }
  }

  async getPluginUsageStats(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { plugin_name } = req.query;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.stats.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const stats = await this.pluginService.getPluginUsageStats(
        workspace_id,
        plugin_name as string
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching plugin usage stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load plugin statistics' }
      });
    }
  }
}
