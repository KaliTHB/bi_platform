// web-application/src/components/providers/AuthProvider.tsx - FIXED WITH PROPER WORKSPACE INIT
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { initializeAuth, validateToken } from '../../store/slices/authSlice';
import { 
  initializeWorkspace, 
  clearWorkspaces,
  fetchUserWorkspaces,
  selectCurrentWorkspace,
  selectWorkspaceInitialized 
} from '../../store/slices/workspaceSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  workspace: any | null;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  workspaceInitialized: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
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
  
  // Auth state
  const auth = useAppSelector((state) => state.auth);
  
  // Workspace state
  const workspace = useAppSelector(selectCurrentWorkspace);
  const workspaceInitialized = useAppSelector(selectWorkspaceInitialized);

  // STEP 1: Initialize auth state first
  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing auth state');
    dispatch(initializeAuth());
  }, [dispatch]);

  // STEP 2: Initialize workspace ONLY after auth is initialized and authenticated
  useEffect(() => {
    if (auth.isInitialized && auth.isAuthenticated) {
      console.log('🏢 AuthProvider: Auth is ready, initializing workspace');
      dispatch(initializeWorkspace());
    } else if (auth.isInitialized && !auth.isAuthenticated) {
      console.log('🧹 AuthProvider: Not authenticated, clearing workspace data');
      dispatch(clearWorkspaces());
    }
  }, [auth.isInitialized, auth.isAuthenticated, dispatch]);

  // STEP 3: Fetch workspaces from API if no workspace is loaded but user is authenticated
  useEffect(() => {
    const shouldFetchWorkspaces = 
      auth.isAuthenticated && 
      workspaceInitialized && 
      !workspace && 
      !auth.isLoading;

    if (shouldFetchWorkspaces) {
      console.log('🔄 AuthProvider: No workspace found, fetching from API');
      dispatch(fetchUserWorkspaces());
    }
  }, [auth.isAuthenticated, workspaceInitialized, workspace, auth.isLoading, dispatch]);

  // STEP 4: Validate token if needed
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const shouldValidateToken = 
      token && 
      auth.isInitialized && 
      !auth.isAuthenticated && 
      !auth.isLoading && 
      !auth.error;

    if (shouldValidateToken) {
      console.log('🔒 AuthProvider: Validating stored token');
      dispatch(validateToken());
    }
  }, [auth.isInitialized, auth.isAuthenticated, auth.isLoading, auth.error, dispatch]);

  // STEP 5: Handle authentication failures and redirects
  useEffect(() => {
    // Only redirect if we're fully initialized and definitely not authenticated
    if (auth.isInitialized && !auth.isAuthenticated && !auth.isLoading) {
      const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      const currentPath = router.asPath;
      
      // Don't redirect if already on a public route
      if (!publicRoutes.some(route => currentPath.startsWith(route))) {
        console.log('🚫 AuthProvider: Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [auth.isInitialized, auth.isAuthenticated, auth.isLoading, router]);

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

  // Sign out function
  const signOut = async (): Promise<void> => {
    console.log('👋 AuthProvider: Signing out');
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
    localStorage.removeItem('selected_workspace_id');
    
    // Clear Redux state
    dispatch(clearWorkspaces());
    // Note: logout action should be imported and dispatched from authSlice
    
    // Redirect to login
    router.push('/login');
  };

  // Refresh auth function
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 AuthProvider: Refreshing auth');
    if (auth.token) {
      dispatch(validateToken());
    }
  };

  // Load workspaces function
  const loadWorkspaces = async (): Promise<void> => {
    console.log('📁 AuthProvider: Loading workspaces');
    if (auth.isAuthenticated) {
      dispatch(fetchUserWorkspaces());
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: workspace,
    permissions: auth.permissions || [],
    loading: auth.isLoading,
    isInitialized: auth.isInitialized,
    workspaceInitialized: workspaceInitialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    signOut,
    refreshAuth,
    loadWorkspaces,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AuthProvider state:', {
      isAuthenticated: auth.isAuthenticated,
      authInitialized: auth.isInitialized,
      workspaceInitialized: workspaceInitialized,
      hasUser: !!auth.user,
      hasWorkspace: !!workspace,
      loading: auth.isLoading,
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