// File: api-services/src/services/PluginService.ts
import { Pool, PoolClient } from 'pg';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';
import { PluginManager, DataSourcePlugin, ConnectionConfig, TestResult } from './PluginManager';

export interface DataSourceConfiguration {
  id: string;
  workspace_id: string;
  plugin_name: string;
  name: string;
  display_name: string;
  description?: string;
  connection_config: any;
  test_query?: string;
  connection_pool_config?: any;
  performance_config?: any;
  is_active: boolean;
  last_tested?: Date;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDataSourceRequest {
  plugin_name: string;
  name: string;
  display_name: string;
  description?: string;
  connection_config: any;
  test_query?: string;
  connection_pool_config?: any;
  performance_config?: any;
}

export interface UpdateDataSourceRequest {
  name?: string;
  display_name?: string;
  description?: string;
  connection_config?: any;
  test_query?: string;
  connection_pool_config?: any;
  performance_config?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error_code?: string;
  response_time?: number;
}

/**
 * Plugin Service - Handles ONLY DataSource plugin operations
 * Chart plugins are handled by frontend components
 */
export class PluginService {
  private db: Pool;
  private cacheService: CacheService;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    this.cacheService = new CacheService();
  }

  /**
   * Get all available data source plugins
   */
  async getAvailableDataSourcePlugins(): Promise<DataSourcePlugin[]> {
    try {
      // Ensure PluginManager is initialized
      if (!PluginManager.isInitialized()) {
        await PluginManager.initialize();
      }

      return PluginManager.getAllDataSourcePlugins();
    } catch (error) {
      logger.error('Failed to get available data source plugins:', error);
      throw new Error('Failed to load data source plugins');
    }
  }

  /**
   * Get data source plugins by category
   */
  async getDataSourcePluginsByCategory(category: string): Promise<DataSourcePlugin[]> {
    try {
      if (!PluginManager.isInitialized()) {
        await PluginManager.initialize();
      }

      return PluginManager.getDataSourcePluginsByCategory(category);
    } catch (error) {
      logger.error('Failed to get data source plugins by category:', error);
      throw new Error(`Failed to load data source plugins for category: ${category}`);
    }
  }

  /**
   * Get specific data source plugin
   */
  async getDataSourcePlugin(pluginName: string): Promise<DataSourcePlugin | null> {
    try {
      if (!PluginManager.isInitialized()) {
        await PluginManager.initialize();
      }

      return PluginManager.getDataSourcePlugin(pluginName);
    } catch (error) {
      logger.error('Failed to get data source plugin:', error);
      return null;
    }
  }

  /**
   * Get all data sources for a workspace
   */
  async getWorkspaceDataSources(workspaceId: string): Promise<DataSourceConfiguration[]> {
    const cacheKey = `workspace-datasources:${workspaceId}`;
    
    // Try cache first
    let dataSources = await this.cacheService.get<DataSourceConfiguration[]>(cacheKey);
    
    if (dataSources) {
      return dataSources;
    }

    const query = `
      SELECT 
        id, workspace_id, plugin_name, name, display_name, description,
        connection_config, test_query, connection_pool_config, performance_config,
        is_active, last_tested, test_status, test_error_message,
        created_by, created_at, updated_at
      FROM datasources
      WHERE workspace_id = $1 AND is_active = true
      ORDER BY name
    `;

    const result = await this.db.query(query, [workspaceId]);
    dataSources = result.rows.map(row => this.formatDataSource(row));

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, dataSources, 300);

