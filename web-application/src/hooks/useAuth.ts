// web-application/src/hooks/useAuth.ts - Updated with new login flow
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  profile_data?: Record<string, any>;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_default?: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  workspace: Workspace | null;
}

export const useAuth = () => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    workspace: null
  });

  // Initialize auth state from localStorage
  useEffect(() => {
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
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Get user's default workspace
  const getDefaultWorkspace = useCallback(async (): Promise<Workspace | null> => {
    try {
      const response = await fetch('/api/v1/user/default-workspace', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.workspace;
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
        return workspacesData.workspaces[0] || null;
      }

      return null;
    } catch (error) {
      console.error('Error fetching default workspace:', error);
      return null;
    }
  }, [authState.token]);

  // Login function with NEW redirect logic
  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, token } = data.data;

        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update auth state
        setAuthState(prev => ({
          ...prev,
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        }));

        // Get default workspace
        const defaultWorkspace = await getDefaultWorkspace();
        
        if (defaultWorkspace) {
          // Store workspace and redirect to workspace overview
          localStorage.setItem('workspace', JSON.stringify(defaultWorkspace));
          setAuthState(prev => ({
            ...prev,
            workspace: defaultWorkspace
          }));
          router.push(`/workspace/${defaultWorkspace.slug}/overview`);
        } else {
          // No workspace found - still redirect to overview with a placeholder slug
          // The layout will show "no workspace found" message
          router.push('/workspace/default/overview');
        }

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
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
      return { 
        success: false, 
        error: 'Network error' 
      };
    }
  }, [getDefaultWorkspace, router]);

  // Switch workspace function
  const switchWorkspace = useCallback(async (workspaceSlug: string) => {
    try {
      const response = await fetch(`/api/v1/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug })
      });

      if (response.ok) {
        const data = await response.json();
        const { workspace, token } = data.data;

        // Update localStorage
        localStorage.setItem('workspace', JSON.stringify(workspace));
        localStorage.setItem('token', token);

        // Update auth state
        setAuthState(prev => ({
          ...prev,
          workspace,
          token
        }));

        // Redirect to new workspace overview
        router.push(`/workspace/${workspace.slug}/overview`);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to switch workspace' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, [authState.token, router]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      // Call logout API if needed
      if (authState.token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear localStorage
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

  // Check if user has workspace access (helper function)
  const hasWorkspaceAccess = useCallback((workspaceSlug?: string): boolean => {
    if (!workspaceSlug || !authState.workspace) {
      return false;
    }
    return authState.workspace.slug === workspaceSlug;
  }, [authState.workspace]);

  return {
    user: authState.user,
    workspace: authState.workspace,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    signOut,
    switchWorkspace,
    getDefaultWorkspace,
    hasWorkspaceAccess
  };
};