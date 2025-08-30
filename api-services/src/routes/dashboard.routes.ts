# api-services/src/routes/dashboard.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { requireWorkspaceRole } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import { User, Workspace } from '../types/auth.types';

interface AuthenticatedRequest extends express.Request {
  user?: User;
  workspace?: Workspace;
}

const router = express.Router();

// Get all dashboards in workspace
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspaceId = req.workspace!.id;
  const { category, search, page = '1', limit = '20', featured } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions: string[] = ['d.workspace_id = $1', 'd.is_active = true'];
  const values: any[] = [workspaceId];
  let paramIndex = 2;

  if (category) {
    conditions.push(`d.category_id = $${paramIndex++}`);
    values.push(category);
  }

  if (search) {
    conditions.push(`(d.name ILIKE $${paramIndex++} OR d.description ILIKE $${paramIndex})`);
    values.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  if (featured === 'true') {
    conditions.push('d.is_featured = true');
  }

  const result = await DatabaseConfig.query(
    `SELECT d.*, c.name as category_name, c.color as category_color,
            u.first_name || ' ' || u.last_name as created_by_name,
            COUNT(DISTINCT ch.id) as chart_count,
            COUNT(DISTINCT wv.webview_id) as webview_count
     FROM dashboards d
     LEFT JOIN categories c ON d.category_id = c.id
     LEFT JOIN users u ON d.created_by = u.id
     LEFT JOIN charts ch ON d.id = ch.dashboard_id AND ch.is_active = true
     LEFT JOIN webview_permissions wv ON d.id = wv.dashboard_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY d.id, c.name, c.color, u.first_name, u.last_name
     ORDER BY d.updated_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, parseInt(limit as string), offset]
  );

  const countResult = await DatabaseConfig.query(
    `SELECT COUNT(*) as total FROM dashboards d WHERE ${conditions.join(' AND ')}`,
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
      webview_count: parseInt(row.webview_count),
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

  const result = await DatabaseConfig.query(
    `SELECT d.*, c.name as category_name, c.color as category_color,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM dashboards d
     LEFT JOIN categories c ON d.category_id = c.id
     LEFT JOIN users u ON d.created_by = u.id
     WHERE d.id = $1 AND d.is_active = true`,
    [dashboardId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Dashboard not found' });
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

    const workspaceId = req.workspace!.id;
    const userId = req.user!.id;

    // Check if slug already exists in workspace
    const existingResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE workspace_id = $1 AND slug = $2 AND is_active = true',
      [workspaceId, slug]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Dashboard slug already exists in workspace' });
    }

    // Validate category exists if provided
    if (category_id) {
      const categoryResult = await DatabaseConfig.query(
        'SELECT id FROM categories WHERE id = $1 AND workspace_id = $2 AND is_active = true',
        [category_id, workspaceId]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category ID' });
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
        JSON.stringify(filter_config || []),
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
      message: 'Dashboard created successfully',
      dashboard: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        slug: result.rows[0].slug,
        description: result.rows[0].description,
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

    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Check if dashboard exists and user has permission
    const dashboardResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboardId, workspaceId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Check slug uniqueness if changing
    if (slug) {
      const existingResult = await DatabaseConfig.query(
        'SELECT id FROM dashboards WHERE workspace_id = $1 AND slug = $2 AND id != $3 AND is_active = true',
        [workspaceId, slug, dashboardId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'Dashboard slug already exists in workspace' });
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

    if (slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(slug);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(category_id);
    }

    if (layout_config !== undefined) {
      updates.push(`layout_config = $${paramIndex++}`);
      values.push(JSON.stringify(layout_config));
    }

    if (filter_config !== undefined) {
      updates.push(`filter_config = $${paramIndex++}`);
      values.push(JSON.stringify(filter_config));
    }

    if (is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(is_public);
    }

    if (is_featured !== undefined) {
      updates.push(`is_featured = $${paramIndex++}`);
      values.push(is_featured);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(dashboardId);

    const result = await DatabaseConfig.query(
      `UPDATE dashboards SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Clear cache
    await CacheService.del(`dashboard:${dashboardId}`);

    // Log audit event
    logAudit('DASHBOARD_UPDATE', userId, workspaceId, {
      dashboard_id: dashboardId,
      updated_fields: Object.keys(req.body)
    });

    res.json({
      message: 'Dashboard updated successfully',
      dashboard: result.rows[0]
    });
  })
);

