// bi_platform/web-application/src/components/providers/AuthProvider.tsx
// Fixed version with correct workspace slice imports

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { 
  initializeAuth, 
  validateToken, 
  logout as logoutAction,
  loadUserPermissions,
  setPermissions,
  clearPermissions,
  setCredentials
} from '@/store/slices/authSlice';
import { 
  setCurrentWorkspace, 
  setAvailableWorkspaces,
  resetWorkspaceState,
  clearWorkspaceState
} from '@/store/slices/workspaceSlice';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';
import { useRouter } from 'next/router';

// Types
interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  user: User | null;
  workspace: Workspace | null;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  workspaceInitialized: boolean;
  permissionsInitialized: boolean;
  error: string | null;
  
  // Auth Methods
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => void;
  refreshAuth: () => Promise<void>;
  
  // Workspace Methods
  switchWorkspace: (workspaceId: string) => Promise<void>;
  getAvailableWorkspaces: () => Promise<Workspace[]>;
  getDefaultWorkspace: () => Workspace | null;
  loadWorkspaces: () => Promise<void>;
  
  // Permission Methods
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  loadPermissions: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  
  // Utility Methods
  getCurrentUser: () => User | null;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  isAdmin: () => boolean;
  canAccessWorkspace: (workspaceId: string) => boolean;
}

