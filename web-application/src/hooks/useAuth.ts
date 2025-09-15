// web-application/src/hooks/useAuth.ts
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setCurrentWorkspace,     // ✅ This comes from workspaceSlice
  setAvailableWorkspaces,
  clearWorkspaceState      // ✅ This clears workspace state
} from '../store/slices/workspaceSlice';
import storageUtils, { cleanExpiredItems } from '../utils/storageUtils';

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  is_active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  users_count?: number;
}

export interface UseAuthReturn {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Functions
  logout: () => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  getAvailableWorkspaces: () => Promise<Workspace[]>;
  refreshAuth: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const dispatch = useDispatch();
  
  // Get auth state from Redux
  const { user, workspace, token, permissions, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  const isAuthenticated = !!user && !!token;

  // ✅ CORRECTED: Logout with proper storage cleanup
  const logout = useCallback(() => {
    console.log('🚪 Logout: Clearing all storage...');
    
    // Clear all auth storage
    storageUtils.auth.clearAuth();
    
    // Clean expired items one final time
    cleanExpiredItems();
    
    // Clear Redux state
    dispatch(clearCredentials());
    
    // Redirect to login
    router.push('/login');
  }, [dispatch, router]);

  // ✅ CORRECTED: Handle token expiry with proper cleanup
  const handleTokenExpiry = useCallback(() => {
    console.log('⏰ Token expired: Clearing storage...');
    
    // Clear all auth storage
    storageUtils.auth.clearAuth();
    cleanExpiredItems();
    
    // Clear Redux state
    dispatch(clearCredentials());
    
    // Redirect to login
    router.push('/login?expired=true');
  }, [dispatch, router]);

  // Switch workspace (update, don't remove)
  const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      console.log(`🔄 Switching to workspace: ${workspaceId}`);

      // Make API call to switch workspace
      const response = await fetch(`/api/workspaces/${workspaceId}/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to switch workspace');
      }

      const data = await response.json();
      
      // Update workspace in storage and Redux
      storageUtils.workspace.setCurrentWorkspace(data.workspace);
      dispatch(setCurrentWorkspace(data.workspace));
      
      // Update permissions for new workspace
      if (data.permissions) {
        storageUtils.auth.setPermissions(data.permissions, workspaceId);
      }

      console.log(`✅ Successfully switched to workspace: ${workspaceId}`);

    } catch (error) {
      console.error('❌ Failed to switch workspace:', error);
      throw error;
    }
  }, [token, dispatch]);

  // Get available workspaces
  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const response = await fetch('/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpiry();
          return [];
        }
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      const workspaces = data.workspaces || [];
      
      // Cache available workspaces
      storageUtils.workspace.setAvailableWorkspaces(workspaces);
      
      return workspaces;

    } catch (error) {
      console.error('❌ Failed to get available workspaces:', error);
      return [];
    }
  }, [token, handleTokenExpiry]);

  // Refresh authentication
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = storageUtils.auth.getRefreshToken();
      if (!refreshToken) {
        logout();
        return;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        logout();
        return;
      }

      const data = await response.json();
      
      // Update token
      storageUtils.auth.setToken(data.token);
      
      // Update Redux state
      dispatch(setCredentials({
        user: data.user || user,
        token: data.token,
        permissions: data.permissions || permissions
      }));

      console.log('✅ Authentication refreshed successfully');

    } catch (error) {
      console.error('❌ Failed to refresh authentication:', error);
      logout();
    }
  }, [user, permissions, dispatch, logout]);

  // Initialize auth from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = storageUtils.auth.getToken();
      const storedUser = storageUtils.auth.getUser();
      const storedWorkspace = storageUtils.workspace.getCurrentWorkspace();
      const storedPermissions = storageUtils.auth.getPermissions(storedWorkspace?.id);

      if (storedToken && storedUser) {
        dispatch(setCredentials({
          user: storedUser,
          token: storedToken,
          permissions: storedPermissions || []
        }));

        if (storedWorkspace) {
          dispatch(setCurrentWorkspace(storedWorkspace));
        }

        console.log('✅ Auth initialized from storage');
      } else {
        console.log('❌ No valid auth data in storage');
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Set up token expiry monitoring
  useEffect(() => {
    if (!token) return;

    // Check token validity periodically
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.log('⚠️ Token validation failed, triggering expiry handling');
          handleTokenExpiry();
        }
      } catch (error) {
        console.error('❌ Token verification error:', error);
        handleTokenExpiry();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [token, handleTokenExpiry]);

  return {
    user,
    workspace,
    token,
    permissions,
    isAuthenticated,
    isLoading,
    logout,
    switchWorkspace,
    getAvailableWorkspaces,
    refreshAuth
  };
};