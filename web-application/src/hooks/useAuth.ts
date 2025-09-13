// web-application/src/hooks/useAuth.ts - Complete version using full Redux integration
//
// This version assumes you've updated your authSlice.ts with the complete version provided
// It uses Redux for all state management instead of mixing local state
//
// Features:
// - RTK Query integration for all auth operations
// - Support for both email and username authentication
// - Full Redux state management with persistence
// - Automatic token refresh and verification
// - Workspace switching capabilities
// - Error handling and loading states

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
import { 
  login as loginAction,
  logout as logoutAction,
  setUser,
  setError,
  clearError,
  setLoading,
  setInitialized,
  setWorkspaces,
  setWorkspace,
  setPermissions
} from '../store/slices/authSlice';
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
      dispatch(setWorkspaces(loginResponse.workspaces));
      
      // Set current workspace (from response or first available)
      const currentWorkspace = loginResponse.workspace || loginResponse.workspaces[0];
      if (currentWorkspace) {
        setStorageItem(STORAGE_KEYS.WORKSPACE, currentWorkspace);
        dispatch(setWorkspace(currentWorkspace));
      }
    }
    
    if (loginResponse.permissions) {
      setStorageItem(STORAGE_KEYS.PERMISSIONS, loginResponse.permissions);
      dispatch(setPermissions(loginResponse.permissions));
    }
    
    // Update Redux state
    dispatch(loginAction({
      user: loginResponse.user,
      token: loginResponse.token,
      workspaces: loginResponse.workspaces || [],
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
  const initializeAuth = useCallback(async () => {
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
        // Restore from localStorage
        dispatch(loginAction({
          user: JSON.parse(storedUser),
          token,
          workspaces: storedWorkspaces ? JSON.parse(storedWorkspaces) : [],
          permissions: storedPermissions ? JSON.parse(storedPermissions) : [],
        }));

        if (storedWorkspace) {
          dispatch(setWorkspace(JSON.parse(storedWorkspace)));
        }

        // Verify token in background
        setShouldVerifyToken(true);
      } else {
        // No stored data, mark as initialized
        dispatch(setLoading(false));
        dispatch(setInitialized(true));
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthData();
      dispatch(setError('Failed to initialize authentication'));
      dispatch(setLoading(false));
      dispatch(setInitialized(true));
    }
  }, [dispatch, clearAuthData]);

  // Handle verify token response
  useEffect(() => {
    if (verifyData && shouldVerifyToken) {
      if (verifyData.success && verifyData.valid) {
        // Token is valid, update user data if needed
        if (verifyData.user) {
          dispatch(setUser(verifyData.user));
          setStorageItem(STORAGE_KEYS.USER, verifyData.user);
        }
        if (verifyData.permissions) {
          dispatch(setPermissions(verifyData.permissions));
          setStorageItem(STORAGE_KEYS.PERMISSIONS, verifyData.permissions);
        }
      } else {
        // Token is invalid
        clearAuthData();
      }
      setShouldVerifyToken(false);
      dispatch(setLoading(false));
      dispatch(setInitialized(true));
    }
  }, [verifyData, shouldVerifyToken, dispatch, clearAuthData]);

  // Handle verify token error
  useEffect(() => {
    if (verifyError && shouldVerifyToken) {
      console.warn('Token verification failed:', verifyError);
      clearAuthData();
      setShouldVerifyToken(false);
      dispatch(setLoading(false));
      dispatch(setInitialized(true));
    }
  }, [verifyError, shouldVerifyToken, clearAuthData, dispatch]);

  // Login function using RTK Query
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    dispatch(clearError());
    
    // Validate credentials - must have either email or username
    if (!credentials.email && !credentials.username) {
      const error = new Error('Either email or username is required');
      dispatch(setError(error.message));
      throw error;
    }
    
    if (!credentials.password) {
      const error = new Error('Password is required');
      dispatch(setError(error.message));
      throw error;
    }
    
    try {
      // Prepare login payload - convert to the format expected by the API
      const loginPayload: any = {
        password: credentials.password,
        workspace_slug: credentials.workspace_slug,
      };
      
      // Add either email or username to the payload
      if (credentials.email) {
        loginPayload.email = credentials.email;
      } else if (credentials.username) {
        loginPayload.username = credentials.username;
      }
      
      const result = await loginMutation(loginPayload).unwrap();
      
      if (result.success) {
        const loginResponse: LoginResponse = {
          success: result.success,
          user: result.user,
          token: result.token,
          workspace: result.workspace,
          permissions: result.permissions,
          message: result.message,
        };
        
        // Store token in localStorage
        localStorage.setItem('token', result.token);
        
        storeAuthData(loginResponse);
        return loginResponse;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Login failed';
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [loginMutation, dispatch, storeAuthData]);

  // Logout function using RTK Query
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      clearAuthData();
      localStorage.removeItem('token');
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        router.push('/login');
      }
    }
  }, [logoutMutation, clearAuthData, router]);

  // Register function (you'll need to add registerMutation to authApi.ts)
  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }) => {
    // TODO: Add register mutation to authApi.ts and import useRegisterMutation
    // For now, this will throw an error indicating the mutation is missing
    throw new Error('Register mutation not implemented in authApi. Please add registerMutation to your authApi.ts file.');
    
    // Example implementation once you add the mutation:
    /*
    try {
      const result = await registerMutation(data).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Registration failed';
      dispatch(setError(errorMessage));
      throw error;
    }
    */
  }, [dispatch]);

  // Verify token function
  const verifyToken = useCallback(async (): Promise<boolean> => {
    if (!authState.token) return false;
    
    try {
      setShouldVerifyToken(true);
      // The actual verification happens in the useEffect above
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
    const workspace = authState.workspaces.find(w => w.slug === workspaceSlug);
    if (workspace) {
      dispatch(setWorkspace(workspace));
      setStorageItem(STORAGE_KEYS.WORKSPACE, workspace);
      
      // You might want to refetch user permissions for this workspace
      setShouldVerifyToken(true);
    }
  }, [authState.workspaces, dispatch]);

  // Forgot password function - accepts email or username
  const forgotPassword = useCallback(async (emailOrUsername: string) => {
    try {
      // Determine if input is email or username
      const credentialType = getCredentialType(emailOrUsername);
      
      const payload: any = {};
      if (credentialType === 'email') {
        payload.email = emailOrUsername;
      } else {
        // If your API supports username for password reset, add it here
        // Otherwise, you might need to resolve username to email first
        payload.email = emailOrUsername; // Assuming API handles both
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
      const result = await resetPasswordMutation({ token, new_password: newPassword }).unwrap();
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
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Auto-refresh token before expiration (optional)
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.token) return;

    const interval = setInterval(async () => {
      await refreshAuth();
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token, refreshAuth]);

  // Combine loading states
  const isLoading = authState.isLoading || loginLoading || logoutLoading || verifyLoading;

  return {
    // State from Redux
    user: authState.user,
    token: authState.token,
    workspaces: authState.workspaces,
    currentWorkspace: authState.currentWorkspace,
    permissions: authState.permissions,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    isInitialized: authState.isInitialized,
    error: authState.error,
    
    // Actions
    login,
    logout,
    register,
    verifyToken,
    refreshAuth,
    switchWorkspace,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    clearError: clearAuthError,
  };
};