interface AuthProviderProps {
  children: ReactNode;
  showPermissionLoading?: boolean;
  permissionTimeout?: number;
  permissionLoadingComponent?: ReactNode;
  onAuthError?: (error: string) => void;
  onPermissionError?: (error: string) => void;
  onWorkspaceError?: (error: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  showPermissionLoading = true,
  permissionTimeout = 5000,
  permissionLoadingComponent,
  onAuthError,
  onPermissionError,
  onWorkspaceError
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { user, token, isAuthenticated, isLoading, error: authError } = useAppSelector((state) => state.auth);
  const { currentWorkspace, availableWorkspaces, isLoading: workspaceLoading } = useAppSelector((state) => state.workspace);
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const [permissionsInitialized, setPermissionsInitialized] = useState(false);
  const [permissions, setLocalPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableWorkspacesList, setAvailableWorkspaces] = useState<Workspace[]>([]);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuthState = async () => {
      try {
        console.log('🔄 AuthProvider: Initializing auth state...');
        
        // Check for stored auth data
        const storedToken = authStorage.getToken();
        const storedUser = authStorage.getUser();
        const storedWorkspace = workspaceStorage.getCurrentWorkspace();
        const storedPermissions = authStorage.getPermissions();
        
        if (storedToken && storedUser) {
          console.log('✅ AuthProvider: Found stored auth data');
          
          // Restore Redux state
          dispatch(setCredentials({
            user: storedUser,
            token: storedToken,
            permissions: storedPermissions || [],
            workspace: storedWorkspace
          }));
          
          if (storedWorkspace) {
            dispatch(setCurrentWorkspace(storedWorkspace));
          }
          
          if (storedPermissions) {
            setLocalPermissions(storedPermissions);
            setPermissionsInitialized(true);
          }
          
          setWorkspaceInitialized(!!storedWorkspace);
        }
        
      } catch (error: any) {
        console.error('❌ AuthProvider: Initialization failed:', error);
        setError(error.message || 'Failed to initialize auth state');
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };

    initializeAuthState();
  }, [dispatch]);

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError);
      onAuthError?.(authError);
    }
  }, [authError, onAuthError]);

  // Auto-redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isLoading) {
      const currentPath = router.asPath;
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
      
      if (!isPublicPath) {
        console.log('🔄 AuthProvider: Redirecting to login - user not authenticated');
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      }
    }
  }, [isInitialized, isAuthenticated, isLoading, router]);

  // ========================================
  // AUTHENTICATION METHODS
  // ========================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 AuthProvider: Logging in user...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Login failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || data.error || 'Invalid login response');
      }

      // Store credentials using Redux action and storage utilities
      dispatch(setCredentials({
        user: data.user,
        token: data.token,
        permissions: data.permissions || [],
        workspace: data.workspace
      }));

      // Update local state
      if (data.workspace) {
        dispatch(setCurrentWorkspace(data.workspace));
        setWorkspaceInitialized(true);
      }

      if (data.permissions) {
        setLocalPermissions(data.permissions);
        setPermissionsInitialized(true);
      }

      console.log('✅ AuthProvider: Login successful');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Login failed:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 AuthProvider: Logging out user...');
      
      // Optional: Call logout API
      try {
        const token = authStorage.getToken();
        if (token) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      } catch (apiError) {
        console.warn('⚠️ AuthProvider: Logout API call failed, continuing with local logout');
      }
      
      // Clear auth data using storage utilities
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();
      
      // Clear Redux state - Fixed to use correct actions
      dispatch(logoutAction());
      dispatch(clearWorkspaceState()); // Use async thunk
      
      // Reset local state
      setLocalPermissions([]);
      setPermissionsInitialized(false);
      setWorkspaceInitialized(false);
      setAvailableWorkspaces([]);
      setError(null);
      
      // Redirect to login page
      router.push('/login');
      
      console.log('✅ AuthProvider: Logout successful');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Logout error:', error);
      setError(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [dispatch, router]);

  const signOut = useCallback((): void => {
    logout();
  }, [logout]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 AuthProvider: Refreshing auth state...');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No token available for refresh');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error('Invalid verification response');
      }

      // Update user data
      dispatch(setCredentials({
        user: data.user,
        token: token,
        permissions: data.permissions || permissions,
        workspace: data.workspace || currentWorkspace
      }));

      console.log('✅ AuthProvider: Auth refresh successful');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Auth refresh failed:', error);
      setError(error.message || 'Failed to refresh authentication');
      // Force logout on refresh failure
      await logout();
    } finally {
      setLoading(false);
    }
  }, [dispatch, permissions, currentWorkspace, logout]);

  // ========================================
  // WORKSPACE METHODS
  // ========================================

  const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 AuthProvider: Switching workspace:', workspaceId);
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/workspace/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Workspace switch failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.workspace) {
        throw new Error(data.message || 'Invalid workspace switch response');
      }

      // Update workspace state
      dispatch(setCurrentWorkspace(data.workspace));
      
      // Update permissions for new workspace
      if (data.permissions) {
        dispatch(setPermissions(data.permissions));
        setLocalPermissions(data.permissions);
      }

      console.log('✅ AuthProvider: Workspace switched successfully');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Workspace switch failed:', error);
      setError(error.message || 'Failed to switch workspace');
      onWorkspaceError?.(error.message || 'Failed to switch workspace');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch, onWorkspaceError]);

  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      console.log('🔄 AuthProvider: Fetching available workspaces...');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch workspaces: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.workspaces)) {
        throw new Error(data.message || 'Invalid workspaces response');
      }

      const workspaces = data.workspaces;
      
      // Update Redux state
      dispatch(setAvailableWorkspaces(workspaces));
      setAvailableWorkspaces(workspaces);

      console.log(`✅ AuthProvider: Fetched ${workspaces.length} workspaces`);
      return workspaces;
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Failed to fetch workspaces:', error);
      setError(error.message || 'Failed to fetch workspaces');
      onWorkspaceError?.(error.message || 'Failed to fetch workspaces');
      return [];
    }
  }, [dispatch, onWorkspaceError]);

  const getDefaultWorkspace = useCallback((): Workspace | null => {
    return currentWorkspace;
  }, [currentWorkspace]);

  const loadWorkspaces = useCallback(async (): Promise<void> => {
    await getAvailableWorkspaces();
  }, [getAvailableWorkspaces]);

  // ========================================
  // PERMISSION METHODS
  // ========================================

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionsToCheck: string[]): boolean => {
    return permissionsToCheck.some(permission => permissions.includes(permission));
  }, [permissions]);

  const hasAllPermissions = useCallback((permissionsToCheck: string[]): boolean => {
    return permissionsToCheck.every(permission => permissions.includes(permission));
  }, [permissions]);

  const loadPermissions = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Loading permissions...');
      
      const workspaceId = currentWorkspace?.id;
      if (!workspaceId) {
        console.warn('⚠️ AuthProvider: No workspace selected for permission loading');
        return;
      }

      const result = await dispatch(loadUserPermissions({ workspaceId }));
      
      if (loadUserPermissions.fulfilled.match(result)) {
        const loadedPermissions = result.payload.permissions || [];
        setLocalPermissions(loadedPermissions);
        setPermissionsInitialized(true);
        console.log(`✅ AuthProvider: Loaded ${loadedPermissions.length} permissions`);
      } else {
        throw new Error(result.payload as string || 'Failed to load permissions');
      }
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Permission loading failed:', error);
      setError(error.message || 'Failed to load permissions');
      onPermissionError?.(error.message || 'Failed to load permissions');
    }
  }, [dispatch, currentWorkspace?.id, onPermissionError]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    // Clear current permissions and reload
    setLocalPermissions([]);
    setPermissionsInitialized(false);
    await loadPermissions();
  }, [loadPermissions]);

  // ========================================
  // UTILITY METHODS
  // ========================================

  const getCurrentUser = useCallback((): User | null => {
    return user;
  }, [user]);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 AuthProvider: Updating user profile...');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Profile update failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error(data.message || 'Invalid profile update response');
      }

      // Update user in Redux and storage
      dispatch(setCredentials({
        user: data.user,
        token: token,
        permissions: permissions,
        workspace: currentWorkspace
      }));

      console.log('✅ AuthProvider: Profile updated successfully');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Profile update failed:', error);
      setError(error.message || 'Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch, permissions, currentWorkspace]);

  const isAdmin = useCallback((): boolean => {
    return permissions.includes('admin') || permissions.includes('super_admin') || permissions.includes('workspace_admin');
  }, [permissions]);

  const canAccessWorkspace = useCallback((workspaceId: string): boolean => {
    return availableWorkspacesList.some(workspace => workspace.id === workspaceId);
  }, [availableWorkspacesList]);

  // Context value
  const contextValue: AuthContextType = {
    // State
    isAuthenticated,
    user,
    workspace: currentWorkspace,
    permissions,
    loading: loading || isLoading || workspaceLoading,
    isInitialized,
    workspaceInitialized,
    permissionsInitialized,
    error,
    
    // Auth Methods
    login,
    logout,
    signOut,
    refreshAuth,
    
    // Workspace Methods
    switchWorkspace,
    getAvailableWorkspaces,
    getDefaultWorkspace,
    loadWorkspaces,
    
    // Permission Methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loadPermissions,
    refreshPermissions,
    
    // Utility Methods
    getCurrentUser,
    updateUserProfile,
    isAdmin,
    canAccessWorkspace,
  };

  // Loading state
  if (!isInitialized) {
    if (permissionLoadingComponent) {
      return <>{permissionLoadingComponent}</>;
    }
    
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Initializing authentication...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error && onAuthError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        px={3}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6">Authentication Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;