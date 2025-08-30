# api-services/src/routes/chart.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { requireWorkspaceRole, checkDatasetAccess } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import { QueryExecutionService } from '../services/QueryExecutionService';
import { PluginManager } from '../services/PluginManager';
import { User, Workspace } from '../types/auth.types';

interface AuthenticatedRequest extends express.Request {
  user?: User;
  workspace?: Workspace;
}

const router = express.Router();

// Get all charts (with optional dashboard filter)
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspaceId = req.workspace!.id;
  const { dashboard_id, type, search, page = '1', limit = '20' } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions: string[] = ['c.workspace_id = $1', 'c.is_active = true'];
  const values: any[] = [workspaceId];
  let paramIndex = 2;

  if (dashboard_id) {
    conditions.push(`c.dashboard_id = $${paramIndex++}`);
    values.push(dashboard_id);
  }

  if (type) {
    conditions.push(`c.type = $${paramIndex++}`);
    values.push(type);
  }

  if (search) {
    conditions.push(`(c.name ILIKE $${paramIndex++} OR d.name ILIKE $${paramIndex})`);
    values.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  const result = await DatabaseConfig.query(
    `SELECT c.*, d.name as dashboard_name, ds.name as dataset_name,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM charts c
     LEFT JOIN dashboards d ON c.dashboard_id = d.id
     LEFT JOIN datasets ds ON c.dataset_id = ds.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.updated_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, parseInt(limit as string), offset]
  );

  const countResult = await DatabaseConfig.query(
    `SELECT COUNT(*) as total FROM charts c WHERE ${conditions.join(' AND ')}`,
    values
  );

  res.json({
    charts: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      dashboard: {
        id: row.dashboard_id,
        name: row.dashboard_name
      },
      dataset: {
        id: row.dataset_id,
        name: row.dataset_name
      },
      config: row.config,
      position: row.position,
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

// Get specific chart
router.get('/:chartId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { chartId } = req.params;

  const result = await DatabaseConfig.query(
    `SELECT c.*, d.name as dashboard_name, ds.name as dataset_name,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM charts c
     LEFT JOIN dashboards d ON c.dashboard_id = d.id
     LEFT JOIN datasets ds ON c.dataset_id = ds.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id = $1 AND c.is_active = true`,
    [chartId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Chart not found' });
  }

  const chart = result.rows[0];

  res.json({
    chart: {
      id: chart.id,
      name: chart.name,
      type: chart.type,
      dashboard: {
        id: chart.dashboard_id,
        name: chart.dashboard_name
      },
      dataset: {
        id: chart.dataset_id,
        name: chart.dataset_name
      },
      config: chart.config,
      position: chart.position,
      created_by: chart.created_by_name,
      created_at: chart.created_at,
      updated_at: chart.updated_at
    }
  });
}));

// Create new chart
router.post('/',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('createChart'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const {
      dashboard_id,
      dataset_id,
      name,
      type,
      config,
      position
    } = req.body;

    const workspaceId = req.workspace!.id;
    const userId = req.user!.id;

    // Validate dashboard exists and belongs to workspace
    const dashboardResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboard_id, workspaceId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid dashboard ID' });
    }

    // Validate dataset exists and user has access
    const datasetResult = await DatabaseConfig.query(
      `SELECT COUNT(*) as count
       FROM datasets d
       LEFT JOIN dataset_permissions dp ON d.id = dp.dataset_id
       LEFT JOIN user_workspace_roles uwr ON dp.role_id = uwr.role_id
       WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true
         AND (uwr.user_id = $3 OR $4 = 'SUPER_ADMIN')`,
      [dataset_id, workspaceId, userId, req.user!.role]
    );

    if (parseInt(datasetResult.rows[0].count) === 0) {
      return res.status(403).json({ error: 'No access to specified dataset' });
    }

    // Validate chart type
    const chartPlugin = PluginManager.getChartPlugin(type);
    if (!chartPlugin) {
      return res.status(400).json({ error: `Unsupported chart type: ${type}` });
    }

    // Validate chart configuration
    const validation = PluginManager.validateChartConfig(type, config);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid chart configuration', 
        details: validation.errors 
      });
    }

    const result = await DatabaseConfig.query(
      `INSERT INTO charts (
        workspace_id, dashboard_id, dataset_id, name, type, config, position, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        workspaceId,
        dashboard_id,
        dataset_id,
        name,
        type,
        JSON.stringify(config),
        JSON.stringify(position),
        userId
      ]
    );

    // Log audit event
    logAudit('CHART_CREATE', userId, workspaceId, {
      chart_id: result.rows[0].id,
      chart_name: result.rows[0].name,
      chart_type: result.rows[0].type,
      dashboard_id
    });

    res.status(201).json({
      message: 'Chart created successfully',
      chart: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        dashboard_id: result.rows[0].dashboard_id,
        dataset_id: result.rows[0].dataset_id,
        config: result.rows[0].config,
        position: result.rows[0].position,
        created_at: result.rows[0].created_at
      }
    });
  })
);

