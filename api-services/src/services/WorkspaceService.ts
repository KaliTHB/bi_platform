// api-services/src/services/WorkspaceService.ts
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { db as defaultDb } from '../utils/database'; // Import the default database connection

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_role?: string;
  user_roles?: string[];
  highest_role?: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  joined_at?: string;
}

export interface WorkspaceStats {
  member_count: number;
  dashboard_count: number;
  dataset_count: number;
  chart_count: number;
  data_source_count: number;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  user?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export class WorkspaceService {
  private db: Pool;

  constructor(db?: Pool) {
    // Use provided database connection or fall back to default
    this.db = db || defaultDb;
    
    if (!this.db) {
      logger.error('WorkspaceService: No database connection provided');
      throw new Error('Database connection is required for WorkspaceService');
    }
    
    logger.info('WorkspaceService initialized with database connection');
  }

  /**
   * Get all workspaces accessible to a user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    if (!userId) {
      logger.error('getUserWorkspaces called without userId');
      throw new Error('User ID is required');
    }

    try {
      logger.info('Getting workspaces for user', { userId });

      // Main query to get user workspaces with role information
      const workspaceQuery = `
        SELECT DISTINCT 
          w.id,
          w.name,
          w.slug,
          w.display_name,
          w.description,
          w.logo_url,
          w.settings as settings,
          w.is_active,
          w.created_at,
          w.updated_at,
          ura.assigned_at,
          -- Get the highest role for the user
          COALESCE(cr.name, r.name) as user_role,
          -- Collect all roles for this user in this workspace
          array_agg(DISTINCT COALESCE(cr.name, r.name)) as user_roles
        FROM workspaces w
        INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
        LEFT JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
          AND ura.is_active = true 
          AND w.is_active = true
        GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
                 w.logo_url, w.settings, w.is_active, w.created_at, 
                 w.updated_at, ura.assigned_at, COALESCE(cr.name, r.name)
        ORDER BY w.name ASC
      `;

      const workspaceResult = await this.db.query(workspaceQuery, [userId]);

      if (workspaceResult.rows.length === 0) {
        logger.info('No workspaces found for user', { userId });
        return [];
      }

      // Get workspace statistics for each workspace
      const workspaceIds = workspaceResult.rows.map(row => row.id);
      const statsQuery = `
        SELECT 
          workspace_id,
          -- Count of active members
          (SELECT COUNT(DISTINCT ura.user_id) 
           FROM user_role_assignments ura 
           WHERE ura.workspace_id = w.id AND ura.is_active = true) as member_count,
          -- Count of dashboards
          (SELECT COUNT(*) 
           FROM dashboards d 
           WHERE d.workspace_id = w.id AND d.is_active = true) as dashboard_count,
          -- Count of datasets
          (SELECT COUNT(*) 
           FROM datasets ds 
           WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
        FROM workspaces w
        WHERE w.id = ANY($1::uuid[])
      `;

      const statsResult = await this.db.query(statsQuery, [workspaceIds]);
      const statsMap = new Map(statsResult.rows.map(row => [row.workspace_id, row]));

      // Determine the highest role priority for each workspace
      const roleHierarchy: Record<string, number> = {
        'owner': 100,
        'admin': 80,
        'editor': 60,
        'viewer': 40,
        'guest': 20
      };

      const workspaces: Workspace[] = workspaceResult.rows.map(row => {
        const stats = statsMap.get(row.id) || { 
          member_count: 0, 
          dashboard_count: 0, 
          dataset_count: 0 
        };

        // Determine highest role
        const roles = row.user_roles || [];
        const highestRole = roles.reduce((highest, role) => {
          const currentPriority = roleHierarchy[role] || 0;
          const highestPriority = roleHierarchy[highest] || 0;
          return currentPriority > highestPriority ? role : highest;
        }, roles[0] || 'viewer');

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          display_name: row.display_name,
          description: row.description,
          logo_url: row.logo_url,
          settings: row.settings || {},
          is_active: row.is_active,
          created_at: row.created_at?.toISOString(),
          updated_at: row.updated_at?.toISOString(),
          joined_at: row.joined_at?.toISOString(),
          user_role: row.user_role,
          user_roles: roles,
          highest_role: highestRole,
          member_count: parseInt(stats.member_count) || 0,
          dashboard_count: parseInt(stats.dashboard_count) || 0,
          dataset_count: parseInt(stats.dataset_count) || 0
        };
      });

      logger.info('Retrieved workspaces successfully', {
        userId,
        workspaceCount: workspaces.length,
        workspaceIds: workspaces.map(w => w.id)
      });

      return workspaces;

    } catch (error: any) {
      logger.error('Error getting user workspaces:', {
        userId,
        error: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });

      // More specific error handling
      if (error.code === '22P02') {
        throw new Error('Invalid user ID format provided');
      } else if (error.code === '42P01') {
        throw new Error('Database schema error: Required tables not found');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Database connection failed');
      } else if (error.code === '53300') {
        throw new Error('Database connection limit reached');
      }

      throw new Error(`Failed to retrieve user workspaces: ${error.message}`);
    }
  }

  /**
   * Get workspace by ID or slug
   */
  async getWorkspaceById(workspaceId: string, userId: string): Promise<Workspace | null> {
    if (!workspaceId || !userId) {
      logger.error('getWorkspaceById called with missing parameters', { workspaceId, userId });
      throw new Error('Workspace ID and User ID are required');
    }

    try {
      logger.info('Getting workspace by ID', { workspaceId, userId });

      // Query to get a specific workspace by ID or slug for a user
      const workspaceQuery = `
        SELECT DISTINCT 
          w.id,
          w.name,
          w.slug,
          w.display_name,
          w.description,
          w.logo_url,
          w.settings as settings,
          w.is_active,
          w.created_at,
          w.updated_at,
          ura.assigned_at,
          COALESCE(cr.name, r.name) as user_role,
          array_agg(DISTINCT COALESCE(cr.name, r.name)) as user_roles
        FROM workspaces w
        INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
        LEFT JOIN roles r ON ura.role_id = r.id 
        WHERE ura.user_id = $1 
          AND (w.id = $2 OR w.slug = $2)
          AND ura.is_active = true 
          AND w.is_active = true
        GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
                 w.logo_url, w.settings, w.is_active, w.created_at, 
                 w.updated_at, ura.assigned_at, COALESCE(cr.name, r.name)
        LIMIT 1
      `;

      const result = await this.db.query(workspaceQuery, [userId, workspaceId]);

      if (result.rows.length === 0) {
        logger.info('Workspace not found or user has no access', { workspaceId, userId });
        return null;
      }

      const row = result.rows[0];

      // Get workspace statistics
      const statsQuery = `
        SELECT 
          (SELECT COUNT(DISTINCT ura.user_id) 
           FROM user_role_assignments ura 
           WHERE ura.workspace_id = $1 AND ura.is_active = true) as member_count,
          (SELECT COUNT(*) 
           FROM dashboards d 
           WHERE d.workspace_id = $1 AND d.is_active = true) as dashboard_count,
          (SELECT COUNT(*) 
           FROM datasets ds 
           WHERE ds.workspace_id = $1 AND ds.is_active = true) as dataset_count
      `;

      const statsResult = await this.db.query(statsQuery, [row.id]);
      const stats = statsResult.rows[0] || { member_count: 0, dashboard_count: 0, dataset_count: 0 };

      const workspace: Workspace = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        display_name: row.display_name,
        description: row.description,
        logo_url: row.logo_url,
        settings: row.settings || {},
        is_active: row.is_active,
        created_at: row.created_at?.toISOString(),
        updated_at: row.updated_at?.toISOString(),
        joined_at: row.joined_at?.toISOString(),
        user_role: row.user_role,
        user_roles: row.user_roles || [],
        member_count: parseInt(stats.member_count) || 0,
        dashboard_count: parseInt(stats.dashboard_count) || 0,
        dataset_count: parseInt(stats.dataset_count) || 0
      };

      logger.info('Workspace retrieved successfully', { workspaceId: workspace.id, userId });
      return workspace;

    } catch (error: any) {
      logger.error('Error getting workspace by ID:', {
        workspaceId,
        userId,
        error: error.message,
        stack: error.stack,
        code: error.code
      });

      // Specific error handling
      if (error.code === '22P02') {
        throw new Error('Invalid workspace ID or user ID format provided');
      } else if (error.code === '42P01') {
        throw new Error('Database schema error: Required tables not found');
      }

      throw new Error(`Failed to retrieve workspace: ${error.message}`);
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(
    data: {
      name: string;
      slug?: string;
      description?: string;
      settings?: any;
    }, 
    userId: string
  ): Promise<Workspace> {
    if (!data.name || !userId) {
      logger.error('createWorkspace called with missing parameters', { data, userId });
      throw new Error('Workspace name and User ID are required');
    }

    try {
      logger.info('Creating new workspace', { name: data.name, userId });

      // Generate slug if not provided
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');

      // Check if workspace with same name or slug exists
      const existingCheck = await this.db.query(
        'SELECT id FROM workspaces WHERE name = $1 OR slug = $2',
        [data.name, slug]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error('Workspace with this name or slug already exists');
      }

      // Create workspace
      const workspaceQuery = `
        INSERT INTO workspaces (name, slug, display_name, description, settings, owner_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const workspaceResult = await this.db.query(workspaceQuery, [
        data.name,
        slug,
        data.name, // display_name defaults to name
        data.description || '',
        JSON.stringify(data.settings || {}),
        userId
      ]);

      const newWorkspace = workspaceResult.rows[0];

      // Assign the creator as owner
      const ownerRoleQuery = `
        SELECT id FROM roles WHERE name = 'owner' AND is_system = true
      `;
      const ownerRoleResult = await this.db.query(ownerRoleQuery);

      if (ownerRoleResult.rows.length > 0) {
        await this.db.query(
          'INSERT INTO user_role_assignments (workspace_id, user_id, role_id, is_active, joined_at, created_at, updated_at) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [newWorkspace.id, userId, ownerRoleResult.rows[0].id]
        );
      }

      const workspace: Workspace = {
        id: newWorkspace.id,
        name: newWorkspace.name,
        slug: newWorkspace.slug,
        display_name: newWorkspace.display_name,
        description: newWorkspace.description,
        logo_url: newWorkspace.logo_url,
        settings: newWorkspace.settings || {},
        is_active: newWorkspace.is_active,
        created_at: newWorkspace.created_at?.toISOString(),
        updated_at: newWorkspace.updated_at?.toISOString(),
        user_role: 'owner',
        user_roles: ['owner'],
        member_count: 1,
        dashboard_count: 0,
        dataset_count: 0
      };

      logger.info('Workspace created successfully', { 
        workspaceId: workspace.id, 
        name: workspace.name, 
        userId 
      });

      return workspace;

    } catch (error: any) {
      logger.error('Error creating workspace:', {
        data,
        userId,
        error: error.message,
        stack: error.stack,
        code: error.code
      });

      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Workspace with this name or slug already exists');
      } else if (error.code === '22P02') {
        throw new Error('Invalid user ID format provided');
      }

      throw new Error(`Failed to create workspace: ${error.message}`);
    }
  }

  /**
   * Check if user has access to workspace
   */
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1 
        FROM user_role_assignments ura
        INNER JOIN workspaces w ON ura.workspace_id = w.id
        WHERE ura.user_id = $1 
          AND (w.id = $2 OR w.slug = $2)
          AND ura.is_active = true
          AND w.is_active = true
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [userId, workspaceId]);
      return result.rows.length > 0;
    } catch (error: any) {
      logger.error('Error checking workspace access:', {
        userId,
        workspaceId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(DISTINCT ura.user_id) 
           FROM user_role_assignments ura 
           WHERE ura.workspace_id = $1 AND ura.is_active = true) as member_count,
          (SELECT COUNT(*) 
           FROM dashboards d 
           WHERE d.workspace_id = $1 AND d.is_active = true) as dashboard_count,
          (SELECT COUNT(*) 
           FROM datasets ds 
           WHERE ds.workspace_id = $1 AND ds.is_active = true) as dataset_count,
          (SELECT COUNT(*) 
           FROM charts c
           INNER JOIN dashboards d ON c.dashboard_id = d.id
           WHERE d.workspace_id = $1 AND c.is_active = true AND d.is_active = true) as chart_count,
          (SELECT COUNT(*) 
           FROM data_sources dss 
           WHERE dss.workspace_id = $1 AND dss.is_active = true) as data_source_count
      `;

      const result = await this.db.query(query, [workspaceId]);
      const stats = result.rows[0] || {
        member_count: 0,
        dashboard_count: 0,
        dataset_count: 0,
        chart_count: 0,
        data_source_count: 0
      };

      return {
        member_count: parseInt(stats.member_count) || 0,
        dashboard_count: parseInt(stats.dashboard_count) || 0,
        dataset_count: parseInt(stats.dataset_count) || 0,
        chart_count: parseInt(stats.chart_count) || 0,
        data_source_count: parseInt(stats.data_source_count) || 0
      };
    } catch (error: any) {
      logger.error('Error getting workspace stats:', {
        workspaceId,
        error: error.message
      });
      throw new Error('Failed to retrieve workspace statistics');
    }
  }
}