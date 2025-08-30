import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface UserPermissions {
  permissions: string[];
  roles: string[];
  workspace_id: string;
}

class PermissionService {
  private readonly CACHE_TTL = 300; // 5 minutes

  async getUserPermissions(userId: string, workspaceId: string): Promise<UserPermissions> {
    const cacheKey = `permissions:${userId}:${workspaceId}`;
    
    try {
      // Try cache first
      const cached = await cache.get<UserPermissions>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's roles in workspace
      const rolesQuery = `
        SELECT r.id, r.name, r.permissions
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.workspace_id = $2 AND r.is_active = true AND ur.is_active = true
      `;
      
      const rolesResult = await db.query(rolesQuery, [userId, workspaceId]);
      
      // Collect all permissions (union of all roles)
      const allPermissions = new Set<string>();
      const userRoles: string[] = [];
      
      rolesResult.rows.forEach(role => {
        userRoles.push(role.name);
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach((permission: string) => {
            allPermissions.add(permission);
          });
        }
      });

      const userPermissions: UserPermissions = {
        permissions: Array.from(allPermissions),
        roles: userRoles,
        workspace_id: workspaceId
      };

      // Cache the result
      await cache.set(cacheKey, userPermissions, this.CACHE_TTL);

      return userPermissions;
    } catch (error) {
      logger.error('Get user permissions error:', error);
      throw error;
    }
  }

  async hasPermission(userId: string, workspaceId: string, permission: string): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, workspaceId);
      return userPermissions.permissions.includes(permission);
    } catch (error) {
      logger.error('Check permission error:', error);
      return false;
    }
  }

  async hasAnyPermission(userId: string, workspaceId: string, permissions: string[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, workspaceId);
      return permissions.some(permission => userPermissions.permissions.includes(permission));
    } catch (error) {
      logger.error('Check any permission error:', error);
      return false;
    }
  }

  async hasAllPermissions(userId: string, workspaceId: string, permissions: string[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, workspaceId);
      return permissions.every(permission => userPermissions.permissions.includes(permission));
    } catch (error) {
      logger.error('Check all permissions error:', error);
      return false;
    }
  }

  async hasDatasetAccess(userId: string, workspaceId: string, datasetId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> {
    try {
      // Check if user has general dataset permissions
      const generalPermission = `dataset.${action}`;
      if (await this.hasPermission(userId, workspaceId, generalPermission)) {
        return true;
      }

      // Check dataset-specific permissions
      const datasetQuery = `
        SELECT dp.action
        FROM dataset_permissions dp
        INNER JOIN datasets d ON dp.dataset_id = d.id
        WHERE dp.user_id = $1 AND d.id = $2 AND d.workspace_id = $3 AND dp.action = $4 AND dp.is_active = true
      `;
      
      const result = await db.query(datasetQuery, [userId, datasetId, workspaceId, action]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Check dataset access error:', error);
      return false;
    }
  }

  async hasDashboardAccess(userId: string, workspaceId: string, dashboardId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> {
    try {
      // Check if user has general dashboard permissions
      const generalPermission = `dashboard.${action}`;
      if (await this.hasPermission(userId, workspaceId, generalPermission)) {
        return true;
      }

      // Check if user has access to all datasets used by the dashboard
      const datasetsQuery = `
        SELECT DISTINCT dc.dataset_id
        FROM dashboard_charts dc
        INNER JOIN charts c ON dc.chart_id = c.id
        INNER JOIN dashboards d ON dc.dashboard_id = d.id
        WHERE d.id = $1 AND d.workspace_id = $2
      `;
      
      const datasetsResult = await db.query(datasetsQuery, [dashboardId, workspaceId]);
      
      for (const row of datasetsResult.rows) {
        const hasAccess = await this.hasDatasetAccess(userId, workspaceId, row.dataset_id, 'read');
        if (!hasAccess) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Check dashboard access error:', error);
      return false;
    }
  }

  async clearUserPermissionsCache(userId: string, workspaceId?: string): Promise<void> {
    try {
      if (workspaceId) {
        await cache.del(`permissions:${userId}:${workspaceId}`);
      } else {
        // Clear all workspace permissions for user
        const pattern = `permissions:${userId}:*`;
        // Note: This would need a proper implementation based on Redis version
        // For now, we'll just clear known workspace permissions
      }
    } catch (error) {
      logger.error('Clear permissions cache error:', error);
    }
  }

  async getAllPermissions(): Promise<Permission[]> {
    try {
      const query = `
        SELECT id, name, resource, action, description
        FROM permissions
        ORDER BY resource, action
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Get all permissions error:', error);
      throw error;
    }
  }

  // Dataset-specific permission methods
  async grantDatasetPermission(userId: string, datasetId: string, action: 'read' | 'write' | 'delete'): Promise<void> {
    try {
      const query = `
        INSERT INTO dataset_permissions (user_id, dataset_id, action, granted_at, granted_by, is_active)
        VALUES ($1, $2, $3, NOW(), $4, true)
        ON CONFLICT (user_id, dataset_id, action) 
        DO UPDATE SET is_active = true, granted_at = NOW()
      `;
      
      await db.query(query, [userId, datasetId, action, userId]); // TODO: Get actual granter
      
      // Clear user permissions cache
      const datasetResult = await db.query('SELECT workspace_id FROM datasets WHERE id = $1', [datasetId]);
      if (datasetResult.rows.length > 0) {
        await this.clearUserPermissionsCache(userId, datasetResult.rows[0].workspace_id);
      }
    } catch (error) {
      logger.error('Grant dataset permission error:', error);
      throw error;
    }
  }

  async revokeDatasetPermission(userId: string, datasetId: string, action: 'read' | 'write' | 'delete'): Promise<void> {
    try {
      const query = `
        UPDATE dataset_permissions 
        SET is_active = false, revoked_at = NOW()
        WHERE user_id = $1 AND dataset_id = $2 AND action = $3
      `;
      
      await db.query(query, [userId, datasetId, action]);
      
      // Clear user permissions cache
      const datasetResult = await db.query('SELECT workspace_id FROM datasets WHERE id = $1', [datasetId]);
      if (datasetResult.rows.length > 0) {
        await this.clearUserPermissionsCache(userId, datasetResult.rows[0].workspace_id);
      }
    } catch (error) {
      logger.error('Revoke dataset permission error:', error);
      throw error;
    }
  }
}

export { PermissionService };