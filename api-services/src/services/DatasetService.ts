import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { PermissionService } from './PermissionService';
import { AuditService } from './AuditService';
import { TransformationEngine } from './TransformationEngine';

interface CreateDatasetRequest {
  name: string;
  description?: string;
  data_source_plugin: string;
  connection_config: any;
  query: string;
  refresh_schedule?: string;
  tags?: string[];
}

interface Dataset {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  data_source_plugin: string;
  connection_config: any;
  query: string;
  refresh_schedule?: string;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_refreshed_at?: Date;
  is_active: boolean;
  schema?: any;
  row_count?: number;
}

interface DatasetData {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  data: any[];
  metadata: {
    totalRows: number;
    executionTime: number;
    lastUpdated: Date;
    cacheHit: boolean;
  };
}

class DatasetService {
  private permissionService: PermissionService;
  private auditService: AuditService;
  private transformationEngine: TransformationEngine;
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor() {
    this.permissionService = new PermissionService();
    this.auditService = new AuditService();
    this.transformationEngine = new TransformationEngine();
  }

  async createDataset(userId: string, workspaceId: string, data: CreateDatasetRequest): Promise<Dataset> {
    try {
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(userId, workspaceId, 'dataset.create');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create dataset');
      }

      const datasetId = uuidv4();
      
      const query = `
        INSERT INTO datasets (
          id, name, description, workspace_id, data_source_plugin, 
          connection_config, query, refresh_schedule, tags, 
          created_by, created_at, updated_at, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), true
        ) RETURNING *
      `;
      
      const values = [
        datasetId,
        data.name,
        data.description,
        workspaceId,
        data.data_source_plugin,
        JSON.stringify(data.connection_config),
        data.query,
        data.refresh_schedule,
        data.tags || [],
        userId
      ];

      const result = await db.query(query, values);
      const dataset = result.rows[0];

      // Grant the creator full access to the dataset
      await this.permissionService.grantDatasetPermission(userId, datasetId, 'read');
      await this.permissionService.grantDatasetPermission(userId, datasetId, 'write');
      await this.permissionService.grantDatasetPermission(userId, datasetId, 'delete');

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dataset.created',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: datasetId,
        details: { dataset_name: data.name }
      });

      // Initial data refresh
      try {
        await this.refreshDataset(userId, workspaceId, datasetId);
      } catch (error) {
        logger.warn('Initial dataset refresh failed:', error);
      }

      return dataset;
    } catch (error) {
      logger.error('Create dataset error:', error);
      throw error;
    }
  }

  async getDatasets(userId: string, workspaceId: string, filters?: any): Promise<Dataset[]> {
    try {
      let query = `
        SELECT d.*, u.display_name as created_by_name
        FROM datasets d
        INNER JOIN users u ON d.created_by = u.id
        WHERE d.workspace_id = $1 AND d.is_active = true
      `;
      const params = [workspaceId];
      let paramIndex = 2;

      // Add filters
      if (filters?.search) {
        query += ` AND (d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.tags && filters.tags.length > 0) {
        query += ` AND d.tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }

      if (filters?.data_source_plugin) {
        query += ` AND d.data_source_plugin = $${paramIndex}`;
        params.push(filters.data_source_plugin);
        paramIndex++;
      }

      query += ' ORDER BY d.updated_at DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await db.query(query, params);
      
      // Filter datasets based on permissions
      const accessibleDatasets = [];
      for (const dataset of result.rows) {
        const hasAccess = await this.permissionService.hasDatasetAccess(
          userId, workspaceId, dataset.id, 'read'
        );
        if (hasAccess) {
          accessibleDatasets.push(dataset);
        }
      }

      return accessibleDatasets;
    } catch (error) {
      logger.error('Get datasets error:', error);
      throw error;
    }
  }

  async getDataset(userId: string, workspaceId: string, datasetId: string): Promise<Dataset | null> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDatasetAccess(
        userId, workspaceId, datasetId, 'read'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to access dataset');
      }

      const query = `
        SELECT d.*, u.display_name as created_by_name
        FROM datasets d
        INNER JOIN users u ON d.created_by = u.id
        WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true
      `;
      
      const result = await db.query(query, [datasetId, workspaceId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Get dataset error:', error);
      throw error;
    }
  }

  async updateDataset(userId: string, workspaceId: string, datasetId: string, updates: Partial<CreateDatasetRequest>): Promise<Dataset> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDatasetAccess(
        userId, workspaceId, datasetId, 'write'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to update dataset');
      }

      const allowedFields = ['name', 'description', 'connection_config', 'query', 'refresh_schedule', 'tags'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(key === 'connection_config' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE datasets 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND is_active = true
        RETURNING *
      `;

      values.push(datasetId, workspaceId);

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Dataset not found');
      }

      // Clear cache if query or connection changed
      if (updates.query || updates.connection_config) {
        await this.clearDatasetCache(datasetId);
      }

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dataset.updated',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: datasetId,
        details: { updated_fields: Object.keys(updates) }
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Update dataset error:', error);
      throw error;
    }
  }

  async deleteDataset(userId: string, workspaceId: string, datasetId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDatasetAccess(
        userId, workspaceId, datasetId, 'delete'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to delete dataset');
      }

      // Check if dataset is used by any charts
      const chartQuery = `
        SELECT COUNT(*) as count 
        FROM charts 
        WHERE dataset_ids @> $1 AND workspace_id = $2 AND is_active = true
      `;
      
      const chartResult = await db.query(chartQuery, [JSON.stringify([datasetId]), workspaceId]);
      
      if (parseInt(chartResult.rows[0].count) > 0) {
        throw new Error('Cannot delete dataset: it is being used by one or more charts');
      }

      // Soft delete
      const query = `
        UPDATE datasets 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
      `;
      
      await db.query(query, [datasetId, workspaceId]);

      // Clear cache
      await this.clearDatasetCache(datasetId);

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dataset.deleted',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: datasetId,
        details: { deletion_type: 'soft' }
      });
    } catch (error) {
      logger.error('Delete dataset error:', error);
      throw error;
    }
  }

  async getDatasetData(userId: string, workspaceId: string, datasetId: string, options?: {
    limit?: number;
    offset?: number;
    filters?: any;
  }): Promise<DatasetData> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDatasetAccess(
        userId, workspaceId, datasetId, 'read'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to access dataset data');
      }

      const cacheKey = `dataset_data:${datasetId}:${JSON.stringify(options)}`;
      const startTime = Date.now();

      // Try cache first
      const cached = await cache.get<DatasetData>(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
            executionTime: Date.now() - startTime
          }
        };
      }

      // Get dataset
      const dataset = await this.getDataset(userId, workspaceId, datasetId);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Execute query using transformation engine
      const result = await this.transformationEngine.executeDatasetQuery(dataset, options);

      const datasetData: DatasetData = {
        columns: result.columns,
        data: result.data,
        metadata: {
          totalRows: result.totalRows,
          executionTime: Date.now() - startTime,
          lastUpdated: new Date(),
          cacheHit: false
        }
      };

      // Cache the result
      await cache.set(cacheKey, datasetData, this.CACHE_TTL);

      // Update dataset statistics
      await this.updateDatasetStats(datasetId, result.totalRows);

      return datasetData;
    } catch (error) {
      logger.error('Get dataset data error:', error);
      throw error;
    }
  }

  async refreshDataset(userId: string, workspaceId: string, datasetId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDatasetAccess(
        userId, workspaceId, datasetId, 'read'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to refresh dataset');
      }

      // Clear cache
      await this.clearDatasetCache(datasetId);

      // Update last refreshed timestamp
      await db.query(
        'UPDATE datasets SET last_refreshed_at = NOW() WHERE id = $1',
        [datasetId]
      );

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dataset.refreshed',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: datasetId,
        details: { refresh_time: new Date() }
      });
    } catch (error) {
      logger.error('Refresh dataset error:', error);
      throw error;
    }
  }

  private async clearDatasetCache(datasetId: string): Promise<void> {
    try {
      // Note: In production, you'd want to use a pattern-based cache clearing
      // For now, we'll just clear known cache keys
      const patterns = [
        `dataset_data:${datasetId}:*`,
        `dataset:${datasetId}:*`
      ];
      
      // This would need proper implementation based on Redis capabilities
      await cache.del(`dataset:${datasetId}`);
    } catch (error) {
      logger.error('Clear dataset cache error:', error);
    }
  }

  private async updateDatasetStats(datasetId: string, rowCount: number): Promise<void> {
    try {
      await db.query(
        'UPDATE datasets SET row_count = $1 WHERE id = $2',
        [rowCount, datasetId]
      );
    } catch (error) {
      logger.error('Update dataset stats error:', error);
    }
  }
}

export { DatasetService };