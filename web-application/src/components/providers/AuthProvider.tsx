// web-application/src/components/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../../store';
import { logout, validateToken } from '../../store/slices/authSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  workspace: any | null;
  permissions: string[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    if (token && !auth.isAuthenticated) {
      // Validate token
      dispatch(validateToken() as any);
    }
  }, [dispatch, auth.isAuthenticated]);

  useEffect(() => {
    // Redirect to login if not authenticated and not on public pages
    const publicPaths = ['/login', '/register', '/forgot-password'];
    const isPublicPath = publicPaths.some(path => router.pathname.startsWith(path));
    
    if (!auth.isAuthenticated && !auth.loading && !isPublicPath) {
      router.push('/login');
    }
  }, [auth.isAuthenticated, auth.loading, router]);

  const value: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: auth.workspace,
    permissions: auth.permissions || [],
    loading: auth.loading,
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