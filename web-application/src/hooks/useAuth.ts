// web-application/src/hooks/useAuth.ts - CORRECTED COMPLETE VERSION
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../store';

// Import correct auth actions
import { 
  setCredentials, 
  logout, // This is the correct action name from authSlice
  setLoading, 
  clearError, 
  setError 
} from '../store/slices/authSlice';

// Import correct workspace actions
import {
  setCurrentWorkspace,
  setAvailableWorkspaces,
  clearWorkspaces // This is the correct action name from workspaceSlice
} from '../store/slices/workspaceSlice';

// Import RTK Query hooks
import {
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useVerifyTokenQuery,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  authApi
} from '../store/api/authApi';

// Import types
import type { 
  User, 
  Workspace, 
  LoginResponse, 
  LoginMutationResult, 
  UseAuthReturn 
} from '../types/auth.types';

// Storage utilities
const STORAGE_KEYS = {
  TOKEN: 'authToken',
  USER: 'user',
  WORKSPACE: 'currentWorkspace',
  WORKSPACES: 'availableWorkspaces',
  PERMISSIONS: 'permissions',
} as const;

const getStorageItem = (key: string) => {
  try {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return localStorage.getItem(key);
  }
};

const setStorageItem = (key: string, value: any) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.error('Error setting storage item:', error);
  }
};

const removeStorageItem = (key: string) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing storage item:', error);
  }
};

