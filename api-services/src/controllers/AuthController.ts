// api-services/src/controllers/AuthController.ts - Fixed imports
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication'; // FIXED IMPORT
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Login user with optional workspace
   * POST /api/auth/login
   */
  public login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, username, password, workspace_slug } = req.body;
      const emailOrUsername = email || username;

      // Validate required fields
      if (!emailOrUsername || !password) {
        res.status(400).json({
          success: false,
          message: 'Email/username and password are required',
          error: 'MISSING_CREDENTIALS'
        });
        return;
      }

      logger.info('Login attempt', {
        emailOrUsername,
        workspaceSlug: workspace_slug,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        service: 'bi-platform-api'
      });

      // Use AuthService to handle login
      const result = await this.authService.login(emailOrUsername, password, workspace_slug);

      if (!result.success) {
        logger.warn('Login failed', {
          emailOrUsername,
          workspaceSlug: workspace_slug,
          error: result.error,
          ip: req.ip,
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: result.error || 'Authentication failed',
          error: 'AUTHENTICATION_FAILED'
        });
        return;
      }

      logger.info('Login successful', {
        userId: result.user?.id,
        email: result.user?.email,
        workspaceId: result.workspace?.id,
        workspaceName: result.workspace?.name,
        permissionCount: result.permissions?.length || 0,
        service: 'bi-platform-api'
      });

      // Send success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: result.token,
          user: {
            id: result.user?.id,
            username: result.user?.username,
            email: result.user?.email,
            first_name: result.user?.first_name,
            last_name: result.user?.last_name,
            avatar_url: result.user?.avatar_url
          },
          workspace: result.workspace ? {
            id: result.workspace.id,
            name: result.workspace.name,
            slug: result.workspace.slug,
            display_name: result.workspace.display_name,
            description: result.workspace.description,
            logo_url: result.workspace.logo_url,
            settings: result.workspace.settings,
            user_role: result.workspace.user_role,
            member_count: result.workspace.member_count,
            dashboard_count: result.workspace.dashboard_count,
            dataset_count: result.workspace.dataset_count
          } : null,
          permissions: result.permissions || [],
          login_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Login controller error:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Switch user workspace
   * POST /api/auth/switch-workspace
   */
  public switchWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;
      const { workspace_slug } = req.body;

      // Validate authentication
      if (!userId || !userEmail) {
        logger.warn('Workspace switch requested without proper authentication', {
          userId: userId || 'undefined',
          userEmail: userEmail || 'undefined',
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required to switch workspace',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Validate workspace_slug
      if (!workspace_slug || typeof workspace_slug !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Workspace slug is required',
          error: 'MISSING_WORKSPACE_SLUG'
        });
        return;
      }

      logger.info('Workspace switch attempt', {
        userId,
        userEmail,
        workspaceSlug: workspace_slug,
        ip: req.ip,
        service: 'bi-platform-api'
      });

      // Use AuthService to handle workspace switch
      const result = await this.authService.switchWorkspace(userId, workspace_slug);

      if (!result.success) {
        logger.warn('Workspace switch failed', {
          userId,
          userEmail,
          workspaceSlug: workspace_slug,
          error: result.error,
          service: 'bi-platform-api'
        });

        const statusCode = result.error?.includes('not found') ? 404 : 
                          result.error?.includes('denied') ? 403 : 400;

        res.status(statusCode).json({
          success: false,
          message: result.error || 'Workspace switch failed',
          error: result.error?.includes('not found') ? 'WORKSPACE_NOT_FOUND' :
                 result.error?.includes('denied') ? 'ACCESS_DENIED' : 'SWITCH_FAILED'
        });
        return;
      }

      logger.info('Workspace switch successful', {
        userId,
        userEmail,
        workspaceId: result.workspace?.id,
        workspaceName: result.workspace?.name,
        userRole: result.workspace?.user_role,
        permissionCount: result.permissions?.length || 0,
        service: 'bi-platform-api'
      });

      // Send success response
      res.status(200).json({
        success: true,
        message: 'Workspace switched successfully',
        data: {
          workspace: {
            id: result.workspace?.id,
            name: result.workspace?.name,
            slug: result.workspace?.slug,
            display_name: result.workspace?.display_name,
            description: result.workspace?.description,
            logo_url: result.workspace?.logo_url,
            settings: result.workspace?.settings,
            user_role: result.workspace?.user_role,
            role_display_name: result.workspace?.role_display_name,
            member_count: result.workspace?.member_count,
            dashboard_count: result.workspace?.dashboard_count,
            dataset_count: result.workspace?.dataset_count
          },
          token: result.token,
          permissions: result.permissions || [],
          switched_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Workspace switch controller error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        userEmail: req.user?.email,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during workspace switch',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Get current user profile with workspace info
   * GET /api/auth/me
   */
  public getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      
      if (!user || !user.user_id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Get additional user info from AuthService
      const userInfo = await this.authService.getUserById(user.user_id);
      
      if (!userInfo) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
        return;
      }

      // Get workspace info if user has workspace context
      let workspaceInfo = null;
      let permissions: string[] = [];
      
      if (user.workspace_id && user.workspace_slug) {
        const workspace = await this.authService.getWorkspaceBySlug(user.workspace_slug, user.user_id);
        if (workspace) {
          workspaceInfo = workspace;
          const userPermissions = await this.authService.getUserPermissions(user.user_id, user.workspace_id);
          permissions = userPermissions.permissions;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userInfo.id,
            username: userInfo.username,
            email: userInfo.email,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            avatar_url: userInfo.avatar_url,
            last_login: userInfo.last_login
          },
          workspace: workspaceInfo ? {
            id: workspaceInfo.id,
            name: workspaceInfo.name,
            slug: workspaceInfo.slug,
            display_name: workspaceInfo.display_name,
            user_role: workspaceInfo.user_role
          } : null,
          permissions,
          token_info: {
            user_id: user.user_id,
            email: user.email,
            workspace_id: user.workspace_id,
            workspace_slug: user.workspace_slug,
            workspace_role: user.workspace_role,
            is_admin: user.is_admin || false
          }
        }
      });

    } catch (error: any) {
      logger.error('Get current user controller error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error getting user profile',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      
      logger.info('User logout', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        service: 'bi-platform-api'
      });

      // In a complete implementation, you might:
      // - Add token to blacklist
      // - Clear refresh tokens
      // - Log audit event
      // - Clear user sessions

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        logged_out_at: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Logout controller error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  public refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      
      if (!user || !user.user_id) {
        res.status(401).json({
          success: false,
          message: 'Valid token required for refresh',
          error: 'INVALID_TOKEN'
        });
        return;
      }

      // Get fresh user data
      const userInfo = await this.authService.getUserById(user.user_id);
      if (!userInfo) {
        res.status(401).json({
          success: false,
          message: 'User no longer exists',
          error: 'USER_NOT_FOUND'
        });
        return;
      }

      // Get workspace info if available
      let workspaceInfo = null;
      let permissions = null;
      
      if (user.workspace_id && user.workspace_slug) {
        workspaceInfo = await this.authService.getWorkspaceBySlug(user.workspace_slug, user.user_id);
        if (workspaceInfo) {
          permissions = await this.authService.getUserPermissions(user.user_id, user.workspace_id);
        }
      }

      // Generate new token
      const newToken = this.authService.generateToken(userInfo, workspaceInfo || undefined, permissions || undefined);

      logger.info('Token refreshed', {
        userId: user.user_id,
        email: user.email,
        workspaceId: user.workspace_id,
        service: 'bi-platform-api'
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          user: {
            id: userInfo.id,
            username: userInfo.username,
            email: userInfo.email,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            avatar_url: userInfo.avatar_url
          },
          workspace: workspaceInfo ? {
            id: workspaceInfo.id,
            name: workspaceInfo.name,
            slug: workspaceInfo.slug,
            display_name: workspaceInfo.display_name,
            user_role: workspaceInfo.user_role
          } : null,
          permissions: permissions?.permissions || [],
          refreshed_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Refresh token controller error:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}

// ================================================================

// api-services/src/controllers/UserController.ts - Fixed imports
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication'; // FIXED IMPORT
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

      // Get user's workspaces through database query
      const query = `
        SELECT DISTINCT w.slug
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
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
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
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