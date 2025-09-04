// api-services/src/services/WorkspaceService.ts
import { Pool, PoolClient } from 'pg';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  owner_id: string;
  member_count?: number;
}

export interface UserWorkspace extends Workspace {
  user_role: string;
  user_roles: string[];
  highest_role: string;
  role_level: number;
  joined_at: Date;
  permissions: string[];
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  settings?: any;
  logo_url?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: any;
  logo_url?: string;
  is_active?: boolean;
}

export class WorkspaceService {
  private database: DatabaseService;

  constructor(database?: DatabaseService) {
    this.database = database || DatabaseService.getInstance();
  }

  /**
   * Get all workspaces for a specific user
   */
  async getUserWorkspaces(userId: string): Promise<UserWorkspace[]> {
    try {
      logger.debug('Getting workspaces for user', { userId });

      const query = `
        SELECT DISTINCT
          w.id,
          w.name,
          w.slug,
          w.description,
          w.logo_url,
          w.settings,
          w.is_active,
          w.created_at,
          w.updated_at,
          w.owner_id,
          wm.joined_at,
          wm.role as user_role,
          ARRAY_AGG(DISTINCT r.name) as user_roles,
          MAX(r.level) as role_level,
          COALESCE(member_counts.member_count, 0) as member_count
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        LEFT JOIN roles r ON wm.role_id = r.id
        LEFT JOIN (
          SELECT 
            workspace_id, 
            COUNT(*) as member_count 
          FROM workspace_members 
          WHERE is_active = true 
          GROUP BY workspace_id
        ) member_counts ON w.id = member_counts.workspace_id
        WHERE wm.user_id = $1
          AND wm.is_active = true
          AND w.is_active = true
        GROUP BY w.id, w.name, w.slug, w.description, w.logo_url, w.settings,
                 w.is_active, w.created_at, w.updated_at, w.owner_id, 
                 wm.joined_at, wm.role, member_counts.member_count
        ORDER BY w.name ASC
      `;

      const result = await this.database.query<UserWorkspace>(query, [userId]);

      // Process results to add computed fields
      const workspaces = result.rows.map(workspace => ({
        ...workspace,
        highest_role: this.getHighestRole(workspace.user_roles || []),
        permissions: [], // Will be populated separately if needed
      }));

      logger.info('Retrieved user workspaces', { 
        userId, 
        workspaceCount: workspaces.length 
      });

      return workspaces;
    } catch (error) {
      logger.error('Error getting user workspaces', { userId, error });
      throw new Error(`Failed to get user workspaces: ${error.message}`);
    }
  }

