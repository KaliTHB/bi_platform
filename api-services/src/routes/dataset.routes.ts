// api-services/src/routes/dataset.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { requireWorkspaceRole, checkDatasetAccess } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import { QueryExecutionService } from '../services/QueryExecutionService';
import { DatasetService } from '../services/DatasetService';
import { User, Workspace } from '../types/auth.types';

interface AuthenticatedRequest extends express.Request {
  user?: User;
  workspace?: Workspace;
}

const router = express.Router();

// Get all datasets in workspace
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspaceId = req.workspace!.id;
  const { type, search, page = '1', limit = '20' } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions: string[] = ['d.workspace_id = $1', 'd.is_active = true'];
  const values: any[] = [workspaceId];
  let paramIndex = 2;

  if (type) {
    conditions.push(`d.type = $${paramIndex++}`);
    values.push(type);
  }

  if (search) {
    conditions.push(`(d.name ILIKE $${paramIndex++} OR d.description ILIKE $${paramIndex})`);
    values.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  // Get datasets with permissions check
  const result = await DatabaseConfig.query(
    `SELECT d.*, ds.name as data_source_name, ds.type as data_source_type,
            u.first_name || ' ' || u.last_name as created_by_name,
            pd.name as parent_name,
            COUNT(DISTINCT c.id) as chart_count,
            CASE WHEN dp.dataset_id IS NOT NULL THEN true ELSE false END as has_access
     FROM datasets d
     LEFT JOIN data_sources ds ON d.data_source_id = ds.id
     LEFT JOIN users u ON d.created_by = u.id
     LEFT JOIN datasets pd ON d.parent_dataset_id = pd.id
     LEFT JOIN charts c ON d.id = c.dataset_id AND c.is_active = true
     LEFT JOIN dataset_permissions dp ON d.id = dp.dataset_id
     LEFT JOIN user_workspace_roles uwr ON dp.role_id = uwr.role_id AND uwr.user_id = $${paramIndex++}
     WHERE ${conditions.join(' AND ')}
     GROUP BY d.id, ds.name, ds.type, u.first_name, u.last_name, pd.name, dp.dataset_id
     ORDER BY d.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, req.user!.id, parseInt(limit as string), offset]
  );

  // Get total count
  const countResult = await DatabaseConfig.query(
    `SELECT COUNT(*) as total FROM datasets d WHERE ${conditions.join(' AND ')}`,
    values
  );

  res.json({
    datasets: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      data_source: row.data_source_id ? {
        id: row.data_source_id,
        name: row.data_source_name,
        type: row.data_source_type
      } : null,
      parent_dataset: row.parent_dataset_id ? {
        id: row.parent_dataset_id,
        name: row.parent_name
      } : null,
      schema_config: row.schema_config,
      cache_ttl: row.cache_ttl,
      chart_count: parseInt(row.chart_count),
      has_access: row.has_access || req.user!.role === 'SUPER_ADMIN',
      created_by: row.created_by_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    })),
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: parseInt(countResult.rows[0].total),
      pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
    }
  });
}));

// Get specific dataset
router.get('/:datasetId', 
  checkDatasetAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;

    const result = await DatabaseConfig.query(
      `SELECT d.*, ds.name as data_source_name, ds.type as data_source_type,
              ds.connection_config,
              u.first_name || ' ' || u.last_name as created_by_name,
              pd.name as parent_name
       FROM datasets d
       LEFT JOIN data_sources ds ON d.data_source_id = ds.id
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN datasets pd ON d.parent_dataset_id = pd.id
       WHERE d.id = $1 AND d.is_active = true`,
      [datasetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const dataset = result.rows[0];

    // Get dataset permissions
    const permissionsResult = await DatabaseConfig.query(
      `SELECT r.name as role_name, dp.permission_type
       FROM dataset_permissions dp
       JOIN roles r ON dp.role_id = r.id
       WHERE dp.dataset_id = $1`,
      [datasetId]
    );

    res.json({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        type: dataset.type,
        data_source: dataset.data_source_id ? {
          id: dataset.data_source_id,
          name: dataset.data_source_name,
          type: dataset.data_source_type,
          connection_config: dataset.connection_config
        } : null,
        parent_dataset: dataset.parent_dataset_id ? {
          id: dataset.parent_dataset_id,
          name: dataset.parent_name
        } : null,
        query_config: dataset.query_config,
        transformation_config: dataset.transformation_config,
        schema_config: dataset.schema_config,
        row_level_security: dataset.row_level_security,
        cache_ttl: dataset.cache_ttl,
        permissions: permissionsResult.rows,
        created_by: dataset.created_by_name,
        created_at: dataset.created_at,
        updated_at: dataset.updated_at
      }
    });
  })
);

// Create new dataset
router.post('/',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('createDataset'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const {
      name,
      description,
      type,
      data_source_id,
      query_config,
      transformation_config,
      parent_dataset_id,
      schema_config,
      row_level_security,
      cache_ttl,
      role_permissions
    } = req.body;

    const workspaceId = req.workspace!.id;
    const userId = req.user!.id;

    // Validate dataset type and required fields
    if (type === 'SOURCE' && !data_source_id) {
      return res.status(400).json({ error: 'data_source_id is required for SOURCE datasets' });
    }

    if (type === 'TRANSFORMATION' && !parent_dataset_id) {
      return res.status(400).json({ error: 'parent_dataset_id is required for TRANSFORMATION datasets' });
    }

    // Check if name already exists in workspace
    const existingResult = await DatabaseConfig.query(
      'SELECT id FROM datasets WHERE workspace_id = $1 AND name = $2 AND is_active = true',
      [workspaceId, name]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Dataset name already exists in workspace' });
    }

    // Validate parent dataset access if transformation
    if (type === 'TRANSFORMATION' && parent_dataset_id) {
      const parentAccessResult = await DatabaseConfig.query(
        `SELECT COUNT(*) as count
         FROM datasets d
         JOIN dataset_permissions dp ON d.id = dp.dataset_id
         JOIN user_workspace_roles uwr ON dp.role_id = uwr.role_id
         WHERE d.id = $1 AND uwr.user_id = $2 AND uwr.workspace_id = $3 AND d.is_active = true`,
        [parent_dataset_id, userId, workspaceId]
      );

      if (parseInt(parentAccessResult.rows[0].count) === 0 && req.user!.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'No access to parent dataset' });
      }
    }

    // Create dataset in transaction
    const result = await DatabaseConfig.transaction(async (client) => {
      // Create dataset
      const datasetResult = await client.query(
        `INSERT INTO datasets (
          workspace_id, name, description, type, data_source_id, 
          query_config, transformation_config, parent_dataset_id,
          schema_config, row_level_security, cache_ttl, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          workspaceId, name, description, type, data_source_id,
          JSON.stringify(query_config || {}),
          JSON.stringify(transformation_config || {}),
          parent_dataset_id,
          JSON.stringify(schema_config || {}),
          JSON.stringify(row_level_security || {}),
          cache_ttl || 3600,
          userId
        ]
      );

      const newDataset = datasetResult.rows[0];

      // Set permissions
      if (role_permissions && role_permissions.length > 0) {
        for (const perm of role_permissions) {
          await client.query(
            'INSERT INTO dataset_permissions (dataset_id, role_id, permission_type) VALUES ($1, $2, $3)',
            [newDataset.id, perm.role_id, perm.permission_type || 'READ']
          );
        }
      }

      return newDataset;
    });

    // Test query if SOURCE dataset
    if (type === 'SOURCE' && query_config) {
      try {
        await DatasetService.testDatasetQuery(result.id);
      } catch (error) {
        logger.warn('Dataset query test failed', { datasetId: result.id, error });
      }
    }

    // Log audit event
    logAudit('DATASET_CREATE', 'dataset',userId, workspaceId, {
      dataset_id: result.id,
      dataset_name: result.name,
      dataset_type: result.type
    });

    res.status(201).json({
      message: 'Dataset created successfully',
      dataset: {
        id: result.id,
        name: result.name,
        description: result.description,
        type: result.type,
        cache_ttl: result.cache_ttl,
        created_at: result.created_at
      }
    });
  })
);