    return dataSources;
  }

  /**
   * Get specific data source by ID
   */
  async getDataSourceById(dataSourceId: string, workspaceId: string): Promise<DataSourceConfiguration | null> {
    const query = `
      SELECT 
        id, workspace_id, plugin_name, name, display_name, description,
        connection_config, test_query, connection_pool_config, performance_config,
        is_active, last_tested, test_status, test_error_message,
        created_by, created_at, updated_at
      FROM datasources
      WHERE id = $1 AND workspace_id = $2 AND is_active = true
    `;

    const result = await this.db.query(query, [dataSourceId, workspaceId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.formatDataSource(result.rows[0]);
  }

  /**
   * Create new data source
   */
  async createDataSource(
    workspaceId: string,
    dataSourceData: CreateDataSourceRequest,
    createdBy: string
  ): Promise<DataSourceConfiguration> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Validate plugin exists
      const plugin = await this.getDataSourcePlugin(dataSourceData.plugin_name);
      if (!plugin) {
        throw new Error(`Data source plugin '${dataSourceData.plugin_name}' not found`);
      }

      // Validate configuration
      const validation = PluginManager.validatePluginConfig(
        dataSourceData.plugin_name,
        dataSourceData.connection_config
      );

      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Check for duplicate names in workspace
      const duplicateCheck = await client.query(
        'SELECT id FROM datasources WHERE workspace_id = $1 AND name = $2 AND is_active = true',
        [workspaceId, dataSourceData.name]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error(`Data source with name '${dataSourceData.name}' already exists in this workspace`);
      }

      // Insert new data source
      const insertQuery = `
        INSERT INTO datasources (
          workspace_id, plugin_name, name, display_name, description,
          connection_config, test_query, connection_pool_config, performance_config,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        workspaceId,
        dataSourceData.plugin_name,
        dataSourceData.name,
        dataSourceData.display_name,
        dataSourceData.description,
        JSON.stringify(dataSourceData.connection_config),
        dataSourceData.test_query,
        JSON.stringify(dataSourceData.connection_pool_config || {}),
        JSON.stringify(dataSourceData.performance_config || {}),
        createdBy
      ]);

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.delete(`workspace-datasources:${workspaceId}`);

      const createdDataSource = this.formatDataSource(result.rows[0]);
      
      logger.info('Data source created successfully', {
        id: createdDataSource.id,
        name: createdDataSource.name,
        plugin: createdDataSource.plugin_name,
        workspace: workspaceId
      });

      return createdDataSource;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create data source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update data source
   */
  async updateDataSource(
    dataSourceId: string,
    workspaceId: string,
    updates: UpdateDataSourceRequest,
    updatedBy: string
  ): Promise<DataSourceConfiguration> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if data source exists
      const existingResult = await client.query(
        'SELECT plugin_name FROM datasources WHERE id = $1 AND workspace_id = $2 AND is_active = true',
        [dataSourceId, workspaceId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Data source not found');
      }

      const pluginName = existingResult.rows[0].plugin_name;

      // If connection config is being updated, validate it
      if (updates.connection_config) {
        const validation = PluginManager.validatePluginConfig(pluginName, updates.connection_config);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
      }

      // Check for duplicate names if name is being updated
      if (updates.name) {
        const duplicateCheck = await client.query(
          'SELECT id FROM datasources WHERE workspace_id = $1 AND name = $2 AND id != $3 AND is_active = true',
          [workspaceId, updates.name, dataSourceId]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error(`Data source with name '${updates.name}' already exists in this workspace`);
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }
      if (updates.display_name !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(updates.display_name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updates.description);
      }
      if (updates.connection_config !== undefined) {
        updateFields.push(`connection_config = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.connection_config));
      }
      if (updates.test_query !== undefined) {
        updateFields.push(`test_query = $${paramIndex++}`);
        updateValues.push(updates.test_query);
      }
      if (updates.connection_pool_config !== undefined) {
        updateFields.push(`connection_pool_config = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.connection_pool_config));
      }
      if (updates.performance_config !== undefined) {
        updateFields.push(`performance_config = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.performance_config));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(dataSourceId, workspaceId);

      const updateQuery = `
        UPDATE datasources 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.delete(`workspace-datasources:${workspaceId}`);

      const updatedDataSource = this.formatDataSource(result.rows[0]);
      
      logger.info('Data source updated successfully', {
        id: updatedDataSource.id,
        name: updatedDataSource.name,
        workspace: workspaceId
      });

      return updatedDataSource;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update data source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete data source (soft delete)
   */
  async deleteDataSource(dataSourceId: string, workspaceId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if data source exists and is not being used
      const dependencyCheck = await client.query(`
        SELECT COUNT(*) as usage_count
        FROM datasets 
        WHERE data_source_id = $1 AND is_active = true
      `, [dataSourceId]);

      if (parseInt(dependencyCheck.rows[0].usage_count) > 0) {
        throw new Error('Cannot delete data source: it is being used by active datasets');
      }

      // Soft delete
      const result = await client.query(
        'UPDATE datasources SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND workspace_id = $2 RETURNING name',
        [dataSourceId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new Error('Data source not found');
      }

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.delete(`workspace-datasources:${workspaceId}`);
      
      logger.info('Data source deleted successfully', {
        id: dataSourceId,
        name: result.rows[0].name,
        workspace: workspaceId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete data source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test data source connection
   */
  async testConnectionConfig(pluginName: string, config: ConnectionConfig): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      const result = await PluginManager.testDataSourceConnection(pluginName, config);
      const responseTime = Date.now() - startTime;

      return {
        success: result.success,
        message: result.message,
        error_code: result.error_code,
        response_time: responseTime
      };
    } catch (error) {
      logger.error('Error testing connection config:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        error_code: 'TEST_CONNECTION_ERROR'
      };
    }
  }

  /**
   * Test existing data source connection
   */
  async testDataSourceConnection(dataSourceId: string, workspaceId: string): Promise<ConnectionTestResult> {
    const dataSource = await this.getDataSourceById(dataSourceId, workspaceId);
    if (!dataSource) {
      return {
        success: false,
        message: 'Data source not found',
        error_code: 'DATASOURCE_NOT_FOUND'
      };
    }

    const result = await this.testConnectionConfig(dataSource.plugin_name, dataSource.connection_config);

    // Update test status in database
    await this.updateDataSourceTestStatus(dataSourceId, result);

    return result;
  }

  /**
   * Update data source test status
   */
  private async updateDataSourceTestStatus(dataSourceId: string, testResult: ConnectionTestResult): Promise<void> {
    try {
      await this.db.query(`
        UPDATE datasources 
        SET 
          last_tested = CURRENT_TIMESTAMP,
          test_status = $2,
          test_error_message = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [
        dataSourceId,
        testResult.success ? 'success' : 'failed',
        testResult.success ? null : testResult.message
      ]);
    } catch (error) {
      logger.error('Failed to update data source test status:', error);
    }
  }

  /**
   * Get data source usage statistics
   */
  async getDataSourceUsage(dataSourceId: string): Promise<{
    dataset_count: number;
    chart_count: number;
    dashboard_count: number;
    last_used?: Date;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(DISTINCT ds.id) as dataset_count,
          COUNT(DISTINCT c.id) as chart_count,
          COUNT(DISTINCT d.id) as dashboard_count,
          MAX(ds.updated_at) as last_used
        FROM datasources dsrc
        LEFT JOIN datasets ds ON dsrc.id = ds.data_source_id AND ds.is_active = true
        LEFT JOIN charts c ON ds.id = ANY(c.dataset_ids) AND c.is_active = true
        LEFT JOIN dashboards d ON c.dashboard_id = d.id AND d.is_active = true
        WHERE dsrc.id = $1
      `, [dataSourceId]);

      return {
        dataset_count: parseInt(result.rows[0].dataset_count) || 0,
        chart_count: parseInt(result.rows[0].chart_count) || 0,
        dashboard_count: parseInt(result.rows[0].dashboard_count) || 0,
        last_used: result.rows[0].last_used
      };
    } catch (error) {
      logger.error('Error fetching data source usage:', error);
      throw error;
    }
  }

  /**
   * Get plugin statistics
   */
  async getPluginStatistics(workspaceId?: string): Promise<{
    available_plugins: number;
    configured_datasources: number;
    plugin_categories: string[];
    plugins_by_category: Record<string, number>;
    workspace_usage?: Record<string, number>;
  }> {
    try {
      const pluginStats = PluginManager.getPluginStats();
      
      let workspaceUsage = {};
      let configuredDataSources = 0;

      if (workspaceId) {
        // Get workspace-specific usage
        const usageResult = await this.db.query(`
          SELECT plugin_name, COUNT(*) as usage_count
          FROM datasources 
          WHERE workspace_id = $1 AND is_active = true
          GROUP BY plugin_name
        `, [workspaceId]);

        workspaceUsage = usageResult.rows.reduce((acc, row) => {
          acc[row.plugin_name] = parseInt(row.usage_count);
          return acc;
        }, {});

        configuredDataSources = Object.values(workspaceUsage).reduce((sum: number, count: any) => sum + count, 0);
      }

      return {
        available_plugins: pluginStats.dataSourcePlugins,
        configured_datasources: configuredDataSources,
        plugin_categories: pluginStats.categories,
        plugins_by_category: pluginStats.pluginsByCategory,
        workspace_usage: Object.keys(workspaceUsage).length > 0 ? workspaceUsage : undefined
      };
    } catch (error) {
      logger.error('Error getting plugin statistics:', error);
      throw error;
    }
  }

  /**
   * Format data source from database row
   */
  private formatDataSource(row: any): DataSourceConfiguration {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      plugin_name: row.plugin_name,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      connection_config: typeof row.connection_config === 'string' 
        ? JSON.parse(row.connection_config) 
        : row.connection_config,
      test_query: row.test_query,
      connection_pool_config: typeof row.connection_pool_config === 'string' 
        ? JSON.parse(row.connection_pool_config) 
        : row.connection_pool_config,
      performance_config: typeof row.performance_config === 'string' 
        ? JSON.parse(row.performance_config) 
        : row.performance_config,
      is_active: row.is_active,
      last_tested: row.last_tested,
      test_status: row.test_status,
      test_error_message: row.test_error_message,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}