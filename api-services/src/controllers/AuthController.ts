// api-services/src/controllers/AuthController.ts - Complete Version
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
    console.log('✅ AuthController initialized with AuthService');
  }

  /**
   * Login user with optional workspace
   * POST /api/auth/login
   */
  public login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      console.log('🔑 AuthController: Login request received');
      const { email, username, password, workspace_slug } = req.body;
      const emailOrUsername = email || username;

      // Validate required fields
      if (!emailOrUsername || !password) {
        console.log('⚠️ AuthController: Missing credentials');
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
        console.log('⚠️ AuthController: Login failed -', result.error);
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

      console.log('✅ AuthController: Login successful');
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
            user_id: result.user?.id,
            username: result.user?.username,
            email: result.user?.email,
            first_name: result.user?.first_name,
            last_name: result.user?.last_name,
            avatar_url: result.user?.avatar_url,
            display_name: result.user?.first_name && result.user?.last_name 
              ? `${result.user.first_name} ${result.user.last_name}` 
              : result.user?.username
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
          } : undefined,
          permissions: result.permissions || [],
          login_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ AuthController: Login error:', error);
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
      console.log('🔄 AuthController: Switch workspace request received');
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;
      const { workspace_slug } = req.body;

      // Validate authentication
      if (!userId || !userEmail) {
        console.log('⚠️ AuthController: Missing authentication');
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
        console.log('⚠️ AuthController: Missing workspace slug');
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
        console.log('⚠️ AuthController: Workspace switch failed -', result.error);
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
          error: 'WORKSPACE_SWITCH_FAILED'
        });
        return;
      }

      console.log('✅ AuthController: Workspace switch successful');
      logger.info('Workspace switch successful', {
        userId,
        userEmail,
        workspaceId: result.workspace?.id,
        workspaceName: result.workspace?.name,
        service: 'bi-platform-api'
      });

      res.status(200).json({
        success: true,
        message: 'Workspace switched successfully',
        data: {
          token: result.token,
          workspace: result.workspace ? {
            id: result.workspace.id,
            name: result.workspace.name,
            slug: result.workspace.slug,
            display_name: result.workspace.display_name,
            description: result.workspace.description,
            logo_url: result.workspace.logo_url,
            user_role: result.workspace.user_role,
            member_count: result.workspace.member_count,
            dashboard_count: result.workspace.dashboard_count,
            dataset_count: result.workspace.dataset_count
          } : undefined ,
          permissions: result.permissions || [],
          switched_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ AuthController: Switch workspace error:', error);
      logger.error('Switch workspace controller error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
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
   * Logout user
   * POST /api/auth/logout
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      logger.info('Logout request', {
        userId,
        userEmail,
        ip: req.ip,
        service: 'bi-platform-api'
      });

      // For now, we just invalidate on client side
      // In the future, we could maintain a token blacklist
      
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: {
          logged_out_at: new Date().toISOString()
        }
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
   * Get current user profile
   * GET /api/auth/me
   */
  public getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const user = await this.authService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          user: {
            user_id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            display_name: user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user.username,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      });

    } catch (error: any) {
      logger.error('Get current user controller error:', {
        error: error.message,
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
 * Refresh authentication token
 * POST /api/auth/refresh
 */
public refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const workspaceId = req.user?.workspace_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to refresh token',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    // Get fresh user data
    const user = await this.authService.getUserById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
      return;
    }

    // Check if user is still active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'User account is inactive',
        error: 'USER_INACTIVE'
      });
      return;
    }

    // Get workspace info if available
    let workspaceInfo = null;
    let userPermissions: { permissions: string[] } = { permissions: [] };
    
    if (workspaceId) {
      try {
        // Get workspace information (you'll need to implement this method or adjust based on your workspace service)
        // workspaceInfo = await this.authService.getWorkspaceById(workspaceId);
        
        // For now, we'll get permissions and reconstruct basic workspace info from the user data
        userPermissions = await this.authService.getUserPermissions(userId, workspaceId);
        
        // If you have workspace data available in the token, you can use it
        workspaceInfo = {
          id: workspaceId,
          slug: req.user?.workspace_slug,
          name: req.user?.workspace_slug, // fallback
          display_name: req.user?.workspace_slug,
          user_role: req.user?.workspace_role
        };
      } catch (error: any) {
        logger.warn('Failed to get workspace info during token refresh:', {
          error: error.message,
          userId,
          workspaceId,
          service: 'bi-platform-api'
        });
        // Continue without workspace info rather than failing
      }
    }

    // Generate new token with fresh permissions
    const token = this.authService.generateAuthToken(user, workspaceInfo);

    logger.info('Token refreshed successfully', {
      userId: user.id,
      email: user.email,
      workspaceId,
      permissionCount: userPermissions.permissions.length,
      service: 'bi-platform-api'
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        user: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          display_name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.username
        },
        workspace: workspaceInfo ? {
          id: workspaceInfo.id,
          name: workspaceInfo.name,
          slug: workspaceInfo.slug,
          display_name: workspaceInfo.display_name,
          user_role: workspaceInfo.user_role
        } : null,
        permissions: userPermissions.permissions || [],
        refreshed_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Refresh token controller error:', {
      error: error.message,
      stack: error.stack,
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