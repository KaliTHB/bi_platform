// api-services/src/services/AuthService.ts - Updated to use WorkspaceService
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { WorkspaceService, Workspace } from './WorkspaceService';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Use the Workspace interface from WorkspaceService
export interface WorkspaceInfo extends Workspace {}

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
  private workspaceService: WorkspaceService;

  constructor(database: Pool) {
    this.db = database;
    this.workspaceService = new WorkspaceService();
    
    // Verify database connection is properly initialized
    if (!this.db) {
      throw new Error('Database connection is required for AuthService');
    }
    
    console.log('✅ AuthService initialized with WorkspaceService integration');
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

      // Query user by email or username with all required fields
      const result = await this.db.query(
        `SELECT id, username, email, password_hash, first_name, last_name,
                display_name, avatar_url, is_active, last_login, created_at, updated_at
        FROM users
        WHERE (email = $1 OR username = $1) AND is_active = true`,
        [emailOrUsername]
      );
      
      const user = result.rows[0];
      console.log('User found:', !!user);

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
      
      return authenticatedUser as AuthenticatedUser;
      
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
        SELECT id, username, email, first_name, last_name, display_name,
               avatar_url, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows[0] as AuthenticatedUser || null;
      
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
   * Get workspace by slug using WorkspaceService
   */
  async getWorkspaceBySlug(workspaceSlug: string, userId?: string): Promise<WorkspaceInfo | null> {
    try {
      console.log('🔍 Getting workspace by slug via WorkspaceService:', workspaceSlug, 'for user:', userId);
      
      if (!userId) {
        console.log('⚠️ No userId provided for workspace access check');
        return null;
      }

      // Use WorkspaceService to get user's workspaces
      const workspaces = await this.workspaceService.getUserWorkspaces(userId);
      
      // Find workspace by slug
      const workspace = workspaces.find(w => w.slug === workspaceSlug);
      
      if (!workspace) {
        console.log('⚠️ Workspace not found or user has no access:', workspaceSlug);
        return null;
      }

      console.log('✅ Workspace found via WorkspaceService:', {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        userRole: workspace.user_role
      });

      // Convert to WorkspaceInfo format
      const workspaceInfo: WorkspaceInfo = {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        display_name: workspace.display_name,
        description: workspace.description,
        logo_url: workspace.logo_url,
        settings: workspace.settings,
        is_active: workspace.is_active,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        user_role: workspace.user_role,
        role_display_name: workspace.user_role, // Use user_role as display name
        role_level: this.getRoleLevel(workspace.user_role),
        member_count: workspace.member_count,
        dashboard_count: workspace.dashboard_count,
        dataset_count: workspace.dataset_count,
        joined_at: workspace.joined_at
      };

      return workspaceInfo;
      
    } catch (error: any) {
      console.error('❌ Get workspace by slug error:', error);
      logger.error('Get workspace by slug error:', {
        workspaceSlug,
        userId,
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      return null;
    }
  }

  /**
   * Get role level for permission calculations
   */
  private getRoleLevel(role?: string): number {
    const roleLevels: Record<string, number> = {
      'viewer': 1,
      'editor': 2,
      'admin': 3,
      'owner': 4,
      'super_admin': 5
    };
    return roleLevels[role || 'viewer'] || 1;
  }

  /**
   * Switch user workspace using WorkspaceService
   */
  async switchWorkspace(userId: string, workspaceSlug: string): Promise<WorkspaceSwitchResult> {
    try {
      console.log('🔄 AuthService: Switching workspace for user:', userId, 'to:', workspaceSlug);
      
      // Get workspace using WorkspaceService
      const workspace = await this.getWorkspaceBySlug(workspaceSlug, userId);
      
      if (!workspace) {
        console.log('⚠️ AuthService: Workspace not found or access denied:', workspaceSlug);
        return {
          success: false,
          error: 'Workspace not found'
        };
      }

      // Check if user has access (already verified in getWorkspaceBySlug)
      const hasAccess = await this.workspaceService.hasWorkspaceAccess(userId, workspace.id);
      if (!hasAccess) {
        console.log('⚠️ AuthService: Access denied to workspace:', workspaceSlug);
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

      // Get permissions (mock for now, based on workspace role)
      const permissions = this.getPermissionsFromRole(workspace.user_role);

      // Generate new token
      const token = this.generateToken(user, workspace, permissions);

      console.log('✅ AuthService: Workspace switch successful');
      return {
        success: true,
        workspace,
        token,
        permissions: permissions.permissions
      };
      
    } catch (error: any) {
      console.error('❌ AuthService: Switch workspace error:', error);
      logger.error('Switch workspace service error:', {
        userId,
        workspaceSlug,
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      
      return {
        success: false,
        error: 'Workspace switch service error'
      };
    }
  }

  /**
   * Get permissions based on role (mock implementation)
   */
  private getPermissionsFromRole(role?: string): UserPermissions {
    const rolePermissions: Record<string, string[]> = {
      'viewer': ['read_dashboards', 'read_datasets'],
      'editor': ['read_dashboards', 'read_datasets', 'write_dashboards', 'write_datasets'],
      'admin': ['read_dashboards', 'read_datasets', 'write_dashboards', 'write_datasets', 'manage_workspace'],
      'owner': ['read_dashboards', 'read_datasets', 'write_dashboards', 'write_datasets', 'manage_workspace', 'admin_access'],
      'super_admin': ['admin_access', 'super_admin_access']
    };

    const permissions = rolePermissions[role || 'viewer'] || rolePermissions['viewer'];
    const isAdmin = role === 'admin' || role === 'owner' || role === 'super_admin';
    const roleLevel = this.getRoleLevel(role);

    return {
      permissions,
      roles: [role || 'viewer'],
      is_admin: isAdmin,
      role_level: roleLevel
    };
  }

  /**
   * Check if user has access to workspace (delegated to WorkspaceService)
   */
  async checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      return await this.workspaceService.hasWorkspaceAccess(userId, workspaceId);
    } catch (error: any) {
      logger.error('Check workspace access error:', {
        userId,
        workspaceId,
        error: error.message,
        service: 'bi-platform-api'
      });
      return false;
    }
  }

  /**
   * Get user permissions for workspace
   */
  async getUserPermissions(userId: string, workspaceId?: string): Promise<UserPermissions> {
    try {
      if (workspaceId) {
        // Get workspace to determine user's role
        const workspaces = await this.workspaceService.getUserWorkspaces(userId);
        const workspace = workspaces.find(w => w.id === workspaceId);
        
        if (workspace) {
          return this.getPermissionsFromRole(workspace.user_role);
        }
      }

      // Default permissions
      return this.getPermissionsFromRole('viewer');
      
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
   * Generate JWT token
   */
  generateToken(user: AuthenticatedUser, workspace?: WorkspaceInfo, permissions?: UserPermissions): string {
    const payload = {
      user_id: user.id,
      username: user.username,
      email: user.email,
      workspace_id: workspace?.id,
      workspace_slug: workspace?.slug,
      permissions: permissions?.permissions || [],
      roles: permissions?.roles || [],
      is_admin: permissions?.is_admin || false,
      iat: Math.floor(Date.now() / 1000)
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const options = {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'bi-platform-api',
      audience: 'bi-platform-web'
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Login user with email/username and password, optionally with workspace
   */
  async login(emailOrUsername: string, password: string, workspaceSlug?: string): Promise<LoginResult> {
    try {
      console.log('🔑 AuthService: Login attempt for:', emailOrUsername);
      
      // Authenticate user
      const user = await this.authenticateUser(emailOrUsername, password);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      let workspace: WorkspaceInfo | undefined;
      let permissions: UserPermissions;

      // If workspace specified, get that workspace
      if (workspaceSlug) {
        workspace = await this.getWorkspaceBySlug(workspaceSlug, user.id);
        if (!workspace) {
          return {
            success: false,
            error: 'Specified workspace not found or access denied'
          };
        }
        permissions = this.getPermissionsFromRole(workspace.user_role);
      } else {
        // Get default workspace (first available from WorkspaceService)
        const workspaces = await this.workspaceService.getUserWorkspaces(user.id);
        if (workspaces.length > 0) {
          const firstWorkspace = workspaces[0];
          workspace = await this.getWorkspaceBySlug(firstWorkspace.slug, user.id);
          permissions = this.getPermissionsFromRole(workspace?.user_role);
        } else {
          permissions = this.getPermissionsFromRole('viewer');
        }
      }

      // Generate token
      const token = this.generateToken(user, workspace, permissions);

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      console.log('✅ AuthService: Login successful');
      return {
        success: true,
        user,
        workspace,
        token,
        permissions: permissions.permissions
      };
      
    } catch (error: any) {
      console.error('❌ AuthService: Login error:', error);
      logger.error('Login service error:', {
        emailOrUsername,
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      
      return {
        success: false,
        error: 'Login service error'
      };
    }
  }
}