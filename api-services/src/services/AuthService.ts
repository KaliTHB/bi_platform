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
 * Complete login method for AuthService
 * Add this method to your existing AuthService class
 */
/**
 * Complete login method - Add this to your AuthService class
 */
async login(emailOrUsername: string, password: string, workspaceSlug?: string): Promise<LoginResult> {
  try {
    logger.info('Starting login process', { 
      emailOrUsername, 
      workspaceSlug,
      service: 'bi-platform-api' 
    });

    // Step 1: Authenticate the user
    const user = await this.authenticateUser(emailOrUsername, password);
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Step 2: Handle workspace selection/assignment
    let workspace: WorkspaceInfo | undefined;
    
    if (workspaceSlug) {
      // User specified a workspace
      workspace = await this.getWorkspaceBySlug(workspaceSlug, user.id);
      if (!workspace) {
        return {
          success: false,
          error: 'Workspace not found or access denied'
        };
      }
    } else {
      // Get user's default workspace
      workspace = await this.getUserDefaultWorkspace(user.id);
    }

    // Step 3: Generate JWT token
    const token = await this.generateAuthToken(user, workspace);

    // Step 4: Get user permissions for the workspace
    const permissions = workspace 
      ? await this.getUserWorkspacePermissions(user.id, workspace.id)
      : [];

    // Step 5: Update last login timestamp
    await this.updateLastLogin(user.id);

    logger.info('Login successful', {
      userId: user.id,
      email: user.email,
      workspaceId: workspace?.id,
      permissionCount: permissions.length,
      service: 'bi-platform-api'
    });

    return {
      success: true,
      user,
      workspace,
      token,
      permissions
    };

  } catch (error: any) {
    logger.error('Login process error:', {
      emailOrUsername,
      workspaceSlug,
      error: error.message,
      stack: error.stack,
      service: 'bi-platform-api'
    });

    return {
      success: false,
      error: 'Authentication service error'
    };
  }
}

/**
 * Helper method: Get user's default workspace
 */
