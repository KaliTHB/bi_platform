// api-services/src/services/DataSourceService.ts
import { DatabaseService as Database } from '../config/database';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';
import { AnalyticsService } from './AnalyticsService';
import { v4 as uuidv4 } from 'uuid';

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  type: string;
  workspace_id: string;
  connection_config: Record<string, any>;
  status: 'active' | 'inactive' | 'error' | 'testing';
  tags: string[];
  metadata: Record<string, any>;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  last_tested_at?: Date;
  last_used_at?: Date;
}

export interface CreateDataSourceRequest {
  name: string;
  description?: string;
  type: string;
  workspace_id: string;
  connection_config: Record<string, any>;
  tags?: string[];
  created_by: string;
}

export interface UpdateDataSourceRequest {
  name?: string;
  description?: string;
  connection_config?: Record<string, any>;
  tags?: string[];
  status?: 'active' | 'inactive' | 'error' | 'testing';
  updated_by?: string;
}

export interface DataSourceFilters {
  workspace_id: string;
  type?: string;
  status?: string;
  search?: string;
  tags?: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  connection_time_ms: number;
  timestamp: Date;
  error_details?: any;
  server_info?: {
    version?: string;
    type?: string;
    host?: string;
  };
}

export interface UsageStats {
  datasource_id: string;
  period: string;
  total_queries: number;
  unique_users: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_query_at?: Date;
  connected_datasets: number;
  daily_usage: Array<{
    date: string;
    queries: number;
    unique_users: number;
    avg_response_time: number;
  }>;
}

export interface DataSourceSchema {
  datasource_id: string;
  schema_version: string;
  last_updated: Date;
  databases: Array<{
    name: string;
    tables: Array<{
      name: string;
      type: 'table' | 'view';
      columns: Array<{
        name: string;
        data_type: string;
        is_nullable: boolean;
        is_primary_key: boolean;
        is_foreign_key: boolean;
        default_value?: any;
        description?: string;
      }>;
      indexes: Array<{
        name: string;
        columns: string[];
        is_unique: boolean;
      }>;
      row_count_estimate?: number;
    }>;
  }>;
}

export interface QueryResult {
  columns: Array<{
    name: string;
    type: string;
  }>;
  data: any[][];
  row_count: number;
  execution_time_ms: number;
  query_id: string;
  from_cache: boolean;
}

export interface DatasourceDependencies {
  datasets: Array<{
    id: string;
    name: string;
    workspace_id: string;
  }>;
  charts: Array<{
    id: string;
    name: string;
    dashboard_id?: string;
  }>;
  dashboards: Array<{
    id: string;
    name: string;
  }>;
  total: number;
}

export class DataSourceService {
  private database: Database;
  private cacheService: CacheService;
  private analyticsService: AnalyticsService;

  constructor(
    database?: Database,
    cacheService?: CacheService,
    analyticsService?: AnalyticsService
  ) {
    // In production, these should be injected
    this.database = database || new Database();
    this.cacheService = cacheService || new CacheService();
    this.analyticsService = analyticsService || new AnalyticsService(this.database, this.cacheService);
  }

