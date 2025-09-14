// web-application/src/hooks/useAuth.ts
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
} from '../store/slices/workspaceSlice';

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

// Consolidated storage keys
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  CURRENT_WORKSPACE: 'currentWorkspace', // ✅ Single workspace key
  PERMISSIONS: 'permissions',
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

// Clean up old workspace keys (for migration)
const cleanupOldWorkspaceKeys = (): void => {
  if (typeof window === 'undefined') return;
  
  const oldKeys = ['workspace', 'auth_workspace', 'selected_workspace_id'];
  oldKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove old key ${key}:`, error);
    }
  });
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
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);

  // Get API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Clear error action
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Login function
  const login = async (credentials: LoginCredentials): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const { emailOrUsername, password } = credentials;
      const credentialType = getCredentialType(emailOrUsername);

      console.log('🔐 Auth Hook: Attempting login with:', {
        type: credentialType,
        email: credentialType === 'email' ? emailOrUsername : undefined,
        username: credentialType === 'username' ? emailOrUsername : undefined,
      });

      const requestBody = {
        [credentialType]: emailOrUsername,
        password,
      };

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Login failed: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      const { token, user, workspace: userWorkspace, permissions } = data.data;

      if (!token || !user) {
        throw new Error('Invalid login response: missing token or user data');
      }

      // Store in localStorage using consolidated keys
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      setStorageItem(STORAGE_KEYS.USER, user);
      
      if (userWorkspace) {
        setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, userWorkspace);
      }
      
      if (permissions) {
        setStorageItem(STORAGE_KEYS.PERMISSIONS, permissions);
      }

      // Clean up old workspace keys
      cleanupOldWorkspaceKeys();

      // Update Redux store
      dispatch(setCredentials({ user, token, permissions }));
      
      if (userWorkspace) {
        dispatch(setCurrentWorkspace(userWorkspace));
      }

      console.log('✅ Auth Hook: Login successful');
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

  // Switch workspace function
  const switchWorkspace = async (workspaceSlug: string): Promise<void> => {
    try {
      console.log('🔄 Auth Hook: Switching to workspace:', workspaceSlug);
      
      // Use Redux action which handles API call and storage
      await dispatch(switchWorkspaceAction(workspaceSlug)).unwrap();
      
      console.log('✅ Auth Hook: Workspace switched successfully');
    } catch (error: any) {
      console.error('❌ Auth Hook: Workspace switch failed:', error);
      
      // Fallback method - find workspace locally and switch
      try {
        const workspaces = await getAvailableWorkspaces();
        const targetWorkspace = workspaces.find(ws => ws.slug === workspaceSlug);
        
        if (targetWorkspace) {
          // Update Redux store
          dispatch(setCurrentWorkspace(targetWorkspace));
          
          // Update localStorage using consolidated key
          setStorageItem(STORAGE_KEYS.CURRENT_WORKSPACE, targetWorkspace);
          
          console.log('✅ Auth Hook: Workspace switched (fallback method):', targetWorkspace.display_name);
        } else {
          throw new Error(`Workspace '${workspaceSlug}' not found in available workspaces`);
        }
      } catch (fallbackError: any) {
        console.error('❌ Auth Hook: Fallback workspace switch failed:', fallbackError);
        dispatch(setError(fallbackError.message || 'Failed to switch workspace'));
        throw fallbackError;
      }
    }
  };

  const getAvailableWorkspaces = async (): Promise<any[]> => {
  try {
    const resultAction = await dispatch(fetchUserWorkspaces());
    
    if (fetchUserWorkspaces.fulfilled.match(resultAction)) {
      return resultAction.payload.workspaces || [];
    } else {
      throw new Error('Failed to fetch workspaces');
    }
  } catch (error: any) {
    console.error('❌ Auth Hook: Failed to get available workspaces:', error);
    throw error;
  }
};

  // Verify token function
  const verifyToken = async (): Promise<boolean> => {
    try {
      const token = getStorageItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token is invalid, clear storage
        await logout();
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('❌ Auth Hook: Token verification failed:', error);
      await logout();
      return false;
    }
  };

  // Refresh auth function
  const refreshAuth = async (): Promise<void> => {
    try {
      const isValid = await verifyToken();
      if (!isValid) {
        await logout();
      }
    } catch (error) {
      console.error('❌ Auth Hook: Auth refresh failed:', error);
      await logout();
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

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
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

  // Forgot password function
  const forgotPassword = async (emailOrUsername: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const credentialType = getCredentialType(emailOrUsername);
      const requestBody = {
        [credentialType]: emailOrUsername,
      };

      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      return data;
    } catch (error: any) {
      dispatch(setError(error.message || 'Failed to send reset email'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      return data;
    } catch (error: any) {
      dispatch(setError(error.message || 'Failed to reset password'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const token = getStorageItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      return data;
    } catch (error: any) {
      dispatch(setError(error.message || 'Failed to change password'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Update profile function
  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const token = getStorageItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update user in storage and Redux if successful
      if (result.success && result.user) {
        setStorageItem(STORAGE_KEYS.USER, result.user);
        dispatch(setCredentials({ 
          user: result.user, 
          token: auth.token, 
          permissions: auth.permissions 
        }));
      }

      return result;
    } catch (error: any) {
      dispatch(setError(error.message || 'Failed to update profile'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  return {
    // State
    user: auth.user,
    token: auth.token,
    workspaces: workspace.availableWorkspaces,
    currentWorkspace: workspace.currentWorkspace,
    permissions: auth.permissions,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || workspace.isLoading,
    isInitialized: auth.isInitialized && workspace.isInitialized,
    error: auth.error || workspace.error,

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