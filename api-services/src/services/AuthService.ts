import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { AuditService } from './AuditService';

interface LoginCredentials {
  username: string;
  password: string;
  workspaceSlug?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  private readonly REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '1h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // Get user with password hash
      const userQuery = `
        SELECT id, username, email, display_name, password_hash, is_active
        FROM users 
        WHERE username = $1 AND is_active = true
      `;
      
      const userResult = await db.query(userQuery, [credentials.username]);
      
      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
      if (!isValidPassword) {
        await this.auditService.logEvent({
          event_type: 'auth.login_failed',
          user_id: user.id,
          details: { reason: 'invalid_password', username: credentials.username }
        });
        throw new Error('Invalid credentials');
      }

      // Get user's workspaces
      const workspacesQuery = `
        SELECT w.id, w.name, w.slug, w.is_active
        FROM workspaces w
        INNER JOIN workspace_users wu ON w.id = wu.workspace_id
        WHERE wu.user_id = $1 AND w.is_active = true AND wu.is_active = true
        ORDER BY w.name
      `;
      
      const workspacesResult = await db.query(workspacesQuery, [user.id]);
      
      if (workspacesResult.rows.length === 0) {
        throw new Error('No accessible workspaces found');
      }

      // Determine workspace
      let selectedWorkspace = workspacesResult.rows[0];
      
      if (credentials.workspaceSlug) {
        const requestedWorkspace = workspacesResult.rows.find(
          w => w.slug === credentials.workspaceSlug
        );
        if (requestedWorkspace) {
          selectedWorkspace = requestedWorkspace;
        }
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user, selectedWorkspace);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      // Clean user object (remove password)
      const { password_hash, ...cleanUser } = user;

      // Log successful login
      await this.auditService.logEvent({
        event_type: 'auth.login_success',
        user_id: user.id,
        workspace_id: selectedWorkspace.id,
        details: { 
          username: credentials.username,
          workspace_slug: selectedWorkspace.slug
        }
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        user: cleanUser,
        workspace: {
          id: selectedWorkspace.id,
          name: selectedWorkspace.name,
          slug: selectedWorkspace.slug
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token is stored and not blacklisted
      const storedToken = await cache.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user and workspace
      const userQuery = `
        SELECT u.id, u.username, u.email, u.display_name, u.is_active,
               w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
        FROM users u
        INNER JOIN workspace_users wu ON u.id = wu.user_id
        INNER JOIN workspaces w ON wu.workspace_id = w.id
        WHERE u.id = $1 AND u.is_active = true AND w.is_active = true AND wu.is_active = true
        ORDER BY w.name
        LIMIT 1
      `;
      
      const userResult = await db.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      const userData = userResult.rows[0];
      
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        display_name: userData.display_name,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };

      const workspace = {
        id: userData.workspace_id,
        name: userData.workspace_name,
        slug: userData.workspace_slug
      };

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user, workspace);
      const newRefreshToken = this.generateRefreshToken(user.id);

      // Update stored refresh token
      await this.storeRefreshToken(user.id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
        user,
        workspace
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Add refresh token to blacklist
        await cache.set(`blacklist:${refreshToken}`, true, 7 * 24 * 60 * 60); // 7 days
        
        // Remove stored refresh token
        await cache.del(`refresh_token:${userId}`);
      }

      // Log logout
      await this.auditService.logEvent({
        event_type: 'auth.logout',
        user_id: userId,
        details: { logout_time: Date.now() }
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  async switchWorkspace(userId: string, workspaceSlug: string): Promise<AuthTokens> {
    try {
      // Verify user has access to workspace
      const query = `
        SELECT u.id, u.username, u.email, u.display_name, u.is_active,
               w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
        FROM users u
        INNER JOIN workspace_users wu ON u.id = wu.user_id
        INNER JOIN workspaces w ON wu.workspace_id = w.id
        WHERE u.id = $1 AND w.slug = $2 AND u.is_active = true AND w.is_active = true AND wu.is_active = true
      `;
      
      const result = await db.query(query, [userId, workspaceSlug]);
      
      if (result.rows.length === 0) {
        throw new Error('Workspace not found or access denied');
      }

      const userData = result.rows[0];
      
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        display_name: userData.display_name,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };

      const workspace = {
        id: userData.workspace_id,
        name: userData.workspace_name,
        slug: userData.workspace_slug
      };

      // Generate new tokens
      const accessToken = this.generateAccessToken(user, workspace);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store new refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      // Log workspace switch
      await this.auditService.logEvent({
        event_type: 'auth.workspace_switch',
        user_id: userId,
        workspace_id: workspace.id,
        details: { 
          new_workspace: workspaceSlug,
          switch_time: Date.now()
        }
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user,
        workspace
      };
    } catch (error) {
      logger.error('Switch workspace error:', error);
      throw error;
    }
  }

  private generateAccessToken(user: User, workspace: any): string {
    return jwt.sign({
      userId: user.id,
      username: user.username,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      type: 'access'
    }, this.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({
      userId,
      type: 'refresh',
      tokenId: uuidv4()
    }, this.REFRESH_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRY });
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    await cache.set(`refresh_token:${userId}`, token, 7 * 24 * 60 * 60); // 7 days
  }
}

export { AuthService };