// Helper function to validate email format
const isValidEmail = (input: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const dispatch = useDispatch();
  const initializationAttempted = useRef(false);
  
  // Get auth state from Redux
  const authState = useSelector((state: RootState) => state.auth);
  const workspaceState = useSelector((state: RootState) => state.workspace);
  
  // Local state for managing initialization
  const [isInitializing, setIsInitializing] = useState(true);
  
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
    if (loginResponse.data?.user) {
      setStorageItem(STORAGE_KEYS.USER, loginResponse.data.user);
    }
    
    if (loginResponse.data?.token) {
      setStorageItem(STORAGE_KEYS.TOKEN, loginResponse.data.token);
    }
    
    if (loginResponse.data?.permissions) {
      setStorageItem(STORAGE_KEYS.PERMISSIONS, loginResponse.data.permissions);
    }
    
    // Handle workspaces (if provided)
    if (loginResponse.data?.workspaces) {
      setStorageItem(STORAGE_KEYS.WORKSPACES, loginResponse.data.workspaces);
      dispatch(setAvailableWorkspaces(loginResponse.data.workspaces));
      
      // ✅ AUTO-SELECT FIRST WORKSPACE LOGIC
      const currentWorkspace = loginResponse.data.workspace || loginResponse.data.workspaces[0];
      if (currentWorkspace) {
        console.log('🔄 useAuth: Auto-selecting workspace:', currentWorkspace.name);
        setStorageItem(STORAGE_KEYS.WORKSPACE, currentWorkspace);
        dispatch(setCurrentWorkspace(currentWorkspace));
      }
    } else if (loginResponse.data?.workspace) {
      // Single workspace provided
      setStorageItem(STORAGE_KEYS.WORKSPACE, loginResponse.data.workspace);
      dispatch(setCurrentWorkspace(loginResponse.data.workspace));
    }
    
    // Update Redux state using setCredentials
    dispatch(setCredentials({
      user: loginResponse.data?.user,
      token: loginResponse.data?.token,
      permissions: loginResponse.data?.permissions || [],
    }));
  }, [dispatch]);

  // Helper function to clear auth data
  const clearAuthData = useCallback(() => {
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(removeStorageItem);
    
    // Clear legacy storage keys
    removeStorageItem('token');
    removeStorageItem('authToken'); 
    removeStorageItem('user');
    removeStorageItem('workspace');
    removeStorageItem('workspaces');
    removeStorageItem('permissions');
    
    // Clear Redux state - using correct action names
    dispatch(logout()); // This calls the logout action from authSlice
    dispatch(clearWorkspaces()); // This calls the clearWorkspaces action from workspaceSlice
    
    // Clear RTK Query cache
    dispatch(authApi.util.resetApiState());
  }, [dispatch]);

  // ✅ ENHANCED GET AVAILABLE WORKSPACES
  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const token = getStorageItem(STORAGE_KEYS.TOKEN) || getStorageItem('token') || getStorageItem('authToken');
      
      if (!token) {
        console.warn('⚠️ useAuth: No token available for workspace fetch');
        return [];
      }

      const response = await fetch('/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const workspaces = data.workspaces || data.data || [];
        
        console.log('✅ useAuth: Fetched workspaces:', workspaces.length);
        
        // Update Redux state
        dispatch(setAvailableWorkspaces(workspaces));
        setStorageItem(STORAGE_KEYS.WORKSPACES, workspaces);
        
        // ✅ AUTO-SELECT FIRST WORKSPACE IF NONE SELECTED
        if (!workspaceState.currentWorkspace && workspaces.length > 0) {
          const defaultWorkspace = workspaces.find((ws: Workspace) => ws.is_default) || workspaces[0];
          console.log('🔄 useAuth: Auto-selecting default workspace:', defaultWorkspace.name);
          
          setStorageItem(STORAGE_KEYS.WORKSPACE, defaultWorkspace);
          dispatch(setCurrentWorkspace(defaultWorkspace));
        }
        
        return workspaces;
      }
      
      throw new Error('Failed to fetch workspaces');
      
    } catch (error) {
      console.error('❌ useAuth: Error fetching workspaces:', error);
      
      // Return fallback workspace for development
      const fallbackWorkspaces = [
        {
          id: '54f2f0df-38b1-4190-b122-702051bdd00b',
          name: 'default',
          slug: 'default', 
          display_name: 'THB Workspace',
          description: 'Default workspace for dashboarding purposes',
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
      
      // Update Redux with fallback data
      dispatch(setAvailableWorkspaces(fallbackWorkspaces));
      setStorageItem(STORAGE_KEYS.WORKSPACES, fallbackWorkspaces);
      
      // Auto-select the fallback workspace
      if (!workspaceState.currentWorkspace) {
        setStorageItem(STORAGE_KEYS.WORKSPACE, fallbackWorkspaces[0]);
        dispatch(setCurrentWorkspace(fallbackWorkspaces[0]));
      }
      
      return fallbackWorkspaces;
    }
  }, [dispatch, workspaceState.currentWorkspace]);

  // ✅ ENHANCED LOGIN FUNCTION
  const login = useCallback(async (
    emailOrUsername: string, 
    password: string, 
    workspaceSlug?: string
  ): Promise<boolean> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      console.log('🔑 useAuth: Starting login process');
      
      // Prepare credentials based on input format
      const credentials = {
        password,
        workspace_slug: workspaceSlug,
        ...(isValidEmail(emailOrUsername.trim()) 
          ? { email: emailOrUsername.trim() }
          : { username: emailOrUsername.trim() }
        )
      };
      
      // Use RTK Query mutation
      const result = await loginMutation(credentials) as LoginMutationResult;
      
      console.log('🐛 DEBUG - Login mutation result:', result);
      
      // Handle RTK Query response structure
      if (result.data && result.data.success && result.data.data) {
        console.log('✅ useAuth: Login successful');
        
        // Store auth data and auto-select workspace
        storeAuthData(result.data);
        
        // Get available workspaces after login if not provided in response
        try {
          if (!result.data.data.workspaces && !result.data.data.workspace) {
            await getAvailableWorkspaces();
          }
        } catch (workspaceError) {
          console.warn('⚠️ useAuth: Could not fetch workspaces after login:', workspaceError);
        }
        
        return true;
      }

      // Handle error cases
      const errorMessage = result.error?.data?.message || result.data?.message || 'Login failed';
      console.error('❌ useAuth: Login failed:', errorMessage);
      dispatch(setError(errorMessage));
      return false;
      
    } catch (error: any) {
      console.error('❌ useAuth: Login error:', error);
      dispatch(setError(error.message || 'Login failed'));
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, loginMutation, storeAuthData, getAvailableWorkspaces]);

  // ✅ SWITCH WORKSPACE FUNCTION
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<void> => {
    try {
      console.log('🔄 useAuth: Switching to workspace:', workspaceSlug);
      dispatch(setLoading(true));
      dispatch(clearError());
      
      const token = getStorageItem(STORAGE_KEYS.TOKEN) || getStorageItem('token') || getStorageItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

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
        
        if (data.success && data.data) {
          console.log('✅ useAuth: Workspace switch successful');
          
          // Update current workspace
          if (data.data.workspace) {
            setStorageItem(STORAGE_KEYS.WORKSPACE, data.data.workspace);
            dispatch(setCurrentWorkspace(data.data.workspace));
          }
          
          // Update token if provided
          if (data.data.token) {
            setStorageItem(STORAGE_KEYS.TOKEN, data.data.token);
            dispatch(setCredentials({
              ...authState,
              token: data.data.token,
              permissions: data.data.permissions || authState.permissions,
            }));
          }
          
          // Update permissions if provided
          if (data.data.permissions) {
            setStorageItem(STORAGE_KEYS.PERMISSIONS, data.data.permissions);
          }
          
          // Navigate to the workspace
          await router.push(`/workspace/${workspaceSlug}`);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Workspace switch failed');
      }
      
    } catch (error: any) {
      console.error('❌ useAuth: Workspace switch error:', error);
      dispatch(setError(error.message || 'Workspace switch failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, authState, router]);

  // Initialize auth on app start
  const initializeAuthState = useCallback(async () => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    setIsInitializing(true);

    try {
      console.log('🔄 useAuth: Initializing authentication');
      
      // Check for stored auth data
      const storedUser = getStorageItem(STORAGE_KEYS.USER) || getStorageItem('user');
      const storedWorkspace = getStorageItem(STORAGE_KEYS.WORKSPACE) || getStorageItem('workspace');
      const storedWorkspaces = getStorageItem(STORAGE_KEYS.WORKSPACES) || getStorageItem('workspaces');
      const storedPermissions = getStorageItem(STORAGE_KEYS.PERMISSIONS) || getStorageItem('permissions');
      const token = getStorageItem('token') || getStorageItem('authToken') || getStorageItem(STORAGE_KEYS.TOKEN);

      if (token && storedUser) {
        console.log('🔄 useAuth: Restoring session from localStorage');
        
        // Restore Redux state using setCredentials
        dispatch(setCredentials({
          user: storedUser,
          token,
          permissions: storedPermissions || [],
        }));
        
        // Restore workspace state
        if (storedWorkspaces) {
          dispatch(setAvailableWorkspaces(storedWorkspaces));
          
          // Restore or auto-select workspace
          if (storedWorkspace) {
            // Verify workspace still exists
            const workspaceExists = storedWorkspaces.find((ws: Workspace) => ws.id === storedWorkspace.id);
            if (workspaceExists) {
              dispatch(setCurrentWorkspace(storedWorkspace));
            } else {
              // Workspace no longer exists, select first available
              const firstWorkspace = storedWorkspaces[0];
              if (firstWorkspace) {
                console.log('🔄 useAuth: Previous workspace not found, selecting first available');
                setStorageItem(STORAGE_KEYS.WORKSPACE, firstWorkspace);
                dispatch(setCurrentWorkspace(firstWorkspace));
              }
            }
          } else if (storedWorkspaces.length > 0) {
            // No saved workspace, select first
            const firstWorkspace = storedWorkspaces.find((ws: Workspace) => ws.is_default) || storedWorkspaces[0];
            console.log('🔄 useAuth: No saved workspace, selecting first available');
            setStorageItem(STORAGE_KEYS.WORKSPACE, firstWorkspace);
            dispatch(setCurrentWorkspace(firstWorkspace));
          }
        } else {
          // Try to fetch workspaces
          try {
            await getAvailableWorkspaces();
          } catch (error) {
            console.warn('⚠️ useAuth: Could not fetch workspaces during initialization');
          }
        }
        
        console.log('✅ useAuth: Session restored successfully');
      } else {
        console.log('🔄 useAuth: No valid session found');
      }

    } catch (error) {
      console.error('❌ useAuth: Initialization error:', error);
      clearAuthData();
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch, clearAuthData, getAvailableWorkspaces]);

  // ✅ INITIALIZATION EFFECT
  useEffect(() => {
    initializeAuthState();
  }, [initializeAuthState]);

  // Logout function
  const logoutUser = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      console.log('🔑 useAuth: Starting logout');
      
      // Use RTK Query mutation if available
      try {
        await logoutMutation().unwrap();
      } catch (error) {
        console.warn('⚠️ useAuth: Logout API call failed, continuing with local cleanup');
      }
      
      // Clear all auth data
      clearAuthData();
      
      // Redirect to login
      await router.push('/login');
      
      console.log('✅ useAuth: Logout successful');
      
    } catch (error) {
      console.error('❌ useAuth: Logout error:', error);
      // Clear auth data even if API call fails
      clearAuthData();
      await router.push('/login');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, clearAuthData, router, logoutMutation]);

  // Permission check functions
  const hasPermission = useCallback((permission: string): boolean => {
    return authState.permissions?.includes(permission) || false;
  }, [authState.permissions]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => authState.permissions?.includes(permission)) || false;
  }, [authState.permissions]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => authState.permissions?.includes(permission)) || false;
  }, [authState.permissions]);

  // Profile update function
  const updateProfile = useCallback(async (profileData: any) => {
    try {
      const result = await updateProfileMutation(profileData).unwrap();
      
      // Update stored user data
      if (result.user) {
        setStorageItem(STORAGE_KEYS.USER, result.user);
        dispatch(setCredentials({
          ...authState,
          user: result.user,
        }));
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }, [updateProfileMutation, authState, dispatch]);

  // Password change function
  const changePassword = useCallback(async (passwordData: any) => {
    try {
      const result = await changePasswordMutation(passwordData).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [changePasswordMutation]);

  // Password reset request function
  const requestPasswordReset = useCallback(async (emailOrUsername: string) => {
    try {
      const requestData = isValidEmail(emailOrUsername)
        ? { email: emailOrUsername }
        : { username: emailOrUsername };
        
      const result = await requestPasswordResetMutation(requestData).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [requestPasswordResetMutation]);

  // Password reset function
  const resetPassword = useCallback(async (resetData: any) => {
    try {
      const result = await resetPasswordMutation(resetData).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [resetPasswordMutation]);

  return {
    // Auth state
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || isInitializing || loginLoading || logoutLoading,
    error: authState.error,
    token: authState.token,
    permissions: authState.permissions,
    
    // Workspace state
    currentWorkspace: workspaceState.currentWorkspace,
    availableWorkspaces: workspaceState.availableWorkspaces,
    
    // Auth functions
    login,
    logout: logoutUser, // Renamed to avoid conflict with the action
    switchWorkspace,
    getAvailableWorkspaces,
    
    // Profile functions
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    
    // Permission functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Initialization state
    isInitializing,
  };
};