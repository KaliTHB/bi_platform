// web-application/src/hooks/useAuth.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiUtils } from '../utils/apiUtils';
import { authAPI } from '../api/authAPI';
import type { User, LoginRequest, LoginResponse } from '../types/auth.types';

// Auth state interface
interface AuthState {
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

// Auth actions interface
interface AuthActions {
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
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
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;
}

// Hook return type
interface UseAuthReturn extends AuthState, AuthActions {}

// Storage keys
const STORAGE_KEYS = {
  USER: 'auth_user',
  WORKSPACE: 'auth_workspace',
  WORKSPACES: 'auth_workspaces',
  PERMISSIONS: 'auth_permissions',
} as const;

// Helper function to safely access localStorage
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

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const initializationAttempted = useRef(false);
  
  // Initial state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    workspaces: [],
    currentWorkspace: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    error: null,
  });

  // Update auth state helper
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    // Clear API client token
    apiUtils.clearAuthToken();
    
    // Clear localStorage
    removeStorageItem(STORAGE_KEYS.USER);
    removeStorageItem(STORAGE_KEYS.WORKSPACE);
    removeStorageItem(STORAGE_KEYS.WORKSPACES);
    removeStorageItem(STORAGE_KEYS.PERMISSIONS);
    
    // Reset state
    updateAuthState({
      user: null,
      token: null,
      workspaces: [],
      currentWorkspace: null,
      permissions: [],
      isAuthenticated: false,
      error: null,
    });
  }, [updateAuthState]);

  // Store auth data
  const storeAuthData = useCallback((loginResponse: LoginResponse) => {
    // Set API client token
    apiUtils.setAuthToken(loginResponse.token);
    
    // Store in localStorage
    setStorageItem(STORAGE_KEYS.USER, loginResponse.user);
    setStorageItem(STORAGE_KEYS.WORKSPACES, loginResponse.workspaces);
    setStorageItem(STORAGE_KEYS.PERMISSIONS, loginResponse.permissions || []);
    
    // Store current workspace if available
    if (loginResponse.workspaces && loginResponse.workspaces.length > 0) {
      const currentWorkspace = loginResponse.workspaces[0]; // Default to first workspace
      setStorageItem(STORAGE_KEYS.WORKSPACE, currentWorkspace);
      
      updateAuthState({
        currentWorkspace,
      });
    }
    
    // Update state
    updateAuthState({
      user: loginResponse.user,
      token: loginResponse.token,
      workspaces: loginResponse.workspaces || [],
      permissions: loginResponse.permissions || [],
      isAuthenticated: true,
      error: null,
    });
  }, [updateAuthState]);

  // Initialize auth on app start
  const initializeAuth = useCallback(async () => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    updateAuthState({ isLoading: true });

    try {
      // Initialize API client token
      apiUtils.initializeToken();
      
      const token = apiUtils.getAuthToken();
      
      if (!token) {
        updateAuthState({ 
          isLoading: false, 
          isInitialized: true,
          isAuthenticated: false 
        });
        return;
      }

      // Try to get stored user data
      const storedUser = getStorageItem(STORAGE_KEYS.USER);
      const storedWorkspace = getStorageItem(STORAGE_KEYS.WORKSPACE);
      const storedWorkspaces = getStorageItem(STORAGE_KEYS.WORKSPACES);
      const storedPermissions = getStorageItem(STORAGE_KEYS.PERMISSIONS);

      if (storedUser) {
        // Restore from localStorage
        updateAuthState({
          user: JSON.parse(storedUser),
          token,
          currentWorkspace: storedWorkspace ? JSON.parse(storedWorkspace) : null,
          workspaces: storedWorkspaces ? JSON.parse(storedWorkspaces) : [],
          permissions: storedPermissions ? JSON.parse(storedPermissions) : [],
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });

        // Verify token in background
        verifyToken().catch(() => {
          // Token verification failed, but don't interrupt user experience
          console.warn('Token verification failed during initialization');
        });
      } else {
        // No stored user, verify token with API
        const isValid = await verifyToken();
        if (!isValid) {
          clearAuthData();
        }
        updateAuthState({ isLoading: false, isInitialized: true });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthData();
      updateAuthState({ 
        isLoading: false, 
        isInitialized: true,
        error: 'Failed to initialize authentication' 
      });
    }
  }, [updateAuthState, clearAuthData]);

  // Login function
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    updateAuthState({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.login(credentials);
      storeAuthData(response);
      updateAuthState({ isLoading: false });
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      updateAuthState({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false 
      });
      throw error;
    }
  }, [storeAuthData, updateAuthState]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    updateAuthState({ isLoading: true });
    
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      clearAuthData();
      updateAuthState({ isLoading: false, isInitialized: true });
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        router.push('/login');
      }
    }
  }, [clearAuthData, updateAuthState, router]);

  // Register function
  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }) => {
    updateAuthState({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.register(data);
      updateAuthState({ isLoading: false });
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      updateAuthState({ 
        isLoading: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [updateAuthState]);

  // Verify token function
  const verifyToken = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authAPI.verifyToken();
      
      if (result.valid && result.user) {
        updateAuthState({
          user: result.user,
          isAuthenticated: true,
          error: null,
        });
        return true;
      } else {
        clearAuthData();
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      clearAuthData();
      return false;
    }
  }, [updateAuthState, clearAuthData]);

  // Refresh auth data
  const refreshAuth = useCallback(async (): Promise<void> => {
    await verifyToken();
  }, [verifyToken]);

  // Switch workspace function
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<void> => {
    updateAuthState({ isLoading: true, error: null });
    
    try {
      // Find workspace in current workspaces
      const workspace = authState.workspaces.find(w => w.slug === workspaceSlug);
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Update current workspace
      setStorageItem(STORAGE_KEYS.WORKSPACE, workspace);
      updateAuthState({ 
        currentWorkspace: workspace,
        isLoading: false 
      });

      // You might want to call an API endpoint to switch workspace context
      // const response = await authAPI.switchWorkspace(workspaceSlug);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to switch workspace';
      updateAuthState({ 
        isLoading: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [authState.workspaces, updateAuthState]);

  // Forgot password function
  const forgotPassword = useCallback(async (email: string) => {
    updateAuthState({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.forgotPassword(email);
      updateAuthState({ isLoading: false });
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset request failed';
      updateAuthState({ 
        isLoading: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [updateAuthState]);

  // Reset password function
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    updateAuthState({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.resetPassword(token, newPassword);
      updateAuthState({ isLoading: false });
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset failed';
      updateAuthState({ 
        isLoading: false, 
        error: errorMessage 
      });
      throw error;
    }
  }, [updateAuthState]);

  // Clear error function
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Auto-logout on token expiration (optional)
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.token) return;

    // Check token every 5 minutes
    const interval = setInterval(async () => {
      const isValid = await verifyToken();
      if (!isValid) {
        clearInterval(interval);
        logout();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token, verifyToken, logout]);

  return {
    // State
    ...authState,
    
    // Actions
    login,
    logout,
    register,
    verifyToken,
    refreshAuth,
    switchWorkspace,
    forgotPassword,
    resetPassword,
    clearError,
  };
};