  // Create new datasource
  async createDataSource(data: CreateDataSourceRequest): Promise<DataSource> {
    try {
      const id = uuidv4();
      const now = new Date();

      const datasource: DataSource = {
        id,
        name: data.name,
        description: data.description,
        type: data.type,
        workspace_id: data.workspace_id,
        connection_config: data.connection_config,
        status: 'inactive',
        tags: data.tags || [],
        metadata: {},
        created_by: data.created_by,
        created_at: now,
        updated_at: now
      };

      await this.database.query(`
        INSERT INTO datasources (
          id, name, description, type, workspace_id, connection_config,
          status, tags, metadata, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        datasource.id,
        datasource.name,
        datasource.description,
        datasource.type,
        datasource.workspace_id,
        JSON.stringify(datasource.connection_config),
        datasource.status,
        JSON.stringify(datasource.tags),
        JSON.stringify(datasource.metadata),
        datasource.created_by,
        datasource.created_at,
        datasource.updated_at
      ]);

      // Track creation event
      await this.analyticsService.trackEvent({
        user_id: data.created_by,
        workspace_id: data.workspace_id,
        event_type: 'create',
        event_category: 'datasource',
        resource_id: id,
        resource_type: 'datasource',
        metadata: {
          datasource_type: data.type,
          datasource_name: data.name
        }
      });

      logger.info('DataSource created successfully', { id, name: data.name, type: data.type });
      return datasource;
    } catch (error: any) {
      logger.error('Error creating datasource:', error);
      throw new Error(`Failed to create datasource: ${error.message}`);
    }
  }

  // Get datasources with filtering and pagination
  async getDataSources(
    filters: DataSourceFilters,
    pagination: { page: number; limit: number }
  ): Promise<{
    datasources: DataSource[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let whereClause = 'WHERE workspace_id = $1';
      const params: any[] = [filters.workspace_id];
      let paramIndex = 2;

      // Build dynamic where clause
      if (filters.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        whereClause += ` AND tags ?| array[$${paramIndex}]`;
        params.push(filters.tags);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.database.query(`
        SELECT COUNT(*) as total FROM datasources ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].total);

      // Get datasources
      const offset = (pagination.page - 1) * pagination.limit;
      const result = await this.database.query(`
        SELECT 
          id, name, description, type, workspace_id, status, tags,
          created_by, updated_by, created_at, updated_at, 
          last_tested_at, last_used_at
        FROM datasources 
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, pagination.limit, offset]);

      const datasources: DataSource[] = result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        connection_config: {}, // Don't return sensitive config data
        metadata: JSON.parse(row.metadata || '{}')
      }));

      return {
        datasources,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error: any) {
      logger.error('Error getting datasources:', error);
      throw new Error(`Failed to get datasources: ${error.message}`);
    }
  }

  // Get single datasource by ID
  async getDataSourceById(id: string, workspaceId: string): Promise<DataSource | null> {
    try {
      const result = await this.database.query(`
        SELECT * FROM datasources 
        WHERE id = $1 AND workspace_id = $2
      `, [id, workspaceId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        connection_config: JSON.parse(row.connection_config || '{}'),
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}')
      };
    } catch (error: any) {
      logger.error('Error getting datasource by ID:', error);
      throw new Error(`Failed to get datasource: ${error.message}`);
    }
  }

  // Find datasource by name
  async findByName(workspaceId: string, name: string): Promise<DataSource | null> {
    try {
      const result = await this.database.query(`
        SELECT * FROM datasources 
        WHERE workspace_id = $1 AND name = $2
      `, [workspaceId, name]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        connection_config: JSON.parse(row.connection_config || '{}'),
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}')
      };
    } catch (error: any) {
      logger.error('Error finding datasource by name:', error);
      throw new Error(`Failed to find datasource: ${error.message}`);
    }
  }

  // Update datasource
  async updateDataSource(
    id: string, 
    workspaceId: string, 
    updates: UpdateDataSourceRequest
  ): Promise<DataSource> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'connection_config' || key === 'tags') {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });

      updateFields.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(id, workspaceId);

      const result = await this.database.query(`
        UPDATE datasources 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex - 1} AND workspace_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        throw new Error('Datasource not found or update failed');
      }

