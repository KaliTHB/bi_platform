// web-application/src/components/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  workspace: any;
  permissions: string[];
  signOut: () => void;
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
    // Check if token is expired
    if (auth.token) {
      try {
        const payload = JSON.parse(atob(auth.token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          dispatch(logout());
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        dispatch(logout());
        router.push('/login');
      }
    }
  }, [auth.token, dispatch, router]);

  const signOut = async () => {
    try {
      if (auth.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logout());
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    workspace: auth.workspace,
    permissions: auth.permissions,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

