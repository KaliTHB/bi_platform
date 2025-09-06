// web-application/src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string;
}

interface UsePermissionsResult {
  permissions: string[];
  roles: string[];
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'user_permissions_';
const CACHE_TIME_SUFFIX = '_timestamp';

export const usePermissions = (): UsePermissionsResult => {
  const { user, workspace, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate cache keys
  const getCacheKeys = () => {
    const baseKey = `${CACHE_KEY_PREFIX}${user?.id}_${workspace?.id}`;
    return {
      permissionsKey: `${baseKey}_permissions`,
      rolesKey: `${baseKey}_roles`,
      timestampKey: `${baseKey}${CACHE_TIME_SUFFIX}`,
      errorKey: `${baseKey}_error`
    };
  };

  // Load from cache
  const loadFromCache = () => {
    if (!user?.id || !workspace?.id) return null;

    const { permissionsKey, rolesKey, timestampKey, errorKey } = getCacheKeys();
    
    const cachedPermissions = localStorage.getItem(permissionsKey);
    const cachedRoles = localStorage.getItem(rolesKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    const cachedError = localStorage.getItem(errorKey);

    if (!cachedTimestamp) return null;

    const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired, clear it
      localStorage.removeItem(permissionsKey);
      localStorage.removeItem(rolesKey);
      localStorage.removeItem(timestampKey);
      localStorage.removeItem(errorKey);
      return null;
    }

    return {
      permissions: cachedPermissions ? JSON.parse(cachedPermissions) : [],
      roles: cachedRoles ? JSON.parse(cachedRoles) : [],
      error: cachedError || null,
      timestamp: parseInt(cachedTimestamp, 10)
    };
  };

  // Save to cache
  const saveToCache = (perms: string[], userRoles: string[], err: string | null = null) => {
    if (!user?.id || !workspace?.id) return;

    const { permissionsKey, rolesKey, timestampKey, errorKey } = getCacheKeys();
    
    try {
      localStorage.setItem(permissionsKey, JSON.stringify(perms));
      localStorage.setItem(rolesKey, JSON.stringify(userRoles));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      if (err) {
        localStorage.setItem(errorKey, err);
      } else {
        localStorage.removeItem(errorKey);
      }
    } catch (e) {
      console.warn('Failed to cache permissions:', e);
    }
  };

  // Function to fetch user permissions from API
  const fetchPermissions = useCallback(async (forceRefresh: boolean = false) => {
    if (!isAuthenticated || !user || !workspace) {
      console.log('Cannot fetch permissions: not authenticated or missing user/workspace');
      setPermissions([]);
      setRoles([]);
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log('Loading permissions from cache');
        setPermissions(cached.permissions);
        setRoles(cached.roles);
        setError(cached.error);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/permissions?workspace=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting specifically
      if (response.status === 429) {
        console.warn('Rate limited, trying to use cached permissions');
        const cached = loadFromCache();
        if (cached) {
          setPermissions(cached.permissions);
          setRoles(cached.roles);
          setError('Using cached permissions due to rate limiting');
          return;
        }
        throw new Error('Rate limited and no cached permissions available');
      }

      if (!response.ok) {
        if (response.status === 404) {
          // Permissions endpoint not implemented yet, use defaults
          console.warn('Permissions endpoint not available, using default permissions');
          
          // For admin users, give all permissions
          if (user.email?.includes('admin') || user.roles?.includes('admin')) {
            const adminPermissions = [
              'workspace.read', 'workspace.admin',
              'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete', 'dashboard.admin',
              'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.admin',
              'chart.read', 'chart.create', 'chart.update', 'chart.delete', 'chart.admin',
              'datasource.read', 'datasource.create', 'datasource.update', 'datasource.delete', 'datasource.admin', 'datasource.test',
              'user.read', 'user.create', 'user.update', 'user.delete',
              'role.read', 'role.create', 'role.update', 'role.delete', 'role.assign',
              'category.read', 'category.create', 'category.update', 'category.delete',
              'webview.read', 'webview.create', 'webview.update', 'webview.delete',
              'export.pdf', 'export.excel', 'export.csv', 'export.image',
              'sql_editor.access', 'sql_editor.execute',
              'audit.read', 'security.manage'
            ];
            const adminRoles = ['admin'];
            
            setPermissions(adminPermissions);
            setRoles(adminRoles);
            saveToCache(adminPermissions, adminRoles);
            return;
          }
          
          // For regular users, give basic permissions
          const basicPermissions = [
            'workspace.read',
            'dashboard.read',
            'dataset.read',
            'chart.read',
            'datasource.read',
            'category.read',
            'webview.read',
            'export.csv', 'export.image'
          ];
          const basicRoles = ['reader'];
          
          setPermissions(basicPermissions);
          setRoles(basicRoles);
          saveToCache(basicPermissions, basicRoles);
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched permissions from API:', data);
      
      // Extract permissions from response
      const userPermissions = data.permissions || [];
      const userRoles = data.roles || [];
      
      setPermissions(userPermissions);
      setRoles(userRoles);
      
      // Cache the successful response
      saveToCache(userPermissions, userRoles);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch permissions';
      console.error('Permission fetch error:', errorMessage);
      setError(errorMessage);
      
      // Try to use cached permissions on error
      const cached = loadFromCache();
      if (cached && cached.permissions.length > 0) {
        console.log('Using cached permissions due to error');
        setPermissions(cached.permissions);
        setRoles(cached.roles);
        return;
      }
      
      // Fallback permissions for development
      if (user?.email?.includes('admin')) {
        const fallbackPermissions = [
          'workspace.read', 'workspace.admin',
          'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete',
          'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
          'chart.read', 'chart.create', 'chart.update', 'chart.delete',
          'datasource.read', 'datasource.create', 'datasource.update', 'datasource.delete', 'datasource.test',
          'user.read', 'user.create', 'user.update', 'user.delete',
          'sql_editor.access', 'sql_editor.execute'
        ];
        const fallbackRoles = ['admin'];
        
        setPermissions(fallbackPermissions);
        setRoles(fallbackRoles);
        saveToCache(fallbackPermissions, fallbackRoles, errorMessage);
      } else {
        // Basic permissions for non-admin users
        const basicPermissions = ['workspace.read', 'dashboard.read', 'dataset.read', 'chart.read', 'datasource.read'];
        const basicRoles = ['reader'];
        
        setPermissions(basicPermissions);
        setRoles(basicRoles);
        saveToCache(basicPermissions, basicRoles, errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user, workspace, isAuthenticated]);

  // Load permissions when auth state changes
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Permission checking functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!permission) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return permissions.includes(permission);
  }, [permissions, roles]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions, roles]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return false;
    
    // Admin users have all permissions
    if (roles.includes('admin')) {
      return true;
    }
    
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions, roles]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions(true); // Force refresh
  }, [fetchPermissions]);

  return {
    permissions,
    roles,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };
};

export default usePermissions;