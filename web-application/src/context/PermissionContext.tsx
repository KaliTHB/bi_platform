// web-application/src/context/PermissionContext.tsx
// ✅ Updated to use unified storage system

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../components/providers/AuthProvider';
import { STORAGE_KEYS,  } from '@/constants/index';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (requiredPermissions: string[]) => boolean;
  hasAllPermissions: (requiredPermissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  // Use unified auth context
  const { user, workspace: currentWorkspace, isAuthenticated } = useAuth();
  
  // Local state
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Fetch permissions from API
  const fetchPermissions = async (): Promise<void> => {
    if (!user || !currentWorkspace || !isAuthenticated) {
      console.log('⏭️ PermissionContext: Skipping permission fetch (no user/workspace/auth)');
      setPermissions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 PermissionContext: Fetching permissions for:', {
        userId: user.id,
        workspaceId: currentWorkspace.id,
        workspaceName: currentWorkspace.name
      });

      // Check cache first using unified storage
      const cachedPermissions = StorageManager.getUserPermissions(user.id, currentWorkspace.id);
      
      if (cachedPermissions) {
        console.log('📦 PermissionContext: Using cached permissions:', cachedPermissions.length);
        setPermissions(cachedPermissions);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const token = StorageManager.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/user/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch permissions');
      }

      const userPermissions = result.data?.permissions || [];
      setPermissions(userPermissions);

      // Cache permissions using unified storage with 5-minute TTL
      StorageManager.setUserPermissions(
        user.id, 
        currentWorkspace.id, 
        userPermissions, 
        5 * 60 * 1000 // 5 minutes
      );

      console.log('✅ PermissionContext: Permissions loaded:', userPermissions.length);

    } catch (err: any) {
      console.error('❌ PermissionContext: Error fetching permissions:', err);
      setError(err.message || 'Failed to fetch permissions');

      // Try to use cached permissions as fallback (even if potentially expired)
      const fallbackPermissions = StorageManager.getUserPermissions(user.id, currentWorkspace.id);
      if (fallbackPermissions) {
        console.log('📦 PermissionContext: Using fallback cached permissions');
        setPermissions(fallbackPermissions);
      } else {
        setPermissions([]);
      }

    } finally {
      setIsLoading(false);
    }
  };

  // Refresh permissions (exposed method)
  const refreshPermissions = async (): Promise<void> => {
    if (!user || !currentWorkspace) return;
    
    // Clear cache and fetch fresh
    const key = `${STORAGE_KEYS.PERMISSIONS_PREFIX}${user.id}_${currentWorkspace.id}`;
    StorageManager.removeItem(key);
    await fetchPermissions();
  };

  // Fetch permissions when user or workspace changes
  useEffect(() => {
    fetchPermissions();
  }, [user?.id, currentWorkspace?.id, isAuthenticated]);

  // Clean up old permission cache keys when workspace changes
  useEffect(() => {
    if (currentWorkspace && user) {
      console.log('🧹 PermissionContext: Cleaning up old permission cache keys');
      
      // Clean up old permission cache keys with different patterns
      const oldKeyPatterns = [
        `permissions_${user.id}_workspace_${currentWorkspace.id}`,
        `user_permissions_${user.id}_${currentWorkspace.id}`,
        `auth_permissions_${user.id}_${currentWorkspace.id}`,
      ];
      
      oldKeyPatterns.forEach(key => {
        StorageManager.removeItem(key);
      });

      // Only keep our current unified format: permissions_userId_workspaceId
      console.log('✅ PermissionContext: Cache cleanup completed');
    }
  }, [currentWorkspace?.id, user?.id]);

  // Clear permissions when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 PermissionContext: Clearing permissions (user logged out)');
      setPermissions([]);
      setError(null);
    }
  }, [isAuthenticated]);

  // Permission checker functions
  const hasPermission = (permission: string): boolean => {
    const hasIt = permissions.includes(permission);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 PermissionContext: Check '${permission}':`, hasIt);
    }
    
    return hasIt;
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    const hasAny = requiredPermissions.some(permission => permissions.includes(permission));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 PermissionContext: Check any of [${requiredPermissions.join(', ')}]:`, hasAny);
    }
    
    return hasAny;
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    const hasAll = requiredPermissions.every(permission => permissions.includes(permission));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 PermissionContext: Check all of [${requiredPermissions.join(', ')}]:`, hasAll);
    }
    
    return hasAll;
  };

  const contextValue: PermissionContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error,
    refreshPermissions,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('PermissionContext state:', {
      userId: user?.id,
      workspaceId: currentWorkspace?.id,
      workspaceName: currentWorkspace?.name,
      permissionCount: permissions.length,
      isLoading,
      hasError: !!error,
      isAuthenticated,
    });
  }

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