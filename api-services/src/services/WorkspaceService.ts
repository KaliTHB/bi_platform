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

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  created_at: string;
}

export interface WorkspaceUsage {
  workspace_id: string;
  total_queries: number;
  total_dashboards: number;
  total_charts: number;
  total_datasets: number;
  total_users: number;
  storage_used: number;
  last_activity: string;
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
   * Invite user to workspace via email
   */
  async inviteUserToWorkspace(
    workspaceId: string,
    email: string,
    roleName: string,
    invitedByUserId: string,
    expiresInDays: number = 7
  ): Promise<WorkspaceInvitation> {
    if (!workspaceId || !email || !roleName || !invitedByUserId) {
      throw new Error('All parameters are required');
    }

    try {
      logger.info('Inviting user to workspace', { workspaceId, email, roleName, invitedByUserId });

      // Check if inviting user has permission
      const hasAccess = await this.hasWorkspaceAccess(invitedByUserId, workspaceId);
      if (!hasAccess) {
        throw new Error('User does not have permission to invite users to this workspace');
      }

      // Generate invitation token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Create invitation
      const invitationQuery = `
        INSERT INTO workspace_invitations 
        (workspace_id, email, role, invited_by, token, expires_at, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await this.db.query(invitationQuery, [
        workspaceId, email, roleName, invitedByUserId, token, expiresAt
      ]);

      const invitation: WorkspaceInvitation = {
        id: result.rows[0].id,
        workspace_id: result.rows[0].workspace_id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        invited_by: result.rows[0].invited_by,
        invited_at: result.rows[0].created_at.toISOString(),
        expires_at: result.rows[0].expires_at.toISOString(),
        status: result.rows[0].status,
        token: result.rows[0].token
      };

      logger.info('User invited to workspace successfully', { workspaceId, email, invitationId: invitation.id });
      return invitation;

    } catch (error: any) {
      logger.error('Error inviting user to workspace:', {
        workspaceId,
        email,
        roleName,
        error: error.message,
        code: error.code
      });

      if (error.code === '23505') {
        throw new Error('User already invited to this workspace');
      }

      throw new Error(`Failed to invite user to workspace: ${error.message}`);
    }
  }

  /**
   * Get workspace invitations
   */
  async getWorkspaceInvitations(workspaceId: string, userId: string): Promise<WorkspaceInvitation[]> {
    try {
      // Check access
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new Error('User does not have access to this workspace');
      }

      const query = `
        SELECT 
          wi.*,
          u.first_name || ' ' || u.last_name as invited_by_name
        FROM workspace_invitations wi
        LEFT JOIN users u ON wi.invited_by = u.id
        WHERE wi.workspace_id = $1
        ORDER BY wi.created_at DESC
      `;

      const result = await this.db.query(query, [workspaceId]);

      const invitations: WorkspaceInvitation[] = result.rows.map(row => ({
        id: row.id,
        workspace_id: row.workspace_id,
        email: row.email,
        role: row.role,
        invited_by: row.invited_by,
        invited_at: row.created_at?.toISOString(),
        expires_at: row.expires_at?.toISOString(),
        status: row.status,
        token: row.token
      }));

      return invitations;

    } catch (error: any) {
      logger.error('Error getting workspace invitations:', {
        workspaceId,
        userId,
        error: error.message
      });
      throw new Error(`Failed to retrieve workspace invitations: ${error.message}`);
    }
  }

  /**
   * Accept workspace invitation
   */
  async acceptInvitation(token: string, acceptingUserId: string): Promise<boolean> {
    if (!token || !acceptingUserId) {
      throw new Error('Token and user ID are required');
    }

    try {
      logger.info('Accepting workspace invitation', { token: token.substring(0, 8) + '...', acceptingUserId });

      // Get invitation
      const invitationQuery = `
        SELECT * FROM workspace_invitations 
        WHERE token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `;

      const invitationResult = await this.db.query(invitationQuery, [token]);

      if (invitationResult.rows.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      const invitation = invitationResult.rows[0];

      // Get user email to verify
      const userResult = await this.db.query('SELECT email FROM users WHERE id = $1', [acceptingUserId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      if (userResult.rows[0].email !== invitation.email) {
        throw new Error('Invitation email does not match user email');
      }

      // Start transaction
      await this.db.query('BEGIN');

      try {
        // Add user to workspace
        await this.addUserToWorkspace(
          invitation.workspace_id,
          acceptingUserId,
          invitation.role,
          invitation.invited_by
        );

        // Update invitation status
        await this.db.query(`
          UPDATE workspace_invitations 
          SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
          WHERE token = $1
        `, [token]);

        await this.db.query('COMMIT');

        logger.info('Workspace invitation accepted successfully', { 
          workspaceId: invitation.workspace_id, 
          acceptingUserId 
        });

        return true;

      } catch (error) {
        await this.db.query('ROLLBACK');
        throw error;
      }

    } catch (error: any) {
      logger.error('Error accepting workspace invitation:', {
        token: token.substring(0, 8) + '...',
        acceptingUserId,
        error: error.message
      });
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  /**
   * Reject workspace invitation
   */
  async rejectInvitation(token: string): Promise<boolean> {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      logger.info('Rejecting workspace invitation', { token: token.substring(0, 8) + '...' });

      const result = await this.db.query(`
        UPDATE workspace_invitations 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE token = $1 AND status = 'pending'
        RETURNING id
      `, [token]);

      const success = result.rows.length > 0;

      if (success) {
        logger.info('Workspace invitation rejected successfully');
      }

      return success;

    } catch (error: any) {
      logger.error('Error rejecting workspace invitation:', {
        token: token.substring(0, 8) + '...',
        error: error.message
      });
      throw new Error(`Failed to reject invitation: ${error.message}`);
    }
  }

  /**
   * Get workspace activity log
   */
  async getWorkspaceActivity(
    workspaceId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkspaceActivity[]> {
    try {
      // Check access
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new Error('User does not have access to this workspace');
      }

      const query = `
        SELECT 
          wa.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM workspace_activity wa
        LEFT JOIN users u ON wa.user_id = u.id
        WHERE wa.workspace_id = $1
        ORDER BY wa.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, [workspaceId, limit, offset]);

      const activities: WorkspaceActivity[] = result.rows.map(row => ({
        id: row.id,
        workspace_id: row.workspace_id,
        user_id: row.user_id,
        action: row.action,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        details: row.details,
        created_at: row.created_at?.toISOString()
      }));

      return activities;

    } catch (error: any) {
      logger.error('Error getting workspace activity:', {
        workspaceId,
        userId,
        error: error.message
      });
      throw new Error(`Failed to retrieve workspace activity: ${error.message}`);
    }
  }

  /**
   * Log workspace activity
   */
  async logActivity(
    workspaceId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO workspace_activity 
        (workspace_id, user_id, action, resource_type, resource_id, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        workspaceId,
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null
      ]);

    } catch (error: any) {
      logger.error('Error logging workspace activity:', {
        workspaceId,
        userId,
        action,
        error: error.message
      });
      // Don't throw error for logging failures
    }
  }

  /**
   * Get workspace usage statistics
   */
  async getWorkspaceUsage(workspaceId: string, userId: string): Promise<WorkspaceUsage> {
    try {
      // Check access
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new Error('User does not have access to this workspace');
      }

      const query = `
        SELECT 
          $1 as workspace_id,
          (SELECT COUNT(*) FROM query_logs WHERE workspace_id = $1) as total_queries,
          (SELECT COUNT(*) FROM dashboards WHERE workspace_id = $1 AND is_active = true) as total_dashboards,
          (SELECT COUNT(*) FROM charts c 
           INNER JOIN dashboards d ON c.dashboard_id = d.id 
           WHERE d.workspace_id = $1 AND c.is_active = true AND d.is_active = true) as total_charts,
          (SELECT COUNT(*) FROM datasets WHERE workspace_id = $1 AND is_active = true) as total_datasets,
          (SELECT COUNT(DISTINCT user_id) FROM user_role_assignments WHERE workspace_id = $1 AND is_active = true) as total_users,
          0 as storage_used, -- Would need separate storage tracking
          (SELECT MAX(created_at) FROM workspace_activity WHERE workspace_id = $1) as last_activity
      `;

      const result = await this.db.query(query, [workspaceId]);
      const row = result.rows[0];

      const usage: WorkspaceUsage = {
        workspace_id: row.workspace_id,
        total_queries: parseInt(row.total_queries) || 0,
        total_dashboards: parseInt(row.total_dashboards) || 0,
        total_charts: parseInt(row.total_charts) || 0,
        total_datasets: parseInt(row.total_datasets) || 0,
        total_users: parseInt(row.total_users) || 0,
        storage_used: parseInt(row.storage_used) || 0,
        last_activity: row.last_activity?.toISOString() || ''
      };

      return usage;

    } catch (error: any) {
      logger.error('Error getting workspace usage:', {
        workspaceId,
        userId,
        error: error.message
      });
      throw new Error(`Failed to retrieve workspace usage: ${error.message}`);
    }
  }

  /**
   * Bulk operations for workspace management
   */
  async bulkAddUsersToWorkspace(
    workspaceId: string,
    userEmails: string[],
    roleName: string,
    addedByUserId: string
  ): Promise<{ successful: string[], failed: { email: string, error: string }[] }> {
    const successful: string[] = [];
    const failed: { email: string, error: string }[] = [];

    for (const email of userEmails) {
      try {
        // First find user by email
        const userResult = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
          failed.push({ email, error: 'User not found' });
          continue;
        }

        const userId = userResult.rows[0].id;
        await this.addUserToWorkspace(workspaceId, userId, roleName, addedByUserId);
        successful.push(email);

      } catch (error: any) {
        failed.push({ email, error: error.message });
      }
    }

    logger.info('Bulk add users completed', { 
      workspaceId, 
      successful: successful.length, 
      failed: failed.length 
    });

    return { successful, failed };
  }

  /**
   * Generate workspace slug from name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
      .substring(0, 50);             // Limit length
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await this.db.query(`
        UPDATE workspace_invitations 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
        RETURNING id
      `);

      const expiredCount = result.rows.length;
      
      if (expiredCount > 0) {
        logger.info('Cleaned up expired invitations', { count: expiredCount });
      }

      return expiredCount;

    } catch (error: any) {
      logger.error('Error cleaning up expired invitations:', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get workspace by any identifier (ID, slug, or name)
   */
  async getWorkspaceByIdentifier(identifier: string, userId: string): Promise<Workspace | null> {
    try {
      const query = `
        SELECT DISTINCT 
          w.id, w.name, w.slug, w.display_name, w.description, w.logo_url,
          w.settings, w.is_active, w.created_at, w.updated_at,
          ura.assigned_at, r.name as user_role,
          array_agg(DISTINCT r.name) as user_roles
        FROM workspaces w
        INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
        LEFT JOIN roles r ON ura.role_id = r.id 
        WHERE ura.user_id = $1 
          AND (w.id = $2 OR w.slug = $2 OR w.name = $2)
          AND ura.is_active = true 
          AND w.is_active = true
        GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
                 w.logo_url, w.settings, w.is_active, w.created_at, 
                 w.updated_at, ura.assigned_at, r.name
        LIMIT 1
      `;

      const result = await this.db.query(query, [userId, identifier]);

      if (result.rows.length === 0) {
        return null;
      }

      // Use existing getWorkspaceById logic for full workspace details
      return this.getWorkspaceById(result.rows[0].id, userId);

    } catch (error: any) {
      logger.error('Error getting workspace by identifier:', {
        identifier,
        userId,
        error: error.message
      });
      return null;
    }
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
        -- Get the role name from roles table only
        r.name as user_role,
        -- Collect all roles for this user in this workspace
        array_agg(DISTINCT r.name) as user_roles
      FROM workspaces w
      INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
      GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
               w.logo_url, w.settings, w.is_active, w.created_at, 
               w.updated_at, ura.assigned_at, r.name
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
   id as workspace_id,
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
      }, roles[0] || 'guest');

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
        joined_at: row.assigned_at?.toISOString(),
        user_role: row.user_role,
        user_roles: row.user_roles || [],
        highest_role: highestRole,
        member_count: parseInt(stats.member_count) || 0,
        dashboard_count: parseInt(stats.dashboard_count) || 0,
        dataset_count: parseInt(stats.dataset_count) || 0
      };

      return workspace;
    });

    logger.info(`Successfully retrieved ${workspaces.length} workspaces for user`, { userId });
    return workspaces;

  } catch (error: any) {
    logger.error('Error getting user workspaces:', {
      userId,
      error: error.message,
      stack: error.stack,
      code: error.code
    });

    // Specific error handling
    if (error.code === '22P02') {
      throw new Error('Invalid user ID format provided');
    } else if (error.code === '42P01') {
      throw new Error('Database schema error: Required tables not found');
    }

    throw new Error(`Failed to retrieve workspaces: ${error.message}`);
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
        r.name as user_role,
        array_agg(DISTINCT r.name) as user_roles
      FROM workspaces w
      INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
      LEFT JOIN roles r ON ura.role_id = r.id 
      WHERE ura.user_id = $1 
        AND (w.id = $2 OR w.slug = $2)
        AND ura.is_active = true 
        AND w.is_active = true
      GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
               w.logo_url, w.settings, w.is_active, w.created_at, 
               w.updated_at, ura.assigned_at, r.name
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
      joined_at: row.assigned_at?.toISOString(),
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
           FROM datasources dss 
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