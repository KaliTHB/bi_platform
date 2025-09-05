import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCredentials, setLoading, logout } from '../store/slices/authSlice';
import { setCurrentWorkspace, clearWorkspace } from '../store/slices/workspaceSlice';

interface AuthContextType {
  // Add your auth methods here
  login: (email: string, password: string) => Promise<any>;
  signOut: () => void;
  switchWorkspace: (slug: string) => Promise<any>;
  getAvailableWorkspaces: () => Promise<any>;
  getDefaultWorkspace: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedWorkspace = localStorage.getItem('workspace');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch(setCredentials({ user, token: storedToken }));
        
        if (storedWorkspace) {
          const workspace = JSON.parse(storedWorkspace);
          dispatch(setCurrentWorkspace(workspace));
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('workspace');
      }
    }
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    dispatch(setLoading(true));
    
    try {
      // Mock login - replace with actual API call
      const response = {
        user: {
          id: '1',
          email,
          display_name: 'System Administrator',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        token: 'mock-jwt-token'
      };

      dispatch(setCredentials(response));
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return { success: true };
    } catch (error) {
      dispatch(setLoading(false));
      throw error;
    }
  };

  const signOut = () => {
    dispatch(logout());
    dispatch(clearWorkspace());
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
  };

  const switchWorkspace = async (slug: string) => {
    // Mock workspace switch - replace with actual API call
    const mockWorkspace = {
      id: '1',
      name: 'Default Workspace',
      slug: slug,
      display_name: 'THB Workspace',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dispatch(setCurrentWorkspace(mockWorkspace));
    localStorage.setItem('workspace', JSON.stringify(mockWorkspace));
    
    return { success: true };
  };

  const getAvailableWorkspaces = async () => {
    // Mock workspaces - replace with actual API call
    return [
      {
        id: '1',
        name: 'default',
        slug: 'default',
        display_name: 'THB Workspace',
        description: 'Default workspace',
        is_default: true,
      }
    ];
  };

  const getDefaultWorkspace = async () => {
    // Mock default workspace - replace with actual API call
    return {
      id: '1',
      name: 'default',
      slug: 'default',
      display_name: 'THB Workspace',
    };
  };

  const value = {
    // Auth state from Redux
    user,
    token,
    isAuthenticated,
    isLoading,
    workspace: currentWorkspace,
    // Auth methods
    login,
    signOut,
    switchWorkspace,
    getAvailableWorkspaces,
    getDefaultWorkspace,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};