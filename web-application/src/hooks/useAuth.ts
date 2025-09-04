// web-application/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

// Interfaces based on your existing auth.types.ts
interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  roles?: string[];
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  
  // RLS-related fields for Row Level Security policies
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  
  // Generic profile data for extensibility
  profile_data?: Record<string, any>;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  user_count?: number;      // For WorkspaceSwitcher component
  dashboard_count?: number; // For WorkspaceSwitcher component
  dataset_count?: number;   // For statistics
  is_default?: boolean;     // If this is user's default workspace
  role?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  
  // Workspace configuration
  settings?: WorkspaceSettings;
  is_active?: boolean;
}

interface WorkspaceSettings {
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
  date_format?: string;
  number_format?: string;
  language?: string;
  currency?: string;
  max_query_timeout?: number;
  max_export_rows?: number;
  features?: {
    sql_editor?: boolean;
    dashboard_builder?: boolean;
    data_exports?: boolean;
    api_access?: boolean;
    webhooks?: boolean;
  };
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface SwitchWorkspaceResult {
  success: boolean;
  error?: string;
}

export const useAuth = () => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    workspace: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const workspace = localStorage.getItem('workspace');

        if (token && user) {
          setAuthState(prev => ({
            ...prev,
            token,
            user: JSON.parse(user),
            workspace: workspace ? JSON.parse(workspace) : null,
            isAuthenticated: true,
            isLoading: false
          }));
        } else {
          setAuthState(prev => ({ 
            ...prev, 
            isLoading: false 
          }));
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('workspace');
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false 
        }));
      }
    };

    initializeAuth();
  }, []);

  // Get user's default workspace
  const getDefaultWorkspace = useCallback(async (): Promise<Workspace | null> => {
    if (!authState.token) {
      return null;
    }

    try {
      // Try to get user's default workspace first
      const defaultResponse = await fetch('/api/v1/user/default-workspace', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (defaultResponse.ok) {
        const data = await defaultResponse.json();
        if (data.success && data.workspace) {
          return data.workspace;
        }
      }

      // Fallback: get first available workspace
      const workspacesResponse = await fetch('/api/v1/user/workspaces', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        if (workspacesData.success && workspacesData.workspaces && workspacesData.workspaces.length > 0) {
          return workspacesData.workspaces[0];
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching default workspace:', error);
      return null;
    }
  }, [authState.token]);

  // Get all available workspaces for the current user
  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    if (!authState.token) {
      return [];
    }

    try {
      const response = await fetch('/api/v1/user/workspaces', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.workspaces) {
          return data.workspaces;
        }
      }

      return [];
    } catch (error) {
      console.error('Error fetching available workspaces:', error);
      return [];
    }
  }, [authState.token]);

  // Login function - Updated to redirect to /workspace/overview
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Support both email and username login
      const loginPayload = {
        password: credentials.password,
        ...(credentials.email ? { email: credentials.email } : { username: credentials.username })
      };

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginPayload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, token, workspace: initialWorkspace } = data.data;

        // Store user and token immediately
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update auth state with user and token
        setAuthState(prev => ({
          ...prev,
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        }));

        // Handle workspace setup
        let workspaceToUse = initialWorkspace;
        
        if (!workspaceToUse) {
          // Try to get default workspace
          try {
            workspaceToUse = await getDefaultWorkspace();
          } catch (error) {
            console.warn('Failed to get default workspace:', error);
          }
        }

        if (workspaceToUse) {
          // Store workspace and update state
          localStorage.setItem('workspace', JSON.stringify(workspaceToUse));
          setAuthState(prev => ({
            ...prev,
            workspace: workspaceToUse
          }));
        }

        // Always redirect to the new overview page
        router.push('/workspace/overview');

        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
        return { 
          success: false, 
          error: data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error occurred' 
      };
    }
  }, [router, getDefaultWorkspace]);

  // Switch workspace function - Updated to redirect to /workspace/overview
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<SwitchWorkspaceResult> => {
    if (!authState.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/v1/auth/switch-workspace', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { workspace, token: newToken } = data.data;

        // Update localStorage with new workspace and token (if provided)
        localStorage.setItem('workspace', JSON.stringify(workspace));
        if (newToken) {
          localStorage.setItem('token', newToken);
        }

        // Update auth state
        setAuthState(prev => ({
          ...prev,
          workspace,
          token: newToken || prev.token
        }));

        // Redirect to overview page (not workspace-specific URL)
        router.push('/workspace/overview');
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.message || 'Failed to switch workspace' 
        };
      }
    } catch (error) {
      console.error('Switch workspace error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error occurred' 
      };
    }
  }, [authState.token, router]);

  // Sign out function
  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Call logout API if we have a token
      if (authState.token) {
        try {
          await fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authState.token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with local cleanup even if API call fails
        }
      }
    } finally {
      // Always clear localStorage and reset state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');

      // Reset auth state
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        workspace: null
      });

      // Redirect to login
      router.push('/login');
    }
  }, [authState.token, router]);

  // Refresh current user data
  const refreshUser = useCallback(async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const updatedUser = data.user;
          
          // Update localStorage and state
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setAuthState(prev => ({
            ...prev,
            user: updatedUser
          }));
          
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  }, [authState.token]);

  // Check if user has access to a specific workspace
  const hasWorkspaceAccess = useCallback((workspaceSlug?: string): boolean => {
    if (!workspaceSlug || !authState.workspace) {
      return false;
    }
    return authState.workspace.slug === workspaceSlug;
  }, [authState.workspace]);

  // Validate current token
  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    try {
      const response = await fetch('/api/v1/auth/validate', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, [authState.token]);

  // Check if user is authenticated and token is valid
  const isTokenValid = useCallback((): boolean => {
    return Boolean(authState.token && authState.isAuthenticated);
  }, [authState.token, authState.isAuthenticated]);

  // Get current user's role in the current workspace
  const getCurrentWorkspaceRole = useCallback((): string | null => {
    return authState.workspace?.role || null;
  }, [authState.workspace]);

  // Update workspace data without switching
  const updateWorkspaceData = useCallback((updates: Partial<Workspace>): void => {
    if (authState.workspace) {
      const updatedWorkspace = { ...authState.workspace, ...updates };
      
      localStorage.setItem('workspace', JSON.stringify(updatedWorkspace));
      setAuthState(prev => ({
        ...prev,
        workspace: updatedWorkspace
      }));
    }
  }, [authState.workspace]);

  return {
    // State
    user: authState.user,
    workspace: authState.workspace,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    
    // Auth actions
    login,
    signOut,
    switchWorkspace,
    refreshUser,
    
    // Workspace helpers
    getDefaultWorkspace,
    getAvailableWorkspaces,
    hasWorkspaceAccess,
    getCurrentWorkspaceRole,
    updateWorkspaceData,
    
    // Token utilities
    validateToken,
    isTokenValid
  };
};