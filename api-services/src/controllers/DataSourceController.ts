// api-services/src/controllers/DataSourceController.ts
import { Request, Response } from 'express';
import { DataSourceService } from '../services/DataSourceService';
import { PluginManager } from '../services/PluginManager';
import { PermissionService } from '../services/PermissionService';
import { EncryptionService } from '../services/EncryptionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    workspace_id: string;
    roles: string[];
  };
}

export class DataSourceController {
  private dataSourceService: DataSourceService;
  private pluginManager: PluginManager;
  private permissionService: PermissionService;
  private encryptionService: EncryptionService;

  constructor() {
    this.dataSourceService = new DataSourceService();
    this.pluginManager = PluginManager.getInstance();
    this.permissionService = new PermissionService();
    this.encryptionService = new EncryptionService();
  }

  // Get all data sources in workspace
  async getDataSources(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        search,
        plugin_type,
        status,
        created_by,
        sort_by = 'updated_at',
        sort_order = 'desc',
        include_connection_status = false
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters: {
          search: search as string,
          plugin_type: plugin_type as string,
          status: status as string,
          created_by: created_by as string
        },
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
        include_connection_status: include_connection_status === 'true'
      };

      const result = await this.dataSourceService.getDataSources(workspace_id, options);

      res.status(200).json({
        success: true,
        data_sources: result.data_sources,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
          has_next: result.has_next,
          has_prev: result.has_prev
        },
        message: 'Data sources retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data sources error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data sources',
        errors: [{ code: 'GET_DATASOURCES_FAILED', message: error.message }]
      });
    }
  }

  // Create new data source
  async createDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, workspace_id } = req.user;
      const dataSourceData = req.body;

      // Validate required fields
      if (!dataSourceData.name || !dataSourceData.plugin_type) {
        res.status(400).json({
          success: false,
          message: 'Data source name and plugin type are required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name and plugin_type fields are required' }]
        });
        return;
      }

      // Validate plugin exists
      const plugin = this.pluginManager.getDataSourcePlugin(dataSourceData.plugin_type);
      if (!plugin) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: `Plugin type '${dataSourceData.plugin_type}' not found` }]
        });
        return;
      }

      // Encrypt sensitive connection config
      const encryptedConfig = await this.encryptionService.encryptConnectionConfig(
        dataSourceData.connection_config,
        plugin.configSchema
      );

      const createData = {
        ...dataSourceData,
        workspace_id,
        created_by: userId,
        connection_config: encryptedConfig
      };

      const dataSource = await this.dataSourceService.createDataSource(createData);

      res.status(201).json({
        success: true,
        data_source: dataSource,
        message: 'Data source created successfully'
      });
    } catch (error: any) {
      logger.error('Create data source error:', error);
      
      if (error.code === 'DATASOURCE_NAME_EXISTS') {
        res.status(409).json({
          success: false,
          message: 'Data source with this name already exists',
          errors: [{ code: 'DUPLICATE_NAME', message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create data source',
          errors: [{ code: 'CREATE_DATASOURCE_FAILED', message: error.message }]
        });
      }
    }
  }

  // Get specific data source by ID
  async getDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        include_schema = false, 
        include_connection_status = false,
        decrypt_config = false 
      } = req.query;

      const dataSource = await this.dataSourceService.getDataSource(id, workspace_id, {
        include_schema: include_schema === 'true',
        include_connection_status: include_connection_status === 'true'
      });

      if (!dataSource) {
        res.status(404).json({
          success: false,
          message: 'Data source not found',
          errors: [{ code: 'DATASOURCE_NOT_FOUND', message: 'Data source does not exist or access denied' }]
        });
        return;
      }

      // Decrypt config if requested and user has permission
      if (decrypt_config === 'true') {
        const hasPermission = await this.permissionService.canManageDataSource(
          req.user.id, 
          workspace_id, 
          id
        );
        
        if (hasPermission) {
          const plugin = this.pluginManager.getDataSourcePlugin(dataSource.plugin_type);
          if (plugin) {
            dataSource.connection_config = await this.encryptionService.decryptConnectionConfig(
              dataSource.connection_config,
              plugin.configSchema
            );
          }
        }
      }

      res.status(200).json({
        success: true,
        data_source: dataSource,
        message: 'Data source retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data source error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data source',
        errors: [{ code: 'GET_DATASOURCE_FAILED', message: error.message }]
      });
    }
  }

  // Update data source
  async updateDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const updateData = req.body;

      // Get existing data source to validate plugin type
      const existingDataSource = await this.dataSourceService.getDataSource(id, workspace_id);
      if (!existingDataSource) {
        res.status(404).json({
          success: false,
          message: 'Data source not found',
          errors: [{ code: 'DATASOURCE_NOT_FOUND', message: 'Data source does not exist or access denied' }]
        });
        return;
      }

      // Encrypt connection config if provided
      if (updateData.connection_config) {
        const plugin = this.pluginManager.getDataSourcePlugin(existingDataSource.plugin_type);
        if (plugin) {
          updateData.connection_config = await this.encryptionService.encryptConnectionConfig(
            updateData.connection_config,
            plugin.configSchema
          );
        }
      }

      const dataSource = await this.dataSourceService.updateDataSource(id, workspace_id, updateData);

      res.status(200).json({
        success: true,
        data_source: dataSource,
        message: 'Data source updated successfully'
      });
    } catch (error: any) {
      logger.error('Update data source error:', error);
      
      if (error.code === 'DATASOURCE_NAME_EXISTS') {
        res.status(409).json({
          success: false,
          message: 'Data source with this name already exists',
          errors: [{ code: 'DUPLICATE_NAME', message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update data source',
          errors: [{ code: 'UPDATE_DATASOURCE_FAILED', message: error.message }]
        });
      }
    }
  }

  // Delete data source
  async deleteDataSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { force = false } = req.query;

      // Check if data source is being used
      const usage = await this.dataSourceService.getDataSourceUsage(id, workspace_id);
      if (usage.is_in_use && force !== 'true') {
        res.status(409).json({
          success: false,
          message: 'Data source is currently being used by datasets or other resources',
          errors: [{ 
            code: 'DATASOURCE_IN_USE', 
            message: `Data source is used by ${usage.datasets_count} datasets. Use force=true to delete anyway.` 
          }],
          usage_details: usage
        });
        return;
      }

      const result = await this.dataSourceService.deleteDataSource(id, workspace_id, force === 'true');

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.message || 'Data source not found',
          errors: [{ code: 'DATASOURCE_NOT_FOUND', message: result.message || 'Data source does not exist or access denied' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Data source deleted successfully',
        affected_resources: result.affected_resources || {}
      });
    } catch (error: any) {
      logger.error('Delete data source error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete data source',
        errors: [{ code: 'DELETE_DATASOURCE_FAILED', message: error.message }]
      });
    }
  }

  // Test data source connection
  async testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      const testResult = await this.dataSourceService.testConnection(id, workspace_id);

      res.status(200).json({
        success: true,
        connection_test: testResult,
        message: testResult.success ? 'Connection test successful' : 'Connection test failed'
      });
    } catch (error: any) {
      logger.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'TEST_CONNECTION_FAILED', message: error.message }]
      });
    }
  }

  // Test custom connection configuration (without saving)
  async testCustomConnection(req: Request, res: Response): Promise<void> {
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

      // Validate plugin exists
      const plugin = this.pluginManager.getDataSourcePlugin(plugin_type);
      if (!plugin) {
        res.status(400).json({
          success: false,
          message: 'Invalid plugin type',
          errors: [{ code: 'INVALID_PLUGIN_TYPE', message: `Plugin type '${plugin_type}' not found` }]
        });
        return;
      }

      const testResult = await plugin.testConnection(connection_config);

      res.status(200).json({
        success: true,
        connection_test: testResult,
        message: testResult.success ? 'Connection test successful' : 'Connection test failed'
      });
    } catch (error: any) {
      logger.error('Test custom connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        errors: [{ code: 'TEST_CUSTOM_CONNECTION_FAILED', message: error.message }]
      });
    }
  }

  // Get data source schema (tables, columns, etc.)
  async getDataSourceSchema(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { refresh = false } = req.query;

      const schema = await this.dataSourceService.getSchema(id, workspace_id, refresh === 'true');

      res.status(200).json({
        success: true,
        schema,
        message: 'Data source schema retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data source schema error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data source schema',
        errors: [{ code: 'GET_SCHEMA_FAILED', message: error.message }]
      });
    }
  }

  // Get tables from data source
  async getDataSourceTables(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { database, schema, search } = req.query;

      const tables = await this.dataSourceService.getTables(id, workspace_id, {
        database: database as string,
        schema: schema as string,
        search: search as string
      });

      res.status(200).json({
        success: true,
        tables,
        message: 'Data source tables retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data source tables error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve data source tables',
        errors: [{ code: 'GET_TABLES_FAILED', message: error.message }]
      });
    }
  }

  // Get columns from specific table
  async getTableColumns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { table_name } = req.query;

      if (!table_name) {
        res.status(400).json({
          success: false,
          message: 'Table name is required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'table_name parameter is required' }]
        });
        return;
      }

      const columns = await this.dataSourceService.getColumns(id, workspace_id, table_name as string);

      res.status(200).json({
        success: true,
        columns,
        message: 'Table columns retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get table columns error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve table columns',
        errors: [{ code: 'GET_COLUMNS_FAILED', message: error.message }]
      });
    }
  }

  // Execute query on data source
  async executeQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { query, limit = 100, timeout = 30000 } = req.body;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Query is required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'query field is required' }]
        });
        return;
      }

      const result = await this.dataSourceService.executeQuery(id, workspace_id, query, {
        limit: parseInt(limit),
        timeout: parseInt(timeout)
      });

      res.status(200).json({
        success: true,
        query_result: result,
        message: 'Query executed successfully'
      });
    } catch (error: any) {
      logger.error('Execute query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute query',
        errors: [{ code: 'EXECUTE_QUERY_FAILED', message: error.message }]
      });
    }
  }

  // Validate query syntax
  async validateQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { query } = req.body;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Query is required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'query field is required' }]
        });
        return;
      }

      const validation = await this.dataSourceService.validateQuery(id, workspace_id, query);

      res.status(200).json({
        success: true,
        validation,
        message: validation.is_valid ? 'Query is valid' : 'Query validation failed'
      });
    } catch (error: any) {
      logger.error('Validate query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate query',
        errors: [{ code: 'VALIDATE_QUERY_FAILED', message: error.message }]
      });
    }
  }

  // Get data source usage statistics
  async getUsageStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        start_date, 
        end_date, 
        include_query_stats = true,
        include_performance_stats = true 
      } = req.query;

      const stats = await this.dataSourceService.getUsageStats(id, workspace_id, {
        start_date: start_date as string,
        end_date: end_date as string,
        include_query_stats: include_query_stats === 'true',
        include_performance_stats: include_performance_stats === 'true'
      });

      res.status(200).json({
        success: true,
        usage_stats: stats,
        message: 'Data source usage statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get usage stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve usage statistics',
        errors: [{ code: 'GET_USAGE_STATS_FAILED', message: error.message }]
      });
    }
  }

  // Get connection health status
  async getConnectionHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      const health = await this.dataSourceService.getConnectionHealth(id, workspace_id);

      res.status(200).json({
        success: true,
        connection_health: health,
        message: 'Connection health status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get connection health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve connection health',
        errors: [{ code: 'GET_CONNECTION_HEALTH_FAILED', message: error.message }]
      });
    }
  }

  // Refresh data source metadata
  async refreshDataSourceMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      const result = await this.dataSourceService.refreshMetadata(id, workspace_id);

      res.status(200).json({
        success: true,
        refresh_result: result,
        message: 'Data source metadata refreshed successfully'
      });
    } catch (error: any) {
      logger.error('Refresh metadata error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh metadata',
        errors: [{ code: 'REFRESH_METADATA_FAILED', message: error.message }]
      });
    }
  }

  // Get available data source plugins
  async getAvailablePlugins(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      const plugins = this.pluginManager.getDataSourcePlugins(category as string);

      // Remove sensitive information and return only public metadata
      const publicPlugins = plugins.map(plugin => ({
        name: plugin.name,
        displayName: plugin.displayName,
        category: plugin.category,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        license: plugin.license,
        configSchema: Object.keys(plugin.configSchema).reduce((schema, key) => {
          const field = plugin.configSchema[key];
          schema[key] = {
            type: field.type,
            required: field.required,
            description: field.description,
            placeholder: field.placeholder,
            helpText: field.helpText,
            options: field.options
          };
          return schema;
        }, {} as any),
        capabilities: plugin.capabilities
      }));

      res.status(200).json({
        success: true,
        plugins: publicPlugins,
        total: publicPlugins.length,
        message: 'Available data source plugins retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get available plugins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available plugins',
        errors: [{ code: 'GET_PLUGINS_FAILED', message: error.message }]
      });
    }
  }
}