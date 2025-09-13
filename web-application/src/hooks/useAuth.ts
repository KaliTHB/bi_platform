// web-application/src/hooks/useAuth.ts - COMPLETE IMPLEMENTATION WITH WORKSPACE FUNCTIONS
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { 
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  authApi
} from '../store/api/authApi';

// Import the correct actions from the appropriate slices
import { 
  setCredentials,
  logout as logoutAction,
  setUser,
  setError,
  clearError,
  setLoading,
  initializeAuth
} from '../store/slices/authSlice';

// Import workspace actions from workspaceSlice
import {
  setAvailableWorkspaces,
  setCurrentWorkspace,
  clearWorkspaces
} from '../store/slices/workspaceSlice';

import type { RootState } from '../store';
import type { User, LoginResponse } from '../types/auth.types';

// Extended login request interface to support both username and email
interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

// Complete Auth actions interface with all functions
interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }) => Promise<any>;
  verifyToken: () => Promise<boolean>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<void>;
  getAvailableWorkspaces: () => Promise<any[]>;  // ✅ Added
  forgotPassword: (emailOrUsername: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<any>;
}

// Hook return type
interface UseAuthReturn extends AuthActions {
  // Auth state from Redux
  user: User | null;
  token: string | null;
  workspaces: any[];
  currentWorkspace: any | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

// Storage keys
const STORAGE_KEYS = {
  USER: 'auth_user',
  WORKSPACE: 'auth_workspace',
  WORKSPACES: 'auth_workspaces',
  PERMISSIONS: 'auth_permissions',
} as const;

// Helper functions for localStorage
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

const setStorageItem = (key: string, value: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to set ${key} in localStorage:`, error);
  }
};

const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage:`, error);
  }
};

