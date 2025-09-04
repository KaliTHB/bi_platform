// api-services/src/services/AuthService.ts
import bcrypt from 'bcryptjs';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  branding_config: any;
  theme_config: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AuthService extends DatabaseService {
  constructor() {
    super();
  }

  async authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, 
               avatar_url, is_active, created_at, updated_at
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await this.query(query, [email]);
      const user = result.rows[0];
      console.log("user",user)

      if (!user) {
        logger.warn('Authentication failed: User not found', { email });
        return null;
      }
      logger.warn(password);
      logger.warn(user.password_hash);
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        logger.warn('Authentication failed: Invalid password', { email, userId: user.id });
        return null;
      }

      // Remove password_hash from returned user object
      const { password_hash, ...authenticatedUser } = user;
      
      logger.info('User authenticated successfully', { 
        userId: authenticatedUser.id, 
        email: authenticatedUser.email 
      });
      
      return authenticatedUser;
    } catch (error) {
      logger.error('Authentication service error:', {
        email,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      const query = `
        SELECT id, email, first_name, last_name, 
               avatar_url, profile_data, is_active, last_login_at,
               created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  async getWorkspaceBySlug(slug: string): Promise<WorkspaceInfo | null> {
    try {
      const query = `
        SELECT id, name, display_name, description, slug, 
               branding_config, theme_config, is_active,
               created_at, updated_at
        FROM workspaces 
        WHERE slug = $1 AND is_active = true
      `;
      
      const result = await this.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get workspace by slug error:', error);
      throw error;
    }
  }

  async getWorkspaceById(workspaceId: string): Promise<WorkspaceInfo | null> {
    try {
      const query = `
        SELECT id, name, display_name, description, slug, 
               branding_config, theme_config, is_active,
               created_at, updated_at
        FROM workspaces 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.query(query, [workspaceId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get workspace by ID error:', error);
      throw error;
    }
  }

  async checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles cr ON ura.role_id = cr.id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2
          AND ura.is_active = true
          AND cr.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      `;
      
      const result = await this.query(query, [userId, workspaceId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Check user workspace access error:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await this.query(query, [userId]);
      logger.debug('Updated last login for user', { userId });
    } catch (error) {
      logger.error('Update last login error:', error);
      throw error;
    }
  }
}