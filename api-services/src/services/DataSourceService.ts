// api-services/src/services/DataSourceService.ts
import { Database } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  workspace_id: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDataSourceRequest {
  name: string;
  type: string;
  workspace_id: string;
  connection_config: Record<string, any>;
  created_by: string;
}

export interface UpdateDataSourceRequest {
  name?: string;
  connection_config?: Record<string, any>;
  is_active?: boolean;
}

export interface DataSourceFilters {
  workspace_id: string;
  type?: string;
  status?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  connection_valid: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
  error_message?: string;
  tested_at: Date;
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

export interface QueryRequest {
  query: string;
  parameters?: Record<string, any>;
  limit: number;
  offset: number;
  user_id: string;
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

  constructor(database?: Database) {
    this.database = database || new Database();
  }

  // Create new datasource
  async createDataSource(data: CreateDataSourceRequest): Promise<DataSource> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.database.query(`
        INSERT INTO data_sources (
          id, workspace_id, name, type, connection_config, is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        id,
        data.workspace_id,
        data.name,
        data.type,
        JSON.stringify(data.connection_config),
        true,
        data.created_by,
        now,
        now
      ]);

      const datasource = result.rows[0];
      
      logger.info('DataSource created successfully', { id, name: data.name, type: data.type });
      
      return {
        ...datasource,
        connection_config: typeof datasource.connection_config === 'string' 
          ? JSON.parse(datasource.connection_config) 
          : datasource.connection_config
      };
    } catch (error: any) {
      logger.error('Error creating datasource:', error);
      throw error;
    }
  }

  // Get all datasources with filtering and pagination
  async getDataSources(
    filters: DataSourceFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<DataSource>> {
    try {
      let whereClause = 'WHERE workspace_id = $1';
      const params: any[] = [filters.workspace_id];
      let paramIndex = 2;

      // Add filters
      if (filters.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.status === 'active' || filters.status === 'inactive') {
        whereClause += ` AND is_active = $${paramIndex}`;
        params.push(filters.status === 'active');
        paramIndex++;
      }

      if (filters.search) {
        whereClause += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.database.query(`
        SELECT COUNT(*) as total FROM data_sources ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      const offset = (pagination.page - 1) * pagination.limit;
      const dataResult = await this.database.query(`
        SELECT id, workspace_id, name, type, connection_config, is_active, created_by, created_at, updated_at
        FROM data_sources 
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, pagination.limit, offset]);

      const datasources: DataSource[] = dataResult.rows.map(row => ({
        ...row,
        connection_config: typeof row.connection_config === 'string' 
          ? JSON.parse(row.connection_config) 
          : row.connection_config
      }));

      return {
        data: datasources,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error: any) {
      logger.error('Error getting datasources:', error);
      throw error;
    }
  }

  // Get datasource by ID
  async getDataSourceById(id: string, workspaceId: string): Promise<DataSource | null> {
    try {
      const result = await this.database.query(`
        SELECT id, workspace_id, name, type, connection_config, is_active, created_by, created_at, updated_at
        FROM data_sources 
        WHERE id = $1 AND workspace_id = $2
      `, [id, workspaceId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        connection_config: typeof row.connection_config === 'string' 
          ? JSON.parse(row.connection_config) 
          : row.connection_config
      };
    } catch (error: any) {
      logger.error('Error getting datasource by ID:', error);
      throw error;
    }
  }

  // Find datasource by name
  async findByName(workspaceId: string, name: string): Promise<DataSource | null> {
    try {
      const result = await this.database.query(`
        SELECT id, workspace_id, name, type, connection_config, is_active, created_by, created_at, updated_at
        FROM data_sources 
        WHERE workspace_id = $1 AND name = $2
      `, [workspaceId, name]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        connection_config: typeof row.connection_config === 'string' 
          ? JSON.parse(row.connection_config) 
          : row.connection_config
      };
    } catch (error: any) {
      logger.error('Error finding datasource by name:', error);
      throw error;
    }
  }

  // Update datasource
  async updateDataSource(
    id: string,
    workspaceId: string,
    updates: UpdateDataSourceRequest
  ): Promise<DataSource | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'connection_config') {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      // Add WHERE clause parameters
      params.push(id, workspaceId);

      const result = await this.database.query(`
        UPDATE data_sources 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex - 1} AND workspace_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        connection_config: typeof row.connection_config === 'string' 
          ? JSON.parse(row.connection_config) 
          : row.connection_config
      };
    } catch (error: any) {
      logger.error('Error updating datasource:', error);
      throw error;
    }
  }

  // Delete datasource
  async deleteDataSource(id: string, workspaceId: string): Promise<void> {
    try {
      const result = await this.database.query(`
        DELETE FROM data_sources 
        WHERE id = $1 AND workspace_id = $2
      `, [id, workspaceId]);

      if (result.rowCount === 0) {
        throw new Error('Datasource not found or already deleted');
      }

      logger.info('DataSource deleted successfully', { id, workspaceId });
    } catch (error: any) {
      logger.error('Error deleting datasource:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(type: string, connectionConfig: Record<string, any>): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      
      // This would implement actual connection testing based on the datasource type
      // For now, return a simple validation that the required fields are present
      const requiredFields = this.getRequiredFieldsForType(type);
      const missingFields = requiredFields.filter(field => !connectionConfig[field]);
      
      if (missingFields.length > 0) {
        return {
          success: false,
          connection_valid: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error_code: 'MISSING_REQUIRED_FIELDS',
          error_message: `Missing required fields: ${missingFields.join(', ')}`,
          tested_at: new Date()
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        connection_valid: true,
        message: `Connection configuration validated for ${type}`,
        response_time: responseTime,
        tested_at: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        connection_valid: false,
        message: `Connection failed: ${error.message}`,
        error_code: error.code || 'CONNECTION_ERROR',
        error_message: error.message,
        tested_at: new Date()
      };
    }
  }

  // Update last tested timestamp (placeholder for future use)
  async updateLastTested(id: string, workspaceId: string): Promise<void> {
    try {
      // The current schema doesn't have a last_tested_at column
      // This is a placeholder for when that column is added
      logger.info('Last tested timestamp would be updated', { id, workspaceId });
    } catch (error: any) {
      logger.error('Error updating last tested:', error);
    }
  }

  // Get usage statistics from actual database
  async getUsageStats(id: string, workspaceId: string, period: string): Promise<UsageStats> {
    try {
      // Query datasets using this datasource
      const datasetResult = await this.database.query(`
        SELECT COUNT(*) as count
        FROM datasets 
        WHERE $1 = ANY(datasource_ids) AND workspace_id = $2
      `, [id, workspaceId]);

      const connected_datasets = parseInt(datasetResult.rows[0]?.count || '0');

      // For now, return stats with database-derived data where possible
      return {
        datasource_id: id,
        period,
        total_queries: 0, // Would need audit log table
        unique_users: 0, // Would need audit log table  
        avg_response_time_ms: 0, // Would need query performance table
        error_rate: 0, // Would need error log table
        connected_datasets
      };
    } catch (error: any) {
      logger.error('Error getting usage stats:', error);
      throw error;
    }
  }

  // Get datasource schema (placeholder - would implement actual schema introspection)
  async getSchema(id: string, workspaceId: string, forceRefresh: boolean = false): Promise<DataSourceSchema> {
    try {
      // This would implement actual schema introspection based on datasource type
      return {
        datasource_id: id,
        schema_version: '1.0',
        last_updated: new Date(),
        databases: [] // Would be populated by actual schema introspection
      };
    } catch (error: any) {
      logger.error('Error getting schema:', error);
      throw error;
    }
  }

  // Execute query (placeholder - would implement actual query execution)
  async executeQuery(id: string, workspaceId: string, request: QueryRequest): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      const queryId = uuidv4();

      // This would implement actual query execution against the datasource
      const result: QueryResult = {
        columns: [],
        data: [],
        row_count: 0,
        execution_time_ms: Date.now() - startTime,
        query_id: queryId,
        from_cache: false
      };

      return result;
    } catch (error: any) {
      logger.error('Error executing query:', error);
      throw error;
    }
  }

  // Get datasource dependencies
  async getDependencies(id: string, workspaceId: string): Promise<DatasourceDependencies> {
    try {
      // Query actual dependencies from database
      const datasetResult = await this.database.query(`
        SELECT id, name, workspace_id
        FROM datasets 
        WHERE $1 = ANY(datasource_ids) AND workspace_id = $2
      `, [id, workspaceId]);

      const datasets = datasetResult.rows;

      // For charts and dashboards, would need to trace through dataset relationships
      const chartsResult = await this.database.query(`
        SELECT c.id, c.name, c.dashboard_id
        FROM charts c
        INNER JOIN datasets d ON c.dataset_id = d.id
        WHERE $1 = ANY(d.datasource_ids) AND d.workspace_id = $2
      `, [id, workspaceId]);

      const charts = chartsResult.rows;

      const dashboardsResult = await this.database.query(`
        SELECT DISTINCT db.id, db.name
        FROM dashboards db
        INNER JOIN charts c ON c.dashboard_id = db.id
        INNER JOIN datasets d ON c.dataset_id = d.id
        WHERE $1 = ANY(d.datasource_ids) AND d.workspace_id = $2
      `, [id, workspaceId]);

      const dashboards = dashboardsResult.rows;

      return {
        datasets,
        charts,
        dashboards,
        total: datasets.length + charts.length + dashboards.length
      };
    } catch (error: any) {
      logger.error('Error getting dependencies:', error);
      throw error;
    }
  }

  // Helper method to get required fields for datasource types
  private getRequiredFieldsForType(type: string): string[] {
    const fieldMap: Record<string, string[]> = {
      postgres: ['host', 'port', 'database', 'username', 'password'],
      mysql: ['host', 'port', 'database', 'username', 'password'],
      mariadb: ['host', 'port', 'database', 'username', 'password'],
      sqlite: ['database'],
      mongodb: ['host', 'port', 'database'],
      redis: ['host', 'port'],
      elasticsearch: ['host', 'port'],
    };

    return fieldMap[type] || ['host'];
  }
}