// Delete dashboard
router.delete('/:dashboardId',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { dashboardId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Check if dashboard has charts
    const chartsResult = await DatabaseConfig.query(
      'SELECT COUNT(*) as count FROM charts WHERE dashboard_id = $1 AND is_active = true',
      [dashboardId]
    );

    const chartCount = parseInt(chartsResult.rows[0].count);
    if (chartCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete dashboard with active charts',
        details: { chart_count: chartCount }
      });
    }

    // Soft delete dashboard
    await DatabaseConfig.query(
      'UPDATE dashboards SET is_active = false, updated_at = NOW() WHERE id = $1',
      [dashboardId]
    );

    // Clear cache
    await CacheService.del(`dashboard:${dashboardId}`);

    // Log audit event
    logAudit('DASHBOARD_DELETE', userId, workspaceId, {
      dashboard_id: dashboardId
    });

    res.json({ message: 'Dashboard deleted successfully' });
  })
);

// Duplicate dashboard
router.post('/:dashboardId/duplicate',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  validateRequest('duplicateDashboard'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { dashboardId } = req.params;
    const { name, slug } = req.body;
    const userId = req.user!.id;
    const workspaceId = req.workspace!.id;

    // Get original dashboard
    const dashboardResult = await DatabaseConfig.query(
      'SELECT * FROM dashboards WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [dashboardId, workspaceId]
    );

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const originalDashboard = dashboardResult.rows[0];

    // Check slug uniqueness
    const existingResult = await DatabaseConfig.query(
      'SELECT id FROM dashboards WHERE workspace_id = $1 AND slug = $2 AND is_active = true',
      [workspaceId, slug]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Dashboard slug already exists' });
    }

    // Create duplicate in transaction
    const result = await DatabaseConfig.transaction(async (client) => {
      // Create new dashboard
      const newDashboardResult = await client.query(
        `INSERT INTO dashboards (
          workspace_id, name, slug, description, category_id,
          layout_config, filter_config, is_public, is_featured, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          workspaceId,
          name,
          slug,
          originalDashboard.description,
          originalDashboard.category_id,
          originalDashboard.layout_config,
          originalDashboard.filter_config,
          false, // New dashboard not public by default
          false, // New dashboard not featured by default
          userId
        ]
      );

      const newDashboard = newDashboardResult.rows[0];

      // Get original charts
      const chartsResult = await client.query(
        'SELECT * FROM charts WHERE dashboard_id = $1 AND is_active = true',
        [dashboardId]
      );

      // Create duplicate charts
      for (const chart of chartsResult.rows) {
        await client.query(
          `INSERT INTO charts (
            workspace_id, dashboard_id, dataset_id, name, type, config, position, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            workspaceId,
            newDashboard.id,
            chart.dataset_id,
            chart.name,
            chart.type,
            chart.config,
            chart.position,
            userId
          ]
        );
      }

      return newDashboard;
    });

    // Log audit event
    logAudit('DASHBOARD_DUPLICATE', userId, workspaceId, {
      original_dashboard_id: dashboardId,
      new_dashboard_id: result.id,
      new_dashboard_name: result.name
    });

    res.status(201).json({
      message: 'Dashboard duplicated successfully',
      dashboard: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        created_at: result.created_at
      }
    });
  })
);

// Get dashboard analytics
router.get('/:dashboardId/analytics',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { dashboardId } = req.params;
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
         DATE_TRUNC('day', created_at) as view_date,
         COUNT(*) as daily_views
       FROM audit_logs
       WHERE resource_type = 'dashboard' 
         AND resource_id = $1 
         AND action = 'DASHBOARD_VIEW'
         AND ${timeCondition}
       GROUP BY view_date
       ORDER BY view_date`,
      [dashboardId]
    );

    // Get top viewers
    const topViewersResult = await DatabaseConfig.query(
      `SELECT u.first_name || ' ' || u.last_name as user_name,
              COUNT(*) as view_count
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.resource_type = 'dashboard' 
         AND al.resource_id = $1 
         AND al.action = 'DASHBOARD_VIEW'
         AND ${timeCondition}
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY view_count DESC
       LIMIT 10`,
      [dashboardId]
    );

    res.json({
      analytics: {
        total_views: viewsResult.rows.reduce((sum, row) => sum + parseInt(row.total_views), 0),
        unique_viewers: new Set(viewsResult.rows.flatMap(row => row.unique_viewers)).size,
        daily_views: viewsResult.rows.map(row => ({
          date: row.view_date,
          views: parseInt(row.daily_views)
        })),
        top_viewers: topViewersResult.rows
      }
    });
  })
);

export default router;