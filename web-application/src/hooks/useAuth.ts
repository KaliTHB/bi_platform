// web-application/src/hooks/useAuth.ts - FIXED VERSION
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

// FIXED: Import the correct actions from the appropriate slices
import { 
  setCredentials,  // Use setCredentials instead of 'login'
  logout as logoutAction,
  setUser,
  setError,
  clearError,
  setLoading,
  initializeAuth  // Use initializeAuth instead of 'setInitialized'
} from '../store/slices/authSlice';

// FIXED: Import workspace actions from workspaceSlice
import {
  setAvailableWorkspaces,  // Use setAvailableWorkspaces instead of 'setWorkspaces'
  setCurrentWorkspace      // Use setCurrentWorkspace instead of 'setWorkspace'
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

// Auth actions interface
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
      dispatch(setAvailableWorkspaces(loginResponse.workspaces)); // FIXED: Use correct action
      
      // Set current workspace (from response or first available)
      const currentWorkspace = loginResponse.workspace || loginResponse.workspaces[0];
      if (currentWorkspace) {
        setStorageItem(STORAGE_KEYS.WORKSPACE, currentWorkspace);
        dispatch(setCurrentWorkspace(currentWorkspace)); // FIXED: Use correct action
      }
    }
    
    if (loginResponse.permissions) {
      setStorageItem(STORAGE_KEYS.PERMISSIONS, loginResponse.permissions);
      // Note: If you have a permissions slice, you'd dispatch to that here
      // For now, permissions are stored in auth state via setCredentials
    }
    
    // FIXED: Update Redux state using setCredentials instead of loginAction
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
    
    // Clear Redux state
    dispatch(logoutAction());
    
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
      const storedUser = getStorageItem(STORAGE_KEYS.USER);
      const storedWorkspace = getStorageItem(STORAGE_KEYS.WORKSPACE);
      const storedWorkspaces = getStorageItem(STORAGE_KEYS.WORKSPACES);
      const storedPermissions = getStorageItem(STORAGE_KEYS.PERMISSIONS);
      const token = getStorageItem('token') || getStorageItem('authToken');

      if (token && storedUser) {
        // FIXED: Restore from localStorage using setCredentials
        dispatch(setCredentials({
          user: JSON.parse(storedUser),
          token,
          permissions: storedPermissions ? JSON.parse(storedPermissions) : [],
        }));

        if (storedWorkspaces) {
          dispatch(setAvailableWorkspaces(JSON.parse(storedWorkspaces))); // FIXED: Use correct action
        }

        if (storedWorkspace) {
          dispatch(setCurrentWorkspace(JSON.parse(storedWorkspace))); // FIXED: Use correct action
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

  // Register function (placeholder - implement as needed)
  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }) => {
    // TODO: Add register mutation to authApi.ts and import useRegisterMutation
    throw new Error('Register mutation not implemented in authApi. Please add registerMutation to your authApi.ts file.');
  }, [dispatch]);

  // Verify token function
  const verifyToken = useCallback(async (): Promise<boolean> => {
    if (!authState.token) return false;
    
    try {
      setShouldVerifyToken(true);
      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }, [authState.token]);

  // Refresh auth function
  const refreshAuth = useCallback(async (): Promise<void> => {
    if (!authState.token) return;
    
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const result = await refreshTokenMutation({ refresh_token: refreshToken }).unwrap();
        if (result.success) {
          localStorage.setItem('token', result.token);
          dispatch(setUser(result.user));
          setStorageItem(STORAGE_KEYS.USER, result.user);
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthData();
    }
  }, [authState.token, refreshTokenMutation, dispatch, clearAuthData]);

  // Switch workspace function
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<void> => {
    const workspace = workspaceState.availableWorkspaces.find(w => w.slug === workspaceSlug);
    if (workspace) {
      dispatch(setCurrentWorkspace(workspace)); // FIXED: Use correct action
      setStorageItem(STORAGE_KEYS.WORKSPACE, workspace);
      
      // Refetch user permissions for this workspace
      setShouldVerifyToken(true);
    }
  }, [workspaceState.availableWorkspaces, dispatch]);

  // Forgot password function
  const forgotPassword = useCallback(async (emailOrUsername: string) => {
    try {
      const credentialType = getCredentialType(emailOrUsername);
      
      const payload: any = {};
      if (credentialType === 'email') {
        payload.email = emailOrUsername;
      } else {
        payload.email = emailOrUsername; // API might handle both
      }
      
      const result = await requestPasswordResetMutation(payload).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Password reset request failed';
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [requestPasswordResetMutation, dispatch]);

  // Reset password function
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      const result = await resetPasswordMutation({ token, password: newPassword }).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Password reset failed';
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [resetPasswordMutation, dispatch]);

  // Change password function
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const result = await changePasswordMutation({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Password change failed';
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [changePasswordMutation, dispatch]);

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
        // Handle permissions if your API returns them
        // if (verifyData.permissions) {
        //   dispatch(setPermissions(verifyData.permissions));
        //   setStorageItem(STORAGE_KEYS.PERMISSIONS, verifyData.permissions);
        // }
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

  // Return the complete auth context
  return {
    // State
    user: authState.user,
    token: authState.token,
    workspaces: workspaceState.availableWorkspaces,
    currentWorkspace: workspaceState.currentWorkspace,
    permissions: authState.permissions,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || loginLoading || logoutLoading || verifyLoading,
    isInitialized: authState.isInitialized,
    error: authState.error,
    
    // Actions
    login,
    logout,
    register,
    verifyToken,
    clearError: clearErrorFunc,
    refreshAuth,
    switchWorkspace,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  };
};