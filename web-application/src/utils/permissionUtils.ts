export class PermissionUtils {
  
  /**
   * Check if a permission string matches a pattern
   * Supports wildcards like 'admin.*' or 'dashboard_*'
   */
  static matchesPattern(permission: string, pattern: string): boolean {
    if (pattern === permission) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return permission.startsWith(prefix);
    }
    return false;
  }

  /**
   * Group permissions by category (prefix before first underscore)
   */
  static groupByCategory(permissions: string[]): Record<string, string[]> {
    return permissions.reduce((groups, permission) => {
      const category = permission.split('_')[0] || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
      return groups;
    }, {} as Record<string, string[]>);
  }

  /**
   * Check if user has admin-level permissions
   */
  static isAdminUser(permissions: string[]): boolean {
    const adminPermissions = ['admin_access', 'super_admin', 'system_admin'];
    return adminPermissions.some(perm => permissions.includes(perm));
  }

  /**
   * Get permission level/priority (higher number = more powerful)
   */
  static getPermissionLevel(permission: string): number {
    const levels = {
      'super_admin': 100,
      'admin_access': 90,
      'system_admin': 85,
      'workspace_admin': 80,
      'user_management': 70,
      'role_management': 70,
      'workspace_create': 60,
      'workspace_edit': 50,
      'workspace_delete': 60,
      'dashboard_create': 40,
      'dashboard_edit': 30,
      'dashboard_delete': 35,
      'dashboard_view': 10,
      'dataset_create': 40,
      'dataset_edit': 30,
      'dataset_delete': 35,
      'dataset_view': 10,
    };
    
    return levels[permission as keyof typeof levels] || 0;
  }

  /**
   * Sort permissions by priority/level
   */
  static sortByLevel(permissions: string[]): string[] {
    return [...permissions].sort((a, b) => 
      this.getPermissionLevel(b) - this.getPermissionLevel(a)
    );
  }

  /**
   * Check if permissions list contains sufficient access for a resource
   */
  static hasResourceAccess(
    permissions: string[], 
    resource: string, 
    action: 'view' | 'create' | 'edit' | 'delete' | 'admin'
  ): boolean {
    // Check for admin permissions first
    if (this.isAdminUser(permissions)) return true;
    
    // Check for specific resource permission
    const specificPermission = `${resource}_${action}`;
    if (permissions.includes(specificPermission)) return true;
    
    // Check for wildcard permissions
    const wildcardPermission = `${resource}_*`;
    if (permissions.includes(wildcardPermission)) return true;
    
    // Check for higher-level permissions that include this action
    if (action === 'view') {
      const higherActions = ['create', 'edit', 'delete', 'admin'];
      return higherActions.some(higherAction => 
        permissions.includes(`${resource}_${higherAction}`)
      );
    }
    
    if (action === 'edit' && permissions.includes(`${resource}_admin`)) {
      return true;
    }
    
    return false;
  }

  /**
   * Format permission name for display
   */
  static formatPermissionName(permission: string): string {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate permission format
   */
  static isValidPermission(permission: string): boolean {
    // Basic validation: should be lowercase, underscore-separated
    const pattern = /^[a-z][a-z0-9_]*$/;
    return pattern.test(permission);
  }
}

export default PermissionUtils;