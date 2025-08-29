import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';

export interface LoginResult {
  user: any;
  token: string;
  refresh_token: string;
  workspace: any;
  permissions: string[];
  expires_at: Date;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  workspace_slug?: string;
}

export class AuthService {
  private db: DatabaseService;
  private cache: CacheService;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.db = new DatabaseService();
    this.cache = new CacheService();
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  async login(username: string, password: string, workspaceSlug: string): Promise<LoginResult> {
    try {
      // Find user
      const userQuery = `
        SELECT id, username, email, password_hash, first_name, last_name, is_active
        FROM users 
        WHERE username = $1 AND is_active = true
      `;
      const userResult = await this.db.query(userQuery, [username]);
      
      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }
      
      const user = userResult.rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      // Find workspace
      const workspaceQuery = `
        SELECT id, name, display_name, slug
        FROM workspaces 
        WHERE slug = $1 AND is_active = true
      `;
      const workspaceResult = await this.db.query(workspaceQuery, [workspaceSlug]);
      
      if (workspaceResult.rows.length === 0) {
        throw new Error('Workspace not found');
      }
      
      const workspace = workspaceResult.rows[0];
      
      // Check if user has access to workspace
      const accessQuery = `
        SELECT COUNT(*) as access_count
        FROM user_role_assignments ura
        JOIN custom_roles cr ON ura.role_id = cr.id
        WHERE ura.user_id = $1 
        AND ura.workspace_id = $2 
        AND ura.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
      `;
      const accessResult = await this.db.query(accessQuery, [user.id, workspace.id]);
      
      if (parseInt(accessResult.rows[0].access_count) === 0) {
        throw new Error('Access denied to workspace');
      }
      
      // Get user permissions for this workspace
      const permissions = await this.getUserPermissions(user.id, workspace.id);
      
      // Generate tokens
      const token = this.generateAccessToken(user, workspace);
      const refreshToken = this.generateRefreshToken(user.id);
      
      // Update last login
      await this.db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Cache user session
      await this.cache.set(`user:${user.id}:workspace:${workspace.id}`, {
        user: { ...user, password_hash: undefined },
        workspace,
        permissions
      }, 900); // 15 minutes
      
      return {
        user: { ...user, password_hash: undefined },
        token,
        refresh_token: refreshToken,
        workspace,
        permissions,
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      };
      
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<any> {
    try {
      // Check if username or email already exists
      const existingUserQuery = `
        SELECT id FROM users 
        WHERE username = $1 OR email = $2
      `;
      const existingUser = await this.db.query(existingUserQuery, [userData.username, userData.email]);
      
      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const createUserQuery = `
        INSERT INTO users (username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, first_name, last_name, created_at
      `;
      const userResult = await this.db.query(createUserQuery, [
        userData.username,
        userData.email,
        passwordHash,
        userData.first_name,
        userData.last_name
      ]);
      
      const newUser = userResult.rows[0];
      
      // If workspace_slug is provided, try to add user to that workspace
      if (userData.workspace_slug) {
        await this.addUserToWorkspace(newUser.id, userData.workspace_slug);
      }
      
      return newUser;
      
    } catch (error) {
      logger.error('Registration service error:', error);
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Add token to blacklist in Redis
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.cache.set(`blacklist:${token}`, 'true', expiresIn);
        }
      }
    } catch (error) {
      logger.error('Logout service error:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      const query = `
        SELECT id, username, email, first_name, last_name, avatar_url, preferences, created_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Get user profile service error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
      
      const user = await this.getUserProfile(decoded.userId);
      if (!user) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new access token
      const newToken = this.generateAccessToken(user, decoded.workspace);
      
      return {
        token: newToken,
        expires_at: new Date(Date.now() + 15 * 60 * 1000)
      };
    } catch (error) {
      logger.error('Refresh token service error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async getUserWorkspaces(userId: string): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT w.id, w.name, w.display_name, w.slug, w.description
        FROM workspaces w
        JOIN user_role_assignments ura ON w.id = ura.workspace_id
        WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        ORDER BY w.name
      `;
      const result = await this.db.query(query, [userId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Get user workspaces service error:', error);
      throw error;
    }
  }

  private generateAccessToken(user: any, workspace: any): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
        tokenId: uuidv4()
      },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiresIn }
    );
  }

  private async getUserPermissions(userId: string, workspaceId: string): Promise<string[]> {
    try {
      const query = `
        SELECT COALESCE(jsonb_agg(DISTINCT perm), '[]'::jsonb) as permissions
        FROM (
          SELECT jsonb_array_elements(cr.permissions) AS perm
          FROM custom_roles cr
          JOIN user_role_assignments ura ON cr.id = ura.role_id
          WHERE ura.user_id = $1 
          AND ura.workspace_id = $2
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        ) AS all_perms
      `;
      
      const result = await this.db.query(query, [userId, workspaceId]);
      return result.rows[0]?.permissions || [];
    } catch (error) {
      logger.error('Get user permissions error:', error);
      return [];
    }
  }

  private async addUserToWorkspace(userId: string, workspaceSlug: string): Promise<void> {
    try {
      // Find workspace
      const workspaceQuery = 'SELECT id FROM workspaces WHERE slug = $1 AND is_active = true';
      const workspaceResult = await this.db.query(workspaceQuery, [workspaceSlug]);
      
      if (workspaceResult.rows.length === 0) {
        return; // Silently fail if workspace doesn't exist
      }
      
      const workspaceId = workspaceResult.rows[0].id;
      
      // Find default reader role
      const roleQuery = `
        SELECT id FROM custom_roles 
        WHERE workspace_id = $1 AND name = 'Reader' AND is_system_role = true
      `;
      const roleResult = await this.db.query(roleQuery, [workspaceId]);
      
      if (roleResult.rows.length === 0) {
        return; // No default role found
      }
      
      const roleId = roleResult.rows[0].id;
      
      // Assign role to user
      const assignQuery = `
        INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by)
        VALUES ($1, $2, $3, $1)
        ON CONFLICT DO NOTHING
      `;
      await this.db.query(assignQuery, [userId, workspaceId, roleId]);
      
    } catch (error) {
      logger.error('Add user to workspace error:', error);
      // Don't throw error, just log it
    }
  }
}