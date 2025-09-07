// api-services/src/services/DataSourceService.ts - FIXED VERSION
import { Pool } from 'pg'; // ✅ Import Pool type, not Database
import { db } from '../utils/database'; // ✅ Import the db instance
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
  private database: Pool; // ✅ Use Pool type, not Database

  constructor(database?: Pool) { // ✅ Accept Pool instance
    // ✅ Use the imported db instance instead of new Database()
    this.database = database || db;
    
    // ✅ Validate the database connection
    if (!this.database) {
      throw new Error('Database connection is required for DataSourceService');
    }
    
    if (typeof this.database.query !== 'function') {
      throw new Error('Invalid database connection - missing query method');
    }
    
    logger.info('DataSourceService initialized with database connection', {
      service: 'bi-platform-api',
      hasDatabase: !!this.database,
      hasQuery: typeof this.database.query === 'function'
    });
  }

  // Create new datasource
  async createDataSource(data: CreateDataSourceRequest): Promise<DataSource> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.database.query(`
        INSERT INTO datasources (
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
      logger.error('Failed to create datasource', { 
        error: error.message, 
        data: { ...data, connection_config: '[REDACTED]' } 
      });
      throw new Error(`Failed to create datasource: ${error.message}`);
    }
  }

  // Get datasource by ID
  async getDataSource(id: string, workspace_id: string): Promise<DataSource | null> {
    try {
      const result = await this.database.query(`
        SELECT * FROM datasources 
        WHERE id = $1 AND workspace_id = $2 AND is_active = true
      `, [id, workspace_id]);

      if (result.rows.length === 0) {
        return null;
      }

      const datasource = result.rows[0];
      return {
        ...datasource,
        connection_config: typeof datasource.connection_config === 'string' 
          ? JSON.parse(datasource.connection_config)
          : datasource.connection_config
      };
    } catch (error: any) {
      logger.error('Failed to get datasource', { error: error.message, id, workspace_id });
      throw new Error(`Failed to get datasource: ${error.message}`);
    }
  }

  // Get all datasources for workspace
  async getDataSources(filters: DataSourceFilters, pagination?: PaginationOptions): Promise<PaginatedResult<DataSource>> {
    try {
      let query = `
        SELECT * FROM datasources 
        WHERE workspace_id = $1 AND is_active = true
      `;
      let countQuery = `
        SELECT COUNT(*) FROM datasources 
        WHERE workspace_id = $1 AND is_active = true
      `;
      
      const params: any[] = [filters.workspace_id];
      let paramIndex = 2;

      // Add filters
      if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        countQuery += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        countQuery += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Add pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(pagination.limit, offset);
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        this.database.query(query, params),
        this.database.query(countQuery, params.slice(0, paramIndex - (pagination ? 2 : 0)))
      ]);

      const datasources = dataResult.rows.map(row => ({
        ...row,
        connection_config: typeof row.connection_config === 'string' 
          ? JSON.parse(row.connection_config)
          : row.connection_config
      }));

      const total = parseInt(countResult.rows[0].count);

      if (pagination) {
        return {
          data: datasources,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages: Math.ceil(total / pagination.limit)
          }
        };
      }

      return {
        data: datasources,
        pagination: {
          page: 1,
          limit: total,
          total,
          pages: 1
        }
      };
    } catch (error: any) {
      logger.error('Failed to get datasources', { error: error.message, filters });
      throw new Error(`Failed to get datasources: ${error.message}`);
    }
  }

  // Test connection
  async testConnection(type: string, connection_config: Record<string, any>): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Mock test result - in real implementation, you'd test the actual connection
      // based on the datasource type
      const testResult: ConnectionTestResult = {
        success: true,
        connection_valid: true,
        message: `Successfully connected to ${type} datasource`,
        response_time: Date.now() - startTime,
        tested_at: new Date()
      };

      logger.info('Connection test completed', { type, success: testResult.success });
      return testResult;
      
    } catch (error: any) {
      logger.error('Connection test failed', { error: error.message, type });
      
      return {
        success: false,
        connection_valid: false,
        message: 'Connection test failed',
        error_message: error.message,
        error_code: error.code || 'UNKNOWN_ERROR',
        response_time: Date.now() - startTime,
        tested_at: new Date()
      };
    }
  }

  // Update datasource
  async updateDataSource(id: string, workspace_id: string, data: UpdateDataSourceRequest): Promise<DataSource | null> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }

      if (data.connection_config !== undefined) {
        updates.push(`connection_config = $${paramIndex++}`);
        params.push(JSON.stringify(data.connection_config));
      }

      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE datasources 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex++}
        RETURNING *
      `;
      
      params.push(id, workspace_id);

      const result = await this.database.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const datasource = result.rows[0];
      logger.info('DataSource updated successfully', { id, workspace_id });

      return {
        ...datasource,
        connection_config: typeof datasource.connection_config === 'string' 
          ? JSON.parse(datasource.connection_config)
          : datasource.connection_config
      };
    } catch (error: any) {
      logger.error('Failed to update datasource', { error: error.message, id, workspace_id });
      throw new Error(`Failed to update datasource: ${error.message}`);
    }
  }

  // Delete datasource (soft delete)
  async deleteDataSource(id: string, workspace_id: string): Promise<boolean> {
    try {
      const result = await this.database.query(`
        UPDATE datasources 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
      `, [id, workspace_id]);

      const success = result.rowCount > 0;
      
      if (success) {
        logger.info('DataSource deleted successfully', { id, workspace_id });
      } else {
        logger.warn('DataSource not found for deletion', { id, workspace_id });
      }

      return success;
    } catch (error: any) {
      logger.error('Failed to delete datasource', { error: error.message, id, workspace_id });
      throw new Error(`Failed to delete datasource: ${error.message}`);
    }
  }
}