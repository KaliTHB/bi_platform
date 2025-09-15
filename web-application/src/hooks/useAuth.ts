// web-application/src/hooks/useAuth.ts - FIXED VERSION
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setCredentials,
  setPermissions,
  setLoading,
  setError,
  clearError,
  initializeAuth,
  logout as logoutAction,  // ✅ CORRECT: Use logout from authSlice
  updateToken
} from '../store/slices/authSlice';
import {authStorage, workspaceStorage} from '@/utils/storageUtils';
import {
  setCurrentWorkspace,
  setAvailableWorkspaces,
  resetWorkspaceState,    // ✅ CORRECT: Use resetWorkspaceState  
  clearError as clearWorkspaceError
} from '../store/slices/workspaceSlice';
import { STORAGE_KEYS } from '../constants';

// Types
interface User {
  id: string;
  user_id: string;
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

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 useAuth: Starting app initialization');
      
      if (!auth.isInitialized) {
        dispatch(initializeAuth());
      }
    };

    initializeApp();
  }, [dispatch, auth.isInitialized]);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<any> => {
    try {
      console.log('🔐 useAuth: Attempting login for:', credentials.emailOrUsername);
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.user || !data.token) {
        throw new Error(data.message || 'Login response missing required data');
      }

      const { user, token, workspace: responseWorkspace, permissions } = data;
      
      console.log('✅ useAuth: Login successful', {
        user: user.email,
        hasWorkspace: !!responseWorkspace,
        hasToken: !!token,
        hasPermissions: !!permissions?.length
      });

      // Store credentials in localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      if (responseWorkspace) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(responseWorkspace));
        dispatch(setCurrentWorkspace(responseWorkspace));
      }

      let finalPermissions: string[] = [];
      if (permissions && permissions.length > 0) {
        finalPermissions = permissions;
        localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
      }

      // ✅ FIXED: Use setCredentials (which exists) instead of clearCredentials
      dispatch(setCredentials({
        user,
        token,
        permissions: finalPermissions,
        workspace: responseWorkspace
      }));

      return { success: true, user, token, workspace: responseWorkspace, permissions: finalPermissions };
      
    } catch (error: any) {
      console.error('❌ useAuth: Login failed:', error);
      dispatch(setError(error.message || 'Login failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // ✅ FIXED: Logout function using correct Redux actions
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 useAuth: Logging out');

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
      localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);

      // ✅ FIXED: Use correct Redux actions that actually exist
      dispatch(logoutAction());           // This exists in authSlice
      dispatch(resetWorkspaceState());    // This exists in workspaceSlice

      console.log('✅ useAuth: Logout completed');
      
    } catch (error: any) {
      console.error('❌ useAuth: Logout failed:', error);
      // Still clear state even if logout request fails
      dispatch(logoutAction());
      dispatch(resetWorkspaceState());
    }
  };

  // Switch workspace function
  const switchWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      console.log('🔄 useAuth: Switching workspace to:', workspaceId);
      dispatch(setLoading(true));
      // Get current context
      const currentUser = authStorage.getUser();
      const currentWorkspace = workspaceStorage.getCurrentWorkspace();


      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
          'X-Workspace-Id': currentWorkspace?.id || '',
          'X-Workspace-Slug': currentWorkspace?.slug || '',
          'X-User-Id': currentUser?.user_id || ''
        },
        body: JSON.stringify({ workspaceId: workspaceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Workspace switch failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.token) {
        throw new Error(data.message || 'Workspace switch response missing token');
      }

      const { user, token, workspace: newWorkspace, permissions } = data;

      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(newWorkspace));
      
      if (permissions) {
        localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
      }

      // Update Redux store
      dispatch(setCredentials({
        user,
        token,
        permissions: permissions || [],
        workspace: newWorkspace
      }));
      
      dispatch(setCurrentWorkspace(newWorkspace));

      console.log('✅ useAuth: Workspace switched successfully to:', newWorkspace.name);

    } catch (error: any) {
      console.error('❌ useAuth: Workspace switch failed:', error);
      dispatch(setError(error.message || 'Failed to switch workspace'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Get available workspaces
  const getAvailableWorkspaces = async (): Promise<any[]> => {
  try {
    console.log('📋 useAuth: Getting available workspaces');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/user/workspaces`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get workspaces: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to retrieve workspaces');
    }

    // ✅ FIXED: Extract workspaces from the correct field
    // API returns data in { success: true, data: [...] } format
    const workspaces = data.data || data.workspaces || [];
    
    console.log('✅ useAuth: Retrieved workspaces:', workspaces.length);
    console.log('✅ useAuth: Workspaces data structure:', workspaces);

    dispatch(setAvailableWorkspaces(workspaces));
    return workspaces;

  } catch (error: any) {
    console.error('❌ useAuth: Failed to get available workspaces:', error);
    dispatch(setError(error.message || 'Failed to load workspaces'));
    return [];
  }
};

  // Verify token
  const verifyToken = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!storedToken) {
      console.log('🔍 useAuth: No stored token found');
      return false;
    }

    try {
      console.log('🔍 useAuth: Verifying token...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log('✅ useAuth: Token verification successful');
          
          // ✅ FIXED: Use setCredentials instead of non-existent clearCredentials
          dispatch(setCredentials({
            user: data.user,
            token: storedToken,
            permissions: data.permissions || [],
            workspace: data.workspace
          }));
          
          return true;
        }
      }

      console.log('❌ useAuth: Token verification failed');
      return false;
    } catch (error: any) {
      console.error('❌ useAuth: Token verification error:', error);
      return false;
    }
  };

  // Clear error
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
    dispatch(clearWorkspaceError());
  }, [dispatch]);

  // Refresh auth
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 useAuth: Refreshing auth');
    if (auth.token) {
      await verifyToken();
      await getAvailableWorkspaces();
    }
  };

  // Permission checking helpers
  const hasPermission = useCallback((permission: string): boolean => {
    return auth.permissions.includes(permission);
  }, [auth.permissions]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => auth.permissions.includes(permission));
  }, [auth.permissions]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => auth.permissions.includes(permission));
  }, [auth.permissions]);

  // Placeholder functions for complete interface
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> => {
    throw new Error('Register function not implemented yet');
  };

  const forgotPassword = async (emailOrUsername: string): Promise<any> => {
    throw new Error('Forgot password function not implemented yet');
  };

  const resetPassword = async (token: string, newPassword: string): Promise<any> => {
    throw new Error('Reset password function not implemented yet');
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
    throw new Error('Change password function not implemented yet');
  };

  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }): Promise<any> => {
    throw new Error('Update profile function not implemented yet');
  };

  return {
    // State
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || workspace.isLoading,
    error: auth.error || workspace.error,
    permissions: auth.permissions || [],
    availableWorkspaces: workspace.availableWorkspaces || [],
    currentWorkspace: workspace.currentWorkspace,
    isInitialized: auth.isInitialized,

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
    
    // Permission helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};