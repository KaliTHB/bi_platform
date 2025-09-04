// web-application/src/hooks/useAuth.ts - Complete Version with Error Handling
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

// Interfaces
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
  
  // RLS-related fields
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
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

interface WorkspaceResult {
  workspace: Workspace | null;
  hasEndpoint: boolean;
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

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  };

  // Safe API call wrapper with error handling
  const safeApiCall = async <T>(
    url: string, 
    options: RequestInit = {},
    errorContext: string
  ): Promise<{ data: T | null; error: string | null; status?: number }> => {
    try {
      const response = await fetch(url, {
        timeout: 10000, // 10 second timeout
        ...options,
      });

      let data: any = null;
      const responseText = await response.text();
      
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.warn('Failed to parse JSON response:', responseText);
          data = { message: responseText };
        }
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`API Error in ${errorContext}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          url,
          data
        });

        return {
          data: null,
          error: errorMessage,
          status: response.status
        };
      }

      return { data, error: null, status: response.status };

    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' || error.message?.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')
        ? 'Unable to connect to server. Please check your connection.'
        : `Network error: ${error.message}`;

      console.error(`Network Error in ${errorContext}:`, {
        error: error.message,
        url,
        errorType: error.name
      });

      return {
        data: null,
        error: errorMessage
      };
    }
  };

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const workspace = localStorage.getItem('workspace');

        console.log('Initializing auth state:', { 
          hasToken: !!token, 
          hasUser: !!user, 
          hasWorkspace: !!workspace 
        });

        if (token && user) {
          try {
            const parsedUser = JSON.parse(user);
            const parsedWorkspace = workspace ? JSON.parse(workspace) : null;

            setAuthState(prev => ({
              ...prev,
              token,
              user: parsedUser,
              workspace: parsedWorkspace,
              isAuthenticated: true,
              isLoading: false
            }));
          } catch (parseError) {
            console.error('Error parsing stored auth data:', parseError);
            // Clear corrupted data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('workspace');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  // Get default workspace with comprehensive error handling
  const getDefaultWorkspace = useCallback(async (): Promise<WorkspaceResult> => {
    if (!authState.token) {
      return { 
        workspace: null, 
        hasEndpoint: false, 
        error: 'No authentication token available' 
      };
    }

    console.log('🔍 Checking for default workspace endpoint...');
    
    const apiUrl = getApiBaseUrl();
    const { data, error, status } = await safeApiCall<any>(
      `${apiUrl}/api/user/default-workspace`,
      {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'getDefaultWorkspace'
    );

    if (error) {
      if (status === 404) {
        console.log('⚠️ Default workspace endpoint not implemented yet (404)');
        return { 
          workspace: null, 
          hasEndpoint: false, 
          error: 'Default workspace endpoint not implemented yet' 
        };
      } else if (status === 401) {
        console.log('⚠️ Authentication failed for default workspace');
        return { 
          workspace: null, 
          hasEndpoint: true, 
          error: 'Authentication failed. Please login again.' 
        };
      } else if (status === 500) {
        console.log('⚠️ Server error getting default workspace');
        return { 
          workspace: null, 
          hasEndpoint: true, 
          error: 'Server error. Please try again later or contact support.' 
        };
      } else {
        console.log('⚠️ Unexpected error getting default workspace:', error);
        return { 
          workspace: null, 
          hasEndpoint: false, 
          error: error 
        };
      }
    }

    if (data?.success && data.workspace) {
      console.log('✅ Default workspace endpoint found:', data.workspace.name);
      
      // Store the workspace
      localStorage.setItem('workspace', JSON.stringify(data.workspace));
      setAuthState(prev => ({
        ...prev,
        workspace: data.workspace
      }));
      
      return { 
        workspace: data.workspace, 
        hasEndpoint: true 
      };
    } else {
      console.log('⚠️ Default workspace endpoint available but no workspace assigned');
      return { 
        workspace: null, 
        hasEndpoint: true, 
        error: data?.message || 'No default workspace assigned' 
      };
    }
  }, [authState.token]);

  // Get available workspaces with error handling
  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    if (!authState.token) {
      console.log('No token available for fetching workspaces');
      return [];
    }

    const apiUrl = getApiBaseUrl();
    
    // Try different possible endpoints for workspaces
    const possibleEndpoints = [
      '/api/user/workspaces',
      '/api/workspaces', 
      '/api/workspace/list'
    ];

    for (const endpoint of possibleEndpoints) {
      console.log(`Trying workspace endpoint: ${endpoint}`);
      
      const { data, error } = await safeApiCall<any>(
        `${apiUrl}${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${authState.token}`,
            'Content-Type': 'application/json'
          }
        },
        `getAvailableWorkspaces-${endpoint}`
      );

      if (!error && data?.success && (data.workspaces || data.data)) {
        console.log(`✅ Successfully fetched workspaces from ${endpoint}`);
        return data.workspaces || data.data || [];
      } else if (error) {
        console.log(`❌ Endpoint ${endpoint} failed: ${error}`);
      }
    }

    console.log('No workspace endpoints available or all failed');
    return [];
  }, [authState.token]);

  // Login function with comprehensive error handling
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    console.log('🔑 Starting login process for:', credentials.email || credentials.username);
    
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const apiUrl = getApiBaseUrl();
      const loginEndpoint = `${apiUrl}/api/auth/login`;
      
      console.log('📡 Login endpoint:', loginEndpoint);

      const loginPayload = {
        password: credentials.password,
        ...(credentials.email ? { email: credentials.email } : { username: credentials.username })
      };

      const { data, error } = await safeApiCall<any>(
        loginEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload)
        },
        'login'
      );

      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: error.includes('401') || error.includes('Unauthorized') 
            ? 'Invalid email or password. Please check your credentials and try again.'
            : error.includes('timeout') || error.includes('connection')
            ? 'Connection timeout. Please check your internet connection and try again.'
            : error.includes('500') || error.includes('Internal Server Error')
            ? 'Server error. Please try again later or contact support.'
            : error
        };
      }

      if (!data?.success || !data.data?.user || !data.data?.token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: data?.message || 'Login failed. Invalid response from server.' 
        };
      }

      const { user, token, workspace: initialWorkspace } = data.data;

      console.log('✅ Login successful:', {
        userEmail: user.email,
        hasToken: !!token,
        hasWorkspace: !!initialWorkspace
      });

      // Store user and token immediately
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update auth state
      setAuthState(prev => ({
        ...prev,
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        workspace: initialWorkspace || null
      }));

      // Store workspace if provided by login response
      if (initialWorkspace) {
        localStorage.setItem('workspace', JSON.stringify(initialWorkspace));
        console.log('📁 Workspace from login stored:', initialWorkspace.name);
      }

      // Redirect with multiple fallbacks
      console.log('🚀 Redirecting to workspace overview...');
      
      const doRedirect = () => {
        router.push('/workspace/overview').catch((routerError) => {
          console.warn('Router redirect failed:', routerError);
          console.log('Using window.location fallback...');
          window.location.href = '/workspace/overview';
        });
      };

      // Immediate redirect attempt
      setTimeout(doRedirect, 100);
      
      // Backup redirect attempt
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          console.log('🔄 Backup redirect attempt...');
          doRedirect();
        }
      }, 1000);

      return { success: true };

    } catch (error) {
      console.error('❌ Critical login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      return { 
        success: false, 
        error: 'An unexpected error occurred during login. Please try again.'
      };
    }
  }, [router]);

  // Switch workspace function with error handling
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<SwitchWorkspaceResult> => {
    if (!authState.token) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🔄 Switching to workspace:', workspaceSlug);

    const apiUrl = getApiBaseUrl();
    const { data, error } = await safeApiCall<any>(
      `${apiUrl}/api/auth/switch-workspace`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug })
      },
      'switchWorkspace'
    );

    if (!error && data?.success) {
      const { workspace, token: newToken } = data.data;

      console.log('✅ Workspace switch successful:', workspace.name);

      localStorage.setItem('workspace', JSON.stringify(workspace));
      if (newToken) {
        localStorage.setItem('token', newToken);
      }

      setAuthState(prev => ({
        ...prev,
        workspace,
        token: newToken || prev.token
      }));

      // Redirect after successful switch
      setTimeout(() => {
        router.push('/workspace/overview').catch((routerError) => {
          console.warn('Switch redirect failed:', routerError);
          window.location.href = '/workspace/overview';
        });
      }, 100);
      
      return { success: true };
    } else {
      console.warn('⚠️ Workspace switching not available or failed:', error);
      // Still redirect to overview even if switch fails
      setTimeout(() => {
        router.push('/workspace/overview').catch(() => {
          window.location.href = '/workspace/overview';
        });
      }, 100);
      
      return { 
        success: false, 
        error: error || 'Workspace switching not available'
      };
    }
  }, [authState.token, router]);

  // Sign out function with cleanup
  const signOut = useCallback(async (): Promise<void> => {
    console.log('🔓 Signing out user');
    
    try {
      if (authState.token) {
        const apiUrl = getApiBaseUrl();
        // Try to call logout API but don't wait for it
        safeApiCall(
          `${apiUrl}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authState.token}`,
              'Content-Type': 'application/json'
            }
          },
          'signOut'
        ).catch((error) => {
          console.warn('Logout API call failed:', error);
        });
      }
    } finally {
      // Always clear localStorage and reset state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        workspace: null
      });

      router.push('/login');
    }
  }, [authState.token, router]);

  // Refresh user data with error handling
  const refreshUser = useCallback(async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    const apiUrl = getApiBaseUrl();
    const { data, error } = await safeApiCall<any>(
      `${apiUrl}/api/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'refreshUser'
    );

    if (!error && data?.success && data.data) {
      const updatedUser = data.data;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
      
      return true;
    }

    return false;
  }, [authState.token]);

  // Validate current token
  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    const apiUrl = getApiBaseUrl();
    const { error } = await safeApiCall<any>(
      `${apiUrl}/api/auth/validate`,
      {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'validateToken'
    );

    return !error;
  }, [authState.token]);

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
    hasWorkspaceAccess: (workspaceSlug?: string): boolean => {
      if (!workspaceSlug || !authState.workspace) {
        return false;
      }
      return authState.workspace.slug === workspaceSlug;
    },
    getCurrentWorkspaceRole: (): string | null => {
      return authState.workspace?.role || null;
    },
    updateWorkspaceData: (updates: Partial<Workspace>): void => {
      if (authState.workspace) {
        const updatedWorkspace = { ...authState.workspace, ...updates };
        localStorage.setItem('workspace', JSON.stringify(updatedWorkspace));
        setAuthState(prev => ({
          ...prev,
          workspace: updatedWorkspace
        }));
      }
    },
    
    // Token utilities
    validateToken,
    isTokenValid: (): boolean => {
      return Boolean(authState.token && authState.isAuthenticated);
    }
  };
};