// =============================================================================
// FILE: web-application/src/hooks/useAuth.ts (COMPLETE UPDATE)
// =============================================================================

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setCredentials,
  setPermissions,
  setLoading,
  setError,
  clearError,
  initializeAuth,
  logout as logoutAction,
} from '../store/slices/authSlice';
import {
  setCurrentWorkspace,
  clearWorkspace,
  clearWorkspaces,
  switchWorkspace as switchWorkspaceAction,
  fetchUserWorkspaces,
  initializeWorkspace,
} from '../store/slices/workspaceSlice';
import {  setStorageItem, removeStorageItem, cleanupOldWorkspaceKeys } from '../utils/storageUtils';
import { STORAGE_KEYS } from '@/constants/index';

// NEW: Import RTK Query hooks for permissions
import { 
  useGetCurrentUserPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useRefreshUserPermissionsMutation,
} from '../store/api/authApi';

// Types
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<any>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<any>;
  verifyToken: () => Promise<boolean>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<void>;
  getAvailableWorkspaces: () => Promise<any[]>;
  forgotPassword: (emailOrUsername: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<any>;
  
  // NEW: Permission-related actions
  loadUserPermissions: () => Promise<string[]>;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
}

interface AuthState {
  user: User | null;
  workspace: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  permissionsLoaded: boolean;
  permissionsError: string | null;
}

