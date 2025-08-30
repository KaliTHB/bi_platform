// api-services/src/routes/workspace.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger, logAudit } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission, requireRole } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { validateRequest } from '../middleware/validation';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
  User
} from '../types/auth.types';

interface AuthenticatedRequest extends express.Request {
  user?: User;
  workspace?: Workspace;
}

const router = express.Router();

// Get user's workspaces
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const userId = req.user!.id;

  const result = await DatabaseConfig.query(
    `SELECT w.*, uw.status as membership_status,
            ARRAY_AGG(DISTINCT r.name) as roles,
            MAX(r.level) as highest_role_level,
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT d.id) as dashboard_count,
            COUNT(DISTINCT ds.id) as dataset_count
     FROM workspaces w
     JOIN user_workspaces uw ON w.id = uw.workspace_id
     LEFT JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id AND uwr.user_id = uw.user_id
     LEFT JOIN roles r ON uwr.role_id = r.id
     LEFT JOIN user_workspaces u ON w.id = u.workspace_id AND u.status = 'ACTIVE'
     LEFT JOIN dashboards d ON w.id = d.workspace_id AND d.is_active = true
     LEFT JOIN datasets ds ON w.id = ds.workspace_id AND ds.is_active = true
     WHERE uw.user_id = $1 AND w.is_active = true
     GROUP BY w.id, uw.status
     ORDER BY w.name`,
    [userId]
  );

  res.json({
    workspaces: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logo_url: row.logo_url,
      settings: row.settings,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      membership_status: row.membership_status,
      roles: row.roles || [],
      highest_role_level: row.highest_role_level || 0,
      stats: {
        user_count: parseInt(row.user_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0
      }
    }))
  });
}));

// Get specific workspace
router.get('/:workspaceId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const workspace = req.workspace!;

  // Get additional workspace statistics
  const statsResult = await DatabaseConfig.query(
    `SELECT 
       (SELECT COUNT(*) FROM user_workspaces WHERE workspace_id = $1 AND status = 'ACTIVE') as active_users,
       (SELECT COUNT(*) FROM dashboards WHERE workspace_id = $1 AND is_active = true) as total_dashboards,
       (SELECT COUNT(*) FROM datasets WHERE workspace_id = $1 AND is_active = true) as total_datasets,
       (SELECT COUNT(*) FROM data_sources WHERE workspace_id = $1 AND is_active = true) as total_data_sources,
       (SELECT COUNT(*) FROM categories WHERE workspace_id = $1 AND is_active = true) as total_categories`,
    [workspace.id]
  );

  const stats = statsResult.rows[0];

  res.json({
    workspace: {
      ...workspace,
      stats: {
        active_users: parseInt(stats.active_users),
        total_dashboards: parseInt(stats.total_dashboards),
        total_datasets: parseInt(stats.total_datasets),
        total_data_sources: parseInt(stats.total_data_sources),
        total_categories: parseInt(stats.total_categories)
      }
    }
  });
}));

// Create new workspace
router.post('/', 
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validateRequest('createWorkspace'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name, slug, description, settings } = req.body as CreateWorkspaceRequest;
    const userId = req.user!.id;

    // Check if slug is already taken
    const existing = await DatabaseConfig.query(
      'SELECT id FROM workspaces WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Workspace slug already exists' });
    }

    // Create workspace in transaction
    const result = await DatabaseConfig.transaction(async (client) => {
      // Create workspace
      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, slug, description, settings, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, slug, description, settings || {}, userId]
      );

      const newWorkspace = workspaceResult.rows[0];

      // Add creator to workspace
      await client.query(
        'INSERT INTO user_workspaces (user_id, workspace_id, status) VALUES ($1, $2, $3)',
        [userId, newWorkspace.id, 'ACTIVE']
      );

      // Assign owner role to creator
      const ownerRoleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1 AND is_system = true',
        ['owner']
      );

      if (ownerRoleResult.rows.length > 0) {
        await client.query(
          'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by) VALUES ($1, $2, $3, $4)',
          [userId, newWorkspace.id, ownerRoleResult.rows[0].id, userId]
        );
      }

      return newWorkspace;
    });

    // Log audit event
    logAudit('WORKSPACE_CREATE', userId, result.id, {
      workspace_name: result.name,
      workspace_slug: result.slug
    });

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        description: result.description,
        settings: result.settings,
        is_active: result.is_active,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    });
  })
);

