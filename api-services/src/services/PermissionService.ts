import { Pool } from 'pg';
import { CacheService } from './CacheService';

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  action: string;
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export class PermissionService {
  constructor(
    private database: Pool,
    private cacheService: CacheService
  ) {}

  /**
   * Get effective permissions for user in workspace
   * Combines all role permissions with union logic
   */
  async getUserEffectivePermissions(
    userId: string, 
    workspaceId: string
  ): Promise<string[]> {
    const cacheKey = `permissions:${userId}:${workspaceId}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get all user roles in workspace
      const roleResult = await this.database.query(`
        SELECT cr.permissions
        FROM user_role_assignments ura
        JOIN custom_roles cr ON ura.role_id = cr.id
        WHERE ura.user_id = $1 
          AND ura.workspace_id = $2 
          AND ura.is_active = true
          AND cr.is_active = true
      `, [userId, workspaceId]);

      // Union all permissions from all roles
      const allPermissions = new Set<string>();
      roleResult.rows.forEach(row => {
        const permissions = row.permissions || [];
        permissions.forEach((perm: string) => allPermissions.add(perm));
      });

      const effectivePermissions = Array.from(allPermissions);
      
      // Cache for 5 minutes
      await this.cacheService.setex(cacheKey, 300, JSON.stringify(effectivePermissions));
      
      return effectivePermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
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
    const permissions = await this.getUserEffectivePermissions(userId, workspaceId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  async hasAnyPermission(
    userId: string, 
    workspaceId: string, 
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
    return permissions.some(perm => userPermissions.includes(perm));
  }

  /**
   * Get all available system permissions
   */
  async getSystemPermissions(): Promise<Permission[]> {
    const result = await this.database.query(`
      SELECT * FROM permissions 
      WHERE is_system = true 
      ORDER BY category, name
    `);
    return result.rows;
  }

  /**
   * Get user roles in workspace
   */
  async getUserRoles(userId: string, workspaceId: string): Promise<UserRole[]> {
    const result = await this.database.query(`
      SELECT cr.id, cr.name, cr.permissions
      FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.role_id = cr.id
      WHERE ura.user_id = $1 
        AND ura.workspace_id = $2 
        AND ura.is_active = true
    `, [userId, workspaceId]);

    return result.rows;
  }

  /**
   * Invalidate user permission cache
   */
  async invalidateUserPermissionCache(userId: string, workspaceId: string): Promise<void> {
    const cacheKey = `permissions:${userId}:${workspaceId}`;
    await this.cacheService.del(cacheKey);
  }
}