// api-services/src/controllers/UserController.ts - Complete Updated Version
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id?: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  roles?: string[];
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_default?: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export class UserController {
  /**
   * Get user's default workspace
   * Returns "THB" workspace for admin users during bootstrap phase
   */
  public async getDefaultWorkspace(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      // Validate authentication
      if (!userId || !userEmail) {
        logger.warn('Default workspace requested without proper authentication', {
          userId: userId || 'undefined',
          userEmail: userEmail || 'undefined',
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required to access default workspace',
          error: 'AUTHENTICATION_REQUIRED',
          data: null
        });
        return;
      }

      logger.info('Getting default workspace for user', {
        userId,
        userEmail,
        service: 'bi-platform-api'
      });

      // Check if user is admin (customize this logic as needed)
      const isAdmin = this.checkAdminAccess(userEmail);
      
      if (isAdmin) {
        // Return THB workspace for admin users
        const thbWorkspace: Workspace = {
          id: 'thb-workspace-001',
          name: 'THB',
          display_name: 'The Hub',
          slug: 'thb',
          description: 'Default administrative workspace for system administrators',
          logo_url: null,
          user_count: 1,
          dashboard_count: 0,
          dataset_count: 0,
          is_default: true,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        };

        logger.info('Returning THB workspace for admin user', {
          userId,
          userEmail,
          workspace: thbWorkspace.name,
          workspaceId: thbWorkspace.id,
          service: 'bi-platform-api'
        });

        res.status(200).json({
          success: true,
          message: 'Default workspace retrieved successfully',
          workspace: thbWorkspace,
          metadata: {
            user_role: 'admin',
            workspace_access: 'full',
            retrieved_at: new Date().toISOString()
          }
        });
        return;
      }

      // For non-admin users
      logger.info('No default workspace configured for non-admin user', {
        userId,
        userEmail,
        userType: 'standard',
        service: 'bi-platform-api'
      });

      res.status(200).json({
        success: true,
        message: 'No default workspace assigned. Please contact administrator for workspace access.',
        workspace: null,
        metadata: {
          user_role: 'standard',
          requires_assignment: true,
          contact_admin: true
        }
      });

    } catch (error: any) {
      logger.error('Critical error getting default workspace:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.user_id,
        userEmail: req.user?.email,
        service: 'bi-platform-api'
      });

      // Return structured error for frontend handling
      res.status(500).json({
        success: false,
        message: 'Unable to retrieve default workspace due to server error',
        error: 'INTERNAL_SERVER_ERROR',
        workspace: null,
        details: process.env.NODE_ENV === 'development' ? error.message : 'Contact system administrator',
        retry_after: 30
      });
    }
  }

  /**
   * Get all workspaces available to the user
   * This will be used by the workspace selector
   */
  public async getUserWorkspaces(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      // Validate authentication
      if (!userId || !userEmail) {
        logger.warn('User workspaces requested without proper authentication', {
          userId: userId || 'undefined',
          userEmail: userEmail || 'undefined',
          service: 'bi-platform-api'
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required to access workspaces',
          error: 'AUTHENTICATION_REQUIRED',
          workspaces: []
        });
        return;
      }

      logger.info('Getting available workspaces for user', {
        userId,
        userEmail,
        service: 'bi-platform-api'
      });

      const workspaces: Workspace[] = [];
      const isAdmin = this.checkAdminAccess(userEmail);
      
      if (isAdmin) {
        // Admin users get access to all workspaces
        workspaces.push({
          id: 'thb-workspace-001',
          name: 'THB',
          display_name: 'The Hub',
          slug: 'thb',
          description: 'Primary administrative workspace with full system access',
          logo_url: null,
          user_count: 1,
          dashboard_count: 0,
          dataset_count: 0,
          is_default: true,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        });

        // Future: Add more workspaces from database
        // const additionalWorkspaces = await this.getWorkspacesFromDatabase(userId, 'admin');
        // workspaces.push(...additionalWorkspaces);
      } else {
        // Future: Query database for user-specific workspaces
        // const userWorkspaces = await this.getWorkspacesFromDatabase(userId, 'standard');
        // workspaces.push(...userWorkspaces);
        
        logger.info('No workspaces available for standard user', {
          userId,
          userEmail,
          userType: 'standard',
          service: 'bi-platform-api'
        });
      }

      logger.info('Returning available workspaces', {
        userId,
        userEmail,
        workspaceCount: workspaces.length,
        userType: isAdmin ? 'admin' : 'standard',
        service: 'bi-platform-api'
      });

      res.status(200).json({
        success: true,
        message: workspaces.length > 0 
          ? 'Workspaces retrieved successfully' 
          : 'No workspaces available. Contact administrator for access.',
        workspaces,
        metadata: {
          total_count: workspaces.length,
          user_role: isAdmin ? 'admin' : 'standard',
          has_admin_access: isAdmin,
          retrieved_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Critical error getting user workspaces:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.user?.user_id,
        userEmail: req.user?.email,
        service: 'bi-platform-api'
      });

      // Return structured error for frontend handling
      res.status(500).json({
        success: false,
        message: 'Unable to retrieve workspaces due to server error',
        error: 'INTERNAL_SERVER_ERROR',
        workspaces: [],
        details: process.env.NODE_ENV === 'development' ? error.message : 'Contact system administrator',
        retry_after: 30
      });
    }
  }

  /**
   * Get all users (existing method - enhanced with error handling)
   */
  public async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Implementation for getting users
      // This is a placeholder - implement based on your database structure
      
      logger.info('Getting all users', {
        requestedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      // Mock response - replace with actual database query
      const users: User[] = [
        {
          id: req.user?.user_id || 'user-1',
          username: 'admin',
          email: req.user?.email || 'admin@localhost.com',
          first_name: 'System',
          last_name: 'Administrator',
          display_name: 'Admin User',
          avatar_url: null,
          roles: ['admin'],
          is_active: true,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users,
        metadata: {
          total: users.length,
          page: 1,
          limit: 50,
          total_pages: 1
        }
      });

    } catch (error: any) {
      logger.error('Error getting users:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve users',
        error: 'INTERNAL_SERVER_ERROR',
        data: []
      });
    }
  }

  /**
   * Create new user (existing method - enhanced with error handling)
   */
  public async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username, email, first_name, last_name, roles } = req.body;

      // Validation
      if (!username || !email || !first_name || !last_name) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          error: 'VALIDATION_ERROR',
          required_fields: ['username', 'email', 'first_name', 'last_name']
        });
        return;
      }

      logger.info('Creating new user', {
        username,
        email,
        createdBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      // Mock implementation - replace with actual user creation logic
      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        email,
        first_name,
        last_name,
        display_name: `${first_name} ${last_name}`,
        avatar_url: null,
        roles: roles || ['viewer'],
        is_active: true,
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });

    } catch (error: any) {
      logger.error('Error creating user:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to create user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Update user (existing method - enhanced with error handling)
   */
  public async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'VALIDATION_ERROR'
        });
        return;
      }

      logger.info('Updating user', {
        userId,
        updatedBy: req.user?.user_id,
        updates: Object.keys(updates),
        service: 'bi-platform-api'
      });

      // Mock implementation - replace with actual update logic
      const updatedUser: User = {
        id: userId,
        username: updates.username || 'admin',
        email: updates.email || 'admin@localhost.com',
        first_name: updates.first_name || 'System',
        last_name: updates.last_name || 'Administrator',
        display_name: updates.display_name || 'Admin User',
        avatar_url: updates.avatar_url || null,
        roles: updates.roles || ['admin'],
        is_active: updates.is_active !== undefined ? updates.is_active : true,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });

    } catch (error: any) {
      logger.error('Error updating user:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.params.userId,
        requestedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to update user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Delete user (existing method - enhanced with error handling)
   */
  public async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'VALIDATION_ERROR'
        });
        return;
      }

      logger.info('Deleting user', {
        userId,
        deletedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      // Mock implementation - replace with actual deletion logic
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: { deleted_user_id: userId }
      });

    } catch (error: any) {
      logger.error('Error deleting user:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        userId: req.params.userId,
        requestedBy: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Unable to delete user',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Private helper method to check admin access
   * Customize this logic based on your requirements
   */
  private checkAdminAccess(email: string): boolean {
    // Current logic: check email patterns
    const adminPatterns = [
      '@localhost.com',
      'admin@',
      'administrator@',
      'root@',
      'sysadmin@'
    ];

    const isAdmin = adminPatterns.some(pattern => 
      email.toLowerCase().includes(pattern.toLowerCase())
    );

    // Future: Replace with proper role-based checking
    // const user = await this.getUserByEmail(email);
    // return user.roles.includes('admin') || user.roles.includes('super_admin');

    return isAdmin;
  }
}