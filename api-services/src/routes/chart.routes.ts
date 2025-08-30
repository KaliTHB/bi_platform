// api-services/src/routes/chart.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { requireWorkspaceRole } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import { ChartRenderer } from '../services/ChartRenderer';
import { PluginManager } from '../services/PluginManager';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all charts (with optional dashboard filter)
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspaceId = req.user!.workspaceId;
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
    success: true,
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
  const workspaceId = req.user!.workspaceId;

  const result = await DatabaseConfig.query(
    `SELECT c.*, d.name as dashboard_name, ds.name as dataset_name,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM charts c
     LEFT JOIN dashboards d ON c.dashboard_id = d.id
     LEFT JOIN datasets ds ON c.dataset_id = ds.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id = $1 AND c.workspace_id = $2 AND c.is_active = true`,
    [chartId, workspaceId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ 
      success: false,
      message: 'Chart not found' 
    });
  }

  const chart = result.rows[0];

  res.json({
    success: true,
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

    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Validate dashboard exists and belongs to workspace
    const dashboardResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboard_id, workspaceId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid dashboard ID',
        errors: [{ code: 'INVALID_DASHBOARD', message: 'Dashboard not found' }]
      });
    }

    // Validate dataset exists and user has access
    const datasetResult = await DatabaseConfig.query(
      `SELECT COUNT(*) as count
       FROM datasets d
       WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true`,
      [dataset_id, workspaceId]
    );

    if (parseInt(datasetResult.rows[0].count) === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'No access to specified dataset',
        errors: [{ code: 'DATASET_ACCESS_DENIED', message: 'Dataset not found or access denied' }]
      });
    }

    // Validate chart configuration
    const validation = ChartRenderer.validateChartConfig(type, config);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid chart configuration', 
        errors: validation.errors.map(error => ({ code: 'INVALID_CONFIG', message: error }))
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
      success: true,
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
    const workspaceId = req.user!.workspaceId;

    // Check if chart exists and belongs to workspace
    const chartResult = await DatabaseConfig.query(
      'SELECT id, type FROM charts WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [chartId, workspaceId]
    );

    if (chartResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Chart not found' 
      });
    }

    // Validate chart configuration if config is being updated
    if (config) {
      const chartType = type || chartResult.rows[0].type;
      const validation = ChartRenderer.validateChartConfig(chartType, config);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid chart configuration', 
          errors: validation.errors.map(error => ({ code: 'INVALID_CONFIG', message: error }))
        });
      }
    }

    const result = await DatabaseConfig.query(
      `UPDATE charts SET
        name = COALESCE($3, name),
        type = COALESCE($4, type),
        config = COALESCE($5, config),
        position = COALESCE($6, position),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND workspace_id = $2
      RETURNING *`,
      [
        chartId, workspaceId, name, type,
        config ? JSON.stringify(config) : null,
        position ? JSON.stringify(position) : null
      ]
    );

    // Log audit event
    logAudit('CHART_UPDATE', userId, workspaceId, {
      chart_id: chartId,
      chart_name: result.rows[0].name,
      changes: { name, type, config: !!config, position: !!position }
    });

    res.json({
      success: true,
      message: 'Chart updated successfully',
      chart: result.rows[0]
    });
  })
);

// Delete chart
router.delete('/:chartId',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Check if chart exists
    const existingResult = await DatabaseConfig.query(
      'SELECT name FROM charts WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [chartId, workspaceId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Chart not found' 
      });
    }

    // Soft delete chart
    await DatabaseConfig.query(
      'UPDATE charts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chartId]
    );

    // Log audit event
    logAudit('CHART_DELETE', userId, workspaceId, {
      chart_id: chartId,
      chart_name: existingResult.rows[0].name
    });

    res.json({
      success: true,
      message: 'Chart deleted successfully'
    });
  })
);

// Get chart data
router.get('/:chartId/data', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { chartId } = req.params;
  const workspaceId = req.user!.workspaceId;
  const { filters } = req.query;

  try {
    const parsedFilters = filters ? JSON.parse(filters as string) : [];
    const chartData = await ChartRenderer.renderChart(chartId, workspaceId, parsedFilters);

    res.json({
      success: true,
      ...chartData
    });
  } catch (error) {
    logger.error('Chart data fetch failed', { chartId, error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
}));

// Export chart data
router.post('/:chartId/export',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { format = 'json' } = req.body;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    try {
      const exportData = await ChartRenderer.exportChart(chartId, workspaceId, format);

      // Log audit event
      logAudit('CHART_EXPORT', userId, workspaceId, {
        chart_id: chartId,
        export_format: format
      });

      res.json({
        success: true,
        message: 'Chart exported successfully',
        export: exportData
      });
    } catch (error) {
      logger.error('Chart export failed', { chartId, format, error });
      res.status(500).json({
        success: false,
        message: 'Failed to export chart data',
        error: error.message
      });
    }
  })
);

// Get chart metrics
router.get('/:chartId/metrics', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { chartId } = req.params;
  const workspaceId = req.user!.workspaceId;

  try {
    const metrics = await ChartRenderer.getChartMetrics(chartId, workspaceId);

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Chart metrics fetch failed', { chartId, error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart metrics',
      error: error.message
    });
  }
}));

// Duplicate chart
router.post('/:chartId/duplicate',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { chartId } = req.params;
    const { dashboard_id, name } = req.body;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Get original chart
    const originalChart = await DatabaseConfig.query(
      'SELECT * FROM charts WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [chartId, workspaceId]
    );

    if (originalChart.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Chart not found' 
      });
    }

    const chart = originalChart.rows[0];
    const newName = name || `${chart.name} (Copy)`;

    // Create duplicate
    const result = await DatabaseConfig.query(
      `INSERT INTO charts (
        workspace_id, dashboard_id, dataset_id, name, type, config, position, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        workspaceId,
        dashboard_id || chart.dashboard_id,
        chart.dataset_id,
        newName,
        chart.type,
        chart.config,
        chart.position, // Position might need adjustment
        userId
      ]
    );

    // Log audit event
    logAudit('CHART_DUPLICATE', userId, workspaceId, {
      original_chart_id: chartId,
      new_chart_id: result.rows[0].id,
      chart_name: newName
    });

    res.status(201).json({
      success: true,
      message: 'Chart duplicated successfully',
      chart: result.rows[0]
    });
  })
);

export default router;