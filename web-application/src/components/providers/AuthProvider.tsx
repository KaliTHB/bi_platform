// web-application/src/components/providers/AuthProvider.tsx - UPDATED WITH WORKSPACE INIT
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { initializeAuth, logout, validateToken } from '../../store/slices/authSlice';
import { initializeWorkspace, clearWorkspaces } from '../../store/slices/workspaceSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  workspace: any | null;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace.currentWorkspace);

  // Initialize auth and workspace state on app startup
  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing auth and workspace state');
    dispatch(initializeAuth());
    dispatch(initializeWorkspace());
  }, [dispatch]);

  // Only validate token if we have one but haven't validated it yet AND auth is initialized
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Only validate if:
    // 1. We have a token
    // 2. We're not currently authenticated
    // 3. We're not currently loading
    // 4. We don't have an error
    // 5. Auth is initialized
    if (token && !auth.isAuthenticated && !auth.isLoading && !auth.error && auth.isInitialized) {
      console.log('🔍 AuthProvider: Found token but not authenticated, validating...');
      dispatch(validateToken());
    }
  }, [dispatch, auth.isAuthenticated, auth.isLoading, auth.error, auth.isInitialized]);

  // Handle authentication-based redirects - only after initialization
  useEffect(() => {
    // Don't do anything until auth is initialized
    if (!auth.isInitialized) {
      console.log('🔄 AuthProvider: Waiting for auth initialization...');
      return;
    }

    const publicPaths = [
      '/login', 
      '/register', 
      '/forgot-password', 
      '/reset-password',
      '/_error',
      '/404',
      '/500'
    ];
    
    const isPublicPath = publicPaths.some(path => 
      router.pathname.startsWith(path)
    );
    
    const isRootPath = router.pathname === '/';
    
    console.log('🛣️ AuthProvider: Route check', {
      pathname: router.pathname,
      isPublicPath,
      isRootPath,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      isInitialized: auth.isInitialized,
      hasToken: !!localStorage.getItem('token')
    });

    // Don't redirect during loading or on public paths
    if (auth.isLoading || isPublicPath) {
      return;
    }

    // Handle root path redirect
    if (isRootPath) {
      if (auth.isAuthenticated) {
        console.log('✅ AuthProvider: Authenticated user on root, redirecting to workspace');
        router.replace('/workspace/overview');
      } else {
        console.log('❌ AuthProvider: Unauthenticated user on root, redirecting to login');
        router.replace('/login');
      }
      return;
    }

    // Redirect unauthenticated users to login
    if (!auth.isAuthenticated && !isPublicPath) {
      console.log('🚪 AuthProvider: Redirecting unauthenticated user to login');
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.isInitialized, router]);

  const hasPermission = (permission: string): boolean => {
    if (!auth.permissions) {
      console.log('⚠️ AuthProvider: No permissions available');
      return false;
    }
    
    const hasAccess = auth.permissions.includes(permission);
    console.log(`🔐 AuthProvider: Permission check for "${permission}":`, hasAccess);
    return hasAccess;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!auth.permissions) {
      console.log('⚠️ AuthProvider: No permissions available for any check');
      return false;
    }
    
    const hasAccess = permissions.some(permission => auth.permissions.includes(permission));
    console.log(`🔐 AuthProvider: Any permission check for [${permissions.join(', ')}]:`, hasAccess);
    return hasAccess;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!auth.permissions) {
      console.log('⚠️ AuthProvider: No permissions available for all check');
      return false;
    }
    
    const hasAccess = permissions.every(permission => auth.permissions.includes(permission));
    console.log(`🔐 AuthProvider: All permissions check for [${permissions.join(', ')}]:`, hasAccess);
    return hasAccess;
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 AuthProvider: Signing out user');
      
      // Clear Redux state and localStorage
      dispatch(logout());
      dispatch(clearWorkspaces());
      
      // Redirect to login
      await router.replace('/login');
      
      console.log('✅ AuthProvider: Logout successful');
    } catch (error) {
      console.error('❌ AuthProvider: Logout error:', error);
      
      // Force redirect even if there's an error
      window.location.href = '/login';
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: Refreshing authentication');
      await dispatch(validateToken()).unwrap();
      console.log('✅ AuthProvider: Auth refresh successful');
    } catch (error) {
      console.error('❌ AuthProvider: Auth refresh failed:', error);
      // Don't automatically logout here, let the component handle it
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: workspace,
    permissions: auth.permissions,
    loading: auth.isLoading,
    isInitialized: auth.isInitialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    signOut,
    refreshAuth,
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

// Export both the hook and the provider for convenience
export default AuthProvider;