// Update chart
router.put('/:chartId',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('updateChart'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { name, type, config, position } = req.body;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Check if chart exists and belongs to workspace
    const chartResult = await DatabaseConfig.query(
      'SELECT id, type FROM charts WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [chartId, workspaceId]
    );

    if (chartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const currentChart = chartResult.rows[0];

    // If type is being changed, validate new type
    if (type && type !== currentChart.type) {
      const chartPlugin = PluginManager.getChartPlugin(type);
      if (!chartPlugin) {
        return res.status(400).json({ error: `Unsupported chart type: ${type}` });
      }
    }

    // Validate chart configuration if provided
    if (config) {
      const chartType = type || currentChart.type;
      const validation = PluginManager.validateChartConfig(chartType, config);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid chart configuration', 
          details: validation.errors 
        });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(config));
    }

    if (position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(JSON.stringify(position));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(chartId);

    const result = await DatabaseConfig.query(
      `UPDATE charts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Clear related caches
    await CacheService.del(`chart:${chartId}`);
    await CacheService.del(`chart_data:${chartId}`);

    // Log audit event
    logAudit('CHART_UPDATE', userId, workspaceId, {
      chart_id: chartId,
      updated_fields: Object.keys(req.body)
    });

    res.json({
      message: 'Chart updated successfully',
      chart: result.rows[0]
    });
  })
);

// Delete chart
router.delete('/:chartId',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Soft delete chart
    const result = await DatabaseConfig.query(
      'UPDATE charts SET is_active = false, updated_at = NOW() WHERE id = $1 AND workspace_id = $2 RETURNING name',
      [chartId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    // Clear caches
    await CacheService.del(`chart:${chartId}`);
    await CacheService.del(`chart_data:${chartId}`);

    // Log audit event
    logAudit('CHART_DELETE', userId, workspaceId, {
      chart_id: chartId,
      chart_name: result.rows[0].name
    });

    res.json({ message: 'Chart deleted successfully' });
  })
);

// Get chart data
router.post('/:chartId/data',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { filters = [] } = req.body;
    const userId = req.user!.id;

    // Get chart and dataset information
    const chartResult = await DatabaseConfig.query(
      `SELECT c.*, d.id as dataset_id
       FROM charts c
       JOIN datasets d ON c.dataset_id = d.id
       WHERE c.id = $1 AND c.is_active = true AND d.is_active = true`,
      [chartId]
    );

    if (chartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const chart = chartResult.rows[0];

    try {
      // Execute query to get chart data
      const result = await QueryExecutionService.executeDatasetQuery(
        chart.dataset_id,
        {
          filters,
          limit: chart.config.limit || 1000,
          user_id: userId,
          use_cache: true
        }
      );

      // Log chart view
      logAudit('CHART_VIEW', userId, req.workspace!.id, {
        chart_id: chartId,
        chart_name: chart.name,
        execution_time: result.execution_time
      });

      res.json({
        data: result.data,
        columns: result.columns,
        total_rows: result.total_rows,
        execution_time: result.execution_time,
        cached: result.cached
      });
    } catch (error) {
      logger.error('Failed to get chart data:', { chartId, error });
      res.status(500).json({ error: 'Failed to load chart data' });
    }
  })
);

// Duplicate chart
router.post('/:chartId/duplicate',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { name, dashboard_id } = req.body;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Get original chart
    const chartResult = await DatabaseConfig.query(
      'SELECT * FROM charts WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [chartId, workspaceId]
    );

    if (chartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const originalChart = chartResult.rows[0];

    // Validate target dashboard if specified
    let targetDashboardId = dashboard_id || originalChart.dashboard_id;
    const dashboardResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [targetDashboardId, workspaceId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid target dashboard' });
    }

    // Create duplicate
    const result = await DatabaseConfig.query(
      `INSERT INTO charts (
        workspace_id, dashboard_id, dataset_id, name, type, config, 
        position, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        workspaceId,
        targetDashboardId,
        originalChart.dataset_id,
        name || `Copy of ${originalChart.name}`,
        originalChart.type,
        originalChart.config,
        JSON.stringify({
          ...originalChart.position,
          x: originalChart.position.x + 2, // Offset position slightly
          y: originalChart.position.y + 1
        }),
        userId
      ]
    );

    // Log audit event
    logAudit('CHART_DUPLICATE', userId, workspaceId, {
      original_chart_id: chartId,
      new_chart_id: result.rows[0].id,
      new_chart_name: result.rows[0].name
    });

    res.status(201).json({
      message: 'Chart duplicated successfully',
      chart: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        created_at: result.rows[0].created_at
      }
    });
  })
);