  /**
   * Get all workspaces (admin function)
   */
  async getAllWorkspaces(
    limit: number = 50,
    offset: number = 0,
    includeInactive: boolean = false
  ): Promise<Workspace[]> {
    try {
      const whereClause = includeInactive ? '' : 'WHERE is_active = true';
      
      const query = `
        SELECT 
          w.*,
          COALESCE(member_counts.member_count, 0) as member_count
        FROM workspaces w
        LEFT JOIN (
          SELECT 
            workspace_id, 
            COUNT(*) as member_count 
          FROM workspace_members 
          WHERE is_active = true 
          GROUP BY workspace_id
        ) member_counts ON w.id = member_counts.workspace_id
        ${whereClause}
        ORDER BY w.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await this.database.query<Workspace>(query, [limit, offset]);
      
      logger.info('Retrieved all workspaces', { 
        count: result.rows.length,
        includeInactive 
      });

      return result.rows;
    } catch (error) {
      logger.error('Error getting all workspaces', { error });
      throw new Error(`Failed to get all workspaces: ${error.message}`);
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(workspaceId: string, userId?: string): Promise<UserWorkspace | null> {
    try {
      let query: string;
      let params: any[];

      if (userId) {
        // Get workspace with user context
        query = `
          SELECT DISTINCT
            w.*,
            wm.joined_at,
            wm.role as user_role,
            ARRAY_AGG(DISTINCT r.name) as user_roles,
            MAX(r.level) as role_level,
            COALESCE(member_counts.member_count, 0) as member_count
          FROM workspaces w
          INNER JOIN workspace_members wm ON w.id = wm.workspace_id
          LEFT JOIN roles r ON wm.role_id = r.id
          LEFT JOIN (
            SELECT 
              workspace_id, 
              COUNT(*) as member_count 
            FROM workspace_members 
            WHERE is_active = true 
            GROUP BY workspace_id
          ) member_counts ON w.id = member_counts.workspace_id
          WHERE w.id = $1 
            AND wm.user_id = $2
            AND wm.is_active = true
            AND w.is_active = true
          GROUP BY w.id, w.name, w.slug, w.description, w.logo_url, w.settings,
                   w.is_active, w.created_at, w.updated_at, w.owner_id, 
                   wm.joined_at, wm.role, member_counts.member_count
        `;
        params = [workspaceId, userId];
      } else {
        // Get workspace without user context
        query = `
          SELECT 
            w.*,
            COALESCE(member_counts.member_count, 0) as member_count
          FROM workspaces w
          LEFT JOIN (
            SELECT 
              workspace_id, 
              COUNT(*) as member_count 
            FROM workspace_members 
            WHERE is_active = true 
            GROUP BY workspace_id
          ) member_counts ON w.id = member_counts.workspace_id
          WHERE w.id = $1 AND w.is_active = true
        `;
        params = [workspaceId];
      }

      const result = await this.database.query<UserWorkspace>(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const workspace = result.rows[0];
      if (workspace.user_roles) {
        workspace.highest_role = this.getHighestRole(workspace.user_roles);
      }

      logger.debug('Retrieved workspace by ID', { workspaceId, userId });
      return workspace;
    } catch (error) {
      logger.error('Error getting workspace by ID', { workspaceId, userId, error });
      throw new Error(`Failed to get workspace: ${error.message}`);
    }
  }

  /**
   * Get workspace by slug
   */
  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    try {
      const query = `
        SELECT 
          w.*,
          COALESCE(member_counts.member_count, 0) as member_count
        FROM workspaces w
        LEFT JOIN (
          SELECT 
            workspace_id, 
            COUNT(*) as member_count 
          FROM workspace_members 
          WHERE is_active = true 
          GROUP BY workspace_id
        ) member_counts ON w.id = member_counts.workspace_id
        WHERE w.slug = $1 AND w.is_active = true
      `;

      const result = await this.database.query<Workspace>(query, [slug]);

      if (result.rows.length === 0) {
        return null;
      }

      logger.debug('Retrieved workspace by slug', { slug });
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting workspace by slug', { slug, error });
      throw new Error(`Failed to get workspace by slug: ${error.message}`);
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    workspaceData: CreateWorkspaceRequest,
    ownerId: string
  ): Promise<Workspace> {
    const client = await this.database.query('BEGIN');
    
    try {
      // Generate slug if not provided
      const slug = workspaceData.slug || this.generateSlug(workspaceData.name);
      
      // Check if slug already exists
      const existingSlug = await this.database.query(
        'SELECT id FROM workspaces WHERE slug = $1',
        [slug]
      );

      if (existingSlug.rows.length > 0) {
        throw new Error('Workspace slug already exists');
      }

      // Create workspace
      const workspaceQuery = `
        INSERT INTO workspaces (
          name, slug, description, logo_url, settings, owner_id, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        RETURNING *
      `;

      const workspaceResult = await this.database.query<Workspace>(workspaceQuery, [
        workspaceData.name,
        slug,
        workspaceData.description || null,
        workspaceData.logo_url || null,
        workspaceData.settings || {},
        ownerId
      ]);

      const workspace = workspaceResult.rows[0];

      // Add owner as admin member
      const ownerRoleQuery = `
        SELECT id FROM roles WHERE name = 'owner' OR name = 'admin' ORDER BY level DESC LIMIT 1
      `;
      const roleResult = await this.database.query(ownerRoleQuery);
      
      if (roleResult.rows.length > 0) {
        await this.database.query(`
          INSERT INTO workspace_members (workspace_id, user_id, role_id, is_active, joined_at)
          VALUES ($1, $2, $3, true, NOW())
        `, [workspace.id, ownerId, roleResult.rows[0].id]);
      }

      await this.database.query('COMMIT');

      logger.info('Created new workspace', { 
        workspaceId: workspace.id, 
        name: workspace.name, 
        ownerId 
      });

      return workspace;
    } catch (error) {
      await this.database.query('ROLLBACK');
      logger.error('Error creating workspace', { workspaceData, ownerId, error });
      throw new Error(`Failed to create workspace: ${error.message}`);
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    updateData: UpdateWorkspaceRequest,
    userId: string
  ): Promise<Workspace> {
    try {
      // Check if user has permission to update workspace
      const hasPermission = await this.checkUserPermission(userId, workspaceId, ['workspace.update', 'workspace.admin']);
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update workspace');
      }

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        setClause.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }

      if (updateData.logo_url !== undefined) {
        setClause.push(`logo_url = $${paramIndex++}`);
        values.push(updateData.logo_url);
      }

      if (updateData.settings !== undefined) {
        setClause.push(`settings = $${paramIndex++}`);
        values.push(updateData.settings);
      }

      if (updateData.is_active !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`);
        values.push(updateData.is_active);
      }

      setClause.push(`updated_at = NOW()`);
      values.push(workspaceId);

      const query = `
        UPDATE workspaces 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.database.query<Workspace>(query, values);

      if (result.rows.length === 0) {
        throw new Error('Workspace not found');
      }

      logger.info('Updated workspace', { workspaceId, updateData, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating workspace', { workspaceId, updateData, userId, error });
      throw new Error(`Failed to update workspace: ${error.message}`);
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    try {
      // Check if user is workspace owner
      const workspace = await this.getWorkspaceById(workspaceId);
      
      if (!workspace || workspace.owner_id !== userId) {
        throw new Error('Only workspace owner can delete workspace');
      }

      // Soft delete
      await this.database.query(
        'UPDATE workspaces SET is_active = false, updated_at = NOW() WHERE id = $1',
        [workspaceId]
      );

      logger.info('Deleted workspace', { workspaceId, userId });
    } catch (error) {
      logger.error('Error deleting workspace', { workspaceId, userId, error });
      throw new Error(`Failed to delete workspace: ${error.message}`);
    }
  }

  /**
   * Check if user has access to workspace
   */
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1
        FROM workspace_members wm
        INNER JOIN workspaces w ON wm.workspace_id = w.id
        WHERE wm.user_id = $1 
          AND wm.workspace_id = $2
          AND wm.is_active = true
          AND w.is_active = true
        LIMIT 1
      `;

      const result = await this.database.query(query, [userId, workspaceId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking workspace access', { userId, workspaceId, error });
      return false;
    }
  }

  /**
   * Check user permissions in workspace
   */
  async checkUserPermission(
    userId: string, 
    workspaceId: string, 
    requiredPermissions: string[]
  ): Promise<boolean> {
    try {
      const query = `
        SELECT DISTINCT p.name
        FROM workspace_members wm
        INNER JOIN roles r ON wm.role_id = r.id
        INNER JOIN role_permissions rp ON r.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE wm.user_id = $1 
          AND wm.workspace_id = $2
          AND wm.is_active = true
          AND p.name = ANY($3)
      `;

      const result = await this.database.query(query, [userId, workspaceId, requiredPermissions]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking user permissions', { userId, workspaceId, requiredPermissions, error });
      return false;
    }
  }

  /**
   * Helper method to get highest role from role array
   */
  private getHighestRole(roles: string[]): string {
    const roleHierarchy = ['owner', 'admin', 'manager', 'editor', 'viewer', 'member'];
    
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    
    return roles[0] || 'member';
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<any> {
    try {
      const queries = [
        // Member count
        this.database.query(
          'SELECT COUNT(*) as member_count FROM workspace_members WHERE workspace_id = $1 AND is_active = true',
          [workspaceId]
        ),
        // Dashboard count (if dashboards table exists)
        this.database.query(
          'SELECT COUNT(*) as dashboard_count FROM dashboards WHERE workspace_id = $1',
          [workspaceId]
        ).catch(() => ({ rows: [{ dashboard_count: 0 }] })),
        // Dataset count (if datasets table exists)
        this.database.query(
          'SELECT COUNT(*) as dataset_count FROM datasets WHERE workspace_id = $1',
          [workspaceId]
        ).catch(() => ({ rows: [{ dataset_count: 0 }] })),
      ];

      const [memberResult, dashboardResult, datasetResult] = await Promise.all(queries);

      return {
        member_count: parseInt(memberResult.rows[0].member_count),
        dashboard_count: parseInt(dashboardResult.rows[0].dashboard_count),
        dataset_count: parseInt(datasetResult.rows[0].dataset_count),
      };
    } catch (error) {
      logger.error('Error getting workspace stats', { workspaceId, error });
      return {
        member_count: 0,
        dashboard_count: 0,
        dataset_count: 0,
      };
    }
  }
}

export default WorkspaceService;