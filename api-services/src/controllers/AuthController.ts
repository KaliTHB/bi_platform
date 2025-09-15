// api-services/src/controllers/AuthController.ts
// REPLACE YOUR ENTIRE FILE WITH THIS VERSION

import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { PermissionService } from '../services/PermissionService';  // ✅ ADD THIS IMPORT
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/express';
import { db } from '../utils/database';

export class AuthController {
  private authService: AuthService;
  private permissionService: PermissionService;  // ✅ ADD THIS PROPERTY

  constructor() {
    this.authService = new AuthService(db);
     // Verify all methods are bound correctly
    console.log('🔍 AuthController constructor - methods available:', {
      getUserPermissions: typeof this.getUserPermissions === 'function',
      login: typeof this.login === 'function',
      logout: typeof this.logout === 'function',
      getCurrentUser: typeof this.getCurrentUser === 'function',
      refreshToken: typeof this.refreshToken === 'function',
      switchWorkspace: typeof this.switchWorkspace === 'function'
    });
    // ✅ INITIALIZE PERMISSION SERVICE
    this.permissionService = new PermissionService(db);
  }

  /**
   * User Login - Keep existing login logic
   * POST /api/auth/login
   */
  public login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // ✅ FIXED: Accept both email and username fields separately
      const { email, username, password, workspace_slug } = req.body;
      const emailOrUsername = email || username;

      console.log('📧 Email received:', email);
      console.log('👤 Username received:', username);
      console.log('🔗 EmailOrUsername:', emailOrUsername);
      console.log('🔑 Password received:', password ? '[PRESENT]' : '[MISSING]');
      console.log('🏢 Workspace slug:', workspace_slug);
      
      // Validate input
      if (!emailOrUsername || !password) {
        res.status(400).json({
          success: false,
          message: 'Email/username and password are required',
          error: 'MISSING_CREDENTIALS'
        });
        return;
      }

      logger.info('Login attempt', {
        emailOrUsername: emailOrUsername.toLowerCase(),
        workspace_slug,
        ip: req.ip,
        service: 'bi-platform-api'
      });

      // Attempt login using AuthService
      const result = await this.authService.login(emailOrUsername, password, workspace_slug);

      if (!result.success) {
        logger.warn('Login failed', {
          emailOrUsername: emailOrUsername.toLowerCase(),
          workspace_slug,
          error: result.error,
          ip: req.ip,
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: result.message || 'Login failed',
          error: result.error || 'AUTHENTICATION_FAILED'
        });
        return;
      }

