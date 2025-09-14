// web-application/src/hooks/useAuth.ts - FINAL FIX with only real exports
import { useEffect, useCallback } from 'react';
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
  // ✅ ONLY import what's actually exported from workspaceSlice
  setCurrentWorkspace,
  setAvailableWorkspaces,
  updateWorkspace,
  removeWorkspace,
  clearError as clearWorkspaceError,
  resetWorkspaceState,
  // ✅ Async thunk actions
  fetchAvailableWorkspaces,
  initializeWorkspace,
  switchWorkspace as switchWorkspaceAction,
  clearWorkspaceState, // This is the async thunk for clearing
} from '../store/slices/workspaceSlice';
import { setStorageItem, removeStorageItem, cleanupOldWorkspaceKeys } from '../utils/storageUtils';
import { STORAGE_KEYS } from '@/constants/index';

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
}

export const useAuth = (): AuthActions & {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  availableWorkspaces: any[];
  currentWorkspace: any;
  isInitialized: boolean;
} => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);

  // ✅ FIXED: Proper initialization effect with correct dependency order
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 useAuth: Starting app initialization', {
        isInitialized: auth.isInitialized,
        isAuthenticated: auth.isAuthenticated,
        hasUser: !!auth.user,
        hasToken: !!auth.token
      });

      // Step 1: Initialize auth from localStorage FIRST
      if (!auth.isInitialized) {
        console.log('🔄 useAuth: Initializing auth from storage...');
        dispatch(initializeAuth());
        return; // Exit early, let the next effect handle the rest
      }

      // Step 2: Only initialize workspaces if authenticated and haven't done it yet
      if (auth.isAuthenticated && auth.user && auth.token && !workspace.isInitialized) {
        try {
          console.log('🔄 useAuth: Initializing workspaces for authenticated user...');
          
          // Initialize workspace state from localStorage
          dispatch(initializeWorkspace());
          
          // Fetch fresh workspaces from API
          console.log('📥 useAuth: Fetching user workspaces...');
          await dispatch(fetchAvailableWorkspaces()).unwrap();
          
          console.log('✅ useAuth: App initialization completed successfully');
        } catch (error: any) {
          console.error('❌ useAuth: Failed to initialize workspaces:', error);
          // Don't fail completely - user can still use the app
          dispatch(setError(`Workspace initialization failed: ${error.message}`));
        }
      }
    };

    initializeApp();
  }, [
    auth.isInitialized, 
    auth.isAuthenticated, 
    auth.user, 
    auth.token, 
    workspace.isInitialized, 
    dispatch
  ]);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<any> => {
    try {
      console.log('🔑 useAuth: Starting login process');
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
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

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // Handle different response formats
      const responseData = data.data || data;
      const { user, token, workspace: responseWorkspace, permissions } = responseData;

      if (!user || !token) {
        throw new Error('Invalid login response: missing user or token');
      }

      console.log('✅ useAuth: Login successful', {
        user: user.email,
        hasWorkspace: !!responseWorkspace,
        hasToken: !!token,
        hasPermissions: !!permissions?.length
      });

      // Store credentials using consolidated storage
      setStorageItem(STORAGE_KEYS.TOKEN, token);
      setStorageItem(STORAGE_KEYS.USER, user);

      if (responseWorkspace) {
        setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, responseWorkspace);
        dispatch(setCurrentWorkspace(responseWorkspace));
      }

      // Handle permissions - store if provided, otherwise will be loaded separately
      let finalPermissions: string[] = [];
      if (permissions && permissions.length > 0) {
        finalPermissions = permissions;
        setStorageItem(STORAGE_KEYS.PERMISSIONS, permissions);
        console.log('💾 useAuth: Permissions from login response:', permissions);
      }

      // Update Redux store
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

  // Logout function - ✅ FIXED: No longer imports non-existent clearWorkspaces
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 useAuth: Logging out');

      // Clear localStorage using consolidated keys
      removeStorageItem(STORAGE_KEYS.TOKEN);
      removeStorageItem(STORAGE_KEYS.USER);
      removeStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE);
      removeStorageItem(STORAGE_KEYS.PERMISSIONS);
  

      // Clear Redux store - ✅ FIXED: Use only existing actions
      dispatch(logoutAction());
      dispatch(clearWorkspaceState()); // This is the async thunk that exists

      console.log('✅ useAuth: Logout completed');
    } catch (error) {
      console.error('❌ useAuth: Logout error:', error);
    }
  };

  // Switch workspace function with permissions refresh
  const switchWorkspace = async (workspaceSlug: string): Promise<void> => {
    try {
      console.log('🔄 useAuth: Switching to workspace:', workspaceSlug);
      
      // Ensure workspaces are loaded first
      if (workspace.availableWorkspaces.length === 0) {
        console.log('📥 useAuth: Loading workspaces first...');
        await dispatch(fetchAvailableWorkspaces()).unwrap();
      }
      
      // ✅ FIXED: Use Redux action which handles API call and storage
      await dispatch(switchWorkspaceAction({ slug: workspaceSlug })).unwrap();
      
      console.log('✅ useAuth: Workspace switched successfully');
    } catch (error: any) {
      console.error('❌ useAuth: Workspace switch failed:', error);
      throw new Error(`Failed to switch to workspace '${workspaceSlug}': ${error.message}`);
    }
  };

  // Get available workspaces
  const getAvailableWorkspaces = async (): Promise<any[]> => {
    try {
      if (workspace.availableWorkspaces.length > 0) {
        return workspace.availableWorkspaces;
      }

      console.log('📥 useAuth: Fetching available workspaces...');
      const result = await dispatch(fetchAvailableWorkspaces()).unwrap();
      return result || [];
    } catch (error: any) {
      console.error('❌ useAuth: Failed to get workspaces:', error);
      throw error;
    }
  };

  // Verify token
  const verifyToken = async (): Promise<boolean> => {
    try {
      const storedToken = auth.token || localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (!storedToken) {
        console.log('🔍 useAuth: No token found for verification');
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log('✅ useAuth: Token verification successful');
          
          // Update Redux state with verified user data
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
  }, [dispatch]);

  // Refresh auth
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 useAuth: Refreshing auth');
    if (auth.token) {
      await verifyToken();
      await getAvailableWorkspaces();
    }
  };

  // Placeholder functions for full interface
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
  };
};