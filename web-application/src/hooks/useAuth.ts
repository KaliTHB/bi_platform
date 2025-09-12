// web-application/src/hooks/useAuth.ts - COMPLETE FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from './redux';
import { useLoginMutation, useLazyVerifyTokenQuery } from '../store/api/authApi';
import { setCredentials, setLoading, logout, clearError, initializeAuth } from '../store/slices/authSlice';
import { setCurrentWorkspace, clearWorkspace } from '../store/slices/workspaceSlice';

// Types
interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

interface LoginResponse {
  success: boolean;
  user?: any;
  token?: string;
  workspace?: any;
  permissions?: string[];
  message?: string;
  error?: string;
}

interface UseAuthReturn {
  // State
  user: any | null;
  token: string | null;
  workspace: any | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
  
  // Utilities
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Redux state selectors
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace.currentWorkspace);
  
  // RTK Query hooks
  const [loginMutation, { isLoading: loginLoading }] = useLoginMutation();
  const [verifyToken, { isLoading: verifyLoading }] = useLazyVerifyTokenQuery();
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationAttempted = useRef(false);

  // Initialize auth on mount
  useEffect(() => {
    if (!initializationAttempted.current) {
      initializationAttempted.current = true;
      console.log('🚀 useAuth: Initializing authentication');
      dispatch(initializeAuth());
      setIsInitialized(true);
    }
  }, [dispatch]);

  // Login function
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      console.log('🔄 useAuth: Starting login process');
      dispatch(setLoading(true));
      dispatch(clearError());

      const result = await loginMutation(credentials);
      
      console.log('🐛 useAuth: Login mutation result:', result);
      
      if (result.data && result.data.success) {
        const { user, token, workspace, permissions } = result.data;
        
        console.log('✅ useAuth: Login successful', {
          hasUser: !!user,
          hasToken: !!token,
          hasWorkspace: !!workspace,
          permissionCount: permissions?.length || 0
        });

        // Store in localStorage
        if (token) {
          localStorage.setItem('token', token);
          console.log('💾 useAuth: Token stored in localStorage');
        }
        
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          console.log('💾 useAuth: User data stored in localStorage');
        }
        
        if (workspace) {
          localStorage.setItem('workspace', JSON.stringify(workspace));
          console.log('💾 useAuth: Workspace data stored in localStorage');
        }

        // Update Redux state
        dispatch(setCredentials({ user, token, permissions }));
        
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace));
        }

        console.log('✅ useAuth: All data stored, login complete');
        
        return {
          success: true,
          user,
          token,
          workspace,
          permissions,
          message: result.data.message || 'Login successful'
        };
        
      } else if (result.error) {
        console.error('❌ useAuth: Login failed with error:', result.error);
        
        const errorData = result.error as any;
        const errorMessage = errorData?.data?.message || errorData?.message || 'Login failed';
        
        dispatch(setLoading(false));
        
        return {
          success: false,
          error: errorMessage,
          message: errorMessage
        };
      } else {
        console.error('❌ useAuth: Login failed - unexpected response:', result);
        dispatch(setLoading(false));
        
        return {
          success: false,
          error: 'Unexpected login response',
          message: 'Login failed due to unexpected response'
        };
      }
    } catch (error: any) {
      console.error('❌ useAuth: Login exception:', error);
      dispatch(setLoading(false));
      
      return {
        success: false,
        error: error.message || 'Login failed',
        message: error.message || 'An unexpected error occurred during login'
      };
    }
  }, [dispatch, loginMutation]);

  // Logout function
  const logoutUser = useCallback(async (): Promise<void> => {
    try {
      console.log('🚪 useAuth: Starting logout process');
      
      // Clear Redux state and localStorage
      dispatch(logout());
      dispatch(clearWorkspace());
      
      console.log('✅ useAuth: Logout complete, redirecting to login');
      
      // Redirect to login
      await router.push('/login');
    } catch (error) {
      console.error('❌ useAuth: Logout error:', error);
      
      // Force redirect even on error
      window.location.href = '/login';
    }
  }, [dispatch, router]);

  // Clear error function
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Refresh auth function
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 useAuth: Refreshing authentication');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token available for refresh');
      }

      const result = await verifyToken();
      
      if (result.data && result.data.success && result.data.valid) {
        console.log('✅ useAuth: Token verification successful');
        
        const { user, workspace, permissions } = result.data;
        
        // Update Redux state
        dispatch(setCredentials({ user, token, permissions }));
        
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace));
        }
        
        console.log('✅ useAuth: Auth refresh complete');
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error: any) {
      console.error('❌ useAuth: Auth refresh failed:', error);
      
      // Clear invalid auth state
      dispatch(logout());
      dispatch(clearWorkspace());
      
      throw error;
    }
  }, [dispatch, verifyToken]);

  // Permission utilities
  const hasPermission = useCallback((permission: string): boolean => {
    if (!auth.permissions) return false;
    return auth.permissions.includes(permission);
  }, [auth.permissions]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.some(permission => auth.permissions.includes(permission));
  }, [auth.permissions]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.every(permission => auth.permissions.includes(permission));
  }, [auth.permissions]);

  // Calculate loading state
  const isLoading = auth.isLoading || loginLoading || verifyLoading || !isInitialized;

  return {
    // State
    user: auth.user,
    token: auth.token,
    workspace: workspace,
    permissions: auth.permissions,
    isAuthenticated: auth.isAuthenticated,
    isLoading,
    error: auth.error,
    
    // Actions
    login,
    logout: logoutUser,
    clearError: clearAuthError,
    refreshAuth,
    
    // Utilities
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};