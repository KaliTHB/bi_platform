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
  loadPermissions: () => Promise<void>;      // ✅ ADD
  fetchPermissions: (userId?: string, workspaceId?: string) => Promise<string[]>; // ✅ ADD
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
        workspace_id: workspaceId  // Send workspace_id as expected
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to switch workspace');
    }

    // ✅ UPDATED: Handle comprehensive response like login
    if (result.data && result.data.user && result.data.token && result.data.workspace) {
      const { user, token: newToken, workspace, permissions } = result.data;
      
      console.log('✅ AuthProvider: Switch workspace successful!');
      console.log('🔑 New token received:', newToken ? 'Present' : 'Missing');
      console.log('👤 User data:', user);
      console.log('🏢 Workspace:', workspace);
      console.log('🔐 Permissions:', permissions);
      
      // ✅ STORE ALL AUTHENTICATION DATA (same as login)
      authStorage.setToken(newToken);
      console.log('💾 New token stored in localStorage');
      
      authStorage.setUser(user);
      console.log('💾 User data stored in localStorage');
      
      workspaceStorage.setCurrentWorkspace(workspace);
      console.log('💾 Workspace data stored in localStorage');

      if (permissions) {
        authStorage.setPermissions(permissions);
        console.log('💾 Permissions stored in localStorage');
      }

      // ✅ UPDATE REDUX STORE (same as login)
      dispatch(setCredentials({ user, token: newToken, permissions }));
      console.log('🔄 Redux credentials updated');
      
      dispatch(setCurrentWorkspace(workspace));
      console.log('🔄 Redux workspace updated');
      
      console.log('✅ AuthProvider: All data stored successfully for workspace switch');
      
      return {
        success: true,
        workspace,
        user,
        permissions,
        message: result.message
      };
      
    } else {
      throw new Error('Invalid workspace switch response structure');
    }
      
  } catch (error: any) {
    console.error('❌ AuthProvider: Error switching workspace:', error);
    throw error;
  }
};

  // Login function
  const login= async (email: string, password: string): Promise<any> => {
  try {
    console.log('🔑 AuthProvider: Logging in...');
    
    // Call your existing login logic
    const result = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.success) {
      // Store auth data
      authStorage.setUser(data.user);
      authStorage.setToken(data.token);

      // Set Redux state
      dispatch(setCredentials({
        user: data.user,
        token: data.token,
        permissions: [] // Will be loaded below
      }));

      // Store workspace if provided
      if (data.workspace) {
        workspaceStorage.setCurrentWorkspace(data.workspace);
        dispatch(setCurrentWorkspace(data.workspace));
        
        // Load permissions for the workspace
        await fetchPermissions(data.user.id, data.workspace.id);
      }

      setWorkspaceInitialized(true);
    }

    return data;
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


  // ✅ ADD: New fetchPermissions function with caching
  const fetchPermissions = async (userId?: string, workspaceId?: string): Promise<string[]> => {
    try {
      const currentUserId = userId || auth.user?.id;
      const currentWorkspaceId = workspaceId || workspace.currentWorkspace?.id;

      if (!currentUserId || !currentWorkspaceId || !auth.isAuthenticated) {
        console.log('⏭️ AuthProvider: Skipping permission fetch (no user/workspace/auth)');
        return [];
      }

      console.log('🔐 AuthProvider: Fetching permissions for:', {
        userId: currentUserId,
        workspaceId: currentWorkspaceId,
      });

      // ✅ STEP 1: Check cache first (multiple cache sources)
      const cacheKey = `permissions_${currentUserId}_${currentWorkspaceId}`;
      
      // Check localStorage cache with expiry
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData);
          // Check if cache is still valid (not expired)
          if (parsedCache.expiry && Date.now() < parsedCache.expiry) {
            console.log('📦 AuthProvider: Using fresh cached permissions:', parsedCache.value?.length);
            return parsedCache.value || [];
          } else {
            console.log('📦 AuthProvider: Cache expired, removing');
            localStorage.removeItem(cacheKey);
          }
        } catch (parseError) {
          console.warn('⚠️ AuthProvider: Invalid cache data, removing');
          localStorage.removeItem(cacheKey);
        }
      }

      // ✅ STEP 2: Try authStorage fallback
      const authCachedPermissions = authStorage.getPermissions(currentWorkspaceId);
      if (authCachedPermissions && authCachedPermissions.length > 0) {
        console.log('📦 AuthProvider: Using authStorage cached permissions:', authCachedPermissions.length);
        return authCachedPermissions;
      }

      // ✅ STEP 3: No cache, fetch from API
      console.log('🔍 AuthProvider: No valid cache, fetching from API');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/user/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch permissions');
      }

      // ✅ STEP 4: Extract and cache permissions
      const userPermissions = result.data?.permissions || [];
      
      if (userPermissions.length > 0) {
        const ttl = 30 * 60 * 1000; // 30 minutes

        // Cache in localStorage with expiry
        const cacheData = {
          value: userPermissions,
          timestamp: Date.now(),
          expiry: Date.now() + ttl
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        // Cache in authStorage for compatibility
        authStorage.setPermissions(userPermissions, currentWorkspaceId);

        console.log('✅ AuthProvider: Permissions cached successfully:', {
          count: userPermissions.length,
          cacheKey: cacheKey,
          ttlMinutes: 30
        });
      }

      // ✅ STEP 5: Update Redux state
      dispatch(setCredentials({ 
        user: auth.user, 
        token: auth.token,
        permissions: userPermissions 
      }));

      console.log('✅ AuthProvider: Permissions loaded from API:', userPermissions.length);
      return userPermissions;

    } catch (error: any) {
      console.error('❌ AuthProvider: Error fetching permissions:', error);

      // ✅ STEP 6: Enhanced fallback to any cached data (even expired)
      const currentUserId = userId || auth.user?.id;
      const currentWorkspaceId = workspaceId || workspace.currentWorkspace?.id;
      
      if (currentUserId && currentWorkspaceId) {
        const cacheKey = `permissions_${currentUserId}_${currentWorkspaceId}`;
        
        // Try expired cache as last resort
        const expiredCache = localStorage.getItem(cacheKey);
        if (expiredCache) {
          try {
            const parsedCache = JSON.parse(expiredCache);
            if (parsedCache.value && Array.isArray(parsedCache.value)) {
              console.log('📦 AuthProvider: Using expired cache as fallback:', parsedCache.value.length);
              return parsedCache.value;
            }
          } catch (parseError) {
            // Ignore parse errors
          }
        }

        // Try authStorage fallback
        const fallbackPermissions = authStorage.getPermissions(currentWorkspaceId);
        if (fallbackPermissions && fallbackPermissions.length > 0) {
          console.log('📦 AuthProvider: Using authStorage fallback:', fallbackPermissions.length);
          return fallbackPermissions;
        }
      }

      return [];
    }
  };

  // ✅ ADD: Load permissions when workspace changes
  const loadPermissions = async (): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Loading permissions...');
      const permissions = await fetchPermissions();
      
      // Update Redux state with fresh permissions
      dispatch(setCredentials({ 
        user: auth.user, 
        token: auth.token,
        permissions 
      }));

      console.log('✅ AuthProvider: Permissions loaded and cached');
    } catch (error) {
      console.error('❌ AuthProvider: Error loading permissions:', error);
    }
  };

  // ✅ ENHANCE: Your existing switchWorkspace function
  const switchWorkspaceEnhanced = async (workspaceSlug: string): Promise<any> => {
    try {
      console.log('🔄 AuthProvider: Switching workspace:', workspaceSlug);
      
      // Call your existing switchWorkspace function
      const result = await switchWorkspaceAsync(workspaceSlug);
      
      // Clear old permission cache
      if (auth.user?.id && workspace.currentWorkspace?.id) {
        const oldCacheKey = `permissions_${auth.user.id}_${workspace.currentWorkspace.id}`;
        localStorage.removeItem(oldCacheKey);
        authStorage.clearPermissions(workspace.currentWorkspace.id);
      }
      
      // Load permissions for the new workspace
      if (result.success && result.workspace) {
        console.log('✅ AuthProvider: Workspace switched, loading permissions...');
        await fetchPermissions(auth.user?.id, result.workspace.id);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AuthProvider: Error switching workspace:', error);
      throw error;
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

  // ✅ ADD THIS NEW useEffect RIGHT HERE ✅
useEffect(() => {
  // Load permissions when user and workspace are available
  if (auth.isAuthenticated && auth.user?.id && workspace.currentWorkspace?.id) {
    console.log('🔄 AuthProvider: Workspace changed, loading permissions...');
    loadPermissions();
  }
}, [auth.user?.id, workspace.currentWorkspace?.id, auth.isAuthenticated]);


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

    // ✅ ADD: New permission methods
    loadPermissions, // Expose loadPermissions method
    fetchPermissions, // Expose fetchPermissions method
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