// api-services/src/controllers/UserController.ts - Updated to use AuthService
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Pool } from 'pg';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class UserController {
  private db: Pool;
  private authService: AuthService;

  constructor(database: Pool, authService: AuthService) {
    this.db = database;
    this.authService = authService;
  }

  /**
   * Get user's default workspace using AuthService
   */
  public async getDefaultWorkspace(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        res.status(401).json({
          success: false,
          message: 'Authentication required to access default workspace',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      logger.info('Getting default workspace using AuthService', {
        userId,
        userEmail,
        service: 'bi-platform-api'
      });

      // Get user's workspaces through AuthService
      const query = `
        SELECT DISTINCT w.slug
        FROM workspaces w
        INNER JOIN user_role_assignments wm ON w.id = wm.workspace_id
        WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true
        ORDER BY wm.joined_at ASC
        LIMIT 1
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rows.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No default workspace assigned. Please select a workspace.',
          workspace: null
        });
        return;
      }

      // Use AuthService to get workspace with full details
      const workspaceSlug = result.rows[0].slug;
      const workspace = await this.authService.getWorkspaceBySlug(workspaceSlug, userId);

      if (!workspace) {
        res.status(200).json({
          success: true,
          message: 'No accessible workspace found.',
          workspace: null
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Default workspace retrieved successfully',
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name,
          description: workspace.description,
          logo_url: workspace.logo_url,
          user_count: workspace.member_count,
          dashboard_count: workspace.dashboard_count,
          dataset_count: workspace.dataset_count,
          is_default: true,
          role: workspace.user_role,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at,
          is_active: workspace.is_active
        }
      });

    } catch (error: any) {
      logger.error('Get default workspace error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve default workspace due to server error',
        error: 'INTERNAL_SERVER_ERROR',
        workspace: null
      });
    }
  }

  /**
   * Get all user workspaces using AuthService
   */
  public async getUserWorkspaces(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required to access workspaces',
          error: 'AUTHENTICATION_REQUIRED',
          workspaces: []
        });
        return;
      }

      // Get workspace slugs first
      const query = `
        SELECT DISTINCT w.slug
        FROM workspaces w
        INNER JOIN user_role_assignments wm ON w.id = wm.workspace_id
        WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true
        ORDER BY w.name ASC
      `;

      const result = await this.db.query(query, [userId]);
      const workspaces = [];

      // Use AuthService to get full workspace details for each
      for (const row of result.rows) {
        const workspace = await this.authService.getWorkspaceBySlug(row.slug, userId);
        if (workspace) {
          workspaces.push({
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            display_name: workspace.display_name,
            description: workspace.description,
            logo_url: workspace.logo_url,
            user_count: workspace.member_count,
            dashboard_count: workspace.dashboard_count,
            dataset_count: workspace.dataset_count,
            is_default: workspaces.length === 0, // First one is default
            role: workspace.user_role,
            created_at: workspace.created_at,
            updated_at: workspace.updated_at,
            is_active: workspace.is_active
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Workspaces retrieved successfully using AuthService',
        data: workspaces,
        workspaces: workspaces,
        count: workspaces.length
      });

    } catch (error: any) {
      logger.error('Get user workspaces error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve workspaces due to server error',
        error: 'INTERNAL_SERVER_ERROR',
        workspaces: []
      });
    }
  }

  /**
   * Get user permissions using AuthService
   */
  public async getUserPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.user?.workspace_id || req.query.workspace as string;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required to access permissions',
          error: 'AUTHENTICATION_REQUIRED',
          permissions: [],
          roles: []
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID required to get permissions',
          error: 'MISSING_WORKSPACE_ID',
          permissions: [],
          roles: []
        });
        return;
      }

      // Use AuthService to get permissions
      const userPermissions = await this.authService.getUserPermissions(userId, workspaceId);

      res.status(200).json({
        success: true,
        message: 'Permissions retrieved successfully using AuthService',
        permissions: userPermissions.permissions,
        roles: userPermissions.roles,
        user_info: {
          user_id: userId,
          email: req.user?.email,
          workspace_id: workspaceId,
          workspace_role: req.user?.workspace_role,
          is_admin: userPermissions.is_admin,
          role_level: userPermissions.role_level
        },
        retrieved_at: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Get user permissions error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve user permissions due to server error',
        error: 'INTERNAL_SERVER_ERROR',
        permissions: [],
        roles: []
      });
    }
  }

  // Placeholder methods
  public async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }
}