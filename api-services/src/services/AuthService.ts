// api-services/src/services/AuthService.ts - Fixed database usage
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

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
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  role?: string;
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
    if (!database) {
      throw new Error('Database pool is required for AuthService');
    }
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

      // Query user by email or username - Use this.db consistently
      const result = await this.db.query(
        `SELECT id, username, email, password_hash, first_name, last_name,
                avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE (email = $1 OR username = $1) AND is_active = true`,
        [emailOrUsername]
      );
      
      const user = result.rows[0];
      console.log(user);
      
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
        SELECT w.id, w.name, w.slug, w.description, w.is_active, 
               w.created_at, w.updated_at
        FROM workspaces w
        WHERE w.slug = $1 AND w.is_active = true
      `;
      
      const params = [workspaceSlug];
      
      if (userId) {
        query = `
          SELECT w.id, w.name, w.slug, w.description, w.is_active, 
                 w.created_at, w.updated_at,
                 ura.role_name as role, ura.role_level,
                 ura.created_at as joined_at
          FROM workspaces w
          LEFT JOIN user_role_assignments ura ON w.id = ura.workspace_id AND ura.user_id = $2
          WHERE w.slug = $1 AND w.is_active = true
        `;
        params.push(userId);
      }
      
      const result = await this.db.query(query, params);
      return result.rows[0] || null;
      
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
   * Get user permissions for a workspace
   */
  async getUserPermissions(userId: string, workspaceId: string): Promise<UserPermissions> {
    try {
      const query = `
        SELECT ura.role_name, ura.role_level, r.permissions
        FROM user_role_assignments ura
        LEFT JOIN roles r ON ura.role_name = r.name AND ura.workspace_id = r.workspace_id
        WHERE ura.user_id = $1 AND ura.workspace_id = $2 AND ura.is_active = true
      `;
      
      const result = await this.db.query(query, [userId, workspaceId]);
      
      if (result.rows.length === 0) {
        return {
          permissions: [],
          roles: [],
          is_admin: false,
          role_level: 0
        };
      }
      
      const userRoles = result.rows;
      const permissions = new Set<string>();
      const roles: string[] = [];
      let maxRoleLevel = 0;
      
      userRoles.forEach(role => {
        if (role.role_name) {
          roles.push(role.role_name);
          maxRoleLevel = Math.max(maxRoleLevel, role.role_level || 0);
          
          if (role.permissions) {
            role.permissions.forEach((perm: string) => permissions.add(perm));
          }
        }
      });
      
      return {
        permissions: Array.from(permissions),
        roles,
        is_admin: maxRoleLevel >= 100, // Admin level threshold
        role_level: maxRoleLevel
      };
      
    } catch (error: any) {
      logger.error('Get user permissions error:', {
        userId,
        workspaceId,
        error: error.message,
        service: 'bi-platform-api'
      });
      return {
        permissions: [],
        roles: [],
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
      await this.db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } catch (error: any) {
      logger.error('Update last login error:', {
        userId,
        error: error.message,
        service: 'bi-platform-api'
      });
    }
  }
}