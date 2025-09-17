// api-services/src/controllers/DatasetController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../utils/database';
import { asyncHandler } from '../middleware/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface Dataset {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'source' | 'virtual' | 'sql' | 'transformation';
  schema_json?: any;
  workspace_id: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  row_count?: number;
  is_active: boolean;
}

export class DatasetController {
  constructor() {
    logger.info('🔧 DatasetController: Starting initialization...');
    
    // ✅ Validate database connection
    if (!db) {
      const error = new Error('DatasetController: Database connection is required but was null/undefined');
      logger.error('❌ DatasetController constructor error:', error.message);
      throw error;
    }
    
    if (typeof db.query !== 'function') {
      const error = new Error(`DatasetController: Invalid database connection - query method is ${typeof db.query}, expected function`);
      logger.error('❌ DatasetController constructor error:', {
        message: error.message,
        databaseType: typeof db,
        hasQuery: typeof db.query,
        constructorName: db.constructor?.name
      });
      throw error;
    }

    logger.info('✅ DatasetController: Database connection validated');
    logger.info('✅ DatasetController: Initialization complete');
  }

  /**
   * GET /api/datasets
   * Get all datasets with filtering and pagination
   */
  async getDatasets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('📊 DatasetController: Getting datasets', {
        user_id: req.user?.user_id,
        workspace_id: req.headers['x-workspace-id'],
        query: req.query
      });

      const {
        workspace_id,
        page = 1,
        limit = 10,
        search,
        type,
        sort_by = 'updated_at',
        sort_direction = 'desc',
        include_schema = false,
        created_by,
        datasource_id
      } = req.query;

      // Validate workspace_id
      if (!workspace_id) {
        return res.status(400).json({
          success: false,
          message: 'workspace_id is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'workspace_id parameter is required' }]
        });
      }

      // Build query
      let query = `
        SELECT 
          d.id,
          d.name,
          d.display_name,
          d.description,
          d.type,
          d.workspace_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.is_active,
          u.username as owner_name,
          u.email as owner_email
          ${include_schema === 'true' ? ', d.schema_json' : ''}
        FROM datasets d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.workspace_id = $1 AND d.is_active = true
      `;

      const queryParams: any[] = [workspace_id];
      let paramCount = 1;

      // Add filters
      if (search) {
        paramCount++;
        query += ` AND (d.name ILIKE $${paramCount} OR d.display_name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (type) {
        paramCount++;
        query += ` AND d.type = $${paramCount}`;
        queryParams.push(type);
      }

      if (created_by) {
        paramCount++;
        query += ` AND d.created_by = $${paramCount}`;
        queryParams.push(created_by);
      }

      if (datasource_id) {
        paramCount++;
        query += ` AND d.id IN (
          SELECT dataset_id FROM dataset_datasources 
          WHERE datasource_id = $${paramCount}
        )`;
        queryParams.push(datasource_id);
      }

      // Add sorting
      const validSortColumns = ['name', 'display_name', 'type', 'created_at', 'updated_at', 'row_count'];
      const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'updated_at';
      const sortDir = sort_direction === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY d.${sortColumn} ${sortDir}`;

      // Add pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
      const offset = (pageNum - 1) * limitNum;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limitNum);

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);

      // Execute query
      const result = await db.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM datasets d
        WHERE d.workspace_id = $1 AND d.is_active = true
        ${search ? `AND (d.name ILIKE '%${search}%' OR d.display_name ILIKE '%${search}%' OR d.description ILIKE '%${search}%')` : ''}
        ${type ? `AND d.type = '${type}'` : ''}
        ${created_by ? `AND d.created_by = '${created_by}'` : ''}
      `;
      const countResult = await db.query(countQuery, [workspace_id]);
      const totalCount = parseInt(countResult.rows[0].total);

      // Format response
      const datasets = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description,
        type: row.type,
        workspace_id: row.workspace_id,
        owner: {
          id: row.created_by,
          name: row.owner_name,
          email: row.owner_email
        },
        created_at: row.created_at,
        updated_at: row.updated_at,
        row_count: row.row_count,
        is_active: row.is_active,
        schema_json: include_schema === 'true' ? row.schema_json : undefined
      }));

      res.json({
        success: true,
        data: {
          datasets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            total_pages: Math.ceil(totalCount / limitNum),
            has_next: pageNum < Math.ceil(totalCount / limitNum),
            has_previous: pageNum > 1
          }
        }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error getting datasets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get datasets',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * GET /api/datasets/:id
   * Get a single dataset by ID
   */
  async getDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { include_schema = false } = req.query;

      const query = `
        SELECT 
          d.*,
          u.name as owner_name,
          u.email as owner_email
        FROM datasets d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = $1 AND d.is_active = true
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      const dataset = result.rows[0];

      res.json({
        success: true,
        data: {
          id: dataset.id,
          name: dataset.name,
          display_name: dataset.display_name,
          description: dataset.description,
          type: dataset.type,
          workspace_id: dataset.workspace_id,
          owner: {
            id: dataset.created_by,
            name: dataset.owner_name,
            email: dataset.owner_email
          },
          created_at: dataset.created_at,
          updated_at: dataset.updated_at,
          row_count: dataset.row_count,
          is_active: dataset.is_active,
          schema_json: include_schema === 'true' ? dataset.schema_json : undefined
        }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error getting dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * POST /api/datasets
   * Create a new dataset
   */
  async createDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        display_name,
        description,
        type = 'source',
        workspace_id,
        schema_json
      } = req.body;

      const user_id = req.user?.user_id;

      // Validate required fields
      if (!name || !display_name || !workspace_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'name, display_name, and workspace_id are required' }]
        });
      }

      const query = `
        INSERT INTO datasets (
          name, 
          display_name, 
          description, 
          type, 
          workspace_id, 
          created_by, 
          schema_json,
          created_at,
          updated_at,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true)
        RETURNING *
      `;

      const result = await db.query(query, [
        name,
        display_name,
        description,
        type,
        workspace_id,
        user_id,
        schema_json || null
      ]);

      const dataset = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Dataset created successfully',
        data: dataset
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error creating dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * PUT /api/datasets/:id
   * Update an existing dataset
   */
  async updateDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        display_name,
        description,
        type,
        schema_json,
        is_active
      } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (name !== undefined) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        values.push(name);
      }

      if (display_name !== undefined) {
        paramCount++;
        updates.push(`display_name = $${paramCount}`);
        values.push(display_name);
      }

      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        values.push(description);
      }

      if (type !== undefined) {
        paramCount++;
        updates.push(`type = $${paramCount}`);
        values.push(type);
      }

      if (schema_json !== undefined) {
        paramCount++;
        updates.push(`schema_json = $${paramCount}`);
        values.push(schema_json);
      }

      if (is_active !== undefined) {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update',
          errors: [{ code: 'VALIDATION_ERROR', message: 'At least one field must be provided for update' }]
        });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE datasets 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      res.json({
        success: true,
        message: 'Dataset updated successfully',
        data: result.rows[0]
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error updating dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * DELETE /api/datasets/:id
   * Delete a dataset (soft delete)
   */
  async deleteDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        UPDATE datasets 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING id, name
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      res.json({
        success: true,
        message: 'Dataset deleted successfully',
        data: { id: result.rows[0].id, name: result.rows[0].name }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error deleting dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }
}