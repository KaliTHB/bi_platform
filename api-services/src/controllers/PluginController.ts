// File: api-services/src/controllers/PluginController.ts
import { Request, Response } from 'express';
import { PluginService } from '../services/PluginService';
import { PermissionService } from '../services/PermissionService';
import { CacheService } from '../services/CacheService';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation';
import { Joi } from 'joi';

export class PluginController {
  private pluginService: PluginService;
  private permissionService: PermissionService;
  private cacheService: CacheService;

  constructor() {
    this.pluginService = new PluginService();
    this.permissionService = new PermissionService();
    this.cacheService = new CacheService();
  }

  // Get all available plugins
  async getAvailablePlugins(req: Request, res: Response) {
    try {
      const cacheKey = 'available-plugins';
      
      // Try cache first
      let plugins = await this.cacheService.get(cacheKey);
      
      if (!plugins) {
        plugins = await this.pluginService.getAvailablePlugins();
        // Cache for 1 hour
        await this.cacheService.set(cacheKey, plugins, 3600);
      }

      res.json({
        success: true,
        data: { plugins }
      });
    } catch (error) {
      logger.error('Error getting available plugins:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get available plugins' }
      });
    }
  }

  // Get workspace plugin configurations
  async getWorkspaceConfigurations(req: Request, res: Response) {
    try {
      const { workspace_id } = req.params;
      
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        req.user.id,
        workspace_id,
        'can_read'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const configurations = await this.pluginService.getWorkspaceConfigurations(workspace_id);

      res.json({
        success: true,
        data: { configurations }
      });
    } catch (error) {
      logger.error('Error getting workspace configurations:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get configurations' }
      });
    }
  }

  // Update plugin configuration
  async updatePluginConfiguration(req: Request, res: Response) {
    try {
      const { workspace_id } = req.params;
      const validation = validateRequest(req.body, Joi.object({
        plugin_type: Joi.string().valid('datasource', 'chart').required(),
        plugin_name: Joi.string().required(),
        configuration: Joi.object().required(),
        is_enabled: Joi.boolean().default(true)
      }));

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') }
        });
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        req.user.id,
        workspace_id,
        'can_configure'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const { plugin_type, plugin_name, configuration, is_enabled } = validation.data;

      const result = await this.pluginService.updatePluginConfiguration({
        workspace_id,
        plugin_type,
        plugin_name,
        configuration,
        is_enabled,
        updated_by: req.user.id
      });

      // Invalidate cache
      await this.cacheService.delete(`workspace-configs-${workspace_id}`);

      res.json({
        success: true,
        data: { configuration: result }
      });
    } catch (error) {
      logger.error('Error updating plugin configuration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update configuration' }
      });
    }
  }

  // Test plugin connection
  async testPluginConnection(req: Request, res: Response) {
    try {
      const { workspace_id } = req.params;
      const validation = validateRequest(req.body, Joi.object({
        plugin_name: Joi.string().required(),
        configuration: Joi.object().required()
      }));

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') }
        });
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        req.user.id,
        workspace_id,
        'can_test'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const { plugin_name, configuration } = validation.data;

      const testResult = await this.pluginService.testPluginConnection(
        plugin_name,
        configuration
      );

      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      logger.error('Error testing plugin connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to test connection' }
      });
    }
  }

  // Get plugin statistics
  async getPluginStatistics(req: Request, res: Response) {
    try {
      const { workspace_id } = req.params;
      
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        req.user.id,
        workspace_id,
        'can_monitor'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const statistics = await this.pluginService.getPluginStatistics(workspace_id);

      res.json({
        success: true,
        data: { statistics }
      });
    } catch (error) {
      logger.error('Error getting plugin statistics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' }
      });
    }
  }

  // Delete plugin configuration
  async deletePluginConfiguration(req: Request, res: Response) {
    try {
      const { workspace_id, plugin_type, plugin_name } = req.params;
      
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        req.user.id,
        workspace_id,
        'can_configure'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      await this.pluginService.deletePluginConfiguration(
        workspace_id,
        plugin_type as 'datasource' | 'chart',
        plugin_name
      );

      // Invalidate cache
      await this.cacheService.delete(`workspace-configs-${workspace_id}`);

      res.json({
        success: true,
        data: { message: 'Configuration deleted successfully' }
      });
    } catch (error) {
      logger.error('Error deleting plugin configuration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete configuration' }
      });
    }
  }
}