// Update dataset
router.put('/:datasetId',
  checkDatasetAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('updateDataset'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;
    const {
      name,
      description,
      query_config,
      transformation_config,
      schema_config,
      row_level_security,
      cache_ttl
    } = req.body;

    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      // Check name uniqueness
      const existingResult = await DatabaseConfig.query(
        'SELECT id FROM datasets WHERE workspace_id = $1 AND name = $2 AND id != $3 AND is_active = true',
        [workspaceId, name, datasetId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'Dataset name already exists in workspace' });
      }

      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (query_config !== undefined) {
      updates.push(`query_config = $${paramIndex++}`);
      values.push(JSON.stringify(query_config));
    }

    if (transformation_config !== undefined) {
      updates.push(`transformation_config = $${paramIndex++}`);
      values.push(JSON.stringify(transformation_config));
    }

    if (schema_config !== undefined) {
      updates.push(`schema_config = $${paramIndex++}`);
      values.push(JSON.stringify(schema_config));
    }

    if (row_level_security !== undefined) {
      updates.push(`row_level_security = $${paramIndex++}`);
      values.push(JSON.stringify(row_level_security));
    }

    if (cache_ttl !== undefined) {
      updates.push(`cache_ttl = $${paramIndex++}`);
      values.push(cache_ttl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(datasetId);

    const result = await DatabaseConfig.query(
      `UPDATE datasets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Clear related caches
    await CacheService.del([
      `dataset:${datasetId}`,
      `dataset_schema:${datasetId}`,
      `dataset_preview:${datasetId}`
    ]);

    // Clear query cache for this dataset
    const cacheKeys = await CacheService.keys(`query_cache:${datasetId}:*`);
    if (cacheKeys.length > 0) {
      await CacheService.del(cacheKeys);
    }

    // Log audit event
    logAudit('DATASET_UPDATE','dataset', userId, workspaceId, {
      dataset_id: datasetId,
      updated_fields: Object.keys(req.body)
    });

    res.json({
      message: 'Dataset updated successfully',
      dataset: result.rows[0]
    });
  })
);

// Delete dataset (soft delete)
router.delete('/:datasetId',
  checkDatasetAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Check if dataset is used by other datasets or charts
    const usageResult = await DatabaseConfig.query(
      `SELECT 
         (SELECT COUNT(*) FROM datasets WHERE parent_dataset_id = $1 AND is_active = true) as child_datasets,
         (SELECT COUNT(*) FROM charts WHERE dataset_id = $1 AND is_active = true) as charts`,
      [datasetId]
    );

    const usage = usageResult.rows[0];
    if (parseInt(usage.child_datasets) > 0 || parseInt(usage.charts) > 0) {
      return res.status(409).json({
        error: 'Cannot delete dataset that is being used',
        details: {
          child_datasets: parseInt(usage.child_datasets),
          charts: parseInt(usage.charts)
        }
      });
    }

    // Soft delete dataset
    await DatabaseConfig.query(
      'UPDATE datasets SET is_active = false, updated_at = NOW() WHERE id = $1',
      [datasetId]
    );

    // Clear caches
    await CacheService.del([
      `dataset:${datasetId}`,
      `dataset_schema:${datasetId}`,
      `dataset_preview:${datasetId}`
    ]);

    const cacheKeys = await CacheService.keys(`query_cache:${datasetId}:*`);
    if (cacheKeys.length > 0) {
      await CacheService.del(cacheKeys);
    }

    // Log audit event
    logAudit('DATASET_DELETE','dataset', userId, workspaceId, {
      dataset_id: datasetId
    });

    res.json({ message: 'Dataset deleted successfully' });
  })
);

// Query dataset (execute query and return data)
router.post('/:datasetId/query',
  checkDatasetAccess,
  validateRequest('queryDataset'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;
    const { filters, limit, offset, columns } = req.body;
    const userId = req.user!.id;

    try {
      const result = await QueryExecutionService.executeDatasetQuery(
        datasetId,
        {
          filters: filters || [],
          limit: limit || 100,
          offset: offset || 0,
          columns: columns || [],
          user_id: userId
        }
      );

      res.json({
        data: result.data,
        columns: result.columns,
        total_rows: result.total_rows,
        execution_time: result.execution_time,
        cached: result.cached
      });
    } catch (error) {
      logger.error('Dataset query execution failed', { datasetId, error });
      res.status(500).json({ error: 'Query execution failed' });
    }
  })
);

// Get dataset schema/preview
router.get('/:datasetId/schema',
  checkDatasetAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;

    try {
      const schema = await DatasetService.getDatasetSchema(datasetId);
      res.json({ schema });
    } catch (error) {
      logger.error('Failed to get dataset schema', { datasetId, error });
      res.status(500).json({ error: 'Failed to get dataset schema' });
    }
  })
);

// Test dataset query
router.post('/:datasetId/test',
  checkDatasetAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { datasetId } = req.params;

    try {
      const result = await DatasetService.testDatasetQuery(datasetId);
      res.json({
        success: true,
        preview: result.preview,
        columns: result.columns,
        execution_time: result.execution_time
      });
    } catch (error) {
      logger.error('Dataset query test failed', { datasetId, error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  })
);

export default router;