// Update workspace
router.put('/:workspaceId',
  requireWorkspaceRole(['admin', 'owner']),
  validateRequest('updateWorkspace'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name, description, logo_url, settings } = req.body as UpdateWorkspaceRequest;
    const workspaceId = req.params.workspaceId;
    const userId = req.user!.id;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(logo_url);
    }

    if (settings !== undefined) {
      updates.push(`settings = settings || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(workspaceId);

    const result = await DatabaseConfig.query(
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Clear workspace cache
    await CacheService.del(`workspace:${workspaceId}`);

    // Log audit event
    logAudit('WORKSPACE_UPDATE', userId, workspaceId, {
      updated_fields: Object.keys(req.body)
    });

    res.json({
      message: 'Workspace updated successfully',
      workspace: result.rows[0]
    });
  })
);

// Delete workspace (soft delete)
router.delete('/:workspaceId',
  requireWorkspaceRole(['owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user!.id;

    await DatabaseConfig.query(
      'UPDATE workspaces SET is_active = false, updated_at = NOW() WHERE id = $1',
      [workspaceId]
    );

    // Clear workspace cache
    await CacheService.del(`workspace:${workspaceId}`);
    await CacheService.flushWorkspace(workspaceId);

    // Log audit event
    logAudit('WORKSPACE_DELETE', userId, workspaceId, {
      workspace_name: req.workspace!.name
    });

    res.json({ message: 'Workspace deleted successfully' });
  })
);

// Get workspace members
router.get('/:workspaceId/members',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const workspaceId = req.params.workspaceId;

    const result = await DatabaseConfig.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url,
              uw.status, uw.joined_at,
              ARRAY_AGG(DISTINCT r.name ORDER BY r.level DESC) as roles,
              MAX(r.level) as highest_role_level,
              STRING_AGG(DISTINCT r.display_name, ', ' ORDER BY r.level DESC) as role_names
       FROM users u
       JOIN user_workspaces uw ON u.id = uw.user_id
       LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id AND uwr.workspace_id = uw.workspace_id
       LEFT JOIN roles r ON uwr.role_id = r.id
       WHERE uw.workspace_id = $1 AND u.is_active = true
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.avatar_url, uw.status, uw.joined_at
       ORDER BY uw.joined_at ASC`,
      [workspaceId]
    );

    res.json({
      members: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        avatar_url: row.avatar_url,
        status: row.status,
        joined_at: row.joined_at,
        roles: row.roles || [],
        highest_role_level: row.highest_role_level || 0,
        role_names: row.role_names
      }))
    });
  })
);

// Get workspace activity/audit logs
router.get('/:workspaceId/activity',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const workspaceId = req.params.workspaceId;
    const { page = '1', limit = '50', action, user_id, from_date, to_date } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const conditions: string[] = ['workspace_id = $1'];
    const values: any[] = [workspaceId];
    let paramIndex = 2;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(action);
    }

    if (user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(user_id);
    }

    if (from_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(to_date);
    }

    const result = await DatabaseConfig.query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit as string), offset]
    );

    const countResult = await DatabaseConfig.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${conditions.join(' AND ')}`,
      values
    );

    res.json({
      activity: result.rows.map(row => ({
        id: row.id,
        action: row.action,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        details: row.details,
        ip_address: row.ip_address,
        created_at: row.created_at,
        user: row.user_id ? {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email
        } : null
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
      }
    });
  })
);

export default router;