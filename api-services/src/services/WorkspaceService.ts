// api-services/src/services/WorkspaceService.ts (Production Version)
import { logger } from '../utils/logger';
import db from '../config/database';

interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  settings?: any;
}

interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
}

interface WorkspaceMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  roles: string[];
  joined_at: string;
  highest_role_level: number;
}

export class WorkspaceService {
  constructor() {}

  /**
   * Get workspaces for a user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      logger.info('Fetching workspaces for user', {
        service: 'bi-platform-api',
        userId: userId
      });

      const result = await db.query(`
        SELECT w.*,
               COALESCE(uc.user_count, 0) as user_count,
               COALESCE(dc.dashboard_count, 0) as dashboard_count,
               COALESCE(ds.dataset_count, 0) as dataset_count
        FROM workspaces w
        LEFT JOIN (
          SELECT workspace_id, COUNT(*) as user_count
          FROM user_workspaces
          WHERE is_active = true
          GROUP BY workspace_id
        ) uc ON w.id = uc.workspace_id
        LEFT JOIN (
          SELECT workspace_id, COUNT(*) as dashboard_count
          FROM dashboards
          WHERE is_active = true
          GROUP BY workspace_id
        ) dc ON w.id = dc.workspace_id
        LEFT JOIN (
          SELECT workspace_id, COUNT(*) as dataset_count
          FROM datasets
          WHERE is_active = true
          GROUP BY workspace_id
        ) ds ON w.id = ds.workspace_id
        JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE w.is_active = true 
        AND uw.user_id = $1 
        AND uw.is_active = true
        ORDER BY w.name
      `, [userId]);

      logger.info('Successfully fetched workspaces from database', {
        service: 'bi-platform-api',
        userId: userId,
        count: result.rows.length
      });

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

    } catch (error: any) {
      logger.error('Error in getUserWorkspaces:', {
        service: 'bi-platform-api',
        userId: userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error('Failed to fetch workspaces');
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(workspaceId: string, userId?: string): Promise<Workspace | null> {
    try {
      logger.info('Fetching workspace by ID', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        userId: userId
      });

      const result = await db.query(
        'SELECT * FROM workspaces WHERE id = $1 AND is_active = true',
        [workspaceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      logger.error('Error fetching workspace by ID:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        error: error.message
      });
      throw new Error('Failed to fetch workspace');
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: CreateWorkspaceRequest, createdBy: string): Promise<Workspace> {
    try {
      // Generate slug if not provided
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      const result = await db.query(`
        INSERT INTO workspaces (name, slug, description, settings, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [data.name, slug, data.description, JSON.stringify(data.settings || {}), createdBy]);

      const workspace = result.rows[0];

      // Add creator as owner
      await db.query(`
        INSERT INTO user_workspaces (user_id, workspace_id, role, created_by)
        VALUES ($1, $2, 'owner', $1)
      `, [createdBy, workspace.id]);

      logger.info('Created workspace successfully', {
        service: 'bi-platform-api',
        workspaceId: workspace.id,
        name: workspace.name
      });

      return workspace;
    } catch (error: any) {
      logger.error('Error creating workspace:', {
        service: 'bi-platform-api',
        error: error.message,
        data: data
      });
      throw new Error('Failed to create workspace');
    }
  }

  /**
   * Update workspace
   */
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

