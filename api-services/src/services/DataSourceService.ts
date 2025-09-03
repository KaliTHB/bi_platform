// api-services/src/services/DataSourceService.ts
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
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

export class DataSourceService extends DatabaseService {
  constructor() {
    super(); // Inherit from DatabaseService
  }

  async getDataSources(workspaceId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    tags?: string[];
  } = {}): Promise<{
    datasources: DataSource[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        type,
        status,
        tags
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE workspace_id = $1';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (tags && tags.length > 0) {
        whereClause += ` AND tags && $${paramIndex}`;
        params.push(JSON.stringify(tags));
        paramIndex++;
      }

      const query = `
        SELECT id, name, description, type, workspace_id, connection_config, 
               status, tags, metadata, created_by, updated_by, 
               created_at, updated_at, last_tested_at, last_used_at
        FROM datasources
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await this.query(query, params);

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM datasources ${whereClause}`;
      const countResult = await this.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        datasources: result.rows,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get datasources error:', error);
      throw error;
    }
  }

  async getDataSource(id: string, workspaceId: string): Promise<DataSource | null> {
    try {
      const result = await this.query(
        'SELECT * FROM datasources WHERE id = $1 AND workspace_id = $2',
        [id, workspaceId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get datasource error:', error);
      throw error;
    }
  }

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

      await this.query(`
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

      logger.info('DataSource created successfully', { 
        id, 
        name: data.name, 
        type: data.type,
        workspace_id: data.workspace_id 
      });

      return datasource;
    } catch (error) {
      logger.error('Create datasource error:', error);
      throw error;
    }
  }

  async updateDataSource(
    id: string, 
    workspaceId: string, 
    updates: UpdateDataSourceRequest
  ): Promise<DataSource> {
    try {
      const setClause: string[] = [];
      const values: any[] = [id, workspaceId];
      let paramIndex = 3;

      const updatableFields = ['name', 'description', 'connection_config', 'tags', 'status', 'updated_by'];
      
      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          const value = ['connection_config', 'tags'].includes(field) 
            ? JSON.stringify(updates[field]) 
            : updates[field];
          values.push(value);
        }
      });

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.query(`
        UPDATE datasources
        SET ${setClause.join(', ')}
        WHERE id = $1 AND workspace_id = $2
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new NotFoundError('DataSource not found');
      }

      logger.info('DataSource updated successfully', { id, workspaceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Update datasource error:', error);
      throw error;
    }
  }

  async deleteDataSource(id: string, workspaceId: string): Promise<void> {
    try {
      const result = await this.query(
        'DELETE FROM datasources WHERE id = $1 AND workspace_id = $2',
        [id, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('DataSource not found');
      }

      logger.info('DataSource deleted successfully', { id, workspaceId });
    } catch (error) {
      logger.error('Delete datasource error:', error);
      throw error;
    }
  }

  async testConnection(type: string, config: Record<string, any>): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // This is a mock implementation - replace with actual connection testing logic
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate connection time
      
      const connectionTime = Date.now() - startTime;
      
      // Mock successful connection
      const result: ConnectionTestResult = {
        success: true,
        message: 'Connection test successful',
        connection_time_ms: connectionTime,
        timestamp: new Date(),
        server_info: {
          type: type,
          host: config.host || 'localhost',
          version: '1.0.0'
        }
      };

      logger.info('Connection test successful', { type, host: config.host, connectionTime });
      return result;
    } catch (error: any) {
      const connectionTime = Date.now() - startTime;
      
      const result: ConnectionTestResult = {
        success: false,
        message: error.message || 'Connection test failed',
        connection_time_ms: connectionTime,
        timestamp: new Date(),
        error_details: {
          error: error.message,
          code: error.code
        }
      };

      logger.error('Connection test failed', { type, host: config.host, error: error.message });
      return result;
    }
  }

  async updateLastUsed(id: string): Promise<void> {
    try {
      await this.query(
        'UPDATE datasources SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error('Update last used error:', error);
      // Don't throw - this is not critical
    }
  }

  async getDatasourceTypes(): Promise<string[]> {
    try {
      const result = await this.query(
        'SELECT DISTINCT type FROM datasources ORDER BY type'
      );
      
      return result.rows.map(row => row.type);
    } catch (error) {
      logger.error('Get datasource types error:', error);
      throw error;
    }
  }
}