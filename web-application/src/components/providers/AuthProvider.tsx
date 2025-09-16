// web-application/src/components/providers/AuthProvider.tsx - COMPLETE VERSION

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
  clearWorkspace
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children,
  showPermissionLoading = true,
  permissionTimeout = 5000,
  permissionLoadingComponent,
  onAuthError,
  onPermissionError
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Redux state
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);

  // Local state for initialization tracking
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const [permissionsInitialized, setPermissionsInitialized] = useState(false);
  const [permissionLoadingTimeout, setPermissionLoadingTimeout] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);

  // ✅ Initialize auth and permissions using storage utilities
  useEffect(() => {
    const initializeAuthFlow = async () => {
      try {
        console.log('🔄 AuthProvider: Starting authentication initialization...');
        
        // First, initialize auth from storage using utilities
        dispatch(initializeAuth());
        
        // Get cached workspace data using workspace storage
        const cachedWorkspaces = workspaceStorage.getAvailableWorkspaces();
        const cachedCurrentWorkspace = workspaceStorage.getCurrentWorkspace();
        
        if (cachedWorkspaces && Array.isArray(cachedWorkspaces)) {
          console.log('💾 AuthProvider: Restored workspaces from cache:', cachedWorkspaces.length);
          dispatch(setAvailableWorkspaces(cachedWorkspaces));
          setAvailableWorkspaces(cachedWorkspaces);
        }
        
        if (cachedCurrentWorkspace) {
          console.log('💾 AuthProvider: Restored current workspace from cache:', cachedCurrentWorkspace.slug);
          dispatch(setCurrentWorkspace(cachedCurrentWorkspace));
        }
        
        setWorkspaceInitialized(true);

        // Auto-validate token if available
        const storedToken = authStorage.getToken();
        if (storedToken) {
          console.log('🔍 AuthProvider: Token found, validating...');
          try {
            await dispatch(validateToken()).unwrap();
          } catch (tokenError: any) {
            console.warn('⚠️ AuthProvider: Token validation failed:', tokenError);
            authStorage.clearAuth();
            if (onAuthError) {
              onAuthError('Session expired. Please log in again.');
            }
          }
        }
        
      } catch (error: any) {
        console.error('❌ AuthProvider: Error initializing auth:', error);
        setWorkspaceInitialized(true);
        setPermissionsInitialized(true);
        if (onAuthError) {
          onAuthError(error.message || 'Authentication initialization failed');
        }
      }
    };

    initializeAuthFlow();
  }, [dispatch, onAuthError]);

  // Initialize permissions after auth and workspace are ready
  useEffect(() => {
    const initializePermissions = async () => {
      // Only proceed if authenticated and workspace is available
      if (!auth.isAuthenticated || !auth.user?.id || !workspace.currentWorkspace?.id) {
        // If not authenticated, mark permissions as initialized to avoid blocking
        if (!auth.isAuthenticated) {
          setPermissionsInitialized(true);
        }
        return;
      }

      // If we already have permissions, we're done
      if (auth.permissions && auth.permissions.length > 0) {
        console.log('✅ AuthProvider: Permissions already loaded:', auth.permissions.length);
        setPermissionsInitialized(true);
        return;
      }

      // Load permissions
      try {
        console.log('🔄 AuthProvider: Loading permissions...', {
          userId: auth.user.id,
          workspaceId: workspace.currentWorkspace.id
        });

        await dispatch(loadUserPermissions({ 
          workspaceId: workspace.currentWorkspace.id 
        })).unwrap();

        console.log('✅ AuthProvider: Permissions loaded successfully');
        setPermissionsInitialized(true);
        
      } catch (error: any) {
        console.error('❌ AuthProvider: Failed to load permissions:', error);
        
        if (onPermissionError) {
          onPermissionError(error.message || 'Failed to load permissions');
        }
        
        // Mark as initialized anyway to prevent blocking the app
        setTimeout(() => {
          console.warn('⚠️ AuthProvider: Proceeding without permissions due to error');
          setPermissionsInitialized(true);
        }, 1000);
      }
    };

    // Only try to load permissions if workspace is initialized
    if (workspaceInitialized) {
      initializePermissions();
    }
  }, [dispatch, auth.isAuthenticated, auth.user?.id, workspace.currentWorkspace?.id, auth.permissions?.length, workspaceInitialized, onPermissionError]);

  // Handle workspace changes (reload permissions for new workspace)
  useEffect(() => {
    const handleWorkspaceChange = async () => {
      if (auth.isAuthenticated && 
          auth.user?.id && 
          workspace.currentWorkspace?.id && 
          permissionsInitialized) {
        
        console.log('🔄 AuthProvider: Workspace changed, reloading permissions...');
        setPermissionsInitialized(false);
        
        try {
          // Clear old permissions
          dispatch(clearPermissions());
          
          // Load new permissions
          await dispatch(loadUserPermissions({ 
            workspaceId: workspace.currentWorkspace.id 
          })).unwrap();
          
          setPermissionsInitialized(true);
        } catch (error: any) {
          console.error('❌ AuthProvider: Failed to reload permissions for workspace:', error);
          setPermissionsInitialized(true);
          if (onPermissionError) {
            onPermissionError('Failed to load permissions for workspace');
          }
        }
      }
    };

    handleWorkspaceChange();
  }, [workspace.currentWorkspace?.id, dispatch, auth.isAuthenticated, auth.user?.id, permissionsInitialized, onPermissionError]);

  // Timeout protection for permission loading
  useEffect(() => {
    if (auth.isAuthenticated && !permissionsInitialized) {
      const timer = setTimeout(() => {
        console.warn('⚠️ AuthProvider: Permission loading timeout, proceeding anyway');
        setPermissionLoadingTimeout(true);
        setPermissionsInitialized(true);
      }, permissionTimeout);

      return () => clearTimeout(timer);
    }
  }, [auth.isAuthenticated, permissionsInitialized, permissionTimeout]);

  // ========================================
  // PERMISSION HELPER FUNCTIONS
  // ========================================

  const hasPermission = useCallback((permission: string): boolean => {
    if (!auth.permissions || auth.permissions.length === 0) return false;
    return auth.permissions.includes(permission);
  }, [auth.permissions]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!auth.permissions || auth.permissions.length === 0) return false;
    return permissions.some(perm => auth.permissions!.includes(perm));
  }, [auth.permissions]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!auth.permissions || auth.permissions.length === 0) return false;
    return permissions.every(perm => auth.permissions!.includes(perm));
  }, [auth.permissions]);

  const isAdmin = useCallback((): boolean => {
    return hasPermission('admin_access') || hasPermission('super_admin');
  }, [hasPermission]);

  // ========================================
  // PERMISSION MANAGEMENT METHODS
  // ========================================

  const loadPermissions = useCallback(async (): Promise<void> => {
    if (!auth.isAuthenticated || !workspace.currentWorkspace?.id) {
      throw new Error('User not authenticated or no workspace selected');
    }

    try {
      await dispatch(loadUserPermissions({ 
        workspaceId: workspace.currentWorkspace.id 
      })).unwrap();
      setPermissionsInitialized(true);
    } catch (error: any) {
      console.error('❌ AuthProvider: Manual permission loading failed:', error);
      throw error;
    }
  }, [dispatch, auth.isAuthenticated, workspace.currentWorkspace?.id]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!auth.isAuthenticated || !workspace.currentWorkspace?.id) return;

    try {
      // Clear cached permissions using authStorage
      authStorage.clearPermissions(workspace.currentWorkspace.id);
      dispatch(clearPermissions());
      
      // Reload permissions
      await loadPermissions();
    } catch (error: any) {
      console.error('❌ AuthProvider: Permission refresh failed:', error);
      throw error;
    }
  }, [auth.isAuthenticated, workspace.currentWorkspace?.id, loadPermissions, dispatch]);

  // ========================================
  // AUTHENTICATION METHODS
  // ========================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Logging in user...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || 'Login failed');
      }

      // Store credentials using Redux action
      dispatch(setCredentials({
        user: data.user,
        token: data.token,
        permissions: data.permissions || [],
        workspace: data.workspace
      }));

      // Update local workspace state
      if (data.workspace) {
        dispatch(setCurrentWorkspace(data.workspace));
      }

      console.log('✅ AuthProvider: Login successful');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Logging out user...');
      
      // Clear auth data using storage utilities
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();
      
      // Clear Redux state
      dispatch(logoutAction());
      dispatch(clearWorkspace());
      
      // Reset local state
      setPermissionsInitialized(false);
      setWorkspaceInitialized(false);
      setAvailableWorkspaces([]);
      
      // Redirect to login page
      router.push('/auth/login');
      
      console.log('✅ AuthProvider: Logout successful');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Logout error:', error);
    }
  }, [dispatch, router]);

  const signOut = useCallback((): void => {
    logout();
  }, [logout]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      await dispatch(validateToken()).unwrap();
    } catch (error: any) {
      console.error('❌ AuthProvider: Auth refresh failed:', error);
      throw error;
    }
  }, [dispatch]);

  // ========================================
  // WORKSPACE METHODS
  // ========================================

  const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Switching workspace...', workspaceId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStorage.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (!response.ok) {
        throw new Error(`Workspace switch failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Workspace switch failed');
      }

      // Update workspace in storage and Redux
      const newWorkspace = data.data.workspace || data.workspace;
      workspaceStorage.setCurrentWorkspace(newWorkspace);
      dispatch(setCurrentWorkspace(newWorkspace));
      
      // Update token if provided
      if (data.data.token || data.token) {
        const newToken = data.data.token || data.token;
        authStorage.setToken(newToken);
      }

      console.log('✅ AuthProvider: Workspace switch successful');
      
      // Permissions will be reloaded automatically via useEffect
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Workspace switch failed:', error);
      throw error;
    }
  }, [dispatch]);

  const loadWorkspaces = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Loading available workspaces...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/workspaces`, {
        headers: {
          'Authorization': `Bearer ${authStorage.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load workspaces: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load workspaces');
      }

      const workspaces = data.workspaces || data.data?.workspaces || [];
      
      // Store in both local state and Redux
      setAvailableWorkspaces(workspaces);
      dispatch(setAvailableWorkspaces(workspaces));
      workspaceStorage.setAvailableWorkspaces(workspaces);

      console.log('✅ AuthProvider: Workspaces loaded successfully:', workspaces.length);
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Failed to load workspaces:', error);
      throw error;
    }
  }, [dispatch]);

  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    // Return cached workspaces if available
    if (availableWorkspaces.length > 0) {
      return availableWorkspaces;
    }

    // Otherwise load from storage
    const cachedWorkspaces = workspaceStorage.getAvailableWorkspaces();
    if (cachedWorkspaces && Array.isArray(cachedWorkspaces)) {
      setAvailableWorkspaces(cachedWorkspaces);
      return cachedWorkspaces;
    }

    // If no cached workspaces, load from API
    await loadWorkspaces();
    return availableWorkspaces;
  }, [availableWorkspaces, loadWorkspaces]);

  const getDefaultWorkspace = useCallback((): Workspace | null => {
    return workspaceStorage.getCurrentWorkspace() || null;
  }, []);

  const canAccessWorkspace = useCallback((workspaceId: string): boolean => {
    return availableWorkspaces.some(ws => ws.id === workspaceId);
  }, [availableWorkspaces]);

  // ========================================
  // USER PROFILE METHODS
  // ========================================

  const getCurrentUser = useCallback((): User | null => {
    return auth.user;
  }, [auth.user]);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Updating user profile...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authStorage.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Profile update failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Profile update failed');
      }

      // Update user in storage and Redux
      const updatedUser = { ...auth.user, ...updates };
      authStorage.setUser(updatedUser);
      
      console.log('✅ AuthProvider: Profile updated successfully');
      
    } catch (error: any) {
      console.error('❌ AuthProvider: Profile update failed:', error);
      throw error;
    }
  }, [auth.user]);

  // ========================================
  // LOADING SCREEN LOGIC
  // ========================================

  // Show loading screen while permissions are initializing
  const shouldShowPermissionLoading = (
    showPermissionLoading && 
    auth.isAuthenticated && 
    auth.isInitialized && 
    workspaceInitialized && 
    !permissionsInitialized && 
    !permissionLoadingTimeout
  );

  if (shouldShowPermissionLoading) {
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
        bgcolor="background.default"
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
          Loading Permissions
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Setting up your workspace access...
        </Typography>
        
        {permissionLoadingTimeout && (
          <Alert severity="warning" sx={{ mt: 2, maxWidth: 400 }}>
            Taking longer than expected. The app will continue loading in the background.
          </Alert>
        )}
      </Box>
    );
  }

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: AuthContextType = {
    // State
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: workspace.currentWorkspace,
    permissions: auth.permissions || [],
    loading: auth.isLoading,
    isInitialized: auth.isInitialized,
    workspaceInitialized,
    permissionsInitialized,
    error: auth.error,
    
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

export default AuthProvider;