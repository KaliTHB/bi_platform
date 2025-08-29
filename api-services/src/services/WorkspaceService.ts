// api-services/src/services/WorkspaceService.ts
import { DatabaseService } from './DatabaseService';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';

export interface CreateWorkspaceRequest {
  name: string;
  display_name: string;
  description?: string;
  branding_config?: any;
  settings_json?: any;
}

export class WorkspaceService {
  private db: DatabaseService;
  private cache: CacheService;

  constructor() {
    this.db = new DatabaseService();
    this.cache = new CacheService();
  }

  async createWorkspace(workspaceData: CreateWorkspaceRequest, createdBy: string): Promise<any> {
    try {
      // Generate unique slug
      const slug = await this.generateUniqueSlug(workspaceData.name);
      
      const result = await this.db.query(`
        INSERT INTO workspaces (name, display_name, description, slug, owner_id, branding_config, settings_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        workspaceData.name,
        workspaceData.display_name,
        workspaceData.description,
        slug,
        createdBy,
        JSON.stringify(workspaceData.branding_config || {}),
        JSON.stringify(workspaceData.settings_json || {})
      ]);

      const workspace = result.rows[0];

      // Create default roles for the workspace
      await this.createDefaultRoles(workspace.id, createdBy);

      return workspace;
    } catch (error) {
      logger.error('Create workspace service error:', error);
      throw error;
    }
  }

  async getWorkspaceById(workspaceId: string, userId: string): Promise<any> {
    try {
      // Check if user has access to workspace
      const accessQuery = `
        SELECT w.*, COUNT(ura.id) as user_count
        FROM workspaces w
        LEFT JOIN user_role_assignments ura ON w.id = ura.workspace_id
        WHERE w.id = $1 
        AND w.is_active = true
        AND EXISTS (
          SELECT 1 FROM user_role_assignments ura2
          WHERE ura2.workspace_id = w.id
          AND ura2.user_id = $2
          AND ura2.is_active = true
        )
        GROUP BY w.id
      `;

      const result = await this.db.query(accessQuery, [workspaceId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Workspace not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Get workspace service error:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, updates: any, userId: string): Promise<any> {
    try {
      const setClause: string[] = [];
      const values: any[] = [workspaceId];
      let paramIndex = 2;

      const updatableFields = ['display_name', 'description', 'branding_config', 'settings_json'];
      
      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          const value = typeof updates[field] === 'object' ? 
            JSON.stringify(updates[field]) : updates[field];
          values.push(value);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.db.query(`
        UPDATE workspaces
        SET ${setClause.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Workspace not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Update workspace service error:', error);
      throw error;
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const exists = await this.db.query(
        'SELECT id FROM workspaces WHERE slug = $1',
        [slug]
      );

      if (exists.rows.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async createDefaultRoles(workspaceId: string, createdBy: string): Promise<void> {
    const defaultRoles = [
      {
        name: 'Administrator',
        description: 'Full workspace access with all permissions',
        permissions: ['workspace.admin', 'user.read', 'user.create', 'user.update', 'user.delete', 'role.read', 'role.create', 'role.update', 'role.delete'],
        is_system_role: true
      },
      {
        name: 'Contributor',
        description: 'Can create and manage content but limited admin access',
        permissions: ['workspace.read', 'dataset.read', 'dataset.create', 'dataset.update', 'dashboard.read', 'dashboard.create', 'dashboard.update'],
        is_system_role: true
      },
      {
        name: 'Reader',
        description: 'Read-only access to published dashboards',
        permissions: ['workspace.read', 'dashboard.read', 'chart.read', 'export.csv'],
        is_system_role: true
      }
    ];

    for (const role of defaultRoles) {
      await this.db.query(`
        INSERT INTO custom_roles (workspace_id, name, description, permissions, is_system_role, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        workspaceId,
        role.name,
        role.description,
        JSON.stringify(role.permissions),
        role.is_system_role,
        createdBy
      ]);
    }

    // Assign admin role to creator
    const adminRoleResult = await this.db.query(
      'SELECT id FROM custom_roles WHERE workspace_id = $1 AND name = $2',
      [workspaceId, 'Administrator']
    );

    if (adminRoleResult.rows.length > 0) {
      await this.db.query(`
        INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by)
        VALUES ($1, $2, $3, $1)
      `, [createdBy, workspaceId, adminRoleResult.rows[0].id]);
    }
  }
}

// api-services/src/services/UserService.ts
import { DatabaseService } from './DatabaseService';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_ids?: string[];
}

export class UserService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getUsers(workspaceId: string, options: { page: number; limit: number; search?: string }) {
    try {
      const offset = (options.page - 1) * options.limit;
      let whereClause = 'WHERE ura.workspace_id = $1 AND u.is_active = true';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (options.search) {
        whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT u.id, u.username, u.email, u.first_name, u.last_name, u.avatar_url, u.last_login, u.created_at,
               array_agg(DISTINCT cr.name) as roles
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id
        JOIN custom_roles cr ON ura.role_id = cr.id
        ${whereClause}
        GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.avatar_url, u.last_login, u.created_at
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(options.limit, offset);

      const result = await this.db.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id
        ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        users: result.rows,
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      };
    } catch (error) {
      logger.error('Get users service error:', error);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest, workspaceId: string, createdBy: string): Promise<any> {
    try {
      return await this.db.transaction(async (client) => {
        // Check if username or email already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [userData.username, userData.email]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('Username or email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Create user
        const userResult = await client.query(`
          INSERT INTO users (username, email, password_hash, first_name, last_name)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, email, first_name, last_name, created_at
        `, [
          userData.username,
          userData.email,
          passwordHash,
          userData.first_name,
          userData.last_name
        ]);

        const user = userResult.rows[0];

        // Assign roles if provided, otherwise assign default Reader role
        const roleIds = userData.role_ids && userData.role_ids.length > 0 
          ? userData.role_ids 
          : await this.getDefaultReaderRoleId(workspaceId, client);

        for (const roleId of roleIds) {
          await client.query(`
            INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by)
            VALUES ($1, $2, $3, $4)
          `, [user.id, workspaceId, roleId, createdBy]);
        }

        return user;
      });
    } catch (error) {
      logger.error('Create user service error:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: any, updatedBy: string): Promise<any> {
    try {
      const setClause: string[] = [];
      const values: any[] = [userId];
      let paramIndex = 2;

      const updatableFields = ['email', 'first_name', 'last_name', 'avatar_url', 'preferences'];
      
      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          const value = typeof updates[field] === 'object' ? 
            JSON.stringify(updates[field]) : updates[field];
          values.push(value);
        }
      });

      // Handle password update separately
      if (updates.password) {
        const passwordHash = await bcrypt.hash(updates.password, 10);
        setClause.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.db.query(`
        UPDATE users
        SET ${setClause.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING id, username, email, first_name, last_name, avatar_url, preferences, updated_at
      `, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Update user service error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      // Soft delete user
      const result = await this.db.query(`
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `, [userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      // Deactivate role assignments
      await this.db.query(`
        UPDATE user_role_assignments
        SET is_active = false
        WHERE user_id = $1
      `, [userId]);
    } catch (error) {
      logger.error('Delete user service error:', error);
      throw error;
    }
  }

  private async getDefaultReaderRoleId(workspaceId: string, client?: any): Promise<string[]> {
    const dbClient = client || this.db;
    const result = await dbClient.query(
      'SELECT id FROM custom_roles WHERE workspace_id = $1 AND name = $2 AND is_system_role = true',
      [workspaceId, 'Reader']
    );
    
    return result.rows.length > 0 ? [result.rows[0].id] : [];
  }
}

// api-services/src/middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';

const cache = new CacheService();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    workspaceId: string;
    workspaceSlug: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        errors: [{ code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token required' }]
      });
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        errors: [{ code: 'TOKEN_REVOKED', message: 'Token is no longer valid' }]
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key') as any;
    
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type',
        errors: [{ code: 'INVALID_TOKEN_TYPE', message: 'Access token required' }]
      });
      return;
    }

    req.user = {
      id: decoded.userId,
      username: decoded.username,
      workspaceId: decoded.workspaceId,
      workspaceSlug: decoded.workspaceSlug
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired',
        errors: [{ code: 'TOKEN_EXPIRED', message: 'Please refresh your token' }]
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        errors: [{ code: 'INVALID_TOKEN', message: 'Token is malformed or invalid' }]
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        errors: [{ code: 'AUTH_ERROR', message: 'Internal authentication error' }]
      });
    }
  }
};

export const optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  // If token is provided, validate it
  await authenticate(req, res, next);
};