import React from 'react';
import { usePermissions } from '../../contexts/PermissionContext';

interface PermissionGateProps {
  permissions: string | string[];
  requireAll?: boolean; // true = AND logic, false = OR logic (default)
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}


export class PermissionService {
  constructor(
    private database: Pool,
    private cacheService: CacheService
  ) {}

  async getUserEffectivePermissions(
    userId: string, 
    workspaceId: string
  ): Promise<string[]> {
    // Input validation
    if (!userId || !workspaceId) {
      console.warn('Invalid userId or workspaceId provided to getUserEffectivePermissions');
      return [];
    }

    const cacheKey = `permissions:${userId}:${workspaceId}`;
    
    try {
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

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
        if (Array.isArray(permissions)) {
          permissions.forEach((perm: string) => {
            if (perm && typeof perm === 'string') {
              allPermissions.add(perm);
            }
          });
        }
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

  async hasPermission(
    userId: string, 
    workspaceId: string, 
    permission: string
  ): Promise<boolean> {
    if (!userId || !workspaceId || !permission) return false;
    
    const permissions = await this.getUserEffectivePermissions(userId, workspaceId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(
    userId: string, 
    workspaceId: string, 
    permissions: string[]
  ): Promise<boolean> {
    if (!userId || !workspaceId || !Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    
    const userPermissions = await this.getUserEffectivePermissions(userId, workspaceId);
    return permissions.some(perm => userPermissions.includes(perm));
  }

  // ... rest of the methods remain the same
}