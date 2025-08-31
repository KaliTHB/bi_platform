// File: api-services/src/services/WorkspaceService.ts
import { db } from '@/config/database';
import { cache } from '@/config/redis';
import { logger } from '@/utils/logger';
import { User, Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest } from '../types/auth.types';

export class WorkspaceService {
  constructor() {}

  async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    try {
      const result = await db.query(
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

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        logo_url: row.logo_url,
        settings: row.settings,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_count: parseInt(row.user_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0
      }));
    } catch (error) {
      logger.error('Error fetching workspaces for user:', error);
      throw new Error('Failed to fetch workspaces');
    }
  }

  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    try {
      const result = await db.query(
        'SELECT * FROM workspaces WHERE id = $1 AND is_active = true',
        [workspaceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching workspace by ID:', error);
      throw new Error('Failed to fetch workspace');
    }
  }

  async createWorkspace(data: CreateWorkspaceRequest, createdBy: string): Promise<Workspace> {
    try {
      const result = await db.query(
        `INSERT INTO workspaces (name, slug, description, settings, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.name, data.slug, data.description, data.settings || {}, createdBy]
      );

      const workspace = result.rows[0];

      // Add creator as workspace owner
      await db.query(
        `INSERT INTO user_workspaces (user_id, workspace_id, status, created_by)
         VALUES ($1, $2, 'ACTIVE', $3)`,
        [createdBy, workspace.id, createdBy]
      );

      // Get default owner role
      const roleResult = await db.query(
        'SELECT id FROM roles WHERE name = $1 AND is_system_role = true',
        ['owner']
      );

      if (roleResult.rows.length > 0) {
        await db.query(
          `INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by)
           VALUES ($1, $2, $3, $4)`,
          [createdBy, workspace.id, roleResult.rows[0].id, createdBy]
        );
      }

      // Clear cache
      await cache.delete(`user-workspaces-${createdBy}`);

      return workspace;
    } catch (error) {
      logger.error('Error creating workspace:', error);
      throw new Error('Failed to create workspace');
    }
  }

  async updateWorkspace(workspaceId: string, updates: UpdateWorkspaceRequest, userId: string): Promise<Workspace> {
    try {
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(updates.description);
      }

      if (updates.logo_url !== undefined) {
        updateFields.push(`logo_url = $${paramCount++}`);
        updateValues.push(updates.logo_url);
      }

      if (updates.settings) {
        updateFields.push(`settings = $${paramCount++}`);
        updateValues.push(JSON.stringify(updates.settings));
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(workspaceId);

      const result = await db.query(
        `UPDATE workspaces 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND is_active = true
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Workspace not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating workspace:', error);
      throw new Error('Failed to update workspace');
    }
  }

  async deleteWorkspace(workspaceId: string, deletedBy: string): Promise<void> {
    try {
      await db.query(
        `UPDATE workspaces 
         SET is_active = false, updated_at = NOW()
         WHERE id = $1`,
        [workspaceId]
      );

      // Clear related cache
      await cache.delete(`workspace-${workspaceId}`);
    } catch (error) {
      logger.error('Error deleting workspace:', error);
      throw new Error('Failed to delete workspace');
    }
  }

  async getWorkspaceMembers(workspaceId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                uw.status, uw.created_at as joined_at,
                ARRAY_AGG(DISTINCT r.name) as roles,
                MAX(r.level) as highest_role_level
         FROM users u
         JOIN user_workspaces uw ON u.id = uw.user_id
         LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id AND uwr.workspace_id = uw.workspace_id
         LEFT JOIN roles r ON uwr.role_id = r.id
         WHERE uw.workspace_id = $1 AND u.is_active = true
         GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, uw.status, uw.created_at
         ORDER BY uw.created_at`,
        [workspaceId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching workspace members:', error);
      throw new Error('Failed to fetch workspace members');
    }
  }

  async addUserToWorkspace(
    workspaceId: string, 
    userId: string, 
    roleIds: string[], 
    addedBy: string
  ): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Add user to workspace
        await client.query(
          `INSERT INTO user_workspaces (user_id, workspace_id, status, created_by)
           VALUES ($1, $2, 'ACTIVE', $3)
           ON CONFLICT (user_id, workspace_id) 
           DO UPDATE SET status = 'ACTIVE', updated_at = NOW()`,
          [userId, workspaceId, addedBy]
        );

        // Remove existing roles
        await client.query(
          'DELETE FROM user_workspace_roles WHERE user_id = $1 AND workspace_id = $2',
          [userId, workspaceId]
        );

        // Add new roles
        for (const roleId of roleIds) {
          await client.query(
            `INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by)
             VALUES ($1, $2, $3, $4)`,
            [userId, workspaceId, roleId, addedBy]
          );
        }
      });

      // Clear cache
      await cache.delete(`user-workspaces-${userId}`);
    } catch (error) {
      logger.error('Error adding user to workspace:', error);
      throw new Error('Failed to add user to workspace');
    }
  }

  async removeUserFromWorkspace(workspaceId: string, userId: string, removedBy: string): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Remove workspace roles
        await client.query(
          'DELETE FROM user_workspace_roles WHERE user_id = $1 AND workspace_id = $2',
          [userId, workspaceId]
        );

        // Update membership status
        await client.query(
          `UPDATE user_workspaces 
           SET status = 'REMOVED', updated_at = NOW()
           WHERE user_id = $1 AND workspace_id = $2`,
          [userId, workspaceId]
        );
      });

      // Clear cache
      await cache.delete(`user-workspaces-${userId}`);
    } catch (error) {
      logger.error('Error removing user from workspace:', error);
      throw new Error('Failed to remove user from workspace');
    }
  }

  async updateUserRoles(
    workspaceId: string, 
    userId: string, 
    roleIds: string[], 
    updatedBy: string
  ): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Remove existing roles
        await client.query(
          'DELETE FROM user_workspace_roles WHERE user_id = $1 AND workspace_id = $2',
          [userId, workspaceId]
        );

        // Add new roles
        for (const roleId of roleIds) {
          await client.query(
            `INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by)
             VALUES ($1, $2, $3, $4)`,
            [userId, workspaceId, roleId, updatedBy]
          );
        }
      });

      // Clear cache
      await cache.delete(`user-workspaces-${userId}`);
    } catch (error) {
      logger.error('Error updating user roles:', error);
      throw new Error('Failed to update user roles');
    }
  }

  async getWorkspaceStats(workspaceId: string): Promise<any> {
    try {
      const result = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM user_workspaces WHERE workspace_id = $1 AND status = 'ACTIVE') as user_count,
          (SELECT COUNT(*) FROM dashboards WHERE workspace_id = $1 AND is_active = true) as dashboard_count,
          (SELECT COUNT(*) FROM datasets WHERE workspace_id = $1 AND is_active = true) as dataset_count,
          (SELECT COUNT(*) FROM charts WHERE workspace_id = $1 AND is_active = true) as chart_count`,
        [workspaceId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching workspace stats:', error);
      throw new Error('Failed to fetch workspace statistics');
    }
  }
}