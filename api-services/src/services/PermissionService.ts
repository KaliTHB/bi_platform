// api-services/src/services/PermissionService.ts
import { Pool, PoolClient } from 'pg';
import { cacheService } from './CacheService';
import { logger } from '../utils/logger';

// ===================================
// INTERFACES
// ===================================

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  resource_type: string;
  action: string;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Role {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[] | any; // Can be string[] or JSONB
  is_system: boolean;
  is_active: boolean;
  level: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface UserRole {
  id: string;
  name: string;
  display_name: string;
  permissions: string[];
  level: number;
  is_system: boolean;
}

interface UserRoleAssignment {
  id: string;
  user_id: string;
  workspace_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  permissions?: string[];
}

// ===================================
// PERMISSION SERVICE CLASS
// ===================================

export class PermissionService {
  private database: Pool;

  constructor(database: Pool, cache?: any) {
    // Comprehensive validation
    if (!database) {
      const error = new Error('PermissionService: Database connection is required but was null/undefined');
      logger.error('❌ PermissionService constructor error:', error.message);
      throw error;
    }
    
    if (typeof database.query !== 'function') {
      const error = new Error(`PermissionService: Invalid database connection - query method is ${typeof database.query}, expected function`);
      logger.error('❌ PermissionService constructor error:', {
        message: error.message,
        databaseType: typeof database,
        hasQuery: typeof database.query,
        constructorName: database.constructor?.name,
        isPool: database instanceof Pool
      });
      throw error;
    }

    // Test database connection immediately
    database.query('SELECT 1 as test')
      .then(() => {
        logger.debug('✅ PermissionService: Database connection test successful');
      })
      .catch((err) => {
        logger.warn('⚠️ PermissionService: Database connection test failed:', err.message);
        // Don't throw here - let it fail later with better context
      });

    this.database = database;
    
    logger.info('✅ PermissionService: Initialized successfully', {
      hasDatabase: !!this.database,
      hasQuery: typeof this.database.query === 'function',
      service: 'bi-platform-api'
    });
  }

  // Add a helper method to test database connectivity
  async testDatabaseConnection(): Promise<boolean> {
    try {
      const result = await this.database.query('SELECT NOW() as current_time');
      logger.debug('✅ Database connection test passed', {
        time: result.rows[0].current_time
      });
      return true;
    } catch (error: any) {
      logger.error('❌ Database connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get ALL roles in the system (both system and workspace-specific roles)
   * This method fixes the original "getAllRoles is not a function" error
   */
  async getAllRoles(includeInactive: boolean = false): Promise<Role[]> {
    try {
      // Test database connection first
      if (!await this.testDatabaseConnection()) {
        throw new Error('Database connection is not available');
      }

      const cacheKey = `all_roles:${includeInactive}`;
      
      // Try cache first
      try {
        const cached = await cacheService.get<Role[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          logger.debug('📦 PermissionService: Cache hit for all roles');
          return cached;
        }
      } catch (cacheError) {
        logger.warn('⚠️ Cache error (continuing without cache):', cacheError);
      }

      logger.debug('🔍 PermissionService: Fetching all roles from database');

      const query = `
        SELECT 
          id, 
          workspace_id, 
          name, 
          display_name, 
          description, 
          permissions, 
          is_system, 
          is_active, 
          level, 
          created_by, 
          created_at, 
          updated_at
        FROM roles 
        WHERE ${includeInactive ? '1=1' : 'is_active = true'}
        ORDER BY is_system DESC, level DESC, name ASC
      `;

      const result = await this.database.query(query);
      
      // Process permissions (handle both string[] and JSONB)
      const roles = result.rows.map(row => ({
        ...row,
        permissions: Array.isArray(row.permissions) 
          ? row.permissions 
          : (typeof row.permissions === 'string' 
              ? JSON.parse(row.permissions) 
              : [])
      }));
      
      // Try to cache for 30 minutes (roles don't change very often)
      try {
        await cacheService.set(cacheKey, roles, 1800);
      } catch (cacheError) {
        logger.warn('⚠️ Cache set error (data still returned):', cacheError);
      }
      
      logger.info(`✅ PermissionService: Retrieved ${roles.length} roles successfully`);
      return roles;
      
    } catch (error: any) {
      logger.error('❌ PermissionService: Error getting all roles:', {
        error: error.message,
        stack: error.stack,
        hasDatabase: !!this.database,
        hasQuery: typeof this.database?.query === 'function'
      });
      
      // Return empty array rather than throwing to prevent cascade failures
      // This allows the UI to load even if there's a database issue
      return [];
    }
  }

  /**
   * Get ALL permissions in the system (both system and custom)
   * Updated with better error handling
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      // Test database connection first
      if (!await this.testDatabaseConnection()) {
        throw new Error('Database connection is not available');
      }

      const cacheKey = 'all_permissions';
      
      // Try cache first
      try {
        const cached = await cacheService.get<Permission[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          logger.debug('📦 PermissionService: Cache hit for all permissions');
          return cached;
        }
      } catch (cacheError) {
        logger.warn('⚠️ Cache error (continuing without cache):', cacheError);
      }

      logger.debug('🔍 PermissionService: Fetching all permissions from database');

      const result = await this.database.query(`
        SELECT 
          id, 
          name, 
          display_name, 
          description, 
          category, 
          resource_type, 
          action, 
          is_system,
          is_active,
          created_at
        FROM permissions 
        WHERE is_active = true
        ORDER BY category ASC, name ASC
      `);
      
      const permissions = result.rows;
      
      // Try to cache for 30 minutes (permissions don't change very often)
      try {
        await cacheService.set(cacheKey, permissions, 1800);
      } catch (cacheError) {
        logger.warn('⚠️ Cache set error (data still returned):', cacheError);
      }
      
      logger.info(`✅ PermissionService: Retrieved ${permissions.length} permissions successfully`);
      return permissions;
      
    } catch (error: any) {
      logger.error('❌ PermissionService: Error getting all permissions:', {
        error: error.message,
        stack: error.stack,
        hasDatabase: !!this.database,
        hasQuery: typeof this.database?.query === 'function'
      });
      
      // Return empty array rather than throwing to prevent cascade failures
      return [];
    }
  }

  /**
   * Get effective permissions for user in workspace
   * This is the main method that combines all role permissions
   */
  async getUserEffectivePermissions(
    userId: string, 
    workspaceId: string
  ): Promise<string[]> {
    const cacheKey = `permissions:${userId}:${workspaceId}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        logger.debug(`📦 PermissionService: Cache hit for ${userId} in workspace ${workspaceId} - ${cached.length} permissions`);
        return cached;
      }

      logger.debug(`🔍 PermissionService: Cache miss, fetching permissions from database for user ${userId}`);

      // Method 1: Try database function (preferred)
      try {
        const functionResult = await this.database.query(`
          SELECT get_user_effective_permissions($1, $2) as permissions
        `, [userId, workspaceId]);

        if (functionResult.rows[0]?.permissions) {
          const permissions = functionResult.rows[0].permissions;
          logger.info(`✅ PermissionService: Function returned ${permissions.length} permissions for user ${userId}`);
          
          // Cache for 5 minutes
          if (permissions.length > 0) {
            await cacheService.set(cacheKey, permissions, 300);
          }
          
          return permissions;
        }
      } catch (functionError) {
        logger.warn(`⚠️ PermissionService: Database function failed, trying manual query:`, functionError.message);
      }

      // Method 2: Manual query using user_permissions_view
      try {
        const viewResult = await this.database.query(`
          SELECT DISTINCT permission_name
          FROM user_permissions_view
          WHERE user_id = $1 
            AND workspace_id = $2 
            AND is_permission_active = true
          ORDER BY permission_name
        `, [userId, workspaceId]);

        const permissions = viewResult.rows.map(row => row.permission_name);
        logger.info(`✅ PermissionService: View query returned ${permissions.length} permissions for user ${userId}`);

        // Cache for 5 minutes
        if (permissions.length > 0) {
          await cacheService.set(cacheKey, permissions, 300);
        }

        return permissions;

      } catch (viewError) {
        logger.warn(`⚠️ PermissionService: View query failed, trying manual join:`, viewError.message);
      }

      // Method 3: Manual join query (fallback)
      const manualResult = await this.database.query(`
        SELECT DISTINCT p.name as permission_name
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2 
          AND ura.is_active = true
          AND r.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        ORDER BY p.name
      `, [userId, workspaceId]);

      const fallbackPermissions = manualResult.rows.map(row => row.permission_name);
      logger.info(`🔧 PermissionService: Manual query fallback returned ${fallbackPermissions.length} permissions for user ${userId}`);

      // Cache for 5 minutes
      if (fallbackPermissions.length > 0) {
        await cacheService.set(cacheKey, fallbackPermissions, 300);
      }

      return fallbackPermissions;

    } catch (error) {
      logger.error(`❌ PermissionService: Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if user has specific permission in workspace
   */
  async hasPermission(
    userId: string, 
    workspaceId: string, 
    permission: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserEffectivePermissions(userId, workspaceId);
      const hasPermission = permissions.includes(permission);
      
      logger.debug(`🔐 PermissionService: User ${userId} ${hasPermission ? 'HAS' : 'DOES NOT HAVE'} permission: ${permission}`);
      return hasPermission;
    } catch (error) {
      logger.error(`❌ PermissionService: Error checking permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  async hasAnyPermission(
    userId: string, 
    workspaceId: string, 
    permissions: string[]
  ): Promise<boolean> {
    if (!permissions || permissions.length === 0) return false;

    try {
      const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
      const hasAny = permissions.some(perm => userPermissions.includes(perm));
      
      logger.debug(`🔐 PermissionService: User ${userId} ${hasAny ? 'HAS' : 'DOES NOT HAVE'} any of: ${permissions.join(', ')}`);
      return hasAny;
    } catch (error) {
      logger.error(`❌ PermissionService: Error checking any permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  async hasAllPermissions(
    userId: string, 
    workspaceId: string, 
    permissions: string[]
  ): Promise<boolean> {
    if (!permissions || permissions.length === 0) return true;

    try {
      const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
      const hasAll = permissions.every(perm => userPermissions.includes(perm));
      
      logger.debug(`🔐 PermissionService: User ${userId} ${hasAll ? 'HAS' : 'DOES NOT HAVE'} all of: ${permissions.join(', ')}`);
      return hasAll;
    } catch (error) {
      logger.error(`❌ PermissionService: Error checking all permissions for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get detailed permission check with reasoning
   */
  async checkPermissionWithDetails(
    userId: string,
    workspaceId: string,
    permission: string
  ): Promise<PermissionCheck> {
    try {
      const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
      const hasPermission = userPermissions.includes(permission);

      return {
        hasPermission,
        permissions: userPermissions,
        reason: hasPermission 
          ? `User has permission: ${permission}` 
          : `User does not have permission: ${permission}. Available: ${userPermissions.join(', ')}`
      };
    } catch (error) {
      return {
        hasPermission: false,
        reason: `Error checking permission: ${error.message}`
      };
    }
  }

  /**
   * Get ALL permissions in the system (both system and custom)
   * This is the missing method that was causing the error!
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const cacheKey = 'all_permissions';
      
      // Try cache first
      const cached = await cacheService.get<Permission[]>(cacheKey);
      if (cached) {
        logger.debug('📦 PermissionService: Cache hit for all permissions');
        return cached;
      }

      logger.debug('🔍 PermissionService: Fetching all permissions from database');

      const result = await this.database.query(`
        SELECT 
          id, 
          name, 
          display_name, 
          description, 
          category, 
          resource_type, 
          action, 
          is_system,
          is_active,
          created_at
        FROM permissions 
        WHERE is_active = true
        ORDER BY category ASC, name ASC
      `);
      
      const permissions = result.rows;
      
      // Cache for 30 minutes (permissions don't change very often)
      await cacheService.set(cacheKey, permissions, 1800);
      
      logger.info(`✅ PermissionService: Retrieved ${permissions.length} permissions`);
      return permissions;
      
    } catch (error) {
      logger.error('❌ PermissionService: Error getting all permissions:', error);
      
      // Return empty array rather than throwing to prevent cascade failures
      return [];
    }
  }


   /**
   * ✅ MISSING METHOD: Check if user has permission in workspace
   * This is the method that ChartController and other controllers expect!
   * It's a wrapper around hasPermission() with the return format controllers expect
   */
  async checkUserPermission(
    userId: string,
    workspaceId: string,
    permission: string
  ): Promise<{ hasPermission: boolean; reason?: string; permissions?: string[] }> {
    try {
      logger.debug(`🔍 PermissionService.checkUserPermission: Checking ${permission} for user ${userId} in workspace ${workspaceId}`);
      
      // Use existing hasPermission method
      const hasPermission = await this.hasPermission(userId, workspaceId, permission);
      
      if (hasPermission) {
        return {
          hasPermission: true,
          reason: `User has permission: ${permission}`
        };
      } else {
        // Get user's actual permissions for better error messaging
        const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
        return {
          hasPermission: false,
          reason: `User does not have permission: ${permission}. Available: ${userPermissions.slice(0, 10).join(', ')}${userPermissions.length > 10 ? '...' : ''}`,
          permissions: userPermissions
        };
      }
    } catch (error) {
      logger.error(`❌ PermissionService.checkUserPermission: Error checking permission ${permission} for user ${userId}:`, error);
      return {
        hasPermission: false,
        reason: `Error checking permission: ${error.message}`
      };
    }
  }

  /**
   * ✅ BATCH PERMISSION CHECK: Check multiple permissions at once
   * Useful for controllers that need to check multiple permissions
   */
  async checkUserPermissions(
    userId: string,
    workspaceId: string,
    permissions: string[]
  ): Promise<{ [permission: string]: boolean }> {
    try {
      const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
      
      const results: { [permission: string]: boolean } = {};
      for (const permission of permissions) {
        results[permission] = userPermissions.includes(permission);
      }
      
      return results;
    } catch (error) {
      logger.error(`❌ PermissionService.checkUserPermissions: Error checking permissions for user ${userId}:`, error);
      
      // Return all false on error
      const results: { [permission: string]: boolean } = {};
      for (const permission of permissions) {
        results[permission] = false;
      }
      return results;
    }
  }

  /**
   * Get all available system permissions
   */
  async getSystemPermissions(): Promise<Permission[]> {
    try {
      const cacheKey = 'system:permissions';
      
      // Try cache first
      const cached = await cacheService.get<Permission[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await this.database.query(`
        SELECT 
          id, name, display_name, description, category, 
          resource_type, action, is_system, created_at, updated_at
        FROM permissions 
        WHERE is_system = true 
        ORDER BY category, name
      `);
      
      // Cache for 1 hour (system permissions change rarely)
      await cacheService.set(cacheKey, result.rows, 3600);
      
      return result.rows;
    } catch (error) {
      logger.error('❌ PermissionService: Error getting system permissions:', error);
      return [];
    }
  }

  /**
   * Get user roles in workspace
   */
  async getUserRoles(userId: string, workspaceId: string): Promise<UserRole[]> {
    try {
      const cacheKey = `user_roles:${userId}:${workspaceId}`;
      
      // Try cache first
      const cached = await cacheService.get<UserRole[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await this.database.query(`
        SELECT 
            role_id as id,
            role_name as name,
            role_display_name as display_name,
            role_permissions as permissions,
            role_level as level,
            (CASE WHEN is_system THEN true ELSE false END) as is_system
        FROM get_user_active_roles($1, $2)
        ORDER BY role_level DESC, role_name;
      `, [userId, workspaceId]);

      // Process permissions (handle both string[] and JSONB)
      const roles = result.rows.map(row => ({
        ...row,
        permissions: Array.isArray(row.permissions) 
          ? row.permissions 
          : (typeof row.permissions === 'string' 
              ? JSON.parse(row.permissions) 
              : [])
      }));

      // Cache for 10 minutes
      await cacheService.set(cacheKey, roles, 600);

      return roles;
    } catch (error) {
      logger.error(`❌ PermissionService: Error getting user roles for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get all roles in workspace
   */
  async getWorkspaceRoles(workspaceId: string): Promise<Role[]> {
    try {
      const result = await this.database.query(`
        SELECT 
          id, workspace_id, name, display_name, description, 
          permissions, is_system, is_active, level, created_by, 
          created_at, updated_at
        FROM roles 
        WHERE workspace_id = $1 OR is_system = true
        ORDER BY level DESC, name
      `, [workspaceId]);

      return result.rows.map(row => ({
        ...row,
        permissions: Array.isArray(row.permissions) 
          ? row.permissions 
          : (typeof row.permissions === 'string' 
              ? JSON.parse(row.permissions) 
              : [])
      }));
    } catch (error) {
      logger.error(`❌ PermissionService: Error getting workspace roles:`, error);
      return [];
    }
  }

  /**
   * Assign role to user in workspace
   */
  async assignRoleToUser(
    userId: string,
    workspaceId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<UserRoleAssignment> {
    let client: PoolClient | null = null;

    try {
      client = await this.database.connect();
      await client.query('BEGIN');

      // Check if role exists and is active
      const roleCheck = await client.query(`
        SELECT id, is_active FROM roles WHERE id = $1
      `, [roleId]);

      if (roleCheck.rows.length === 0 || !roleCheck.rows[0].is_active) {
        throw new Error('Role not found or inactive');
      }

      // Insert or update role assignment
      const result = await client.query(`
        INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, workspace_id, role_id)
        DO UPDATE SET 
          is_active = true,
          assigned_by = $4,
          assigned_at = CURRENT_TIMESTAMP,
          expires_at = $5
        RETURNING *
      `, [userId, workspaceId, roleId, assignedBy, expiresAt]);

      await client.query('COMMIT');

      // Invalidate caches
      await this.invalidateUserPermissionCache(userId, workspaceId);

      logger.info(`✅ PermissionService: Assigned role ${roleId} to user ${userId} in workspace ${workspaceId}`);

      return result.rows[0];

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      logger.error(`❌ PermissionService: Error assigning role:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Remove role from user in workspace
   */
  async removeRoleFromUser(
    userId: string,
    workspaceId: string,
    roleId: string
  ): Promise<void> {
    try {
      await this.database.query(`
        UPDATE user_role_assignments
        SET is_active = false
        WHERE user_id = $1 AND workspace_id = $2 AND role_id = $3
      `, [userId, workspaceId, roleId]);

      // Invalidate caches
      await this.invalidateUserPermissionCache(userId, workspaceId);

      logger.info(`✅ PermissionService: Removed role ${roleId} from user ${userId} in workspace ${workspaceId}`);

    } catch (error) {
      logger.error(`❌ PermissionService: Error removing role:`, error);
      throw error;
    }
  }

  /**
   * Create custom role in workspace
   */
  async createCustomRole(
    workspaceId: string,
    name: string,
    displayName: string,
    description: string,
    permissions: string[],
    level: number,
    createdBy: string
  ): Promise<Role> {
    try {
      const result = await this.database.query(`
        INSERT INTO roles (workspace_id, name, display_name, description, permissions, level, created_by, is_system, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, true)
        RETURNING *
      `, [workspaceId, name, displayName, description, JSON.stringify(permissions), level, createdBy]);

      logger.info(`✅ PermissionService: Created custom role ${name} in workspace ${workspaceId}`);

      return {
        ...result.rows[0],
        permissions: permissions
      };

    } catch (error) {
      logger.error(`❌ PermissionService: Error creating custom role:`, error);
      throw error;
    }
  }

  /**
   * Update custom role
   */
  async updateCustomRole(
    roleId: string,
    updates: Partial<{
      name: string;
      displayName: string;
      description: string;
      permissions: string[];
      level: number;
    }>
  ): Promise<Role> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [roleId];
      let paramIndex = 2;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.displayName) {
        updateFields.push(`display_name = $${paramIndex++}`);
        values.push(updates.displayName);
      }
      if (updates.description) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.permissions) {
        updateFields.push(`permissions = $${paramIndex++}`);
        values.push(JSON.stringify(updates.permissions));
      }
      if (updates.level !== undefined) {
        updateFields.push(`level = $${paramIndex++}`);
        values.push(updates.level);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.database.query(`
        UPDATE roles
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND is_system = false
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Role not found or is system role');
      }

      // Invalidate related permission caches
      await this.invalidateRolePermissionCaches(roleId);

      logger.info(`✅ PermissionService: Updated role ${roleId}`);

      return {
        ...result.rows[0],
        permissions: Array.isArray(result.rows[0].permissions) 
          ? result.rows[0].permissions 
          : JSON.parse(result.rows[0].permissions)
      };

    } catch (error) {
      logger.error(`❌ PermissionService: Error updating role:`, error);
      throw error;
    }
  }

  /**
   * Delete custom role
   */
  async deleteCustomRole(roleId: string): Promise<void> {
    let client: PoolClient | null = null;

    try {
      client = await this.database.connect();
      await client.query('BEGIN');

      // Check if role is in use
      const usageResult = await client.query(`
        SELECT COUNT(*) as usage_count
        FROM user_role_assignments
        WHERE role_id = $1 AND is_active = true
      `, [roleId]);

      if (parseInt(usageResult.rows[0].usage_count) > 0) {
        throw new Error('Cannot delete role that is currently assigned to users');
      }

      // Delete the role
      await client.query(`
        DELETE FROM roles 
        WHERE id = $1 AND is_system = false
      `, [roleId]);

      await client.query('COMMIT');

      // Invalidate related caches
      await this.invalidateRolePermissionCaches(roleId);

      logger.info(`✅ PermissionService: Deleted role ${roleId}`);

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      logger.error(`❌ PermissionService: Error deleting role:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Check if user is admin in workspace
   */
  async isUserAdmin(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId, workspaceId);
      return roles.some(role => 
        role.name.toLowerCase().includes('admin') || 
        role.level >= 80 ||
        role.permissions.includes('workspace.admin')
      );
    } catch (error) {
      logger.error(`❌ PermissionService: Error checking admin status:`, error);
      return false;
    }
  }

  /**
   * Get permission summary for user
   */
  async getUserPermissionSummary(userId: string, workspaceId: string) {
    try {
      const [permissions, roles, isAdmin] = await Promise.all([
        this.getUserEffectivePermissions(userId, workspaceId),
        this.getUserRoles(userId, workspaceId),
        this.isUserAdmin(userId, workspaceId)
      ]);

      return {
        userId,
        workspaceId,
        permissions,
        roles,
        isAdmin,
        permissionCount: permissions.length,
        roleCount: roles.length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ PermissionService: Error getting permission summary:`, error);
      throw error;
    }
  }

  /**
   * COMPREHENSIVE DEBUG METHOD
   */
  async debugUserPermissions(userId: string, workspaceId: string): Promise<any> {
    try {
      logger.info(`🔍 DEBUG: Starting comprehensive permission debug for user ${userId} in workspace ${workspaceId}`);

      // 1. Check if user exists
      const userCheck = await this.database.query(`
        SELECT id, email, username, is_active, created_at, last_login FROM users WHERE id = $1
      `, [userId]);

      // 2. Check workspace
      const workspaceCheck = await this.database.query(`
        SELECT id, name, is_active, created_at FROM workspaces WHERE id = $1
      `, [workspaceId]);

      // 3. Check user workspace assignments
      const userWorkspaceCheck = await this.database.query(`
        SELECT * FROM user_workspace_assignments 
        WHERE user_id = $1 AND workspace_id = $2
      `, [userId, workspaceId]);

      // 4. Check roles assigned to user in workspace
      const rolesCheck = await this.database.query(`
          SELECT * FROM get_user_role_assignments($1, $2)
      `, [userId, workspaceId]);

      // 5. Check the permission view directly
      let permissionViewCheck = { rows: [], error: null };
      try {
        const viewResult = await this.database.query(`
          SELECT 
            permission_name,
            role_name,
            is_permission_active,
            is_role_active,
            assigned_at,
            expires_at
          FROM user_permissions_view
          WHERE user_id = $1 AND workspace_id = $2
          ORDER BY permission_name
          LIMIT 20
        `, [userId, workspaceId]);
        permissionViewCheck.rows = viewResult.rows;
      } catch (viewError) {
        permissionViewCheck.error = viewError.message;
      }

      // 6. Check if tables/views exist
      const tableCheck = await this.database.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename IN ('users', 'workspaces', 'roles', 'permissions', 'user_role_assignments', 'role_permissions')
        ORDER BY tablename
      `);

      const viewCheck = await this.database.query(`
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE viewname = 'user_permissions_view'
      `);

      // 7. Test the function
      let functionResult = null;
      try {
        const funcResult = await this.database.query(`
          SELECT get_user_effective_permissions($1, $2) as permissions
        `, [userId, workspaceId]);
        functionResult = funcResult.rows[0];
      } catch (funcError) {
        functionResult = { error: funcError.message };
      }

      // 8. Cache status
      const cacheKey = `permissions:${userId}:${workspaceId}`;
      const cached = await cacheService.get(cacheKey);

      // 9. Get actual effective permissions
      const effectivePermissions = await this.getUserEffectivePermissions(userId, workspaceId);

      const debugData = {
        timestamp: new Date().toISOString(),
        inputs: { userId, workspaceId },
        user: userCheck.rows[0] || null,
        workspace: workspaceCheck.rows[0] || null,
        userWorkspaceAssignments: userWorkspaceCheck.rows,
        roleAssignments: rolesCheck.rows,
        permissionViewResults: permissionViewCheck.rows,
        permissionViewError: permissionViewCheck.error,
        tablesExist: tableCheck.rows,
        viewExists: viewCheck.rows,
        functionResult: functionResult,
        cacheKey: cacheKey,
        cachedValue: cached,
        effectivePermissions: effectivePermissions,
        effectivePermissionCount: effectivePermissions.length,
        cacheInfo: cacheService.getCacheInfo()
      };

      logger.info('🔍 DEBUG: Complete debug data:', JSON.stringify(debugData, null, 2));

      return debugData;

    } catch (error) {
      logger.error('❌ DEBUG: Error in debug method:', error);
      return { 
        error: error.message, 
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Invalidate user permission cache
   */
  async invalidateUserPermissionCache(userId: string, workspaceId: string): Promise<void> {
    try {
      const cacheKey = `permissions:${userId}:${workspaceId}`;
      await cacheService.delete(cacheKey);
      
      const rolesCacheKey = `user_roles:${userId}:${workspaceId}`;
      await cacheService.delete(rolesCacheKey);
      
      logger.debug(`🧹 PermissionService: Cache invalidated for user ${userId} in workspace ${workspaceId}`);
    } catch (error) {
      logger.error('❌ PermissionService: Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate all permission caches for a workspace
   */
  async invalidateWorkspacePermissionCache(workspaceId: string): Promise<void> {
    try {
      await cacheService.deletePattern(`permissions:*:${workspaceId}`);
      await cacheService.deletePattern(`user_roles:*:${workspaceId}`);
      
      logger.debug(`🧹 PermissionService: All permission caches invalidated for workspace ${workspaceId}`);
    } catch (error) {
      logger.error('❌ PermissionService: Error invalidating workspace cache:', error);
    }
  }

  /**
   * Invalidate all permission caches for users with specific role
   */
  private async invalidateRolePermissionCaches(roleId: string): Promise<void> {
    try {
      // Get all users with this role
      const result = await this.database.query(`
        SELECT DISTINCT user_id, workspace_id
        FROM user_role_assignments
        WHERE role_id = $1 AND is_active = true
      `, [roleId]);

      // Invalidate cache for each user
      const invalidationPromises = result.rows.map(row => 
        this.invalidateUserPermissionCache(row.user_id, row.workspace_id)
      );

      await Promise.all(invalidationPromises);

      logger.debug(`🧹 PermissionService: Invalidated caches for ${result.rows.length} users with role ${roleId}`);
    } catch (error) {
      logger.error('❌ PermissionService: Error invalidating role permission caches:', error);
    }
  }
}

export default PermissionService;