      logger.info('Login successful', {
        userId: result.user?.id,
        email: result.user?.email,
        workspaceId: result.workspace?.id,
        service: 'bi-platform-api'
      });

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
      logger.error('Login controller error', {
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
   * ✅ UPDATED: Get User Permissions - NOW USES YOUR PERMISSION SERVICE
   * GET /api/auth/permissions?workspace_id=xxx
   */
  public getUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // ✅ DEBUG: Check authentication state
      console.log('🔍 DEBUG:', {
        hasReqUser: !!req.user,
        userId: req.user?.user_id,
        authHeader: !!req.headers.authorization
      });

      if (!req.user) {
        logger.error('AuthController: Authentication required', {
          path: req.path,
          hasAuthHeader: !!req.headers.authorization,
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          permissions: [],
          roles: []
        });
        return;
      }

      const userId = req.user.user_id;
      const workspaceId = req.query.workspace_id as string || req.user.workspace_id;

      // Validate userId
      if (!userId) {
        logger.error('AuthController: Invalid user ID', {
          reqUser: req.user,
          service: 'bi-platform-api'
        });

        res.status(400).json({
          success: false,
          message: 'Invalid authentication token',
          error: 'INVALID_USER_TOKEN',
          permissions: [],
          roles: []
        });
        return;
      }

      console.log('🔍 AuthController: Getting permissions for user:', { 
        userId, 
        workspaceId,
        userEmail: req.user.email 
      });

      // If no workspace ID, get user's first workspace
      if (!workspaceId) {
        try {
          const userWorkspaces = await this.authService.getUserWorkspaces(userId);
          
          if (!userWorkspaces?.length) {
            res.status(400).json({
              success: false,
              message: 'No accessible workspaces found',
              error: 'NO_WORKSPACES',
              permissions: [],
              roles: []
            });
            return;
          }

          const firstWorkspace = userWorkspaces[0];
          
          // ✅ USE YOUR PERMISSION SERVICE
          const effectivePermissions = await this.permissionService.getUserEffectivePermissions(
            userId, 
            firstWorkspace.id
          );

          const userRoles = await this.permissionService.getUserRoles(userId, firstWorkspace.id);

          // Check admin using your permission system
          const isAdmin = await this.permissionService.hasPermission(userId, firstWorkspace.id, 'workspace.admin') ||
                         effectivePermissions.includes('*');

          console.log('✅ AuthController: Permissions retrieved using PermissionService:', {
            userId,
            workspaceId: firstWorkspace.id,
            permissionCount: effectivePermissions.length,
            roleCount: userRoles.length,
            isAdmin
          });

          res.status(200).json({
            success: true,
            message: 'Permissions retrieved successfully using PermissionService',
            permissions: effectivePermissions,
            roles: userRoles.map(role => role.name),
            role_details: userRoles,
            is_admin: isAdmin,
            role_level: isAdmin ? 100 : 0,
            user_info: {
              user_id: userId,
              email: req.user.email,
              workspace_id: firstWorkspace.id
            },
            workspace_used: firstWorkspace
          });
          return;

        } catch (workspaceError: any) {
          logger.error('AuthController: Error finding user workspace', {
            error: workspaceError.message,
            userId,
            service: 'bi-platform-api'
          });

          res.status(400).json({
            success: false,
            message: 'Workspace ID required',
            error: 'MISSING_WORKSPACE_ID',
            permissions: [],
            roles: []
          });
          return;
        }
      }

      // ✅ GET PERMISSIONS FOR SPECIFIC WORKSPACE USING YOUR PERMISSION SERVICE
      try {
        console.log('🔍 AuthController: Using PermissionService for workspace:', workspaceId);

        const effectivePermissions = await this.permissionService.getUserEffectivePermissions(
          userId, 
          workspaceId
        );

        const userRoles = await this.permissionService.getUserRoles(userId, workspaceId);

        const isAdmin = await this.permissionService.hasPermission(userId, workspaceId, 'workspace.admin') ||
                       await this.permissionService.hasPermission(userId, workspaceId, '*') ||
                       effectivePermissions.includes('workspace.admin') ||
                       effectivePermissions.includes('*');

        console.log('✅ AuthController: PermissionService results:', {
          userId,
          workspaceId,
          permissionCount: effectivePermissions.length,
          roleCount: userRoles.length,
          isAdmin,
          samplePermissions: effectivePermissions.slice(0, 5)
        });

        res.status(200).json({
          success: true,
          message: 'Permissions retrieved successfully using PermissionService',
          permissions: effectivePermissions,
          roles: userRoles.map(role => role.name),
          role_details: userRoles,
          is_admin: isAdmin,
          role_level: isAdmin ? 100 : 0,
          user_info: {
            user_id: userId,
            email: req.user.email,
            workspace_id: workspaceId
          }
        });

      } catch (permissionError: any) {
        logger.error('AuthController: PermissionService error', {
          error: permissionError.message,
          stack: permissionError.stack,
          userId,
          workspaceId,
          service: 'bi-platform-api'
        });

        res.status(200).json({
          success: true,
          message: 'Permissions retrieved with limited access',
          permissions: [],
          roles: [],
          role_details: [],
          is_admin: false,
          role_level: 0,
          user_info: {
            user_id: userId,
            email: req.user.email,
            workspace_id: workspaceId
          },
          warning: 'Could not retrieve full permissions from PermissionService'
        });
      }

    } catch (error: any) {
      logger.error('AuthController: Get user permissions error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve permissions',
        error: 'INTERNAL_SERVER_ERROR',
        permissions: [],
        roles: []
      });
    }
  };

  /**
   * ✅ NEW: Check specific permission
   * POST /api/auth/check-permission
   */
  public checkPermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const { permission, workspace_id } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          has_permission: false
        });
        return;
      }

      if (!permission) {
        res.status(400).json({
          success: false,
          message: 'Permission name required',
          has_permission: false
        });
        return;
      }

      const workspaceId = workspace_id || req.user.workspace_id;
      
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          has_permission: false
        });
        return;
      }

      // ✅ USE YOUR PERMISSION SERVICE
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        workspaceId, 
        permission
      );

      res.status(200).json({
        success: true,
        has_permission: hasPermission,
        permission: permission,
        user_id: userId,
        workspace_id: workspaceId
      });

    } catch (error: any) {
      logger.error('AuthController: Check permission error', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        has_permission: false
      });
    }
  };

  /**
   * ✅ NEW: Check multiple permissions
   * POST /api/auth/check-permissions
   */
  public checkMultiplePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const { permissions, workspace_id } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          permissions: {}
        });
        return;
      }

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: 'Permissions array required',
          permissions: {}
        });
        return;
      }

      const workspaceId = workspace_id || req.user.workspace_id;
      
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          permissions: {}
        });
        return;
      }

      // ✅ CHECK ALL PERMISSIONS USING YOUR PERMISSION SERVICE
      const permissionResults: { [key: string]: boolean } = {};
      
      for (const permission of permissions) {
        permissionResults[permission] = await this.permissionService.hasPermission(
          userId,
          workspaceId,
          permission
        );
      }

      res.status(200).json({
        success: true,
        permissions: permissionResults,
        user_id: userId,
        workspace_id: workspaceId
      });

    } catch (error: any) {
      logger.error('AuthController: Check multiple permissions error', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        permissions: {}
      });
    }
  };
  
  /**
   * Get current user profile - KEEP EXISTING
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
              : user?.username,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at
          }
        }
      });

    } catch (error: any) {
      logger.error('AuthController: Get current user error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve user profile',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Switch workspace - KEEP EXISTING
   * POST /api/auth/switch-workspace
   */
  public switchWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;
      const { workspace_id } = req.body;

      if (!userId || !userEmail) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspace_id) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      const result = await this.authService.switchWorkspace(userId, workspace_id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to switch workspace',
          error: result.error || 'WORKSPACE_SWITCH_FAILED'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Workspace switched successfully',
        data: {
          token: result.token,
          workspace: result.workspace,
          permissions: result.permissions || [],
          user_info: {
            user_id: userId,
            email: userEmail,
            workspace_id: workspace_id
          }
        }
      });

    } catch (error: any) {
      logger.error('AuthController: Switch workspace error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Refresh Token - KEEP EXISTING
   * POST /api/auth/refresh
   */
  public refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.user?.workspace_id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
        return;
      }

      let workspace = null;
      if (workspaceId) {
        workspace = await this.authService.getWorkspaceById(workspaceId);
      }

      const newToken = await this.authService.generateJWTToken(user, workspace);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          expires_in: 15 * 60,
          user_info: {
            user_id: userId,
            email: user.email,
            workspace_id: workspaceId
          }
        }
      });

    } catch (error: any) {
      logger.error('AuthController: Refresh token error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: 'REFRESH_FAILED'
      });
    }
  };

  /**
   * Logout - KEEP EXISTING
   * POST /api/auth/logout
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;

      if (userId) {
        logger.info('User logged out', {
          userId,
          ip: req.ip,
          service: 'bi-platform-api'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error: any) {
      logger.error('AuthController: Logout error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: 'LOGOUT_FAILED'
      });
    }
  };
}