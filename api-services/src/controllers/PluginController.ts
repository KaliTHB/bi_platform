/ File: api-services/src/controllers/PluginController.ts
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
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.read')) {
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
      const { workspace_id } = req.user;
      const schema = Joi.object({
        plugin_type: Joi.string().valid('datasource', 'chart').required(),
        plugin_name: Joi.string().required(),
        configuration: Joi.object().default({}),
        is_enabled: Joi.boolean().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
        });
      }

      const { plugin_type, plugin_name, configuration, is_enabled } = value;

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
        data: { configuration: config }
      });
    } catch (error) {
      logger.error('Error updating plugin config:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update plugin configuration' }
      });
    }
  }

  // Test plugin connection
  async testPluginConnection(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const schema = Joi.object({
        plugin_name: Joi.string().required(),
        configuration: Joi.object().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
        });
      }

      const { plugin_name, configuration } = value;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.test')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const startTime = Date.now();
      const result = await this.pluginService.testPluginConnection(plugin_name, configuration);
      const responseTime = Date.now() - startTime;

      // Cache test result for 1 minute
      const cacheKey = `plugin-test:${workspace_id}:${plugin_name}`;
      await this.cacheService.set(cacheKey, { ...result, response_time: responseTime }, 60);

      res.json({
        success: true,
        data: {
          connection_valid: result.success,
          message: result.message,
          response_time: responseTime
        }
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
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'plugin.config.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const statistics = await this.pluginService.getPluginStatistics(workspace_id);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error getting plugin statistics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' }
      });
    }
  }