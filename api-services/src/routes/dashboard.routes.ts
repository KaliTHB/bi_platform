// api-services/src/routes/dashboard.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { requireWorkspaceRole } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import { ChartRenderer } from '../services/ChartRenderer';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all dashboards
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspaceId = req.user!.workspaceId;
  const { category_id, search, page = '1', limit = '20', is_public } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions: string[] = ['d.workspace_id = $1', 'd.is_active = true'];
  const values: any[] = [workspaceId];
  let paramIndex = 2;

  if (category_id) {
    conditions.push(`d.category_id = $${paramIndex++}`);
    values.push(category_id);
  }

  if (search) {
    conditions.push(`(d.name ILIKE $${paramIndex++} OR d.description ILIKE $${paramIndex})`);
    values.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  if (is_public !== undefined) {
    conditions.push(`d.is_public = $${paramIndex++}`);
    values.push(is_public === 'true');
  }

  const result = await DatabaseConfig.query(
    `SELECT d.*, c.name as category_name, c.color as category_color,
            u.first_name || ' ' || u.last_name as created_by_name,
            COUNT(ch.id) as chart_count
     FROM dashboards d
     LEFT JOIN categories c ON d.category_id = c.id
     LEFT JOIN users u ON d.created_by = u.id
     LEFT JOIN charts ch ON d.id = ch.dashboard_id AND ch.is_active = true
     WHERE ${conditions.join(' AND ')}
     GROUP BY d.id, c.id, u.id
     ORDER BY d.updated_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, parseInt(limit as string), offset]
  );

  const countResult = await DatabaseConfig.query(
    `SELECT COUNT(DISTINCT d.id) as total FROM dashboards d WHERE ${conditions.join(' AND ')}`,
    values
  );

  res.json({
    dashboards: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color
      } : null,
      is_public: row.is_public,
      is_featured: row.is_featured,
      chart_count: parseInt(row.chart_count),
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

// Get specific dashboard
router.get('/:dashboardId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { dashboardId } = req.params;
  const workspaceId = req.user!.workspaceId;

  const result = await DatabaseConfig.query(
    `SELECT d.*, c.name as category_name, c.color as category_color,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM dashboards d
     LEFT JOIN categories c ON d.category_id = c.id
     LEFT JOIN users u ON d.created_by = u.id
     WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true`,
    [dashboardId, workspaceId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ 
      success: false,
      message: 'Dashboard not found' 
    });
  }

  const dashboard = result.rows[0];

  // Get charts
  const chartsResult = await DatabaseConfig.query(
    `SELECT ch.*, ds.name as dataset_name
     FROM charts ch
     LEFT JOIN datasets ds ON ch.dataset_id = ds.id
     WHERE ch.dashboard_id = $1 AND ch.is_active = true
     ORDER BY ch.position->>'y', ch.position->>'x'`,
    [dashboardId]
  );

  res.json({
    success: true,
    dashboard: {
      id: dashboard.id,
      name: dashboard.name,
      slug: dashboard.slug,
      description: dashboard.description,
      category: dashboard.category_id ? {
        id: dashboard.category_id,
        name: dashboard.category_name,
        color: dashboard.category_color
      } : null,
      layout_config: dashboard.layout_config,
      filter_config: dashboard.filter_config,
      is_public: dashboard.is_public,
      is_featured: dashboard.is_featured,
      created_by: dashboard.created_by_name,
      created_at: dashboard.created_at,
      updated_at: dashboard.updated_at,
      charts: chartsResult.rows.map(chart => ({
        id: chart.id,
        name: chart.name,
        type: chart.type,
        config: chart.config,
        position: chart.position,
        dataset: {
          id: chart.dataset_id,
          name: chart.dataset_name
        },
        created_at: chart.created_at,
        updated_at: chart.updated_at
      }))
    }
  });
}));

// Create new dashboard
router.post('/',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('createDashboard'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const {
      name,
      slug,
      description,
      category_id,
      layout_config,
      filter_config,
      is_public,
      is_featured
    } = req.body;

    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Check if slug already exists in workspace
    const existingResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE workspace_id = $1 AND slug = $2 AND is_active = true',
      [workspaceId, slug]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        message: 'Dashboard slug already exists in workspace',
        errors: [{ code: 'SLUG_EXISTS', message: 'A dashboard with this slug already exists' }]
      });
    }

    // Validate category exists if provided
    if (category_id) {
      const categoryResult = await DatabaseConfig.query(
        'SELECT id FROM categories WHERE id = $1 AND workspace_id = $2 AND is_active = true',
        [category_id, workspaceId]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid category ID',
          errors: [{ code: 'INVALID_CATEGORY', message: 'Category not found' }]
        });
      }
    }

    const result = await DatabaseConfig.query(
      `INSERT INTO dashboards (
        workspace_id, name, slug, description, category_id,
        layout_config, filter_config, is_public, is_featured, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        workspaceId, name, slug, description, category_id,
        JSON.stringify(layout_config || {}),
        JSON.stringify(filter_config || {}),
        is_public || false,
        is_featured || false,
        userId
      ]
    );

    // Log audit event
    logAudit('DASHBOARD_CREATE', userId, workspaceId, {
      dashboard_id: result.rows[0].id,
      dashboard_name: result.rows[0].name,
      dashboard_slug: result.rows[0].slug
    });

    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        slug: result.rows[0].slug,
        description: result.rows[0].description,
        category_id: result.rows[0].category_id,
        layout_config: result.rows[0].layout_config,
        filter_config: result.rows[0].filter_config,
        is_public: result.rows[0].is_public,
        is_featured: result.rows[0].is_featured,
        created_at: result.rows[0].created_at
      }
    });
  })
);

