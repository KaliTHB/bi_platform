// api-services/src/services/UserService.ts
import { DatabaseService } from './DatabaseService';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { ValidationError, ConflictError, NotFoundError } from '../middleware/errorHandler';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_ids?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  preferences?: any;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  last_login_at?: Date;
  created_at: Date;
  roles: string[];
}

export class UserService extends DatabaseService {
  constructor() {
    super(); // Inherit from DatabaseService instead of instantiating it
  }

  async getUsers(workspaceId: string, options: { page: number; limit: number; search?: string }) {
    try {
      const offset = (options.page - 1) * options.limit;
      let whereClause = 'WHERE ura.workspace_id = $1 AND u.is_active = true';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (options.search) {
        whereClause += ` AND (u.username ILIKE ${paramIndex} OR u.email ILIKE ${paramIndex} OR u.first_name ILIKE ${paramIndex} OR u.last_name ILIKE ${paramIndex})`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.last_login_at, u.created_at,
               COALESCE(array_agg(DISTINCT cr.name) FILTER (WHERE cr.name IS NOT NULL), '{}') as roles
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
        LEFT JOIN roles cr ON ura.role_id = cr.id AND cr.is_active = true
        ${whereClause}
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.last_login_at, u.created_at
        ORDER BY u.created_at DESC
        LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
      `;

      params.push(options.limit, offset);
      const result = await this.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
        ${whereClause}
      `;

      const countResult = await this.query(countQuery, params.slice(0, -2));
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

  async createUser(userData: CreateUserRequest, workspaceId: string, createdBy: string): Promise<UserResponse> {
    try {
      return await this.transaction(async (client) => {
        // Check if username or email already exists
        const existingUserResult = await client.query(
          'SELECT id FROM users WHERE (email = $1) AND is_active = true',
          [userData.email]
        );

        if (existingUserResult.rows.length > 0) {
          throw new ConflictError('Username or email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Create user
        const userResult = await client.query(`
          INSERT INTO users ( email, password_hash, first_name, last_name)
          VALUES ($1, $2, $3, $4)
          RETURNING id, email, first_name, last_name, created_at
        `, [userData.email, passwordHash, userData.first_name, userData.last_name]);

        const newUser = userResult.rows[0];

        // Get default role IDs or use provided ones
        const roleIds = userData.role_ids && userData.role_ids.length > 0 
          ? userData.role_ids 
          : await this.getDefaultReaderRoleId(workspaceId, client);

        const assignedRoles: string[] = [];

        // Assign roles to user
        for (const roleId of roleIds) {
          // Verify role exists and get role name
          const roleResult = await client.query(
            'SELECT id, name FROM roles WHERE id = $1 AND workspace_id = $2 AND is_active = true',
            [roleId, workspaceId]
          );

          if (roleResult.rows.length > 0) {
            await client.query(`
              INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by)
              VALUES ($1, $2, $3, $4)
            `, [newUser.id, workspaceId, roleId, createdBy]);
            
            assignedRoles.push(roleResult.rows[0].name);
          }
        }

        logger.info('User created successfully', {
          userId: newUser.id,
          username: newUser.email,
          workspaceId,
          createdBy,
          assignedRoles
        });

        return {
          ...newUser,
          roles: assignedRoles
        };
      });
    } catch (error) {
      logger.error('Create user service error:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: UpdateUserRequest, updatedBy: string): Promise<UserResponse> {
    try {
      const setClause: string[] = [];
      const values: any[] = [userId];
      let paramIndex = 2;

      // Build SET clause dynamically
      const updatableFields = ['username', 'email', 'first_name', 'last_name', 'avatar_url', 'preferences'];
      
      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = ${paramIndex++}`);
          // Handle JSON fields
          const jsonFields = ['preferences'];
          const actualValue = jsonFields.includes(field) ? JSON.stringify(updates[field]) : updates[field];
          values.push(actualValue);
        }
      });

      // Handle password update separately
      if (updates.password) {
        const passwordHash = await bcrypt.hash(updates.password, 10);
        setClause.push(`password_hash = ${paramIndex++}`);
        values.push(passwordHash);
      }

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.query(`
        UPDATE users
        SET ${setClause.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING id, email, first_name, last_name, avatar_url, preferences, updated_at
      `, values);

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = result.rows[0];

      // Get user roles
      const rolesResult = await this.query(`
        SELECT cr.name
        FROM roles cr
        JOIN user_role_assignments ura ON cr.id = ura.role_id
        WHERE ura.user_id = $1 AND ura.is_active = true AND cr.is_active = true
      `, [userId]);

      logger.info('User updated successfully', { userId, updatedBy });
      
      return {
        ...updatedUser,
        roles: rolesResult.rows.map(row => row.name)
      };
    } catch (error) {
      logger.error('Update user service error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      // Soft delete user
      const result = await this.query(`
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `, [userId]);

      if (result.rowCount === 0) {
        throw new NotFoundError('User not found');
      }

      // Deactivate role assignments
      await this.query(`
        UPDATE user_role_assignments
        SET is_active = false
        WHERE user_id = $1
      `, [userId]);

      logger.info('User deleted successfully', { userId, deletedBy });
    } catch (error) {
      logger.error('Delete user service error:', error);
      throw error;
    }
  }

  private async getDefaultReaderRoleId(workspaceId: string, client?: any): Promise<string[]> {
    const dbClient = client || this;
    try {
      const result = await dbClient.query(
        'SELECT id FROM roles WHERE workspace_id = $1 AND name = $2 AND is_system = true AND is_active = true',
        [workspaceId, 'Reader']
      );
      
      return result.rows.length > 0 ? [result.rows[0].id] : [];
    } catch (error) {
      logger.warn('Could not find default Reader role', { workspaceId, error: (error as any).message });
      return [];
    }
  }
}