      const row = result.rows[0];
      const datasource: DataSource = {
        ...row,
        connection_config: JSON.parse(row.connection_config || '{}'),
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}')
      };

      // Track update event
      await this.analyticsService.trackEvent({
        user_id: updates.updated_by || 'system',
        workspace_id: workspaceId,
        event_type: 'update',
        event_category: 'datasource',
        resource_id: id,
        resource_type: 'datasource',
        metadata: {
          updated_fields: Object.keys(updates)
        }
      });

      logger.info('DataSource updated successfully', { id, updates: Object.keys(updates) });
      return datasource;
    } catch (error: any) {
      logger.error('Error updating datasource:', error);
      throw new Error(`Failed to update datasource: ${error.message}`);
    }
  }

  // Delete datasource
  async deleteDataSource(id: string, workspaceId: string, deletedBy: string): Promise<void> {
    try {
      const result = await this.database.query(`
        DELETE FROM datasources 
        WHERE id = $1 AND workspace_id = $2
        RETURNING name, type
      `, [id, workspaceId]);

      if (result.rows.length === 0) {
        throw new Error('Datasource not found');
      }

      // Clear cache
      await this.cacheService.delete(`datasource:${id}`);
      await this.cacheService.delete(`datasource:schema:${id}`);

      // Track deletion event
      await this.analyticsService.trackEvent({
        user_id: deletedBy,
        workspace_id: workspaceId,
        event_type: 'delete',
        event_category: 'datasource',
        resource_id: id,
        resource_type: 'datasource',
        metadata: {
          datasource_name: result.rows[0].name,
          datasource_type: result.rows[0].type
        }
      });

      logger.info('DataSource deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting datasource:', error);
      throw new Error(`Failed to delete datasource: ${error.message}`);
    }
  }

  // Test connection
  async testConnection(type: string, connectionConfig: Record<string, any>): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();

      // This would integrate with the actual plugin system
      // For now, we'll simulate the connection test
      
      // Simulate connection time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      
      const connectionTime = Date.now() - startTime;
      const success = Math.random() > 0.1; // 90% success rate for demo

      const result: ConnectionTestResult = {
        success,
        message: success ? 'Connection successful' : 'Connection failed - Invalid credentials',
        connection_time_ms: connectionTime,
        timestamp: new Date(),
        server_info: success ? {
          version: '14.5',
          type: type,
          host: connectionConfig.host || 'localhost'
        } : undefined,
        error_details: success ? undefined : {
          error_code: 'AUTH_FAILED',
          error_message: 'Authentication failed'
        }
      };

      logger.info('Connection test completed', { type, success, connectionTime });
      return result;
    } catch (error: any) {
      logger.error('Error testing connection:', error);
      
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        connection_time_ms: 0,
        timestamp: new Date(),
        error_details: {
          error_code: 'TEST_FAILED',
          error_message: error.message
        }
      };
    }
  }

  // Update last tested timestamp
  async updateLastTested(id: string, workspaceId: string): Promise<void> {
    try {
      await this.database.query(`
        UPDATE datasources 
        SET last_tested_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND workspace_id = $2
      `, [id, workspaceId]);
    } catch (error: any) {
      logger.error('Error updating last tested timestamp:', error);
      // Don't throw error for this operation
    }
  }

  // Get usage statistics
  async getUsageStats(
    id: string,
    options: {
      period: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<UsageStats> {
    try {
      // This would query actual analytics data
      // For now, return structured empty stats
      
      const endDate = new Date(options.endDate || new Date());
      const startDate = new Date(options.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000));
      
      // Generate daily usage data for the period
      const dailyUsage = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dailyUsage.push({
          date: currentDate.toISOString().split('T')[0],
          queries: 0,
          unique_users: 0,
          avg_response_time: 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        datasource_id: id,
        period: options.period,
        total_queries: 0,
        unique_users: 0,
        avg_response_time_ms: 0,
        error_rate: 0,
        connected_datasets: 0,
        daily_usage: dailyUsage
      };
    } catch (error: any) {
      logger.error('Error getting usage stats:', error);
      throw new Error(`Failed to get usage statistics: ${error.message}`);
    }
  }

  // Get datasource dependencies
  async getDatasourceDependencies(id: string): Promise<DatasourceDependencies> {
    try {
      // Query for datasets using this datasource
      const datasetsResult = await this.database.query(`
        SELECT id, name, workspace_id 
        FROM datasets 
        WHERE datasource_id = $1
      `, [id]);

      const datasets = datasetsResult.rows;

      // For charts and dashboards, we'd need to query through dataset relationships
      // This is a simplified version
      const charts: any[] = [];
      const dashboards: any[] = [];

      return {
        datasets,
        charts,
        dashboards,
        total: datasets.length + charts.length + dashboards.length
      };
    } catch (error: any) {
      logger.error('Error getting datasource dependencies:', error);
      throw new Error(`Failed to get dependencies: ${error.message}`);
    }
  }

  // Get datasource schema
  async getSchema(id: string, refresh: boolean = false): Promise<DataSourceSchema> {
    try {
      const cacheKey = `datasource:schema:${id}`;
      
      // Check cache first (unless refresh requested)
      if (!refresh) {
        const cachedSchema = await this.cacheService.get(cacheKey);
        if (cachedSchema) {
          return JSON.parse(cachedSchema);
        }
      }

      // This would integrate with the actual plugin system to fetch schema
      // For now, return a structured empty schema
      const schema: DataSourceSchema = {
        datasource_id: id,
        schema_version: '1.0',
        last_updated: new Date(),
        databases: []
      };

      // Cache the schema for 1 hour
      await this.cacheService.set(cacheKey, JSON.stringify(schema), 3600);

      return schema;
    } catch (error: any) {
      logger.error('Error getting datasource schema:', error);
      throw new Error(`Failed to get schema: ${error.message}`);
    }
  }

  // Execute query
  async executeQuery(
    id: string, 
    query: string, 
    options: { limit: number; userId: string }
  ): Promise<QueryResult> {
    try {
      const queryId = uuidv4();
      const startTime = Date.now();

      // This would integrate with the actual plugin system to execute queries
      // For now, return a structured empty result
      
      const executionTime = Date.now() - startTime;
      
      const result: QueryResult = {
        columns: [],
        data: [],
        row_count: 0,
        execution_time_ms: executionTime,
        query_id: queryId,
        from_cache: false
      };

      // Track query execution
      await this.analyticsService.trackDatasetQuery(
        options.userId,
        'workspace-id', // This would come from context
        id,
        'custom_query',
        executionTime,
        0,
        { query_id: queryId }
      );

      // Update last used timestamp
      await this.database.query(`
        UPDATE datasources 
        SET last_used_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [id]);

      return result;
    } catch (error: any) {
      logger.error('Error executing query:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }
}