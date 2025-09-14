// web-application/src/components/providers/AuthProvider.tsx
// ✅ FIXED VERSION - Using only confirmed exports from workspaceSlice

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  setCredentials, 
  setLoading, 
  logout as logoutAction,
  clearError 
} from '../../store/slices/authSlice';
import { 
  setCurrentWorkspace,
  setAvailableWorkspaces,
  resetWorkspaceState,
  clearError as clearWorkspaceError
} from '../../store/slices/workspaceSlice';
import { useRouter } from 'next/router';
import { STORAGE_KEYS } from '../../constants';
import storageUtils, { authStorage, workspaceStorage } from '../../utils/storageUtils';

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  user: any;
  workspace: any;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  workspaceInitialized: boolean;

  // Auth methods
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  switchWorkspace: (slug: string) => Promise<any>;
  getAvailableWorkspaces: () => Promise<any[]>;
  getDefaultWorkspace: () => Promise<any>;
  
  // Permission methods
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Utility methods
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Redux state
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);
  
  // Local state
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Manual async function to fetch workspaces
  const fetchWorkspaces = async (): Promise<any[]> => {
    try {
      console.log('📡 AuthProvider: Fetching workspaces manually');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch workspaces');
      }
      
      const workspaces = result.data?.workspaces || result.data || [];
      
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
  const switchWorkspaceAsync = async (workspaceSlug: string): Promise<any> => {
    try {
      console.log('🔄 AuthProvider: Switching workspace to:', workspaceSlug);
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/workspaces/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: workspaceSlug }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to switch workspace');
      }
      
      const newWorkspace = result.data?.workspace || result.data;
      
      // Update Redux state using synchronous action
      dispatch(setCurrentWorkspace(newWorkspace));
      
      // Update storage
      workspaceStorage.setCurrentWorkspace(newWorkspace);
      
      console.log('✅ AuthProvider: Workspace switched successfully');
      return newWorkspace;
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Workspace switch failed:', error);
      
      // Fallback: try to find and switch locally
      const workspaces = workspace.availableWorkspaces || [];
      const targetWorkspace = workspaces.find((ws: any) => ws.slug === workspaceSlug);
      
      if (targetWorkspace) {
        dispatch(setCurrentWorkspace(targetWorkspace));
        workspaceStorage.setCurrentWorkspace(targetWorkspace);
        console.log('✅ AuthProvider: Workspace switched (local fallback):', targetWorkspace.name);
        return targetWorkspace;
      }
      
      throw error;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthProvider: Initializing auth from storage');
        
        // Clean up legacy keys on startup
        workspaceStorage.migrateOldWorkspaceKeys?.();
        
        // Get stored auth data using unified storage utilities
        const storedToken = authStorage.getToken();
        const storedUser = authStorage.getUser();
        const storedWorkspace = workspaceStorage.getCurrentWorkspace();
        
        if (storedToken && storedUser) {
          console.log('📦 AuthProvider: Found stored auth data');
          
          // Set auth credentials in Redux
          dispatch(setCredentials({ 
            user: storedUser, 
            token: storedToken 
          }));

          // Load workspaces manually
          try {
            const workspaces = await fetchWorkspaces();
            
            if (workspaces && workspaces.length > 0) {
              console.log('✅ AuthProvider: Workspaces loaded:', workspaces.length);
              
              // If we have a stored workspace and it's still valid, restore it
              if (storedWorkspace) {
                const workspaceExists = workspaces.find(
                  (ws: any) => ws.id === storedWorkspace.id
                );
                
                if (workspaceExists) {
                  dispatch(setCurrentWorkspace(storedWorkspace));
                  console.log('🔄 AuthProvider: Restored workspace:', storedWorkspace.name);
                } else {
                  // Stored workspace no longer exists, select first available
                  const firstWorkspace = workspaces[0];
                  dispatch(setCurrentWorkspace(firstWorkspace));
                  workspaceStorage.setCurrentWorkspace(firstWorkspace);
                  console.log('🔄 AuthProvider: Auto-selected first workspace:', firstWorkspace.name);
                }
              } else {
                // No stored workspace, select first available
                const firstWorkspace = workspaces[0];
                dispatch(setCurrentWorkspace(firstWorkspace));
                workspaceStorage.setCurrentWorkspace(firstWorkspace);
                console.log('🔄 AuthProvider: Auto-selected first workspace:', firstWorkspace.name);
              }
              
              setWorkspaceInitialized(true);
            }
          } catch (workspaceError) {
            console.error('❌ AuthProvider: Error loading workspaces during init:', workspaceError);
          }
        } else {
          console.log('📭 AuthProvider: No stored auth data found');
        }
        
        // Debug storage state in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Storage info:', storageUtils.getStorageInfo());
        }
        
      } catch (error) {
        console.error('❌ AuthProvider: Initialization error:', error);
        // Clear potentially corrupted data
        storageUtils.clearAllStorage();
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Login function
  const login = async (email: string, password: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      console.log('🔐 AuthProvider: Attempting login');

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed');
      }

      const { user, token, workspace } = result.data;

      // Store using unified storage system
      authStorage.setToken(token);
      authStorage.setUser(user);
      
      if (workspace) {
        workspaceStorage.setCurrentWorkspace(workspace);
        dispatch(setCurrentWorkspace(workspace));
      }

      // Update Redux state
      dispatch(setCredentials({ user, token }));

      // Load all available workspaces
      await fetchWorkspaces();
      setWorkspaceInitialized(true);

      console.log('✅ AuthProvider: Login successful');
      return result;

    } catch (error: any) {
      console.error('❌ AuthProvider: Login error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      console.log('👋 AuthProvider: Logging out');

      // Call logout API endpoint
      const token = authStorage.getToken();
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
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
      storageUtils.clearAllStorage();

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

  // Get available workspaces function
  const getAvailableWorkspaces = async (): Promise<any[]> => {
    try {
      console.log('🔍 AuthProvider: Getting available workspaces');
      
      if (!auth.isAuthenticated) {
        console.warn('⚠️ AuthProvider: User not authenticated');
        return [];
      }

      // Try to get from Redux state first
      if (workspace.availableWorkspaces && workspace.availableWorkspaces.length > 0) {
        console.log('📦 AuthProvider: Using workspaces from Redux state:', workspace.availableWorkspaces.length);
        return workspace.availableWorkspaces;
      }

      // Fetch fresh from API
      return await fetchWorkspaces();
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Error getting workspaces:', error);
      return [];
    }
  };

  // Get default workspace function
  const getDefaultWorkspace = async (): Promise<any> => {
    try {
      const workspaces = await getAvailableWorkspaces();
      return workspaces.find((ws: any) => ws.is_default) || workspaces[0] || null;
    } catch (error) {
      console.error('❌ AuthProvider: Error getting default workspace:', error);
      return null;
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
      // Add token validation logic here if needed
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

  const contextValue: AuthContextType = {
    // Auth state
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: workspace.currentWorkspace,
    permissions: auth.permissions || [],
    loading: auth.isLoading || workspace.isLoading,
    isInitialized: auth.isInitialized,
    workspaceInitialized,

    // Auth methods  
    login,
    logout,
    switchWorkspace,
    getAvailableWorkspaces,
    getDefaultWorkspace,
    
    // Permission methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Utility methods
    signOut,
    refreshAuth,
    loadWorkspaces,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AuthProvider context value:', {
      isAuthenticated: contextValue.isAuthenticated,
      authInitialized: contextValue.isInitialized,
      workspaceInitialized: contextValue.workspaceInitialized,
      hasUser: !!contextValue.user,
      hasWorkspace: !!contextValue.workspace,
      loading: contextValue.loading,
      workspacesCount: workspace.availableWorkspaces?.length || 0,
    });
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;