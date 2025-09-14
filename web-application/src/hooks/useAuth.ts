// web-application/src/hooks/useAuth.ts - FIXED VERSION
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setCredentials,
  setLoading,
  setError,
  clearError,
  clearAuth,
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
import { STORAGE_KEYS, setStorageItem, removeStorageItem, cleanupOldWorkspaceKeys } from '../utils/storageUtils';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
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

interface AuthState {
  user: User | null;
  workspace: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
}

export const useAuth = (): AuthState & AuthActions => {
  const dispatch = useAppDispatch();
  
  // Auth state
  const { user, token, isLoading, error, permissions } = useAppSelector(state => state.auth);
  const { currentWorkspace, availableWorkspaces, isInitialized } = useAppSelector(state => state.workspace);
  
  const isAuthenticated = !!token && !!user;

  // ✅ CRITICAL FIX: Initialize workspaces when user is authenticated
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 useAuth: Initializing app...', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        workspacesInitialized: isInitialized,
        availableWorkspacesCount: availableWorkspaces.length
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
  }, [isAuthenticated, user, token, isInitialized, dispatch]);

  // Login function
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

      if (!data.success || !data.user || !data.token) {
        throw new Error('Invalid login response format');
      }

      console.log('✅ Auth Hook: Login successful', {
        user: data.user.email,
        hasWorkspace: !!data.workspace,
        hasToken: !!data.token
      });

      // Store credentials
      setStorageItem(STORAGE_KEYS.TOKEN, data.token);
      setStorageItem(STORAGE_KEYS.USER, data.user);
      setStorageItem(STORAGE_KEYS.PERMISSIONS, data.permissions || []);

      if (data.workspace) {
        setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, data.workspace);
        dispatch(setCurrentWorkspace(data.workspace));
      }

      // Update Redux
      dispatch(setCredentials({
        user: data.user,
        token: data.token,
        workspace: data.workspace,
        permissions: data.permissions || []
      }));

      // Clean up old storage keys
      cleanupOldWorkspaceKeys();

      return data;
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

  // ✅ FIXED: Switch workspace function with better error handling
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
      return result.workspaces;
    } catch (error: any) {
      console.error('❌ Auth Hook: Failed to get workspaces:', error);
      throw error;
    }
  };

  // Verify token
  const verifyToken = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          dispatch(setCredentials({
            user: data.user,
            token: token,
            workspace: data.workspace,
            permissions: data.permissions || []
          }));

          if (data.workspace) {
            dispatch(setCurrentWorkspace(data.workspace));
          }

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Auth Hook: Token verification failed:', error);
      return false;
    }
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<void> => {
    try {
      await verifyToken();
    } catch (error) {
      console.error('❌ Auth Hook: Failed to refresh auth:', error);
      throw error;
    }
  };

  // Register function
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message || 'Registration failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Password reset functions
  const forgotPassword = async (emailOrUsername: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrUsername }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send password reset email');
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Password reset failed');
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Password change failed');
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Profile update failed');
      }

      // Update user in Redux if successful
      if (result.success && result.user) {
        const currentToken = getStorageItem(STORAGE_KEYS.TOKEN);
        dispatch(setCredentials({
          user: result.user,
          token: currentToken,
          workspace: currentWorkspace,
          permissions: permissions
        }));
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const clearErrorFn = () => {
    dispatch(clearError());
  };

  return {
    // State
    user,
    workspace: currentWorkspace,
    isAuthenticated,
    isLoading,
    error,
    permissions,
    
    // Actions
    login,
    logout,
    register,
    verifyToken,
    clearError: clearErrorFn,
    refreshAuth,
    switchWorkspace,
    getAvailableWorkspaces,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  };
};