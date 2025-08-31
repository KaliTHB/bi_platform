// File: api-services/src/services/DataSourceService.ts
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { DataSourcePlugins } from '../plugins/datasources';

export interface DataSource {
  id: string;
  workspace_id: string;
  plugin_name: string;
  name: string;
  display_name?: string;
  description?: string;
  connection_config: Record<string, any>;
  test_query?: string;
  connection_pool_config: Record<string, any>;
  performance_config: Record<string, any>;
  is_active: boolean;
  last_tested?: Date;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDataSourceRequest {
  name: string;
  display_name?: string;
  description?: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  test_query?: string;
  connection_pool_config?: Record<string, any>;
  performance_config?: Record<string, any>;
}

export interface UpdateDataSourceRequest {
  name?: string;
  display_name?: string;
  description?: string;
  connection_config?: Record<string, any>;
  test_query?: string;
  connection_pool_config?: Record<string, any>;
  performance_config?: Record<string, any>;
  is_active?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
  details?: Record<string, any>;
}

export class DataSourceService {
  
  /**
   * Create a new datasource
   */
  async createDataSource(
    workspaceId: string, 
    data: CreateDataSourceRequest, 
    userId: string
  ): Promise<DataSource> {
    try {
      // Validate plugin exists
      const plugin = DataSourcePlugins.get(data.plugin_name);
      if (!plugin) {
        throw new Error(`Plugin '${data.plugin_name}' not found`);
      }

      // Validate plugin configuration
      const validation = DataSourcePlugins.validateConfig(data.plugin_name, data.connection_config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if name already exists in workspace
      const existingResult = await db.query(
        'SELECT id FROM datasources WHERE workspace_id = $1 AND name = $2 AND is_active = true',
        [workspaceId, data.name]
      );

      if (existingResult.rows.length > 0) {
        throw new Error(`Datasource name '${data.name}' already exists in workspace`);
      }

      // Create datasource
      const result = await db.query(
        `INSERT INTO datasources (
          workspace_id, plugin_name, name, display_name, description,
          connection_config, test_query, connection_pool_config, 
          performance_config, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          workspaceId,
          data.plugin_name,
          data.name,
          data.display_name || data.name,
          data.description,
          JSON.stringify(data.connection_config),
          data.test_query,
          JSON.stringify(data.connection_pool_config || { max_connections: 20, min_connections: 5 }),
          JSON.stringify(data.performance_config || {}),
          userId
        ]
      );

      const datasource = result.rows[0];

      // Clear cache
      await cache.delete(`datasources:${workspaceId}`);

      return this.formatDataSource(datasource);
    } catch (error) {
      logger.error('Error creating datasource:', error);
      throw error;
    }
  }

  /**
   * Get all datasources for workspace
   */
  async getDataSources(workspaceId: string): Promise<DataSource[]> {
    try {
      const cacheKey = `datasources:${workspaceId}`;
      let datasources = await cache.get<DataSource[]>(cacheKey);

      if (!datasources) {
        const result = await db.query(
          `SELECT d.*, u.first_name || ' ' || u.last_name as created_by_name
           FROM datasources d
           LEFT JOIN users u ON d.created_by = u.id
           WHERE d.workspace_id = $1 AND d.is_active = true
           ORDER BY d.created_at DESC`,
          [workspaceId]
        );

        datasources = result.rows.map(row => this.formatDataSource(row));
        await cache.set(cacheKey, datasources, 300); // Cache for 5 minutes
      }

      return datasources;
    } catch (error) {
      logger.error('Error fetching datasources:', error);
      throw error;
    }
  }

  /**
   * Get datasource by ID
   */
  async getDataSourceById(datasourceId: string, workspaceId?: string): Promise<DataSource | null> {
    try {
      const query = workspaceId 
        ? 'SELECT d.*, u.first_name || \' \' || u.last_name as created_by_name FROM datasources d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true'
        : 'SELECT d.*, u.first_name || \' \' || u.last_name as created_by_name FROM datasources d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = $1 AND d.is_active = true';
      
      const params = workspaceId ? [datasourceId, workspaceId] : [datasourceId];
      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatDataSource(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching datasource:', error);
      throw error;
    }
  }

  /**
   * Update datasource
   */
  async updateDataSource(
    datasourceId: string,
    workspaceId: string,
    data: UpdateDataSourceRequest,
    userId: string
  ): Promise<DataSource> {
    try {
      // Get existing datasource
      const existing = await this.getDataSourceById(datasourceId, workspaceId);
      if (!existing) {
        throw new Error('Datasource not found');
      }

      // If connection_config is being updated, validate it
      if (data.connection_config) {
        const validation = DataSourcePlugins.validateConfig(existing.plugin_name, data.connection_config);
        if (!validation.valid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Check if name already exists (if name is being changed)
      if (data.name && data.name !== existing.name) {
        const existingResult = await db.query(
          'SELECT id FROM datasources WHERE workspace_id = $1 AND name = $2 AND id != $3 AND is_active = true',
          [workspaceId, data.name, datasourceId]
        );

        if (existingResult.rows.length > 0) {
          throw new Error(`Datasource name '${data.name}' already exists in workspace`);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(data.name);
      }

      if (data.display_name !== undefined) {
        updateFields.push(`display_name = $${paramCount++}`);
        updateValues.push(data.display_name);
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(data.description);
      }

      if (data.connection_config !== undefined) {
        updateFields.push(`connection_config = $${paramCount++}`);
        updateValues.push(JSON.stringify(data.connection_config));
      }

      if (data.test_query !== undefined) {
        updateFields.push(`test_query = $${paramCount++}`);
        updateValues.push(data.test_query);
      }

      if (data.connection_pool_config !== undefined) {
        updateFields.push(`connection_pool_config = $${paramCount++}`);
        updateValues.push(JSON.stringify(data.connection_pool_config));
      }

      if (data.performance_config !== undefined) {
        updateFields.push(`performance_config = $${paramCount++}`);
        updateValues.push(JSON.stringify(data.performance_config));
      }

      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(data.is_active);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(datasourceId, workspaceId);

      const result = await db.query(
        `UPDATE datasources 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount++} AND workspace_id = $${paramCount}
         RETURNING *`,
        updateValues
      );

      // Clear cache
      await cache.delete(`datasources:${workspaceId}`);

      return this.formatDataSource(result.rows[0]);
    } catch (error) {
      logger.error('Error updating datasource:', error);
      throw error;
    }
  }

  /**
   * Delete datasource (soft delete)
   */
  async deleteDataSource(datasourceId: string, workspaceId: string, userId: string): Promise<void> {
    try {
      // Check if datasource is in use
      const usageResult = await db.query(
        'SELECT COUNT(*) as count FROM datasets WHERE data_source_id = $1 AND is_active = true',
        [datasourceId]
      );

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error('Cannot delete datasource - it is currently being used by datasets');
      }

      // Soft delete
      await db.query(
        'UPDATE datasources SET is_active = false, updated_at = NOW() WHERE id = $1 AND workspace_id = $2',
        [datasourceId, workspaceId]
      );

      // Clear cache
      await cache.delete(`datasources:${workspaceId}`);
    } catch (error) {
      logger.error('Error deleting datasource:', error);
      throw error;
    }
  }

  /**
   * Test datasource connection
   */
  async testConnection(datasourceId: string, workspaceId?: string): Promise<TestConnectionResult> {
    try {
      const datasource = await this.getDataSourceById(datasourceId, workspaceId);
      if (!datasource) {
        throw new Error('Datasource not found');
      }

      const plugin = DataSourcePlugins.get(datasource.plugin_name);
      if (!plugin) {
        throw new Error(`Plugin '${datasource.plugin_name}' not found`);
      }

      const startTime = Date.now();
      const isValid = await plugin.testConnection(datasource.connection_config);
      const responseTime = Date.now() - startTime;

      // Update test status
      const testStatus = isValid ? 'success' : 'failed';
      const errorMessage = isValid ? null : 'Connection test failed';

      await db.query(
        `UPDATE datasources 
         SET test_status = $1, test_error_message = $2, last_tested = NOW()
         WHERE id = $3`,
        [testStatus, errorMessage, datasourceId]
      );

      // Clear cache
      if (workspaceId) {
        await cache.delete(`datasources:${workspaceId}`);
      }

      return {
        success: isValid,
        message: isValid ? 'Connection successful' : 'Connection failed',
        response_time: responseTime,
        details: {
          plugin_name: datasource.plugin_name,
          test_status: testStatus
        }
      };
    } catch (error) {
      logger.error('Error testing connection:', error);
      
      // Update test status to failed
      if (datasourceId) {
        await db.query(
          `UPDATE datasources 
           SET test_status = 'failed', test_error_message = $1, last_tested = NOW()
           WHERE id = $2`,
          [error instanceof Error ? error.message : 'Unknown error', datasourceId]
        );
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        error_code: 'TEST_CONNECTION_ERROR'
      };
    }
  }

  /**
   * Test connection with custom config (without saving)
   */
  async testConnectionConfig(
    pluginName: string,
    connectionConfig: Record<string, any>
  ): Promise<TestConnectionResult> {
    try {
      const plugin = DataSourcePlugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin '${pluginName}' not found`);
      }

      // Validate configuration
      const validation = DataSourcePlugins.validateConfig(pluginName, connectionConfig);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      const startTime = Date.now();
      const isValid = await plugin.testConnection(connectionConfig);
      const responseTime = Date.now() - startTime;

      return {
        success: isValid,
        message: isValid ? 'Connection successful' : 'Connection failed',
        response_time: responseTime,
        details: {
          plugin_name: pluginName
        }
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
   * Get datasource usage statistics
   */
  async getDataSourceUsage(datasourceId: string): Promise<any> {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(DISTINCT ds.id) as dataset_count,
          COUNT(DISTINCT c.id) as chart_count,
          COUNT(DISTINCT d.id) as dashboard_count,
          MAX(ds.updated_at) as last_used
         FROM datasources dsrc
         LEFT JOIN datasets ds ON dsrc.id = ds.data_source_id AND ds.is_active = true
         LEFT JOIN charts c ON ds.id = c.dataset_id AND c.is_active = true
         LEFT JOIN dashboards d ON c.dashboard_id = d.id AND d.is_active = true
         WHERE dsrc.id = $1`,
        [datasourceId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching datasource usage:', error);
      throw error;
    }
  }

  /**
   * Format datasource from database row
   */
  private formatDataSource(row: any): DataSource {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      plugin_name: row.plugin_name,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      connection_config: row.connection_config,
      test_query: row.test_query,
      connection_pool_config: row.connection_pool_config,
      performance_config: row.performance_config,
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