      const result = await db.query(`
        UPDATE workspaces 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Workspace not found');
      }

      logger.info('Updated workspace successfully', {
        service: 'bi-platform-api',
        workspaceId: workspaceId
      });

      return result.rows[0];
    } catch (error: any) {
      logger.error('Error updating workspace:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        error: error.message
      });
      throw new Error('Failed to update workspace');
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async deleteWorkspace(workspaceId: string, deletedBy: string): Promise<void> {
    try {
      const result = await db.query(`
        UPDATE workspaces 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
      `, [workspaceId]);

      if (result.rowCount === 0) {
        throw new Error('Workspace not found');
      }

      // Also deactivate all workspace memberships
      await db.query(`
        UPDATE user_workspaces 
        SET is_active = false, updated_at = NOW()
        WHERE workspace_id = $1
      `, [workspaceId]);

      logger.info('Workspace deleted successfully', {
        service: 'bi-platform-api',
        workspaceId: workspaceId
      });
    } catch (error: any) {
      logger.error('Error deleting workspace:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        error: error.message
      });
      throw new Error('Failed to delete workspace');
    }
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const result = await db.query(`
        SELECT u.id, u.email, u.first_name, u.last_name,
               uw.status, uw.role as roles, uw.created_at as joined_at,
               CASE 
                 WHEN uw.role = 'owner' THEN 100
                 WHEN uw.role = 'admin' THEN 80
                 WHEN uw.role = 'editor' THEN 60
                 ELSE 50
               END as highest_role_level
        FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        WHERE uw.workspace_id = $1 
        AND u.is_active = true 
        AND uw.is_active = true
        ORDER BY highest_role_level DESC, u.first_name, u.last_name
      `, [workspaceId]);

      return result.rows.map(row => ({
        ...row,
        roles: [row.roles] // Convert single role to array for consistency
      }));
    } catch (error: any) {
      logger.error('Error fetching workspace members:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        error: error.message
      });
      throw new Error('Failed to fetch workspace members');
    }
  }

  /**
   * Add workspace member
   */
  async addWorkspaceMember(workspaceId: string, email: string, role: string, addedBy: string): Promise<WorkspaceMember> {
    try {
      // First, find or create the user
      let userResult = await db.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      let userId: string;
      if (userResult.rows.length === 0) {
        // Create new user (you might want to handle this differently)
        const newUserResult = await db.query(`
          INSERT INTO users (email, first_name, last_name, is_active, created_by)
          VALUES ($1, 'New', 'User', true, $2)
          RETURNING id
        `, [email, addedBy]);
        userId = newUserResult.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
      }

      // Add user to workspace
      await db.query(`
        INSERT INTO user_workspaces (user_id, workspace_id, role, status, created_by)
        VALUES ($1, $2, $3, 'active', $4)
        ON CONFLICT (user_id, workspace_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = 'active',
        is_active = true,
        updated_at = NOW()
      `, [userId, workspaceId, role, addedBy]);

      // Fetch the added member details
      const memberResult = await db.query(`
        SELECT u.id, u.email, u.first_name, u.last_name,
               uw.status, uw.role, uw.created_at as joined_at,
               CASE 
                 WHEN uw.role = 'owner' THEN 100
                 WHEN uw.role = 'admin' THEN 80
                 WHEN uw.role = 'editor' THEN 60
                 ELSE 50
               END as highest_role_level
        FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        WHERE u.id = $1 AND uw.workspace_id = $2
      `, [userId, workspaceId]);

      const member = memberResult.rows[0];
      return {
        id: member.id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        status: member.status,
        roles: [member.role],
        joined_at: member.joined_at,
        highest_role_level: member.highest_role_level
      };
    } catch (error: any) {
      logger.error('Error adding workspace member:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        email: email,
        error: error.message
      });
      throw new Error('Failed to add workspace member');
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(workspaceId: string, userId: string, role: string, updatedBy: string): Promise<void> {
    try {
      const result = await db.query(`
        UPDATE user_workspaces 
        SET role = $1, updated_at = NOW()
        WHERE workspace_id = $2 AND user_id = $3 AND is_active = true
      `, [role, workspaceId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Workspace member not found');
      }

      logger.info('Member role updated', {
        service: 'bi-platform-api',
        workspaceId,
        userId,
        role
      });
    } catch (error: any) {
      logger.error('Error updating member role:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        userId: userId,
        error: error.message
      });
      throw new Error('Failed to update member role');
    }
  }

  /**
   * Remove member
   */
  async removeMember(workspaceId: string, userId: string, removedBy: string): Promise<void> {
    try {
      const result = await this.db.query(`
        UPDATE user_workspaces 
        SET is_active = false, updated_at = NOW()
        WHERE workspace_id = $1 AND user_id = $2 AND is_active = true
      `, [workspaceId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Workspace member not found');
      }

      logger.info('Member removed', {
        service: 'bi-platform-api',
        workspaceId,
        userId
      });
    } catch (error: any) {
      logger.error('Error removing workspace member:', {
        service: 'bi-platform-api',
        workspaceId: workspaceId,
        userId: userId,
        error: error.message
      });
      throw new Error('Failed to remove workspace member');
    }
  }
}