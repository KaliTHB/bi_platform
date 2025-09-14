// web-application/src/context/PermissionContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { apiClient } from '@/utils/apiUtils';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Consolidated storage keys
const STORAGE_KEYS = {
  CURRENT_WORKSPACE: 'currentWorkspace', // ✅ Single workspace key
  PERMISSIONS_PREFIX: 'permissions_', // For user-workspace specific permissions
} as const;

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const fetchPermissions = async () => {
    if (!user || !currentWorkspace) {
      setPermissions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/permissions/my-permissions/${currentWorkspace.id}`);
      
      if (response.data.success) {
        const userPermissions = response.data.data.permissions || [];
        setPermissions(userPermissions);
        
        // Cache permissions in localStorage for offline UI
        // Use consistent workspace key format
        const permissionsCacheKey = `${STORAGE_KEYS.PERMISSIONS_PREFIX}${user.id}_${currentWorkspace.id}`;
        localStorage.setItem(permissionsCacheKey, JSON.stringify({
          permissions: userPermissions,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        }));
      }
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setError(err.message || 'Failed to fetch permissions');
      
      // Try to load from cache on error
      const permissionsCacheKey = `${STORAGE_KEYS.PERMISSIONS_PREFIX}${user.id}_${currentWorkspace.id}`;
      const cached = localStorage.getItem(permissionsCacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (Date.now() - parsedCache.timestamp < parsedCache.ttl) {
            setPermissions(parsedCache.permissions);
          }
        } catch (e) {
          console.error('Error parsing cached permissions:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch permissions when user or workspace changes
  useEffect(() => {
    fetchPermissions();
  }, [user?.id, currentWorkspace?.id]);

  // Clean up old permission cache keys when workspace changes
  useEffect(() => {
    if (currentWorkspace && user) {
      // Clean up old permission cache keys that might use different formats
      const oldKeys = [
        `permissions_${user.id}_workspace_${currentWorkspace.id}`,
        `user_permissions_${user.id}_${currentWorkspace.id}`,
        `auth_permissions_${user.id}_${currentWorkspace.id}`,
      ];
      
      oldKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove old permission cache key ${key}:`, error);
        }
      });
    }
  }, [currentWorkspace?.id, user?.id]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const contextValue: PermissionContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}