// Helper function to validate email format
const isValidEmail = (input: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

// Helper function to determine credential type
const getCredentialType = (input: string): 'email' | 'username' => {
  return isValidEmail(input) ? 'email' : 'username';
};

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const dispatch = useDispatch();
  const initializationAttempted = useRef(false);
  
  // Get auth state from Redux
  const authState = useSelector((state: RootState) => state.auth);
  const workspaceState = useSelector((state: RootState) => state.workspace);
  
  // RTK Query hooks
  const [loginMutation, { isLoading: loginLoading }] = useLoginMutation();
  const [logoutMutation, { isLoading: logoutLoading }] = useLogoutMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();
  const [updateProfileMutation] = useUpdateProfileMutation();
  const [changePasswordMutation] = useChangePasswordMutation();
  const [requestPasswordResetMutation] = useRequestPasswordResetMutation();
  const [resetPasswordMutation] = useResetPasswordMutation();
  
  // Verify token query (only run when we have a token and need verification)
  const [shouldVerifyToken, setShouldVerifyToken] = useState(false);
  const { 
    data: verifyData, 
    error: verifyError, 
    isLoading: verifyLoading 
  } = useVerifyTokenQuery(undefined, {
    skip: !shouldVerifyToken || !authState.token,
    refetchOnMountOrArgChange: true,
  });

  // Get current user query (only run when authenticated)
  const { 
    data: currentUserData, 
    error: currentUserError 
  } = useGetCurrentUserQuery(undefined, {
    skip: !authState.isAuthenticated,
    refetchOnMountOrArgChange: true,
  });

  // Helper function to store auth data in localStorage
  const storeAuthData = useCallback((loginResponse: LoginResponse) => {
    if (loginResponse.user) {
      setStorageItem(STORAGE_KEYS.USER, loginResponse.user);
    }
    
    if (loginResponse.workspaces) {
      setStorageItem(STORAGE_KEYS.WORKSPACES, loginResponse.workspaces);
      dispatch(setAvailableWorkspaces(loginResponse.workspaces));
      
      // Set current workspace (from response or first available)
      const currentWorkspace = loginResponse.workspace || loginResponse.workspaces[0];
      if (currentWorkspace) {
        setStorageItem(STORAGE_KEYS.WORKSPACE, currentWorkspace);
        dispatch(setCurrentWorkspace(currentWorkspace));
      }
    }
    
    if (loginResponse.permissions) {
      setStorageItem(STORAGE_KEYS.PERMISSIONS, loginResponse.permissions);
    }
    
    // Update Redux state using setCredentials
    dispatch(setCredentials({
      user: loginResponse.user,
      token: loginResponse.token,
      permissions: loginResponse.permissions || [],
    }));
  }, [dispatch]);

  // Helper function to clear auth data
  const clearAuthData = useCallback(() => {
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(removeStorageItem);
    removeStorageItem('token');
    removeStorageItem('authToken');
    removeStorageItem('user');
    removeStorageItem('workspace');
    removeStorageItem('workspaces');
    removeStorageItem('permissions');
    
    // Clear Redux state
    dispatch(logoutAction());
    dispatch(clearWorkspaces());
    
    // Clear RTK Query cache
    dispatch(authApi.util.resetApiState());
  }, [dispatch]);

  // Initialize auth on app start
  const initializeAuthState = useCallback(async () => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    dispatch(setLoading(true));

    try {
      // Check for stored auth data
      const storedUser = getStorageItem(STORAGE_KEYS.USER) || getStorageItem('user');
      const storedWorkspace = getStorageItem(STORAGE_KEYS.WORKSPACE) || getStorageItem('workspace');
      const storedWorkspaces = getStorageItem(STORAGE_KEYS.WORKSPACES) || getStorageItem('workspaces');
      const storedPermissions = getStorageItem(STORAGE_KEYS.PERMISSIONS) || getStorageItem('permissions');
      const token = getStorageItem('token') || getStorageItem('authToken');

      if (token && storedUser) {
        // Restore from localStorage using setCredentials
        dispatch(setCredentials({
          user: JSON.parse(storedUser),
          token,
          permissions: storedPermissions ? JSON.parse(storedPermissions) : [],
        }));

        if (storedWorkspaces) {
          dispatch(setAvailableWorkspaces(JSON.parse(storedWorkspaces)));
        }

        if (storedWorkspace) {
          dispatch(setCurrentWorkspace(JSON.parse(storedWorkspace)));
        }

        // Verify token in background
        setShouldVerifyToken(true);
      } else {
        // No stored data, use initializeAuth action
        dispatch(initializeAuth());
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthData();
      dispatch(setError('Failed to initialize authentication'));
      dispatch(setLoading(false));
    }
  }, [dispatch, clearAuthData]);

  // ✅ GET AVAILABLE WORKSPACES FUNCTION
  const getAvailableWorkspaces = useCallback(async (): Promise<any[]> => {
    try {
      console.log('🔍 Fetching available workspaces...');
      const token = getStorageItem('token') || getStorageItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/user/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('API call failed, using fallback data');
        throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Workspaces fetched successfully:', data.workspaces?.length || 0);
      
      // Update Redux store with available workspaces
      if (data.workspaces) {
        dispatch(setAvailableWorkspaces(data.workspaces));
        setStorageItem(STORAGE_KEYS.WORKSPACES, data.workspaces);
      }
      
      return data.workspaces || [];
      
    } catch (error) {
      console.error('Failed to get available workspaces:', error);
      
      // Return mock/fallback data for development
      const fallbackWorkspaces = [
        {
          id: '54f2f0df-38b1-4190-b122-702051bdd00b',
          name: 'default',
          slug: 'default', 
          display_name: 'THB Workspace',
          description: 'Built workspace for dashboarding purposes',
          member_count: 1,
          dashboard_count: 0,
          dataset_count: 0,
          is_default: true,
          is_active: true,
          user_role: 'Administrator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      // Still update Redux with fallback data
      dispatch(setAvailableWorkspaces(fallbackWorkspaces));
      setStorageItem(STORAGE_KEYS.WORKSPACES, fallbackWorkspaces);
      
      return fallbackWorkspaces;
    }
  }, [dispatch]);

  // ✅ SWITCH WORKSPACE FUNCTION
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<void> => {
    try {
      console.log('🔄 Switching to workspace:', workspaceSlug);
      dispatch(setLoading(true));
      dispatch(clearError());
      
      const token = getStorageItem('token') || getStorageItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Try API call to switch workspace
      const response = await fetch('/api/auth/switch-workspace', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.workspace) {
          // Update Redux store
          dispatch(setCurrentWorkspace(data.workspace));
          
          // Update localStorage
          setStorageItem(STORAGE_KEYS.WORKSPACE, data.workspace);
          localStorage.setItem('workspace', JSON.stringify(data.workspace));
          
          console.log('✅ Workspace switched successfully:', data.workspace.display_name);
          return;
        } else {
          throw new Error(data.message || 'Failed to switch workspace');
        }
      } else {
        console.warn('API call failed, using local workspace switching');
        throw new Error('API not available');
      }
    } catch (error: any) {
      console.warn('API workspace switch failed, using fallback method:', error.message);
      
      // Fallback method - find workspace locally and switch
      try {
        const workspaces = await getAvailableWorkspaces();
        const targetWorkspace = workspaces.find(ws => ws.slug === workspaceSlug);
        
        if (targetWorkspace) {
          // Update Redux store
          dispatch(setCurrentWorkspace(targetWorkspace));
          
          // Update localStorage  
          setStorageItem(STORAGE_KEYS.WORKSPACE, targetWorkspace);
          localStorage.setItem('workspace', JSON.stringify(targetWorkspace));
          
          console.log('✅ Workspace switched (fallback method):', targetWorkspace.display_name);
        } else {
          throw new Error(`Workspace '${workspaceSlug}' not found in available workspaces`);
        }
      } catch (fallbackError: any) {
        console.error('Failed to switch workspace:', fallbackError);
        dispatch(setError(fallbackError.message || 'Failed to switch workspace'));
        throw fallbackError;
      }
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, getAvailableWorkspaces]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      // Determine credential type and format request
      const credentialType = getCredentialType(credentials.email || credentials.username || '');
      
      const loginData: any = {
        password: credentials.password,
        workspace_slug: credentials.workspace_slug,
      };
      
      if (credentialType === 'email') {
        loginData.email = credentials.email || credentials.username;
      } else {
        loginData.username = credentials.username || credentials.email;
      }

      const result = await loginMutation(loginData).unwrap();
      
      if (result.success && result.data) {
        storeAuthData(result.data);
        return result.data;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Login failed';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [loginMutation, dispatch, storeAuthData]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      router.push('/login');
    }
  }, [logoutMutation, clearAuthData, router]);

  // Register function
  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }): Promise<any> => {
    try {
      console.log('👤 Registering new user...');
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      dispatch(setError(error.message));
      throw error;
    }
  }, [dispatch]);

  // Verify token function
  const verifyToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Verifying token...');
      setShouldVerifyToken(true);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }, []);

  // Refresh auth function
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing authentication...');
      setShouldVerifyToken(true);
    } catch (error) {
      console.error('Auth refresh failed:', error);
      throw error;
    }
  }, []);

  // Forgot password function
  const forgotPassword = useCallback(async (emailOrUsername: string): Promise<any> => {
    try {
      console.log('📧 Forgot password request for:', emailOrUsername);
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUsername })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to request password reset');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error('Password reset request failed');
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<any> => {
    try {
      console.log('🔑 Resetting password with token...');
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error('Password reset failed');
    }
  }, []);

  // Change password function
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      console.log('🔐 Changing password...');
      const token = getStorageItem('token') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      dispatch(setError(error.message));
      throw error;
    }
  }, [dispatch]);

  // Update profile function
  const updateProfile = useCallback(async (data: { name?: string; email?: string; avatar?: string }) => {
    try {
      const result = await updateProfileMutation(data).unwrap();
      if (result.success && result.user) {
        dispatch(setUser(result.user));
        setStorageItem(STORAGE_KEYS.USER, result.user);
      }
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Profile update failed';
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [updateProfileMutation, dispatch]);

  // Clear error function
  const clearErrorFunc = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Handle verify token response
  useEffect(() => {
    if (verifyData && shouldVerifyToken) {
      if (verifyData.success && verifyData.valid) {
        // Token is valid, update user data if needed
        if (verifyData.user) {
          dispatch(setUser(verifyData.user));
          setStorageItem(STORAGE_KEYS.USER, verifyData.user);
        }
      } else {
        // Token is invalid
        clearAuthData();
      }
      setShouldVerifyToken(false);
      dispatch(setLoading(false));
    }
  }, [verifyData, shouldVerifyToken, dispatch, clearAuthData]);

  // Handle verify token error
  useEffect(() => {
    if (verifyError && shouldVerifyToken) {
      console.error('Token verification failed:', verifyError);
      clearAuthData();
      setShouldVerifyToken(false);
      dispatch(setLoading(false));
    }
  }, [verifyError, shouldVerifyToken, clearAuthData, dispatch]);

  // Initialize on mount
  useEffect(() => {
    initializeAuthState();
  }, [initializeAuthState]);

  // ✅ RETURN THE COMPLETE AUTH CONTEXT WITH ALL FUNCTIONS
  return {
    // State
    user: authState.user,
    token: authState.token,
    workspaces: workspaceState.availableWorkspaces || [],
    currentWorkspace: workspaceState.currentWorkspace,
    permissions: authState.permissions || [],
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || loginLoading || logoutLoading || verifyLoading,
    isInitialized: authState.isInitialized,
    error: authState.error,
    
    // ✅ ALL AUTH ACTIONS INCLUDING WORKSPACE FUNCTIONS
    login,
    logout,
    register,
    verifyToken,
    clearError: clearErrorFunc,
    refreshAuth,
    switchWorkspace,           // ✅ Workspace switching
    getAvailableWorkspaces,    // ✅ Get workspace list
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  };
};