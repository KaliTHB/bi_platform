// web-application/src/components/providers/AuthProvider.tsx
import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../../store';
import { 
  setCredentials, 
  logout as logoutAction, 
  setError 
} from '../../store/slices/authSlice';
import { 
  setCurrentWorkspace, 
  setAvailableWorkspaces, 
  resetWorkspaceState 
} from '../../store/slices/workspaceSlice';
import { authStorage, workspaceStorage } from '../../utils/storageUtils';

// Types
interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  workspace: any;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  workspaceInitialized: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<any>;
  getAvailableWorkspaces: () => Promise<any[]>;
  getDefaultWorkspace: () => Promise<any>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
}

// Context creation
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  
  // Redux state
  const auth = useSelector((state: RootState) => state.auth);
  const workspace = useSelector((state: RootState) => state.workspace);
  
  // Local state
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);

  // ✅ FIXED: Corrected API base URL WITHOUT /api prefix
  // The /api prefix is added by the workspaceApi.ts configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Manual async function to fetch workspaces
  const fetchWorkspaces = async (): Promise<any[]> => {
    try {
      console.log('📡 AuthProvider: Fetching workspaces manually');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get current context
      const currentUser = authStorage.getUser();
      const currentWorkspace = workspaceStorage.getCurrentWorkspace();
      
      // ✅ FIXED: Using correct endpoint - API_BASE_URL + /api/workspaces
      const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Id': currentWorkspace?.id || '',
          'X-Workspace-Slug': currentWorkspace?.slug || '',
          'X-User-Id': currentUser?.user_id || ''
        },
      });

      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch workspaces');
      }
      
      // ✅ FIXED: Handle both data.workspaces and data.data response formats
      const workspaces = result.data || [];
      
      // Update Redux state using synchronous action
      dispatch(setAvailableWorkspaces(workspaces));
      
      // Cache in storage
      workspaceStorage.setAvailableWorkspaces(workspaces);
      
      console.log(`✅ AuthProvider: Fetched ${workspaces.length} workspaces`);
      return workspaces;
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Error fetching workspaces:', error);
      return [];
    }
  };

  // Manual async function to switch workspace
  const switchWorkspaceAsync = async (workspaceId: string): Promise<any> => {
    try {
      console.log('🔄 AuthProvider: Switching workspace to:', workspaceId);
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Get current context
      const currentUser = authStorage.getUser();
      const currentWorkspace = workspaceStorage.getCurrentWorkspace();

      const response = await fetch(`${API_BASE_URL}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Id': currentWorkspace?.id || '',
          'X-Workspace-Slug': currentWorkspace?.slug || '',
          'X-User-Id': currentUser?.user_id || ''
        },
        body: JSON.stringify({
          workspaceId: workspaceId  // Change from workspaceSlug to workspaceId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to switch workspace');
      }
      
      // Update token and workspace in storage and Redux
      const { token: newToken, workspace: newWorkspace, permissions } = result.data;
      
      if (newToken) {
        authStorage.setToken(newToken);
        dispatch(setCredentials({ user: auth.user, token: newToken, permissions }));
      }
      
      if (newWorkspace) {
        workspaceStorage.setCurrentWorkspace(newWorkspace);
        dispatch(setCurrentWorkspace(newWorkspace));
      }
      
      console.log('✅ AuthProvider: Workspace switched successfully');
      return result;
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Error switching workspace:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<any> => {
    try {
      console.log('🔑 AuthProvider: Attempting login for:', email);

      // ✅ FIXED: Using correct login endpoint
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Login failed');
      }

      const { user, token, permissions } = result.data;

      // Store credentials
      authStorage.setToken(token);
      authStorage.setUser(user);
      
      // Set auth credentials in Redux
      dispatch(setCredentials({ user, token, permissions }));
      
      // Load workspaces after successful login
      await fetchWorkspaces();
      
      console.log('✅ AuthProvider: Login successful');
      return result;
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Login failed:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 AuthProvider: Logging out');

      // Call logout API endpoint
      const token = authStorage.getToken();
      if (token) {
        try {
          // ✅ FIXED: Using correct logout endpoint
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (apiError) {
          console.warn('⚠️ AuthProvider: Logout API call failed:', apiError);
          // Continue with local logout even if API fails
        }
      }

      // Clear all storage using unified system
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();

      // Clear Redux state
      dispatch(logoutAction());
      dispatch(resetWorkspaceState());
      
      // Reset initialization flags
      setWorkspaceInitialized(false);

      // Redirect to login
      router.replace('/login');

      console.log('✅ AuthProvider: Logout completed');
    } catch (error) {
      console.error('❌ AuthProvider: Logout error:', error);
    }
  };

  // Switch workspace function
  const switchWorkspace = async (workspaceSlug: string): Promise<any> => {
    return await switchWorkspaceAsync(workspaceSlug);
  };

  // ✅ FIXED: Simplified getAvailableWorkspaces to avoid duplicate calls
  const getAvailableWorkspaces = async (): Promise<any[]> => {
    try {
      console.log('🔍 AuthProvider: Getting available workspaces');
      
      if (!auth.isAuthenticated) {
        console.warn('⚠️ AuthProvider: User not authenticated');
        return [];
      }

      // Try to get from Redux state first to avoid unnecessary API calls
      if (workspace.availableWorkspaces && workspace.availableWorkspaces.length > 0) {
        console.log('📦 AuthProvider: Using workspaces from Redux state:', workspace.availableWorkspaces.length);
        return workspace.availableWorkspaces;
      }

      // Try to get from localStorage cache
      const cachedWorkspaces = workspaceStorage.getAvailableWorkspaces();
      if (cachedWorkspaces && cachedWorkspaces.length > 0) {
        console.log('💾 AuthProvider: Using cached workspaces:', cachedWorkspaces.length);
        dispatch(setAvailableWorkspaces(cachedWorkspaces));
        return cachedWorkspaces;
      }

      // Fetch fresh from API only if no cached data
      return await fetchWorkspaces();
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Error getting workspaces:', error);
      return [];
    }
  };

  // Get default workspace function
  const getDefaultWorkspace = async (): Promise<any> => {
    try {
      // ✅ FIXED: Use correct endpoint for getting default workspace
      const response = await fetch(`${API_BASE_URL}/api/user/workspace/default`, {
        headers: {
          'Authorization': `Bearer ${authStorage.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get default workspace');
      }

      if (data.success && data.workspace) {
        workspaceStorage.setCurrentWorkspace(data.workspace);
        dispatch(setCurrentWorkspace(data.workspace));
      }

      return data;
    } catch (error: any) {
      console.error('❌ AuthProvider: Error getting default workspace:', error);
      
      // Fallback to first workspace from available workspaces
      const workspaces = await getAvailableWorkspaces();
      return workspaces.find((ws: any) => ws.is_default) || workspaces[0] || null;
    }
  };

  // Permission helper functions
  const hasPermission = (permission: string): boolean => {
    return auth.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // Utility functions for backward compatibility
  const signOut = logout;
  
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 AuthProvider: Refreshing auth');
    if (auth.token) {
      await fetchWorkspaces();
    }
  };

  const loadWorkspaces = async (): Promise<void> => {
    console.log('📁 AuthProvider: Loading workspaces');
    if (auth.isAuthenticated) {
      await fetchWorkspaces();
      setWorkspaceInitialized(true);
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthProvider: Initializing auth from storage');
        
        const token = authStorage.getToken();
        const user = authStorage.getUser();
        
        if (token && user) {
          console.log('🔄 AuthProvider: Restoring auth from storage');
          
          // Set credentials in Redux
          dispatch(setCredentials({ user, token }));
          
          // Try to restore workspaces from cache first
          const cachedWorkspaces = workspaceStorage.getAvailableWorkspaces();
          const cachedCurrentWorkspace = workspaceStorage.getCurrentWorkspace();
          
          if (cachedWorkspaces && cachedWorkspaces.length > 0) {
            console.log('💾 AuthProvider: Restored workspaces from cache:', cachedWorkspaces.length);
            dispatch(setAvailableWorkspaces(cachedWorkspaces));
          }
          
          if (cachedCurrentWorkspace) {
            console.log('💾 AuthProvider: Restored current workspace from cache:', cachedCurrentWorkspace.slug);
            dispatch(setCurrentWorkspace(cachedCurrentWorkspace));
          }
          
          setWorkspaceInitialized(true);
        }
      } catch (error) {
        console.error('❌ AuthProvider: Error initializing auth:', error);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Context value
  const contextValue: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: workspace.currentWorkspace,
    permissions: auth.permissions || [],
    loading: auth.loading,
    isInitialized: auth.isInitialized,
    workspaceInitialized,
    login,
    logout,
    switchWorkspace,
    getAvailableWorkspaces,
    getDefaultWorkspace,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    signOut,
    refreshAuth,
    loadWorkspaces,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};