async getUserDefaultWorkspace(userId: string): Promise<WorkspaceInfo | undefined> {
  try {
    const query = `
      SELECT w.id, w.name, w.slug, w.description, w.is_active, 
             w.created_at, w.updated_at,
             wr.role, wr.role_level,
             (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
             (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id) as dashboard_count,
             (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id) as dataset_count,
             wm.joined_at
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN workspace_roles wr ON wm.role_id = wr.id
      WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true
      ORDER BY wm.joined_at ASC
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0] || undefined;
    
  } catch (error: any) {
    logger.error('Get default workspace error:', {
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });
    return undefined;
  }
}
/**
 * Get user permissions for a specific workspace
 */
async getUserWorkspacePermissions(userId: string, workspaceId: string): Promise<string[]> {
  try {
    const query = `
      SELECT DISTINCT p.permission_name
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN workspace_roles wr ON rp.role_id = wr.id
      INNER JOIN workspace_members wm ON wr.id = wm.role_id
      WHERE wm.user_id = $1 AND wm.workspace_id = $2 AND wm.is_active = true
    `;
    
    const result = await this.db.query(query, [userId, workspaceId]);
    return result.rows.map(row => row.permission_name);
    
  } catch (error: any) {
    logger.error('Get user permissions error:', {
      userId,
      workspaceId,
      error: error.message,
      service: 'bi-platform-api'
    });
    return [];
  }
}


/**
 * Logout user (optional: invalidate token if using token blacklist)
 */
async logout(userId: string, token?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    logger.info('User logout', { 
      userId,
      service: 'bi-platform-api' 
    });

    // Optional: Add token to blacklist if you're maintaining one
    // await this.addTokenToBlacklist(token);

    // Optional: Update user's logout timestamp
    try {
      await this.db.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [userId]
      );
    } catch (dbError: any) {
      logger.warn('Could not update user logout timestamp', {
        userId,
        error: dbError.message,
        service: 'bi-platform-api'
      });
    }

    logger.info('User logout successful', { 
      userId,
      service: 'bi-platform-api' 
    });

    return {
      success: true,
      message: 'Logout successful'
    };

  } catch (error: any) {
    logger.error('Logout error:', {
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });

    return {
      success: false,
      error: 'Logout failed'
    };
  }
}

/**
 * Refresh authentication token
 */
async refreshToken(userId: string, currentToken: string): Promise<{
  success: boolean;
  token?: string;
  user?: AuthenticatedUser;
  workspace?: WorkspaceInfo;
  permissions?: string[];
  error?: string;
}> {
  try {
    // Verify current token is valid (you might want to add token validation logic)
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Get current workspace from token payload (you'll need to decode the JWT)
    const jwt = require('jsonwebtoken');
    let workspaceId: string | undefined;
    
    try {
      const decoded: any = jwt.decode(currentToken);
      workspaceId = decoded?.workspace_id;
    } catch (decodeError) {
      // Continue without workspace if token decode fails
    }

    let workspace: WorkspaceInfo | undefined;
    let permissions: string[] = [];

    if (workspaceId) {
      const workspaceResult = await this.db.query(
        'SELECT * FROM workspaces WHERE id = $1 AND is_active = true',
        [workspaceId]
      );
      workspace = workspaceResult.rows[0];
      
      if (workspace) {
        permissions = await this.getUserWorkspacePermissions(userId, workspaceId);
      }
    }

    // Generate new token
    const newToken = await this.generateAuthToken(user, workspace);

    return {
      success: true,
      token: newToken,
      user,
      workspace,
      permissions
    };

  } catch (error: any) {
    logger.error('Token refresh error:', {
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });

    return {
      success: false,
      error: 'Token refresh failed'
    };
  }
}

/**
 * Add this switchWorkspace method to your AuthService class
 */
async switchWorkspace(userId: string, workspaceSlug: string): Promise<WorkspaceSwitchResult> {
  try {
    logger.info('Switching workspace', { 
      userId, 
      workspaceSlug,
      service: 'bi-platform-api' 
    });

    // Get the target workspace and verify user access
    const workspace = await this.getWorkspaceBySlug(workspaceSlug, userId);
    if (!workspace) {
      return {
        success: false,
        error: 'Workspace not found or access denied'
      };
    }

    // Get user data
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Generate new token with new workspace
    const token = await this.generateAuthToken(user, workspace);

    // Get permissions for the new workspace
    const permissions = await this.getUserWorkspacePermissions(userId, workspace.id);

    logger.info('Workspace switch successful', {
      userId,
      newWorkspaceId: workspace.id,
      newWorkspaceName: workspace.name,
      service: 'bi-platform-api'
    });

    return {
      success: true,
      workspace,
      token,
      permissions
    };

  } catch (error: any) {
    logger.error('Workspace switch error:', {
      userId,
      workspaceSlug,
      error: error.message,
      stack: error.stack,
      service: 'bi-platform-api'
    });

    return {
      success: false,
      error: 'Workspace switch failed'
    };
  }
}

/**
 * Generate JWT authentication token
 */
async generateAuthToken(user: AuthenticatedUser, workspace?: WorkspaceInfo): Promise<string> {
  // You'll need to install and import jsonwebtoken: npm install jsonwebtoken @types/jsonwebtoken
  const jwt = require('jsonwebtoken');
  
  const payload = {
    user_id: user.id,
    email: user.email,
    workspace_id: workspace?.id,
    workspace_slug: workspace?.slug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret);
}

  /**
 * Authenticate user with email/username and password
 * Updated return type: Promise<AuthenticatedUser | undefined>
 */
async authenticateUser(emailOrUsername: string, password: string): Promise<AuthenticatedUser | undefined> {
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
      return undefined; // Changed from null to undefined
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn('Authentication failed: Invalid password', { 
        emailOrUsername, 
        userId: user.id 
      });
      return undefined; // Changed from null to undefined
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
    return undefined; // Changed from null to undefined
  }
}
  /**
 * Get user by ID
 * Updated return type: Promise<AuthenticatedUser | undefined>
 */
async getUserById(userId: string): Promise<AuthenticatedUser | undefined> {
  try {
    const query = `
      SELECT id, username, email, first_name, last_name, 
             avatar_url, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0] || undefined; // Changed from null to undefined
    
  } catch (error: any) {
    logger.error('Get user by ID error:', {
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });
    return undefined; // Changed from null to undefined
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
          LEFT JOIN user_roles ura ON w.id = ura.workspace_id AND ura.user_id = $2
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
        FROM user_roles ura
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
 * Update user's last login timestamp
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
    logger.error('Update last login error:', {
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });
    // Don't throw error for this operation
  }
}
}