// Get chart analytics
router.get('/:chartId/analytics',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { timeframe = '7d' } = req.query;

    const timeCondition = timeframe === '24h' ? 
      'created_at >= NOW() - INTERVAL \'24 hours\'' :
      timeframe === '7d' ?
      'created_at >= NOW() - INTERVAL \'7 days\'' :
      'created_at >= NOW() - INTERVAL \'30 days\'';

    // Get view analytics
    const viewsResult = await DatabaseConfig.query(
      `SELECT 
         COUNT(*) as total_views,
         COUNT(DISTINCT user_id) as unique_viewers,
         AVG((details->>'execution_time')::int) as avg_execution_time,
         DATE_TRUNC('day', created_at) as view_date,
         COUNT(*) as daily_views
       FROM audit_logs
       WHERE resource_type = 'chart' 
         AND resource_id = $1 
         AND action = 'CHART_VIEW'
         AND ${timeCondition}
       GROUP BY view_date
       ORDER BY view_date`,
      [chartId]
    );

    // Get performance metrics
    const performanceResult = await DatabaseConfig.query(
      `SELECT 
         MIN((details->>'execution_time')::int) as min_execution_time,
         MAX((details->>'execution_time')::int) as max_execution_time,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'execution_time')::int) as p95_execution_time
       FROM audit_logs
       WHERE resource_type = 'chart' 
         AND resource_id = $1 
         AND action = 'CHART_VIEW'
         AND ${timeCondition}`,
      [chartId]
    );

    res.json({
      analytics: {
        total_views: viewsResult.rows.reduce((sum, row) => sum + parseInt(row.total_views), 0),
        unique_viewers: new Set(viewsResult.rows.flatMap(row => row.unique_viewers)).size,
        avg_execution_time: viewsResult.rows.length > 0 
          ? Math.round(viewsResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_execution_time), 0) / viewsResult.rows.length)
          : 0,
        daily_views: viewsResult.rows.map(row => ({
          date: row.view_date,
          views: parseInt(row.daily_views)
        })),
        performance: performanceResult.rows[0] || {
          min_execution_time: 0,
          max_execution_time: 0,
          p95_execution_time: 0
        }
      }
    });
  })
);

// Export chart
router.get('/:chartId/export',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { format = 'png' } = req.query;

    // This would integrate with a chart export service
    // For now, return a placeholder response
    res.json({
      message: 'Chart export functionality not yet implemented',
      chart_id: chartId,
      format
    });
  })
);

export default router;