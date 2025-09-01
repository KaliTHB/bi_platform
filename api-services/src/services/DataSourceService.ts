// File: api-services/src/services/DataSourceService.ts
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { PluginService } from './PluginService';

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
  private pluginService: PluginService;

  constructor() {
    this.pluginService = new PluginService();
  }

  /**
   * Create a new datasource
   */
  async createDataSource(
    workspaceId: string, 
    data: CreateDataSourceRequest, 
    userId: string
  ): Promise<DataSource> {
    try {
      // Delegate plugin validation to PluginService
      await this.pluginService.validatePluginConfiguration(workspaceId, data.plugin_name, data.connection_config);

      // Check if name already exists in workspace
      const existingResult = await db.query(
        'SELECT id FROM datasources WHERE workspace_id = $1 AND name = $2 AND is_active = true',
        [workspaceId, data.name]
      );

      if (existingResult.rows.length > 0) {
        throw new Error(`Datasource name '${data.name}' already exists in this workspace`);
      }

      const id = this.generateId();
      
      // Set default configurations
      const connectionPoolConfig = data.connection_pool_config || {
        max_connections: 10,
        idle_timeout: 30000,
        connection_timeout: 5000
      };

      const performanceConfig = data.performance_config || {
        query_timeout: 30000,
        max_rows: 10000,
        cache_ttl: 300
      };

      const result = await db.query(`
        INSERT INTO datasources (
          id, workspace_id, plugin_name, name, display_name, description,
          connection_config, test_query, connection_pool_config, performance_config,
          test_status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, NOW(), NOW())
        RETURNING *
      `, [
        id, workspaceId, data.plugin_name, data.name,
        data.display_name || data.name, data.description,
        JSON.stringify(data.connection_config),
        data.test_query,
        JSON.stringify(connectionPoolConfig),
        JSON.stringify(performanceConfig),
        userId
      ]);

      // Clear workspace datasources cache
      await cache.delete(`datasources:${workspaceId}`);
      
      const datasource = this.formatDataSource(result.rows[0]);

      // Test connection asynchronously (don't wait for it)
      this.testConnectionAsync(datasource.id, workspaceId).catch(error => {
        logger.error('Async connection test failed:', error);
      });

      return datasource;
    } catch (error) {
      logger.error('Error creating datasource:', error);
      throw error;
    }
  }

  /**
   * Get all datasources for a workspace
   */
  async getDataSources(workspaceId: string): Promise<DataSource[]> {
    try {
      const cacheKey = `datasources:${workspaceId}`;
      let datasources = await cache.get<DataSource[]>(cacheKey);
      
      if (datasources) {
        return datasources;
      }

      const result = await db.query(`
        SELECT ds.*, u.email as created_by_email
        FROM datasources ds
        LEFT JOIN users u ON ds.created_by = u.id
        WHERE ds.workspace_id = $1 AND ds.is_active = true
        ORDER BY ds.created_at DESC
      `, [workspaceId]);

      datasources = result.rows.map(row => this.formatDataSource(row));
      
      // Cache for 5 minutes
      await cache.set(cacheKey, datasources, 300);
      
      return datasources;
    } catch (error) {
      logger.error('Error getting datasources:', error);
      throw error;
    }
  }

  /**
   * Get datasource by ID
   */
  async getDataSourceById(datasourceId: string, workspaceId?: string): Promise<DataSource | null> {
    try {
      let query = 'SELECT * FROM datasources WHERE id = $1 AND is_active = true';
      const params: any[] = [datasourceId];
      
      if (workspaceId) {
        query += ' AND workspace_id = $2';
        params.push(workspaceId);
      }

      const result = await db.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.formatDataSource(result.rows[0]);
    } catch (error) {
      logger.error('Error getting datasource:', error);
      throw error;
    }
  }

  /**
   * Update datasource
   */
  async updateDataSource(
    datasourceId: string, 
    workspaceId: string, 
    data: UpdateDataSourceRequest
  ): Promise<DataSource> {
    try {
      // If connection config is being updated, validate it
      if (data.connection_config) {
        const currentDataSource = await this.getDataSourceById(datasourceId, workspaceId);
        if (!currentDataSource) {
          throw new Error('Datasource not found');
        }

        await this.pluginService.validatePluginConfiguration(
          workspaceId, 
          currentDataSource.plugin_name, 
          data.connection_config
        );
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      // Build dynamic update query
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
        // Reset test status when connection config changes
        updateFields.push(`test_status = 'pending'`);
        updateFields.push(`test_error_message = NULL`);
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

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
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

      if (result.rows.length === 0) {
        throw new Error('Datasource not found or update failed');
      }

      // Clear cache
      await cache.delete(`datasources:${workspaceId}`);

      const updatedDataSource = this.formatDataSource(result.rows[0]);

      // If connection config was updated, test connection asynchronously
      if (data.connection_config) {
        this.testConnectionAsync(datasourceId, workspaceId).catch(error => {
          logger.error('Async connection test failed after update:', error);
        });
      }

      return updatedDataSource;
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
      const result = await db.query(
        'UPDATE datasources SET is_active = false, updated_at = NOW() WHERE id = $1 AND workspace_id = $2',
        [datasourceId, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new Error('Datasource not found');
      }

      // Clear cache
      await cache.delete(`datasources:${workspaceId}`);
    } catch (error) {
      logger.error('Error deleting datasource:', error);
      throw error;
    }
  }

  /**
   * Test datasource connection - delegates to PluginService
   */
  async testConnection(datasourceId: string, workspaceId?: string): Promise<TestConnectionResult> {
    try {
      const datasource = await this.getDataSourceById(datasourceId, workspaceId);
      if (!datasource) {
        throw new Error('Datasource not found');
      }

      // Delegate to PluginService for connection testing
      const result = await this.pluginService.testPluginConnection(
        datasource.plugin_name,
        datasource.connection_config
      );

      // Update test status in database
      const testStatus = result.success ? 'success' : 'failed';
      const errorMessage = result.success ? null : result.message;

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
        ...result,
        details: {
          ...result.details,
          datasource_id: datasourceId,
          datasource_name: datasource.name
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
   * Test connection with custom config (without saving) - delegates to PluginService
   */
  async testConnectionConfig(
    pluginName: string,
    connectionConfig: Record<string, any>
  ): Promise<TestConnectionResult> {
    return this.pluginService.testPluginConnection(pluginName, connectionConfig);
  }

  /**
   * Get datasource usage statistics
   */
  async getUsageStatistics(datasourceId: string, workspaceId: string): Promise<any> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT d.id) as dataset_count,
          COUNT(DISTINCT c.id) as chart_count,
          COUNT(DISTINCT db.id) as dashboard_count,
          MAX(qh.executed_at) as last_used
        FROM datasources ds
        LEFT JOIN datasets d ON ds.id = d.data_source_id AND d.is_active = true
        LEFT JOIN charts c ON d.id = c.dataset_id AND c.is_active = true
        LEFT JOIN dashboard_charts dc ON c.id = dc.chart_id
        LEFT JOIN dashboards db ON dc.dashboard_id = db.id AND db.is_active = true
        LEFT JOIN query_history qh ON ds.id = qh.datasource_id
        WHERE ds.id = $1 AND ds.workspace_id = $2
        GROUP BY ds.id
      `, [datasourceId, workspaceId]);

      if (result.rows.length === 0) {
        throw new Error('Datasource not found');
      }

      return {
        dataset_count: parseInt(result.rows[0].dataset_count) || 0,
        chart_count: parseInt(result.rows[0].chart_count) || 0,
        dashboard_count: parseInt(result.rows[0].dashboard_count) || 0,
        last_used: result.rows[0].last_used
      };
    } catch (error) {
      logger.error('Error getting usage statistics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async testConnectionAsync(datasourceId: string, workspaceId: string): Promise<void> {
    try {
      await this.testConnection(datasourceId, workspaceId);
    } catch (error) {
      logger.error('Async connection test failed:', error);
    }
  }

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

  private generateId(): string {
    return 'ds_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}