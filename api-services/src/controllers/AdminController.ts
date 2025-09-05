import { Request, Response } from 'express';
import { Pool } from 'pg';
import { PermissionService } from '../services/PermissionService';

export class AdminController {
  // Controllers now use standard Request type with extended properties
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const workspaceId = req.headers['x-workspace-id'] as string;
      
      const result = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.is_active,
          u.last_login,
          u.created_at,
          array_agg(cr.name) as roles
        FROM users u
        LEFT JOIN user_roles ura ON u.id = ura.user_id 
          AND ura.workspace_id = $1 
          AND ura.is_active = true
        LEFT JOIN custom_roles cr ON ura.role_id = cr.id
        WHERE u.is_active = true
        GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.is_active, u.last_login, u.created_at
        ORDER BY u.created_at DESC
      `, [workspaceId]);

      res.json({
        success: true,
        data: result.rows.map(user => ({
          ...user,
          roles: user.roles.filter((r: string | null) => r !== null)
        }))
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const workspaceId = req.headers['x-workspace-id'] as string;
      
      const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          permissions,
          is_system_role,
          level,
          created_at
        FROM custom_roles 
        WHERE workspace_id = $1 OR is_system_role = true
        ORDER BY level DESC, name ASC
      `, [workspaceId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      });
    }
  }

  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const permissionService: PermissionService = req.app.locals.permissionService;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const { name, description, permissions } = req.body;

      // Validate request body
      if (!name || !Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: 'Name and permissions array are required'
        });
        return;
      }

      // Validate permissions exist
      const systemPermissions = await permissionService.getSystemPermissions();
      const validPermissionNames = systemPermissions.map(p => p.name);
      const invalidPermissions = permissions.filter((p: string) => !validPermissionNames.includes(p));
      
      if (invalidPermissions.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
        return;
      }

      const result = await db.query(`
        INSERT INTO custom_roles (workspace_id, name, description, permissions, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [workspaceId, name, description, JSON.stringify(permissions), req.user?.user_id]);

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error creating role:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Role name already exists in this workspace'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create role'
      });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const { username, email, first_name, last_name, password, roles } = req.body;
      
      // Basic validation
      if (!username || !email) {
        res.status(400).json({
          success: false,
          message: 'Username and email are required'
        });
        return;
      }

      // Hash password (implement proper password hashing)
      const hashedPassword = password; // TODO: Implement bcrypt hashing

      const result = await db.query(`
        INSERT INTO users (username, email, first_name, last_name, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, first_name, last_name, created_at
      `, [username, email, first_name, last_name, hashedPassword]);

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const { id } = req.params;
      const { first_name, last_name, is_active } = req.body;

      const result = await db.query(`
        UPDATE users 
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            is_active = COALESCE($3, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, username, email, first_name, last_name, is_active, updated_at
      `, [first_name, last_name, is_active, id]);

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
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const { id } = req.params;

      // Soft delete - set is_active to false
      const result = await db.query(`
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, email
      `, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const db: Pool = req.app.locals.db;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const { page = 1, limit = 50, action, user_id } = req.query;
      
      let query = `
        SELECT 
          al.id,
          al.action,
          al.resource_type,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.username,
          u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.workspace_id = $1
      `;
      
      const params: any[] = [workspaceId];
      let paramIndex = 2;
      
      if (action) {
        query += ` AND al.action = $${paramIndex}`;
        params.push(action as string);
        paramIndex++;
      }
      
      if (user_id) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(user_id as string);
        paramIndex++;
      }
      
      query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit as string, ((Number(page) - 1) * Number(limit)).toString());
      
      const result = await db.query(query, params);

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) FROM audit_logs WHERE workspace_id = $1`;
      const countResult = await db.query(countQuery, [workspaceId]);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult.rows[0].count),
          pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs'
      });
    }
  }
}