// api-services/src/services/AuthService.ts - Complete Implementation
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { db } from '../utils/database';  // ← Add this import at the top

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user_role?: string;
  role_display_name?: string;
  role_level?: number;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  joined_at?: Date;
}

export interface UserPermissions {
  permissions: string[];
  roles: string[];
  is_admin: boolean;
  role_level: number;
}

export interface LoginResult {
  success: boolean;
  user?: AuthenticatedUser;
  workspace?: WorkspaceInfo;
  token?: string;
  permissions?: string[];
  error?: string;
}

export interface WorkspaceSwitchResult {
  success: boolean;
  workspace?: WorkspaceInfo;
  token?: string;
  permissions?: string[];
  error?: string;
}

export class AuthService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Authenticate user with email/username and password
   */
  async authenticateUser(emailOrUsername: string, password: string): Promise<AuthenticatedUser | null> {
    try {
      logger.info('Authenticating user', { 
        emailOrUsername,
        service: 'bi-platform-api' 
      });

      // Query user by email or username
      const result = await db.query(
        `SELECT id, username, email, password_hash, first_name, last_name,
                avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE (email = $1 OR username = $1) AND is_active = true`,
        [emailOrUsername]
      );
      const user = result.rows[0];
      console.log(user)
      if (!user) {
        logger.warn('Authentication failed: User not found', { emailOrUsername });
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        logger.warn('Authentication failed: Invalid password', { 
          emailOrUsername, 
          userId: user.id 
        });
        return null;
      }

      // Remove password_hash from returned user object
      const { password_hash, ...authenticatedUser } = user;
      
      logger.info('User authenticated successfully', { 
        userId: authenticatedUser.id, 
        email: authenticatedUser.email 
      });
      
      return authenticatedUser;
      
    } catch (error: any) {
      logger.error('Authentication service error:', {
        emailOrUsername,
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      const query = `
        SELECT id, username, email, first_name, last_name, 
               avatar_url, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
      
    } catch (error: any) {
      logger.error('Get user by ID error:', {
        userId,
        error: error.message,
        service: 'bi-platform-api'
      });
      return null;
    }
  }

  /**
   * Get workspace by slug and verify user access
   */
  async getWorkspaceBySlug(workspaceSlug: string, userId?: string): Promise<WorkspaceInfo | null> {
    try {
      let query = `
        SELECT DISTINCT 
          w.id, w.name, w.slug, w.display_name, w.description,
          w.branding_config->>'logo_url' as logo_url,
          w.settings_json as settings,
          w.is_active, w.created_at, w.updated_at
        FROM workspaces w
        WHERE w.slug = $1 AND w.is_active = true
      `;
      
      const params = [workspaceSlug];
      
      // If userId provided, also get user's role information
      if (userId) {
        query = `
          SELECT DISTINCT 
            w.id, w.name, w.slug, w.display_name, w.description,
            w.branding_config->>'logo_url' as logo_url,
            w.settings_json as settings,
            w.is_active, w.created_at, w.updated_at,
            wm.joined_at,
            r.name as user_role,
            r.display_name as role_display_name,
            r.level as role_level,
            
            -- Get workspace statistics
            (SELECT COUNT(*) FROM workspace_members wm2 
             WHERE wm2.workspace_id = w.id AND wm2.is_active = true) as member_count,
            (SELECT COUNT(*) FROM dashboards d 
             WHERE d.workspace_id = w.id AND d.is_active = true) as dashboard_count,
            (SELECT COUNT(*) FROM datasets ds 
             WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
             
          FROM workspaces w
          LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
          LEFT JOIN roles r ON wm.role_id = r.id
          WHERE w.slug = $1 AND w.is_active = true
        `;
        params.push(userId);
      }

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        display_name: row.display_name,
        description: row.description,
        logo_url: row.logo_url,
        settings: row.settings || {},
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_role: row.user_role,
        role_display_name: row.role_display_name,
        role_level: row.role_level,
        member_count: parseInt(row.member_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0,
        joined_at: row.joined_at
      };
      
    } catch (error: any) {
      logger.error('Get workspace by slug error:', {
        workspaceSlug,
        userId,
        error: error.message,
        service: 'bi-platform-api'
      });
      return null;
    }
  }

  /**
   * Check if user has access to workspace
   */
  async checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
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

      const result = await this.db.query(query, [userId, workspaceId]);
      return result.rows.length > 0;
      
    } catch (error: any) {
      logger.error('Check user workspace access error:', {
        userId,
        workspaceId,
        error: error.message,
        service: 'bi-platform-api'
      });
      return false;
    }
  }

  /**
   * Get user permissions for a workspace
   */
  async getUserPermissions(userId: string, workspaceId: string): Promise<UserPermissions> {
    try {
      const permissionsQuery = `
        SELECT DISTINCT 
          p.name as permission_name,
          r.name as role_name,
          r.display_name as role_display_name,
          r.level as role_level
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN workspace_members wm ON r.id = wm.role_id
        WHERE wm.user_id = $1 
          AND wm.workspace_id = $2
          AND wm.is_active = true
          
        UNION
        
        -- Also check user_role_assignments table if it exists
        SELECT DISTINCT 
          p.name as permission_name,
          r.name as role_name,
          r.display_name as role_display_name,
          r.level as role_level
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN user_role_assignments ura ON r.id = ura.role_id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      `;

      const result = await this.db.query(permissionsQuery, [userId, workspaceId]);

      const permissions = [...new Set(result.rows.map(row => row.permission_name))];
      const roles = [...new Set(result.rows.map(row => row.role_name))];
      const maxRoleLevel = Math.max(...result.rows.map(row => row.role_level || 0), 0);

      // Determine admin status based on role level or role name
      const isAdmin = maxRoleLevel >= 90 || 
                     roles.includes('admin') || 
                     roles.includes('owner') || 
                     roles.includes('super_admin');

      return {
        permissions,
        roles,
        is_admin: isAdmin,
        role_level: maxRoleLevel
      };
      
    } catch (error: any) {
      logger.error('Get user permissions error:', {
        userId,
        workspaceId,
        error: error.message,
        service: 'bi-platform-api'
      });
      
      // Return basic permissions as fallback
      return {
        permissions: ['workspace.read'],
        roles: ['viewer'],
        is_admin: false,
        role_level: 0
      };
    }
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `;
      
      await this.db.query(query, [userId]);
      
    } catch (error: any) {
      logger.warn('Update last login failed:', {
        userId,
        error: error.message,
        service: 'bi-platform-api'
      });
      // Non-critical error, don't throw
    }
  }

  /**
   * Generate JWT token with user and workspace context
   */
  generateToken(user: AuthenticatedUser, workspace?: WorkspaceInfo, permissions?: UserPermissions): string {
    const payload = {
      user_id: user.id,
      email: user.email,
      username: user.username,
      workspace_id: workspace?.id || null,
      workspace_slug: workspace?.slug || null,
      workspace_role: workspace?.user_role || null,
      is_admin: permissions?.is_admin || false,
      role_level: permissions?.role_level || 0
    };
    return jwt.sign(
  {
    user_id: user.id,
    email: user.email,
    workspace_id: workspace?.id || null,
  },
  process.env.JWT_SECRET as string || 'your-jwt-secret',
  { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'bi-platform-api',
        subject: user.id
      } as jwt.SignOptions
);
  }

  /**
   * Login user with optional workspace
   */
  async login(emailOrUsername: string, password: string, workspaceSlug?: string): Promise<LoginResult> {
    try {
      // Authenticate user
      const user = await this.authenticateUser(emailOrUsername, password);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      let workspace: WorkspaceInfo | null = null;
      let permissions: UserPermissions | null = null;

      // Get workspace if provided
      if (workspaceSlug) {
        workspace = await this.getWorkspaceBySlug(workspaceSlug, user.id);
        if (!workspace) {
          return {
            success: false,
            error: 'Workspace not found or access denied'
          };
        }

        // Check access
        const hasAccess = await this.checkUserWorkspaceAccess(user.id, workspace.id);
        if (!hasAccess) {
          return {
            success: false,
            error: 'Access denied to workspace'
          };
        }

        // Get permissions
        permissions = await this.getUserPermissions(user.id, workspace.id);
      }

      // Update last login (non-blocking)
      this.updateLastLogin(user.id).catch(error => {
        logger.warn('Failed to update last login:', error);
      });

      // Generate token
      const token = this.generateToken(user, workspace || undefined, permissions || undefined);

      return {
        success: true,
        user,
        workspace: workspace || undefined,
        token,
        permissions: permissions?.permissions || []
      };
      
    } catch (error: any) {
      logger.error('Login service error:', {
        emailOrUsername,
        workspaceSlug,
        error: error.message,
        service: 'bi-platform-api'
      });
      
      return {
        success: false,
        error: 'Login service error'
      };
    }
  }

  /**
   * Switch user workspace
   */
  async switchWorkspace(userId: string, workspaceSlug: string): Promise<WorkspaceSwitchResult> {
    try {
      // Get workspace with user context
      const workspace = await this.getWorkspaceBySlug(workspaceSlug, userId);
      if (!workspace) {
        return {
          success: false,
          error: 'Workspace not found'
        };
      }

      // Verify access
      const hasAccess = await this.checkUserWorkspaceAccess(userId, workspace.id);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied to workspace'
        };
      }

      // Get user info
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get permissions
      const permissions = await this.getUserPermissions(userId, workspace.id);

      // Generate new token
      const token = this.generateToken(user, workspace, permissions);

      return {
        success: true,
        workspace,
        token,
        permissions: permissions.permissions
      };
      
    } catch (error: any) {
      logger.error('Switch workspace service error:', {
        userId,
        workspaceSlug,
        error: error.message,
        service: 'bi-platform-api'
      });
      
      return {
        success: false,
        error: 'Workspace switch service error'
      };
    }
  }
}