// Update dashboard
router.put('/:dashboardId',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('updateDashboard'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { dashboardId } = req.params;
    const {
      name,
      slug,
      description,
      category_id,
      layout_config,
      filter_config,
      is_public,
      is_featured
    } = req.body;

    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Check if dashboard exists
    const existingResult = await DatabaseConfig.query(
      'SELECT id, slug FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboardId, workspaceId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Dashboard not found' 
      });
    }

    // Check if slug conflict (if slug is being changed)
    if (slug && slug !== existingResult.rows[0].slug) {
      const slugResult = await DatabaseConfig.query(
        'SELECT id FROM dashboards WHERE workspace_id = $1 AND slug = $2 AND id != $3 AND is_active = true',
        [workspaceId, slug, dashboardId]
      );

      if (slugResult.rows.length > 0) {
        return res.status(409).json({ 
          success: false,
          message: 'Dashboard slug already exists in workspace' 
        });
      }
    }

    const result = await DatabaseConfig.query(
      `UPDATE dashboards SET
        name = COALESCE($3, name),
        slug = COALESCE($4, slug),
        description = COALESCE($5, description),
        category_id = COALESCE($6, category_id),
        layout_config = COALESCE($7, layout_config),
        filter_config = COALESCE($8, filter_config),
        is_public = COALESCE($9, is_public),
        is_featured = COALESCE($10, is_featured),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND workspace_id = $2
      RETURNING *`,
      [
        dashboardId, workspaceId, name, slug, description, category_id,
        layout_config ? JSON.stringify(layout_config) : null,
        filter_config ? JSON.stringify(filter_config) : null,
        is_public, is_featured
      ]
    );

    // Log audit event
    logAudit('DASHBOARD_UPDATE', userId, workspaceId, {
      dashboard_id: dashboardId,
      dashboard_name: result.rows[0].name,
      changes: { name, slug, description, is_public, is_featured }
    });

    res.json({
      success: true,
      message: 'Dashboard updated successfully',
      dashboard: result.rows[0]
    });
  })
);

// Delete dashboard
router.delete('/:dashboardId',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { dashboardId } = req.params;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    // Check if dashboard exists
    const existingResult = await DatabaseConfig.query(
      'SELECT name FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboardId, workspaceId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Dashboard not found' 
      });
    }

    // Soft delete dashboard and associated charts
    await DatabaseConfig.query(
      'UPDATE dashboards SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [dashboardId]
    );

    await DatabaseConfig.query(
      'UPDATE charts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE dashboard_id = $1',
      [dashboardId]
    );

    // Log audit event
    logAudit('DASHBOARD_DELETE', userId, workspaceId, {
      dashboard_id: dashboardId,
      dashboard_name: existingResult.rows[0].name
    });

    res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  })
);

// Get dashboard data with all chart data rendered
router.get('/:dashboardId/data', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { dashboardId } = req.params;
  const workspaceId = req.user!.workspaceId;
  const { filters } = req.query;

  try {
    // Get dashboard and charts
    const dashboard = await DatabaseConfig.query(
      `SELECT d.*, 
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', ch.id,
             'name', ch.name,
             'type', ch.type,
             'config', ch.config,
             'position', ch.position,
             'dataset_id', ch.dataset_id
           )
         ) FILTER (WHERE ch.id IS NOT NULL), 
         '[]'::json
       ) as charts
       FROM dashboards d
       LEFT JOIN charts ch ON d.id = ch.dashboard_id AND ch.is_active = true
       WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true
       GROUP BY d.id`,
      [dashboardId, workspaceId]
    );

    if (dashboard.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Dashboard not found' 
      });
    }

    const dashboardData = dashboard.rows[0];
    const parsedFilters = filters ? JSON.parse(filters as string) : [];

    // Render data for each chart
    const chartDataPromises = dashboardData.charts.map(async (chart: any) => {
      try {
        const chartData = await ChartRenderer.renderChart(chart.id, workspaceId, parsedFilters);
        return {
          chartId: chart.id,
          ...chartData
        };
      } catch (error) {
        logger.error('Chart rendering failed', { chartId: chart.id, error });
        return {
          chartId: chart.id,
          data: [],
          columns: [],
          metadata: { error: 'Failed to render chart data' }
        };
      }
    });

    const chartsData = await Promise.all(chartDataPromises);

    res.json({
      success: true,
      dashboard: {
        id: dashboardData.id,
        name: dashboardData.name,
        slug: dashboardData.slug,
        description: dashboardData.description,
        layout_config: dashboardData.layout_config,
        filter_config: dashboardData.filter_config,
        charts: dashboardData.charts
      },
      chartsData
    });
  } catch (error) {
    logger.error('Dashboard data fetch failed', { dashboardId, error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
}));

export default router;