// api-services/src/services/AuthService.ts - IMPROVED ERROR HANDLING
import { Pool, QueryResult } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { db } from '../utils/database';

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
  role: string;
  role_level: number;
  role_id: string;
  member_count: number;
  dashboard_count: number;
  dataset_count: number;
  joined_at: Date;
}

export interface LoginResult {
  success: boolean;
  user?: AuthenticatedUser;
  workspace?: WorkspaceInfo;
  token?: string;
  permissions?: string[];
  error?: string;
  errorCode?: string;
}

// Custom error types for better error handling
export class DatabaseConnectionError extends Error {
  constructor(message: string, public originalError: any) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthService {
  private database: Pool;

  constructor(database?: Pool) {
    this.database = database || db;
    
    if (!this.database) {
      throw new Error('Database connection is required for AuthService');
    }
    
    if (typeof this.database.query !== 'function') {
      throw new Error('Invalid database connection - missing query method');
    }
    
    logger.info('AuthService initialized with database connection', {
      service: 'bi-platform-api',
      hasDatabase: !!this.database,
      hasQuery: typeof this.database.query === 'function'
    });
  }

  /**
   * Test database connection health
   */
  async testDatabaseConnection(): Promise<boolean> {
    try {
      await this.database.query('SELECT 1 as health_check');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Handle database errors with proper classification
   */
  private handleDatabaseError(error: any, operation: string): never {
    logger.error(`Database error during ${operation}:`, {
      service: 'bi-platform-api',
      operation,
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    // Check for specific PostgreSQL error codes
    if (error.code === 'ECONNREFUSED') {
      throw new DatabaseConnectionError(
        'Database service is not available. Please ensure PostgreSQL is running.',
        error
      );
    }
    
    if (error.code === '28P01') {
      throw new DatabaseConnectionError(
        'Database authentication failed. Please check database credentials.',
        error
      );
    }
    
    if (error.code === '3D000') {
      throw new DatabaseConnectionError(
        'Database does not exist. Please create the database first.',
        error
      );
    }
    
    if (error.code === 'ENOTFOUND') {
      throw new DatabaseConnectionError(
        'Database host not found. Please check the database host configuration.',
        error
      );
    }

    // Handle AggregateError from connection pool
    if (error.name === 'AggregateError' || error.errors) {
      const firstError = error.errors?.[0] || error;
      throw new DatabaseConnectionError(
        `Database connection pool failed: ${firstError.message}`,
        error
      );
    }

    // Generic database error
    throw new DatabaseConnectionError(
      `Database operation failed: ${error.message}`,
      error
    );
  }

  /**
   * Authenticate user with improved error handling
   */
  async authenticateUser(emailOrUsername: string, password: string): Promise<AuthenticatedUser | null> {
    try {
      logger.info('Attempting to authenticate user', { 
        service: 'bi-platform-api',
        emailOrUsername: emailOrUsername.substring(0, 3) + '***'
      });

      // Test database connection first
      const isHealthy = await this.testDatabaseConnection();
      if (!isHealthy) {
        throw new DatabaseConnectionError(
          'Database connection is not healthy',
          new Error('Health check failed')
        );
      }

      const query = `
        SELECT id, username, email, first_name, last_name, password_hash, 
               avatar_url, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE (email = $1 OR username = $1) AND is_active = true
      `;

      logger.debug('Executing user authentication query');
      const result: QueryResult = await this.database.query(query, [emailOrUsername]);
      
      if (result.rows.length === 0) {
        logger.warn('User not found or inactive', { 
          service: 'bi-platform-api',
          emailOrUsername: emailOrUsername.substring(0, 3) + '***'
        });
        return null;
      }

      const user = result.rows[0];
      
      // Verify password
      logger.debug('Verifying password');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        logger.warn('Invalid password', { 
          service: 'bi-platform-api',
          userId: user.id
        });
        return null;
      }

      // Update last login
      try {
        await this.database.query(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (updateError) {
        // Log but don't fail authentication for this
        logger.warn('Failed to update last login time:', updateError);
      }

      logger.info('User authenticated successfully', { 
        service: 'bi-platform-api',
        userId: user.id,
        username: user.username
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        last_login: new Date(),
        created_at: user.created_at,
        updated_at: user.updated_at
      };

    } catch (error: any) {
      // Distinguish between database errors and authentication errors
      if (error instanceof DatabaseConnectionError) {
        throw error; // Re-throw database connection errors
      }
      
      // Handle other database errors
      if (error.code || error.name === 'AggregateError') {
        this.handleDatabaseError(error, 'user authentication');
      }
      
      // Log and re-throw unexpected errors
      logger.error('Unexpected error during authentication:', error);
      throw new Error(`Authentication service error: ${error.message}`);
    }
  }

  /**
   * Get user's default workspace with improved error handling
   */
  async getUserDefaultWorkspace(userId: string): Promise<WorkspaceInfo | undefined> {
    try {
      logger.info('Getting user default workspace', { 
        userId,
        service: 'bi-platform-api'
      });

      const query = `
        SELECT 
          w.id, w.name, w.slug, w.description, w.is_active, 
          w.created_at, w.updated_at,
          r.name as role, r.role_level , r.id as role_id,
          (SELECT COUNT(*) FROM user_role_assignments ura2 
           WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
          (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id) as dashboard_count,
          (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id) as dataset_count,
          ura.created_at as joined_at
        FROM workspaces w
        INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
        INNER JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 AND ura.is_active = true AND w.is_active = true
        ORDER BY ura.created_at ASC
        LIMIT 1
      `;

      const result: QueryResult = await this.database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        logger.info('No default workspace found for user', { userId });
        return undefined;
      }

      const row = result.rows[0];
      
      const workspaceInfo: WorkspaceInfo = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        role: row.role,
        role_level: parseInt(row.role_level) || 0,
        role_id: row.role_id,
        member_count: parseInt(row.member_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0,
        joined_at: row.joined_at
      };

      logger.info('Default workspace retrieved successfully', { 
        userId, 
        workspaceId: workspaceInfo.id,
        workspaceName: workspaceInfo.name
      });

      return workspaceInfo;

    } catch (error: any) {
      if (error.code || error.name === 'AggregateError') {
        this.handleDatabaseError(error, 'get user default workspace');
      }
      
      logger.error('Error getting user default workspace:', error);
      throw error;
    }
  }

  /**
   * Main login method with comprehensive error handling
   */
  async login(emailOrUsername: string, password: string, workspaceSlug?: string): Promise<LoginResult> {
    try {
      logger.info('Starting login process', { 
        emailOrUsername: emailOrUsername.substring(0, 3) + '***',
        workspaceSlug,
        service: 'bi-platform-api' 
      });

      // Step 1: Authenticate the user
      const user = await this.authenticateUser(emailOrUsername, password);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email/username or password',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Step 2: Handle workspace selection
      let workspace: WorkspaceInfo | undefined;
      
      if (workspaceSlug) {
        workspace = await this.getWorkspaceBySlug(workspaceSlug, user.id);
        if (!workspace) {
          return {
            success: false,
            error: 'Workspace not found or access denied',
            errorCode: 'WORKSPACE_ACCESS_DENIED'
          };
        }
      } else {
        workspace = await this.getUserDefaultWorkspace(user.id);
      }

      // Step 3: Generate JWT token
      const token = await this.generateAuthToken(user, workspace);

      logger.info('Login successful', { 
        userId: user.id,
        workspaceId: workspace?.id,
        service: 'bi-platform-api'
      });

      return {
        success: true,
        user,
        workspace,
        token,
        permissions: [] // Add permission logic here
      };

    } catch (error: any) {
      logger.error('Authentication service error:', {
        service: 'bi-platform-api',
        emailOrUsername: emailOrUsername.substring(0, 3) + '***',
        error: error.message,
        stack: error.stack
      });

      // Return specific error types
      if (error instanceof DatabaseConnectionError) {
        return {
          success: false,
          error: 'Database service is temporarily unavailable. Please try again later.',
          errorCode: 'DATABASE_UNAVAILABLE'
        };
      }

      if (error instanceof AuthenticationError) {
        return {
          success: false,
          error: error.message,
          errorCode: 'AUTHENTICATION_ERROR'
        };
      }

      // Generic error response
      return {
        success: false,
        error: 'Login failed due to internal error. Please try again later.',
        errorCode: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Get workspace by slug (implementation needed)
   */
  async getWorkspaceBySlug(slug: string, userId: string): Promise<WorkspaceInfo | undefined> {
    try {
      const query = `
        SELECT 
          w.id, w.name, w.slug, w.description, w.is_active, 
          w.created_at, w.updated_at,
          r.name as role, r.role_level as role_level, r.id as role_id,
          (SELECT COUNT(*) FROM user_role_assignments ura2 
           WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
          (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id) as dashboard_count,
          (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id) as dataset_count,
          ura.created_at as joined_at
        FROM workspaces w
        INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
        INNER JOIN roles r ON ura.role_id = r.id
        WHERE w.slug = $1 AND ura.user_id = $2 
          AND ura.is_active = true AND w.is_active = true
      `;

      const result = await this.database.query(query, [slug, userId]);
      
      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        role: row.role,
        role_level: parseInt(row.role_level) || 0,
        role_id: row.role_id,
        member_count: parseInt(row.member_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0,
        joined_at: row.joined_at
      };

    } catch (error: any) {
      if (error.code || error.name === 'AggregateError') {
        this.handleDatabaseError(error, 'get workspace by slug');
      }
      
      logger.error('Error getting workspace by slug:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  async generateAuthToken(user: AuthenticatedUser, workspace?: WorkspaceInfo): Promise<string> {
    const payload = {
      user_id: user.id,
      email: user.email,
      username: user.username,
      workspace_id: workspace?.id,
      workspace_slug: workspace?.slug,
      workspace_role: workspace?.role,
      role_level: workspace?.role_level || 0
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
 * Get user permissions and roles for workspace
 * This method is called by UserController
 */
/**
 * Get user permissions and roles for workspace
 * Uses existing database function and proper joins
 */
async getUserPermissions(userId: string, workspaceId: string): Promise<{
  permissions: string[];
  roles: string[];
  is_admin: boolean;
  role_level: number;
}> {
  try {
    console.log('🔍 AuthService: Getting user permissions:', { userId, workspaceId });

    // Use the existing database function to get effective permissions
    const permissionsQuery = `
      SELECT get_user_effective_permissions($1, $2) as user_permissions
    `;
    
    const permissionsResult = await this.database.query(permissionsQuery, [userId, workspaceId]);
    
    // Get user roles information
    const rolesQuery = `
      SELECT 
        r.id as role_id,
        r.name as role_name,
        r.role_level as role_level,
        ura.is_active as assignment_active
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.workspace_id = $2 
        AND ura.is_active = true
        AND r.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    `;

    const rolesResult = await this.database.query(rolesQuery, [userId, workspaceId]);

    // Extract permissions from the function result
    const userPermissions = permissionsResult.rows[0]?.user_permissions || [];
    const allPermissions = new Set<string>(Array.isArray(userPermissions) ? userPermissions : []);
    
    // Process roles
    const roles: string[] = [];
    let isAdmin = false;
    let maxRoleLevel = 0;

    rolesResult.rows.forEach(row => {
      roles.push(row.role_name);
      maxRoleLevel = Math.max(maxRoleLevel, row.role_level || 0);
      
      // Check if this is an admin role
      if (row.role_name.toLowerCase().includes('admin') || 
          row.role_name.toLowerCase().includes('owner')) {
        isAdmin = true;
      }
    });

    // If user has admin/owner role, give them all basic permissions
    if (isAdmin) {
      const adminPermissions = [
        'workspace.read', 'workspace.update', 'workspace.admin',
        'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete',
        'dashboard.publish', 'dashboard.share',
        'chart.read', 'chart.create', 'chart.update', 'chart.delete',
        'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
        'user.read', 'user.create', 'user.update', 'user.delete',
        'role.read', 'role.create', 'role.update', 'role.delete'
      ];
      adminPermissions.forEach(perm => allPermissions.add(perm));
    }

    const permissionArray = Array.from(allPermissions);
    
    const permissionJson = {
      userId,
      workspaceId,
      permissionCount: permissionArray.length,
      roleCount: roles.length,
      isAdmin,
      roleLevel: maxRoleLevel
    };
    console.log('✅ AuthService: User permissions retrieved:', permissionJson);

    return {
      permissions: permissionArray,
      roles,
      is_admin: isAdmin,
      role_level: maxRoleLevel
    };

  } catch (error: any) {
    console.error('❌ AuthService: Get user permissions error:', error);
    logger.error('AuthService getUserPermissions error:', {
      error: error.message,
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    // Return empty permissions on error
    return {
      permissions: [],
      roles: [],
      is_admin: false,
      role_level: 0
    };
  }
}

/**
 * Get user by ID - MISSING METHOD
 */
async getUserById(userId: string): Promise<AuthenticatedUser | null> {
  try {
    logger.debug('Getting user by ID', { userId, service: 'bi-platform-api' });

    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.is_active,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = $1 AND u.is_active = true
    `;

    const result = await this.database.query(query, [userId]);

    if (result.rows.length === 0) {
      logger.warn('User not found by ID', { userId, service: 'bi-platform-api' });
      return null;
    }

    const userData = result.rows[0];
    
    logger.debug('User retrieved successfully by ID', { 
      userId: userData.id,
      email: userData.email,
      service: 'bi-platform-api' 
    });

    return {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      avatar_url: userData.avatar_url,
      is_active: userData.is_active,
      last_login: userData.last_login,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };

  } catch (error: any) {
    logger.error('Error getting user by ID:', {
      error: error.message,
      userId,
      service: 'bi-platform-api'
    });
    throw new Error(`Failed to get user by ID: ${error.message}`);
  }
}

/**
 * Get user permissions for workspace using the existing user_permissions_view
 */
async getUserPermissions(userId: string, workspaceId: string): Promise<{ permissions: string[] }> {
  try {
    logger.debug('Getting user permissions', {
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    // Use the existing user_permissions_view which already handles all the JOINs and active checks
    const query = `
      SELECT DISTINCT permission_name
      FROM user_permissions_view
      WHERE user_id = $1 
        AND workspace_id = $2
        AND is_permission_active = true
      ORDER BY permission_name
    `;

    const result = await this.database.query(query, [userId, workspaceId]);
    const permissions = result.rows.map(row => row.permission_name);

    logger.debug('User permissions retrieved', {
      userId,
      workspaceId,
      permissionCount: permissions.length,
      service: 'bi-platform-api'
    });

    return { permissions };
  } catch (error: any) {
    logger.error('Error getting user permissions:', {
      error: error.message,
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    // Return empty permissions instead of throwing to allow graceful degradation
    return { permissions: [] };
  }
}

/**
 * Enhanced version that returns more detailed permission info if needed
 */
async getUserPermissionsDetailed(userId: string, workspaceId: string): Promise<{
  permissions: string[];
  roles: Array<{
    roleId: string;
    roleName: string;
    roleLevel: number;
    isSystemRole: boolean;
  }>;
  permissionDetails: Array<{
    permission: string;
    displayName: string;
    description: string;
    category: string;
    fromRole: string;
  }>;
}> {
  try {
    logger.debug('Getting detailed user permissions', {
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    const query = `
      SELECT DISTINCT 
        permission_name,
        permission_display_name,
        permission_description,
        permission_category,
        role_name,
        role_id,
        role_level,
        is_system_role
      FROM user_permissions_view
      WHERE user_id = $1 
        AND workspace_id = $2
        AND is_permission_active = true
      ORDER BY permission_name, role_level DESC
    `;

    const result = await this.database.query(query, [userId, workspaceId]);
    
    // Extract unique permissions
    const permissions = [...new Set(result.rows.map(row => row.permission_name))];
    
    // Extract unique roles
    const rolesMap = new Map();
    result.rows.forEach(row => {
      if (!rolesMap.has(row.role_id)) {
        rolesMap.set(row.role_id, {
          roleId: row.role_id,
          roleName: row.role_name,
          roleLevel: row.role_level,
          isSystemRole: row.is_system_role
        });
      }
    });
    const roles = Array.from(rolesMap.values());

    // Extract permission details
    const permissionDetails = result.rows.map(row => ({
      permission: row.permission_name,
      displayName: row.permission_display_name,
      description: row.permission_description,
      category: row.permission_category,
      fromRole: row.role_name
    }));

    logger.debug('Detailed user permissions retrieved', {
      userId,
      workspaceId,
      permissionCount: permissions.length,
      roleCount: roles.length,
      service: 'bi-platform-api'
    });

    return {
      permissions,
      roles,
      permissionDetails
    };
  } catch (error: any) {
    logger.error('Error getting detailed user permissions:', {
      error: error.message,
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    return {
      permissions: [],
      roles: [],
      permissionDetails: []
    };
  }
}


/**
 * Get workspace by ID for a user
 */
async getWorkspaceById(workspaceId: string, userId?: string): Promise<WorkspaceInfo | null> {
  try {
    logger.debug('Getting workspace by ID', { 
      workspaceId, 
      userId, 
      service: 'bi-platform-api' 
    });

    let query: string;
    let params: any[];

    if (userId) {
      // Get workspace with user's role information
      query = `
        SELECT 
          w.id,
          w.name,
          w.slug,
          w.description,
          w.is_active,
          w.created_at,
          w.updated_at,
          r.name as role,
          r.level as role_level,
          r.id as role_id,
          ura.joined_at,
          (SELECT COUNT(*) FROM user_role_assignments ura2 WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
          (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id AND d.status != 'archived') as dashboard_count,
          (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
        FROM workspaces w
        JOIN user_role_assignments ura ON w.id = ura.workspace_id
        JOIN roles r ON ura.role_id = r.id
        WHERE w.id = $1 
          AND ura.user_id = $2 
          AND ura.is_active = true 
          AND w.is_active = true
          AND r.is_active = true
        LIMIT 1
      `;
      params = [workspaceId, userId];
    } else {
      // Get workspace without user role information
      query = `
        SELECT 
          w.id,
          w.name,
          w.slug,
          w.description,
          w.is_active,
          w.created_at,
          w.updated_at,
          (SELECT COUNT(*) FROM user_role_assignments ura WHERE ura.workspace_id = w.id AND ura.is_active = true) as member_count,
          (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id AND d.status != 'archived') as dashboard_count,
          (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
        FROM workspaces w
        WHERE w.id = $1 AND w.is_active = true
        LIMIT 1
      `;
      params = [workspaceId];
    }

    const result = await this.database.query(query, params);

    if (result.rows.length === 0) {
      logger.warn('Workspace not found by ID', { 
        workspaceId, 
        userId, 
        service: 'bi-platform-api' 
      });
      return null;
    }

    const workspaceData = result.rows[0];
    
    logger.debug('Workspace retrieved successfully by ID', { 
      workspaceId: workspaceData.id,
      workspaceSlug: workspaceData.slug,
      userId,
      service: 'bi-platform-api' 
    });

    return {
      id: workspaceData.id,
      name: workspaceData.name,
      slug: workspaceData.slug,
      description: workspaceData.description,
      is_active: workspaceData.is_active,
      created_at: workspaceData.created_at,
      updated_at: workspaceData.updated_at,
      role: workspaceData.role || 'viewer', // default role if not specified
      role_level: workspaceData.role_level || 10, // default level
      role_id: workspaceData.role_id || '',
      member_count: workspaceData.member_count,
      dashboard_count: workspaceData.dashboard_count,
      dataset_count: workspaceData.dataset_count,
      joined_at: workspaceData.joined_at || new Date()
    };

  } catch (error: any) {
    logger.error('Error getting workspace by ID:', {
      error: error.message,
      workspaceId,
      userId,
      service: 'bi-platform-api'
    });
    throw new Error(`Failed to get workspace by ID: ${error.message}`);
  }
}

/**
 * Generate authentication token
 */
generateAuthToken(user: AuthenticatedUser, workspace?: any): string {
  try {
    const payload: any = {
      user_id: user.id,
      email: user.email,
      username: user.username,
      workspace_id: workspace?.id,
      workspace_slug: workspace?.slug,
      workspace_role: workspace?.role || workspace?.user_role,
      is_admin: user.email?.includes('admin') || false, // Basic admin check
      role_level: workspace?.role_level || 10
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-jwt-secret',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'bi-platform-api'
      }
    );

    logger.debug('Authentication token generated', {
      userId: user.id,
      email: user.email,
      workspaceId: workspace?.id,
      service: 'bi-platform-api'
    });

    return token;

  } catch (error: any) {
    logger.error('Error generating authentication token:', {
      error: error.message,
      userId: user.id,
      service: 'bi-platform-api'
    });
    throw new Error(`Failed to generate authentication token: ${error.message}`);
  }
}

/**
 * Get user's workspaces
 */
async getUserWorkspaces(userId: string): Promise<WorkspaceInfo[]> {
  try {
    logger.debug('Getting user workspaces', { userId, service: 'bi-platform-api' });

    const query = `
      SELECT 
        w.id,
        w.name,
        w.slug,
        w.description,
        w.is_active,
        w.created_at,
        w.updated_at,
        r.name as role,
        r.level as role_level,
        r.id as role_id,
        ura.joined_at,
        (SELECT COUNT(*) FROM user_role_assignments ura2 WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
        (SELECT COUNT(*) FROM dashboards d WHERE d.workspace_id = w.id AND d.status != 'archived') as dashboard_count,
        (SELECT COUNT(*) FROM datasets ds WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
      FROM workspaces w
      JOIN user_role_assignments ura ON w.id = ura.workspace_id
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
        AND r.is_active = true
      ORDER BY ura.joined_at ASC
    `;

    const result = await this.database.query(query, [userId]);

    const workspaces = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: row.role,
      role_level: row.role_level,
      role_id: row.role_id,
      member_count: row.member_count,
      dashboard_count: row.dashboard_count,
      dataset_count: row.dataset_count,
      joined_at: row.joined_at
    }));

    logger.debug('User workspaces retrieved', { 
      userId,
      workspaceCount: workspaces.length,
      service: 'bi-platform-api' 
    });

    return workspaces;

  } catch (error: any) {
    logger.error('Error getting user workspaces:', {
      error: error.message,
      userId,
      service: 'bi-platform-api'
    });
    throw new Error(`Failed to get user workspaces: ${error.message}`);
  }
}

/**
 * Check if user has specific permission in workspace
 */
async hasPermission(userId: string, workspaceId: string, permission: string): Promise<boolean> {
  try {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);
    
    // Admin has all permissions
    if (userPermissions.is_admin) {
      return true;
    }

    // Check if user has specific permission
    return userPermissions.permissions.includes(permission) || 
           userPermissions.permissions.includes('*');
           
  } catch (error: any) {
    logger.error('AuthService hasPermission error:', {
      error: error.message,
      userId,
      workspaceId,
      permission,
      service: 'bi-platform-api'
    });
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
async hasAnyPermission(userId: string, workspaceId: string, permissions: string[]): Promise<boolean> {
  try {
    const userPermissions = await this.getUserPermissions(userId, workspaceId);
    
    // Admin has all permissions
    if (userPermissions.is_admin) {
      return true;
    }

    // Check if user has any of the permissions
    return permissions.some(perm => 
      userPermissions.permissions.includes(perm) || 
      userPermissions.permissions.includes('*')
    );
    
  } catch (error: any) {
    logger.error('AuthService hasAnyPermission error:', {
      error: error.message,
      userId,
      workspaceId,
      permissions,
      service: 'bi-platform-api'
    });
    return false;
  }
}

}