export const useAuth = (): AuthState & AuthActions => {
  const dispatch = useAppDispatch();
  
  // Auth state from Redux
  const { 
    user, 
    token, 
    isLoading, 
    error, 
    permissions,
    permissionsLoaded,
    permissionsError,
    isAuthenticated: authIsAuthenticated 
  } = useAppSelector(state => state.auth);
  
  const { 
    currentWorkspace, 
    availableWorkspaces, 
    isInitialized 
  } = useAppSelector(state => state.workspace);
  
  const isAuthenticated = !!token && !!user && authIsAuthenticated;

  // NEW: RTK Query permissions hooks
  const { 
    data: permissionsData,
    isLoading: permissionsQueryLoading,
    error: permissionsQueryError,
    refetch: refetchPermissions
  } = useGetCurrentUserPermissionsQuery(
    { workspaceId: currentWorkspace?.id },
    {
      skip: !isAuthenticated || !token,
      pollingInterval: 5 * 60 * 1000, // Poll every 5 minutes
    }
  );

  const [loadPermissionsLazy, { 
    isLoading: lazyPermissionsLoading 
  }] = useLazyGetCurrentUserPermissionsQuery();

  const [refreshPermissionsMutation, { 
    isLoading: refreshingPermissions 
  }] = useRefreshUserPermissionsMutation();

  // Initialize auth on app start
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Initialize workspaces when user is authenticated
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 useAuth: Initializing app...', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        workspacesInitialized: isInitialized,
        availableWorkspacesCount: availableWorkspaces.length,
        permissionsLoaded
      });

      if (isAuthenticated && user && !isInitialized) {
        try {
          // Initialize workspace from localStorage first
          dispatch(initializeWorkspace());
          
          // Then fetch fresh workspaces from API
          console.log('🔄 useAuth: Fetching user workspaces...');
          await dispatch(fetchUserWorkspaces()).unwrap();
          
          console.log('✅ useAuth: App initialization completed');
        } catch (error) {
          console.error('❌ useAuth: Failed to initialize workspaces:', error);
        }
      }
    };

    initializeApp();
  }, [isAuthenticated, user, token, isInitialized, dispatch, availableWorkspaces.length, permissionsLoaded]);

  // Auto-load permissions if not loaded and user is authenticated
  useEffect(() => {
    if (isAuthenticated && !permissionsLoaded && !permissionsQueryLoading && !lazyPermissionsLoading) {
      console.log('🔐 useAuth: Auto-loading permissions...');
      loadUserPermissions();
    }
  }, [isAuthenticated, permissionsLoaded, permissionsQueryLoading, lazyPermissionsLoading]);

  // Login function - enhanced with permissions support
  const login = async (credentials: LoginCredentials): Promise<any> => {
    try {
      console.log('🔑 Auth Hook: Starting login process');
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.emailOrUsername.includes('@') ? credentials.emailOrUsername : undefined,
          username: !credentials.emailOrUsername.includes('@') ? credentials.emailOrUsername : undefined,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.success || !data.data?.user || !data.data?.token) {
        throw new Error('Invalid login response format');
      }

      const { user, token, workspace, permissions } = data.data;

      console.log('✅ Auth Hook: Login successful', {
        user: user.email,
        hasWorkspace: !!workspace,
        hasToken: !!token,
        hasPermissions: !!permissions?.length
      });

      // Store credentials using consolidated storage
      setStorageItem(STORAGE_KEYS.TOKEN, token);
      setStorageItem(STORAGE_KEYS.USER, user);

      if (workspace) {
        setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, workspace);
        dispatch(setCurrentWorkspace(workspace));
      }

      // Handle permissions - store if provided, otherwise will be loaded separately
      let finalPermissions: string[] = [];
      if (permissions && permissions.length > 0) {
        finalPermissions = permissions;
        setStorageItem(STORAGE_KEYS.PERMISSIONS, permissions);
        console.log('💾 Auth Hook: Permissions from login response:', permissions);
      }

      // Update Redux store
      dispatch(setCredentials({
        user,
        token,
        permissions: finalPermissions,
        workspace
      }));

      // Clean up old storage keys
      cleanupOldWorkspaceKeys();

      return { success: true, user, token, workspace, permissions: finalPermissions };
      
    } catch (error: any) {
      console.error('❌ Auth Hook: Login failed:', error);
      dispatch(setError(error.message || 'Login failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Auth Hook: Logging out');

      // Clear localStorage using consolidated keys
      removeStorageItem(STORAGE_KEYS.TOKEN);
      removeStorageItem(STORAGE_KEYS.USER);
      removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE);
      removeStorageItem(STORAGE_KEYS.PERMISSIONS);
      
      // Clean up old workspace keys
      cleanupOldWorkspaceKeys();

      // Clear Redux store
      dispatch(logoutAction());
      dispatch(clearWorkspaces());

      console.log('✅ Auth Hook: Logout completed');
    } catch (error) {
      console.error('❌ Auth Hook: Logout error:', error);
    }
  };

  // Switch workspace function with permissions refresh
  const switchWorkspace = async (workspaceSlug: string): Promise<void> => {
    try {
      console.log('🔄 Auth Hook: Switching to workspace:', workspaceSlug);
      
      // Ensure workspaces are loaded first
      if (availableWorkspaces.length === 0) {
        console.log('📥 Auth Hook: Loading workspaces first...');
        await dispatch(fetchUserWorkspaces()).unwrap();
      }
      
      // Use Redux action which handles API call and storage
      await dispatch(switchWorkspaceAction(workspaceSlug)).unwrap();
      
      // Refresh permissions for new workspace
      await refreshPermissions();
      
      console.log('✅ Auth Hook: Workspace switched successfully');
    } catch (error: any) {
      console.error('❌ Auth Hook: Workspace switch failed:', error);
      throw new Error(`Failed to switch to workspace '${workspaceSlug}': ${error.message}`);
    }
  };

  // Get available workspaces
  const getAvailableWorkspaces = async (): Promise<any[]> => {
    try {
      if (availableWorkspaces.length > 0) {
        return availableWorkspaces;
      }

      console.log('📥 Auth Hook: Fetching available workspaces...');
      const result = await dispatch(fetchUserWorkspaces()).unwrap();
      return result.workspaces || [];
    } catch (error: any) {
      console.error('❌ Auth Hook: Failed to get workspaces:', error);
      throw error;
    }
  };

  // Verify token
  const verifyToken = async (): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (!storedToken) {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          dispatch(setCredentials({
            user: data.user,
            token: storedToken,
            workspace: data.workspace,
            permissions: data.permissions || []
          }));

          if (data.workspace) {
            dispatch(setCurrentWorkspace(data.workspace));
          }

          return true;
        }
      }
      
      // Token is invalid, clear storage
      await logout();
      return false;
      
    } catch (error) {
      console.error('❌ Auth Hook: Token verification failed:', error);
      await logout();
      return false;
    }
  };

  // NEW: Load user permissions manually
  const loadUserPermissions = async (): Promise<string[]> => {
    if (!isAuthenticated || !token) {
      console.warn('⚠️ Cannot load permissions: user not authenticated');
      return [];
    }

    try {
      console.log('🔍 Auth Hook: Loading user permissions...');
      const result = await loadPermissionsLazy({ 
        workspaceId: currentWorkspace?.id 
      }).unwrap();
      
      dispatch(setPermissions({ 
        permissions: result.permissions,
        workspaceId: currentWorkspace?.id 
      }));
      
      console.log('✅ Auth Hook: Permissions loaded:', result.permissions);
      return result.permissions;
    } catch (error: any) {
      console.error('❌ Auth Hook: Failed to load permissions:', error);
      dispatch(setError(error.message || 'Failed to load permissions'));
      return [];
    }
  };

  // NEW: Refresh permissions
  const refreshPermissions = async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      console.log('🔄 Auth Hook: Refreshing permissions...');
      await refreshPermissionsMutation({ 
        workspaceId: currentWorkspace?.id 
      }).unwrap();
      
      await refetchPermissions();
      console.log('✅ Auth Hook: Permissions refreshed successfully');
    } catch (error: any) {
      console.error('❌ Auth Hook: Failed to refresh permissions:', error);
      dispatch(setError(error.message || 'Failed to refresh permissions'));
    }
  };

  // Refresh auth function
  const refreshAuth = async (): Promise<void> => {
    try {
      await verifyToken();
      await refreshPermissions();
    } catch (error) {
      console.error('❌ Auth Hook: Refresh auth failed:', error);
    }
  };

  // Clear error
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // NEW: Permission check functions
  const hasPermission = (permission: string): boolean => {
    if (!permissions.length) return false;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!permissions.length || !requiredPermissions.length) return false;
    return requiredPermissions.every(perm => permissions.includes(perm));
  };

  const isAdmin = (): boolean => {
    return hasPermission('admin_access') || hasPermission('super_admin');
  };

  // Placeholder functions for backwards compatibility
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> => {
    throw new Error('Registration not implemented');
  };

  const forgotPassword = async (emailOrUsername: string): Promise<any> => {
    throw new Error('Forgot password not implemented');
  };

  const resetPassword = async (token: string, newPassword: string): Promise<any> => {
    throw new Error('Reset password not implemented');
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
    throw new Error('Change password not implemented');
  };

  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }): Promise<any> => {
    throw new Error('Update profile not implemented');
  };

  // Calculate loading states
  const totalLoading = isLoading || permissionsQueryLoading || lazyPermissionsLoading || refreshingPermissions;

  return {
    // State
    user,
    workspace: currentWorkspace,
    isAuthenticated,
    isLoading: totalLoading,
    error,
    permissions,
    permissionsLoaded,
    permissionsError,

    // Actions
    login,
    logout,
    register,
    verifyToken,
    clearError: clearAuthError,
    refreshAuth,
    switchWorkspace,
    getAvailableWorkspaces,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,

    // NEW: Permission actions
    loadUserPermissions,
    refreshPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
};

export default useAuth;

// Export types for backward compatibility
export type { User, LoginCredentials, AuthActions, AuthState };