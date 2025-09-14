// web-application/src/components/AuthProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCredentials, setLoading, logout } from '../store/slices/authSlice';
import { setCurrentWorkspace, clearWorkspace } from '../store/slices/workspaceSlice';
import {STORAGE_KEYS} from '@/constants/index';

interface AuthContextType {
  // Add your auth methods here
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  switchWorkspace: (slug: string) => Promise<any>;
  getAvailableWorkspaces: () => Promise<any>;
  getDefaultWorkspace: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to clean up old workspace keys (for migration)
const cleanupOldWorkspaceKeys = (): void => {
  if (typeof window === 'undefined') return;
  
  const oldKeys = ['workspace', 'auth_workspace', 'selected_workspace_id'];
  oldKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove old key ${key}:`, error);
    }
  });
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedWorkspace = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch(setCredentials({ user, token: storedToken }));
        
        if (storedWorkspace) {
          const workspace = JSON.parse(storedWorkspace);
          dispatch(setCurrentWorkspace(workspace));
        }

        // Clean up old workspace keys after successful migration
        
        
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
        
      }
    }
  }, [dispatch]);

  const login = async (email: string, password: string): Promise<any> => {
    try {
      dispatch(setLoading(true));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        const { user, token, workspace } = data.data;
        
        // Store with consolidated keys
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        
        if (workspace) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(workspace));
          dispatch(setCurrentWorkspace(workspace));
        }

        // Clean up old workspace keys
        

        dispatch(setCredentials({ user, token }));
        return data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logoutUser = () => {
    // Clear localStorage with consolidated keys
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
    
    // Clean up old workspace keys
    

    dispatch(logout());
    dispatch(clearWorkspace());
  };

  const switchWorkspace = async (slug: string): Promise<any> => {
    try {
      const response = await fetch(`/api/user/workspace/${slug}/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to switch workspace');
      }

      if (data.success) {
        const { workspace } = data;
        
        // Store with consolidated key
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(workspace));
        dispatch(setCurrentWorkspace(workspace));
        
        return data;
      } else {
        throw new Error(data.message || 'Failed to switch workspace');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to switch workspace');
    }
  };

  const getAvailableWorkspaces = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/user/workspaces', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch workspaces');
    }

    // 🔥 UPDATED: Match your API response format
    if (data.success) {
      console.log('✅ AuthProvider: Workspaces fetched', {
        count: data.count,
        workspaces: data.data?.length || 0
      });
      // Store with consolidated key
      localStorage.setItem(STORAGE_KEYS.AVAILABLE_WORKSPACES, JSON.stringify(data.data));
      return data.data || []; // ✅ Use data.data from your API
    }

    return [];
  } catch (error: any) {
    console.error('❌ AuthProvider: Failed to fetch workspaces:', error);
    throw new Error(error.message || 'Failed to fetch workspaces');
  }
};

  const getDefaultWorkspace = async (): Promise<any> => {
    try {
      const response = await fetch('/api/user/workspace/default', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get default workspace');
      }

      if (data.success && data.workspace) {
        // Store with consolidated key
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(data.workspace));
        dispatch(setCurrentWorkspace(data.workspace));
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get default workspace');
    }
  };

  const contextValue: AuthContextType = {
    login,
    logout: logoutUser,
    switchWorkspace,
    getAvailableWorkspaces,
    getDefaultWorkspace,
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