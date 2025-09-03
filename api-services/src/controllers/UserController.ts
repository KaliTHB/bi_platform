// api-services/src/controllers/UserController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    workspace_id?: string;
  };
  workspace?: {
    id: string;
    slug: string;
  };
}

export class UserController {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  // Get users with pagination and search
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search = '', sort_by = 'created_at', sort_order = 'desc' } = req.query as any;
      const workspaceId = req.workspace?.id;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE uw.workspace_id = $1 AND u.is_active = true';
      let queryParams: any[] = [workspaceId];
      let paramIndex = 2;

      // Add search functionality
      if (search && search.trim()) {
        whereClause += ` AND (
          LOWER(u.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(u.last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(u.email) LIKE LOWER($${paramIndex}) OR 
          LOWER(u.username) LIKE LOWER($${paramIndex})
        )`;
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Validate sort column to prevent SQL injection
      const allowedSortColumns = ['first_name', 'last_name', 'email', 'username', 'created_at', 'last_login_at'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get users with roles
      const usersQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.is_active,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
        FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id AND uwr.workspace_id = uw.workspace_id
        LEFT JOIN roles r ON uwr.role_id = r.id
        ${whereClause}
        GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.last_login_at, u.created_at, u.updated_at
        ORDER BY u.${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const usersResult = await this.db.query(usersQuery, queryParams);

      res.json({
        success: true,
        data: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user by ID
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const workspaceId = req.workspace?.id;

      const userQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.is_active,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
          ARRAY_AGG(DISTINCT r.id) FILTER (WHERE r.id IS NOT NULL) as role_ids
        FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id AND uwr.workspace_id = uw.workspace_id
        LEFT JOIN roles r ON uwr.role_id = r.id
        WHERE u.id = $1 AND uw.workspace_id = $2
        GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.last_login_at, u.created_at, u.updated_at
      `;

      const result = await this.db.query(userQuery, [userId, workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create new user
  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        first_name,
        last_name,
        role_ids = [],
        is_active = true,
        send_invitation = false
      } = req.body;

      const workspaceId = req.workspace?.id;
      const createdBy = req.user?.id;

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user in transaction
      const result = await this.db.transaction(async (client) => {
        // Create user
        const userId = uuidv4();
        const userResult = await client.query(`
          INSERT INTO users (
            id, username, email, password_hash, first_name, last_name, 
            is_active, email_verified, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id, username, email, first_name, last_name, is_active, created_at
        `, [userId, username.toLowerCase(), email.toLowerCase(), passwordHash, first_name, last_name, is_active, false]);

        const newUser = userResult.rows[0];

        // Add user to workspace
        await client.query(`
          INSERT INTO user_workspaces (user_id, workspace_id, status, added_by, added_at)
          VALUES ($1, $2, 'ACTIVE', $3, NOW())
        `, [userId, workspaceId, createdBy]);

        // Assign roles if provided
        if (role_ids && role_ids.length > 0) {
          const roleQueries = role_ids.map((roleId: string) => 
            client.query(`
              INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by, assigned_at)
              VALUES ($1, $2, $3, $4, NOW())
            `, [userId, workspaceId, roleId, createdBy])
          );
          await Promise.all(roleQueries);
        }

        // TODO: Send invitation email if requested
        if (send_invitation) {
          logger.info(`Invitation email should be sent to ${email}`);
        }

        logger.info('User created successfully', {
          userId: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdBy,
          workspaceId
        });

        return newUser;
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error('Error creating user:', error);

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          res.status(409).json({
            success: false,
            message: 'User with this email or username already exists',
            error: 'DUPLICATE_USER'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update user
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        email,
        password,
        first_name,
        last_name,
        role_ids,
        is_active,
        avatar_url
      } = req.body;

      const workspaceId = req.workspace?.id;
      const updatedBy = req.user?.id;

      // Check if user exists in workspace
      const userCheck = await this.db.query(`
        SELECT u.id FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        WHERE u.id = $1 AND uw.workspace_id = $2
      `, [userId, workspaceId]);

      if (userCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Update user in transaction
      const result = await this.db.transaction(async (client) => {
        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (email !== undefined) {
          updateFields.push(`email = $${paramIndex}`);
          updateValues.push(email.toLowerCase());
          paramIndex++;
        }

        if (password && password.trim()) {
          const saltRounds = 12;
          const passwordHash = await bcrypt.hash(password, saltRounds);
          updateFields.push(`password_hash = $${paramIndex}`);
          updateValues.push(passwordHash);
          paramIndex++;
        }

        if (first_name !== undefined) {
          updateFields.push(`first_name = $${paramIndex}`);
          updateValues.push(first_name);
          paramIndex++;
        }

        if (last_name !== undefined) {
          updateFields.push(`last_name = $${paramIndex}`);
          updateValues.push(last_name);
          paramIndex++;
        }

        if (is_active !== undefined) {
          updateFields.push(`is_active = $${paramIndex}`);
          updateValues.push(is_active);
          paramIndex++;
        }

        if (avatar_url !== undefined) {
          updateFields.push(`avatar_url = $${paramIndex}`);
          updateValues.push(avatar_url);
          paramIndex++;
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = NOW()');

        if (updateFields.length > 1) { // More than just updated_at
          const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $1
            RETURNING id, username, email, first_name, last_name, avatar_url, is_active, updated_at
          `;
          const userResult = await client.query(updateQuery, updateValues);

          // Update roles if provided
          if (role_ids !== undefined) {
            // Remove existing roles
            await client.query(`
              DELETE FROM user_workspace_roles 
              WHERE user_id = $1 AND workspace_id = $2
            `, [userId, workspaceId]);

            // Add new roles
            if (role_ids.length > 0) {
              const roleQueries = role_ids.map((roleId: string) =>
                client.query(`
                  INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by, assigned_at)
                  VALUES ($1, $2, $3, $4, NOW())
                `, [userId, workspaceId, roleId, updatedBy])
              );
              await Promise.all(roleQueries);
            }
          }

          return userResult.rows[0];
        }

        // If no fields to update, just return the current user
        const userResult = await client.query(`
          SELECT id, username, email, first_name, last_name, avatar_url, is_active, updated_at
          FROM users WHERE id = $1
        `, [userId]);
        return userResult.rows[0];
      });

      logger.info('User updated successfully', {
        userId,
        updatedBy,
        workspaceId
      });

      res.json({
        success: true,
        data: result,
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user:', error);

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          res.status(409).json({
            success: false,
            message: 'Email address is already in use',
            error: 'DUPLICATE_EMAIL'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete user
  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const workspaceId = req.workspace?.id;
      const deletedBy = req.user?.id;

      // Check if user exists in workspace
      const userCheck = await this.db.query(`
        SELECT u.id, u.username, u.email FROM users u
        JOIN user_workspaces uw ON u.id = uw.user_id
        WHERE u.id = $1 AND uw.workspace_id = $2
      `, [userId, workspaceId]);

      if (userCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Soft delete user from workspace
      await this.db.transaction(async (client) => {
        // Remove from workspace
        await client.query(`
          DELETE FROM user_workspaces 
          WHERE user_id = $1 AND workspace_id = $2
        `, [userId, workspaceId]);

        // Remove workspace roles
        await client.query(`
          DELETE FROM user_workspace_roles 
          WHERE user_id = $1 AND workspace_id = $2
        `, [userId, workspaceId]);

        // Check if user belongs to any other workspaces
        const otherWorkspaces = await client.query(`
          SELECT COUNT(*) as count FROM user_workspaces WHERE user_id = $1
        `, [userId]);

        // If user doesn't belong to any other workspaces, deactivate the user
        if (otherWorkspaces.rows[0].count === '0') {
          await client.query(`
            UPDATE users SET is_active = false, updated_at = NOW()
            WHERE id = $1
          `, [userId]);
        }
      });

      logger.info('User deleted successfully', {
        userId,
        deletedBy,
        workspaceId
      });

      res.json({
        success: true,
        message: 'User removed from workspace successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Additional methods for profile management and other operations...
  async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const userQuery = `
        SELECT 
          id, username, email, first_name, last_name, avatar_url, 
          is_active, email_verified, last_login_at, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;

      const result = await this.db.query(userQuery, [userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Change password
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { current_password, new_password } = req.body;

      // Verify current password
      const userResult = await this.db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await this.db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      logger.info('Password changed successfully', { userId });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// ===================================================================
// api-services/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../config/database';
import { logger } from '../utils/logger';

export class AuthController {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  // Standard login with email
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, workspace_slug } = req.body;

      // Get user with workspace information
      const userResult = await this.db.query(`
        SELECT u.*, 
               ARRAY_AGG(DISTINCT uw.workspace_id) FILTER (WHERE uw.workspace_id IS NOT NULL) as workspace_ids
        FROM users u
        LEFT JOIN user_workspaces uw ON u.id = uw.user_id AND uw.status = 'ACTIVE'
        WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
        GROUP BY u.id
      `, [email]);

      if (userResult.rows.length === 0) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          token,
          workspace_ids: user.workspace_ids || []
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Error during login:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Flexible login with email or username
  async loginFlexible(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password, workspace_slug } = req.body;

      // Determine if identifier is email or username
      const isEmail = identifier.includes('@');
      const field = isEmail ? 'email' : 'username';

      const userResult = await this.db.query(`
        SELECT u.*, 
               ARRAY_AGG(DISTINCT uw.workspace_id) FILTER (WHERE uw.workspace_id IS NOT NULL) as workspace_ids
        FROM users u
        LEFT JOIN user_workspaces uw ON u.id = uw.user_id AND uw.status = 'ACTIVE'
        WHERE LOWER(u.${field}) = LOWER($1) AND u.is_active = true
        GROUP BY u.id
      `, [identifier]);

      if (userResult.rows.length === 0) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          token,
          workspace_ids: user.workspace_ids || []
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Error during flexible login:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check availability of email/username
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { email, username } = req.query as { email?: string; username?: string };

      const results: { email?: boolean; username?: boolean } = {};

      if (email) {
        const emailResult = await this.db.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        results.email = emailResult.rows.length === 0;
      }

      if (username) {
        const usernameResult = await this.db.query(
          'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
          [username]
        );
        results.username = usernameResult.rows.length === 0;
      }

      res.json({
        success: true,
        data: {
          available: results
        }
      });
    } catch (error) {
      logger.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check availability',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Additional auth methods (register, logout, etc.) would go here...
}