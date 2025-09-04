// hooks/useAuth.ts - Updated authentication hook
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_default: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  defaultWorkspace: Workspace | null;
}

export const useAuth = () => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    defaultWorkspace: null
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setAuthState(prev => ({
        ...prev,
        token,
        user: JSON.parse(user),
        isAuthenticated: true,
        isLoading: false
      }));
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Get user's default workspace
  const getDefaultWorkspace = useCallback(async (userId: string): Promise<Workspace | null> => {
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

  // Login function with automatic redirect
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

        // Get default workspace and redirect
        const defaultWorkspace = await getDefaultWorkspace(user.id);
        
        if (defaultWorkspace) {
          // Redirect to workspace overview
          router.push(`/workspace/${defaultWorkspace.slug}/overview`);
        } else {
          // No workspace access - redirect to workspace selector as fallback
          router.push('/workspace-selector');
        }

        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Network error occurred' };
    }
  }, [router, getDefaultWorkspace]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Reset auth state
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        defaultWorkspace: null
      });

      // Redirect to login
      router.push('/login');
    }
  }, [authState.token, router]);

  // Check if user has access to specific workspace
  const hasWorkspaceAccess = useCallback(async (workspaceSlug: string): Promise<boolean> => {
    if (!authState.isAuthenticated) return false;

    try {
      const response = await fetch(`/api/v1/workspace/${workspaceSlug}/access-check`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [authState.isAuthenticated, authState.token]);

  return {
    ...authState,
    login,
    logout,
    getDefaultWorkspace,
    hasWorkspaceAccess
  };
};

