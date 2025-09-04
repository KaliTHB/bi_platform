import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { apiClient } from '../services/apiClient';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

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
        localStorage.setItem(`permissions_${user.id}_${currentWorkspace.id}`, JSON.stringify({
          permissions: userPermissions,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        }));
      }
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setError(err.message || 'Failed to fetch permissions');
      
      // Try to load from cache on error
      const cached = localStorage.getItem(`permissions_${user.id}_${currentWorkspace.id}`);
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

  // Refresh permissions every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchPermissions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, currentWorkspace?.id]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(perm => permissions.includes(perm));
  };

  const value = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}