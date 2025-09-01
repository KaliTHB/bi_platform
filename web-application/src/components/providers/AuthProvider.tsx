// web-application/src/components/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout, validateToken } from '../../store/slices/authSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  workspace: any | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('auth_token');
    if (token && !auth.isAuthenticated && !auth.isLoading) {
      // Validate token - now properly typed with void parameter
      dispatch(validateToken());
    }
  }, [dispatch, auth.isAuthenticated, auth.isLoading]);

  useEffect(() => {
    // Redirect to login if not authenticated and not on public pages
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.some(path => router.pathname.startsWith(path));
    
    if (!auth.isAuthenticated && !auth.isLoading && !isPublicPath) {
      router.push('/login');
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  const hasPermission = (permission: string): boolean => {
    if (!auth.permissions) return false;
    return auth.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.some(permission => auth.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!auth.permissions) return false;
    return permissions.every(permission => auth.permissions.includes(permission));
  };

  const signOut = async () => {
    try {
      // Call logout API if token exists
      if (auth.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      dispatch(logout());
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: auth.workspace,
    permissions: auth.permissions || [],
    loading: auth.isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};