// web-application/src/hooks/useAuth.ts - Enhanced version supporting email/username
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import type { NextRouter } from 'next/router';

// Types
export interface User {
  user_id: number;
  email: string;
  username: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  workspace_id: number;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  workspace: Workspace | null;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface SwitchWorkspaceResult {
  success: boolean;
  error?: string;
}

// Enhanced login credentials interface
export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

export interface AuthContextType extends AuthState {
  // Support both old and new login signatures for backward compatibility
  login: {
    (emailOrUsername: string, password: string, workspaceSlug?: string): Promise<LoginResult>;
    (credentials: LoginCredentials): Promise<LoginResult>;
  };
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<SwitchWorkspaceResult>;
  refreshUser: () => Promise<boolean>;
  getDefaultWorkspace: () => Promise<Workspace | null>;
  getAvailableWorkspaces: () => Promise<Workspace[]>;
}

interface ApiResponse {
  data: any;
  error: string | null;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enhanced redirect functionality
class RedirectManager {
  private static redirectAttempts: number = 0;
  private static maxAttempts: number = 5;
  private static redirectKey: string = 'auth_redirect_attempts';

  static async performRedirect(router: NextRouter, targetUrl: string = '/workspace/overview'): Promise<boolean> {
    console.log('🚀 Starting enhanced redirect process...');
    
    // Get current attempts from localStorage
    const storedAttempts: string | null = localStorage.getItem(this.redirectKey);
    this.redirectAttempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
    
    if (this.redirectAttempts >= this.maxAttempts) {
      console.warn('⚠️ Max redirect attempts reached, clearing cache and forcing reload');
      localStorage.removeItem(this.redirectKey);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return false;
    }

    // Increment attempt counter
    this.redirectAttempts = this.redirectAttempts + 1;
    localStorage.setItem(this.redirectKey, this.redirectAttempts.toString());

    console.log(`🔄 Redirect attempt ${this.redirectAttempts}/${this.maxAttempts} to ${targetUrl}`);

    // Debug current state
    this.debugRedirectState(router);

    // Try different redirect strategies based on attempt number
    const success: boolean = await this.executeRedirectStrategy(router, targetUrl, this.redirectAttempts);
    
    if (success) {
      // Clear attempts on successful redirect
      setTimeout(() => {
        localStorage.removeItem(this.redirectKey);
      }, 1000);
      return true;
    }

    // Schedule next attempt if needed
    if (this.redirectAttempts < this.maxAttempts) {
      const delay: number = Math.min(1000 * this.redirectAttempts, 5000); // Exponential backoff, max 5s
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          console.log(`🔄 Scheduling next redirect attempt in ${delay}ms...`);
          this.performRedirect(router, targetUrl);
        }
      }, delay);
    }

    return false;
  }

  private static async executeRedirectStrategy(router: NextRouter, targetUrl: string, attempt: number): Promise<boolean> {
    try {
      switch (attempt) {
        case 1:
          // Standard router push
          console.log('📍 Strategy 1: Standard router.push');
          await router.push(targetUrl);
          return true;

        case 2:
          // Router replace
          console.log('📍 Strategy 2: Router.replace');
          await router.replace(targetUrl);
          return true;

        case 3:
          // Window location href
          console.log('📍 Strategy 3: Window.location.href');
          if (typeof window !== 'undefined') {
            window.location.href = targetUrl;
          }
          return true;

        case 4:
          // Window location replace
          console.log('📍 Strategy 4: Window.location.replace');
          if (typeof window !== 'undefined') {
            window.location.replace(targetUrl);
          }
          return true;

        case 5:
          // Force reload and let middleware handle redirect
          console.log('📍 Strategy 5: Force reload for middleware redirect');
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ Redirect strategy ${attempt} failed:`, error);
      return false;
    }
  }

  private static debugRedirectState(router: NextRouter): void {
    if (typeof window !== 'undefined') {
      console.log('🔍 Redirect Debug Info:', {
        currentPathname: window.location.pathname,
        routerReady: router.isReady,
        documentState: document.readyState,
        windowLoaded: document.readyState === 'complete',
        timestamp: new Date().toISOString()
      });
    }
  }

  static clearRedirectAttempts(): void {
    localStorage.removeItem(this.redirectKey);
    this.redirectAttempts = 0;
  }
}

// Utility functions
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(':3000', ':3001');
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
};

// Helper function to detect email format
const isEmailFormat = (input: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
};

const safeApiCall = async (
  url: string, 
  options: RequestInit, 
  operation: string
): Promise<ApiResponse> => {
  try {
    console.log(`🌐 API Call [${operation}]:`, { url, method: options.method });
    
    const response: Response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseText: string = await response.text();
    console.log(`📥 API Response [${operation}]:`, {
      status: response.status,
      statusText: response.statusText,
      hasContent: responseText.length > 0,
    });

    if (!response.ok) {
      let errorMessage: string = `HTTP ${response.status}: ${response.statusText}`;
      
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
      }

      return { data: null, error: errorMessage };
    }

    if (!responseText) {
      return { data: null, error: 'Empty response from server' };
    }

    try {
      const data = JSON.parse(responseText);
      return { data, error: null };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { data: null, error: 'Invalid JSON response from server' };
    }

  } catch (error) {
    console.error(`❌ API Error [${operation}]:`, error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { data: null, error: 'Network error. Please check your connection and try again.' };
    }
    
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
};

// Auth Hook Implementation
function useAuthHook(): AuthContextType {
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
    const initializeAuth = async (): Promise<void> => {
      try {
        console.log('🔐 Initializing auth state...');
        
        if (typeof window === 'undefined') {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        const storedToken: string | null = localStorage.getItem('token');
        const storedUser: string | null = localStorage.getItem('user');
        const storedWorkspace: string | null = localStorage.getItem('workspace');

        if (storedToken && storedUser) {
          try {
            const user: User = JSON.parse(storedUser);
            const workspace: Workspace | null = storedWorkspace ? JSON.parse(storedWorkspace) : null;

            console.log('✅ Found stored auth data:', {
              hasToken: Boolean(storedToken),
              userEmail: user?.email,
              workspaceName: workspace?.name
            });

            setAuthState({
              user,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
              workspace
            });

            // Clear any old redirect attempts since we found valid auth
            RedirectManager.clearRedirectAttempts();
          } catch (parseError) {
            console.error('Error parsing stored auth data:', parseError);
            localStorage.clear();
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          console.log('📭 No stored auth data found');
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  // Enhanced login function with flexible signature support
  const loginFunction = useCallback(async (
    emailOrUsernameOrCredentials: string | LoginCredentials,
    password?: string,
    workspaceSlug?: string
  ): Promise<LoginResult> => {
    
    setAuthState(prev => ({ ...prev, isLoading: true }));

    let loginData: Record<string, string>;

    // Handle different function signatures
    if (typeof emailOrUsernameOrCredentials === 'string') {
      // Called with individual parameters: login(emailOrUsername, password, workspaceSlug?)
      if (!password) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Password is required' };
      }

      console.log('🔑 Login called with individual parameters');
      
      const emailOrUsername = emailOrUsernameOrCredentials.trim();
      
      if (isEmailFormat(emailOrUsername)) {
        loginData = { 
          email: emailOrUsername,
          password: password
        };
        console.log('📧 Detected email format:', emailOrUsername);
      } else {
        loginData = { 
          username: emailOrUsername,
          password: password
        };
        console.log('👤 Detected username format:', emailOrUsername);
      }
      
      if (workspaceSlug) {
        loginData.workspace_slug = workspaceSlug;
      }
    } else {
      // Called with credentials object: login({ email/username, password, workspace_slug? })
      console.log('🔑 Login called with credentials object');
      
      const credentials = emailOrUsernameOrCredentials;
      
      if (!credentials.password) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Password is required' };
      }

      if (!credentials.email && !credentials.username) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Email or username is required' };
      }

      loginData = {
        password: credentials.password
      };

      if (credentials.email) {
        loginData.email = credentials.email;
        console.log('📧 Using email from credentials:', credentials.email);
      } else if (credentials.username) {
        loginData.username = credentials.username;
        console.log('👤 Using username from credentials:', credentials.username);
      }

      if (credentials.workspace_slug) {
        loginData.workspace_slug = credentials.workspace_slug;
      }
    }

    console.log('🔑 Starting login process with:', { 
      hasEmail: !!loginData.email,
      hasUsername: !!loginData.username,
      hasWorkspace: !!loginData.workspace_slug 
    });

    const apiUrl: string = getApiBaseUrl();

    try {
      const apiResult = await safeApiCall(
        `${apiUrl}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        },
        'login'
      );

      const { data, error } = apiResult;

      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: error.includes('fetch') 
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
        username: user.username,
        hasToken: Boolean(token),
        hasWorkspace: Boolean(initialWorkspace)
      });

      // Store user and token immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }

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
      if (initialWorkspace && typeof window !== 'undefined') {
        localStorage.setItem('workspace', JSON.stringify(initialWorkspace));
        console.log('📁 Workspace from login stored:', initialWorkspace.name);
      }

      // Enhanced redirect with multiple fallbacks
      console.log('🚀 Starting enhanced redirect process...');
      
      // Clear any previous redirect attempts
      RedirectManager.clearRedirectAttempts();
      
      // Start the enhanced redirect process
      setTimeout(async () => {
        await RedirectManager.performRedirect(router, '/workspace/overview');
      }, 100);

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

  // Enhanced switch workspace function
  const switchWorkspace = useCallback(async (workspaceSlug: string): Promise<SwitchWorkspaceResult> => {
    if (!authState.token) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🔄 Switching to workspace:', workspaceSlug);

    const apiUrl: string = getApiBaseUrl();
    const apiResult = await safeApiCall(
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

    const { data, error } = apiResult;

    if (!error && data?.success) {
      const { workspace, token: newToken } = data.data;

      console.log('✅ Workspace switch successful:', workspace.name);

      if (typeof window !== 'undefined') {
        localStorage.setItem('workspace', JSON.stringify(workspace));
        if (newToken) {
          localStorage.setItem('token', newToken);
        }
      }

      setAuthState(prev => ({
        ...prev,
        workspace,
        token: newToken || prev.token
      }));

      // Enhanced redirect after successful switch
      setTimeout(async () => {
        await RedirectManager.performRedirect(router, '/workspace/overview');
      }, 100);
      
      return { success: true };
    } else {
      console.warn('⚠️ Workspace switching not available or failed:', error);
      // Still redirect to overview even if switch fails
      setTimeout(async () => {
        await RedirectManager.performRedirect(router, '/workspace/overview');
      }, 100);
      
      return { 
        success: false, 
        error: error || 'Workspace switching not available'
      };
    }
  }, [authState.token, router]);

  // Enhanced sign out function
  const signOut = useCallback(async (): Promise<void> => {
    console.log('🔓 Signing out user');
    
    try {
      if (authState.token) {
        const apiUrl: string = getApiBaseUrl();
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
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      RedirectManager.clearRedirectAttempts();

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        workspace: null
      });

      // Enhanced redirect to login
      setTimeout(async () => {
        await RedirectManager.performRedirect(router, '/login');
      }, 100);
    }
  }, [authState.token, router]);

  // Refresh user data function
  const refreshUser = useCallback(async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    console.log('🔄 Refreshing user data...');

    const apiUrl: string = getApiBaseUrl();
    const apiResult = await safeApiCall(
      `${apiUrl}/api/auth/me`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'refreshUser'
    );

    const { data, error } = apiResult;

    if (!error && data?.success && data.data?.user) {
      const { user, workspace } = data.data;
      
      console.log('✅ User data refreshed:', user.email);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
        if (workspace) {
          localStorage.setItem('workspace', JSON.stringify(workspace));
        }
      }

      setAuthState(prev => ({
        ...prev,
        user,
        workspace: workspace || prev.workspace
      }));

      return true;
    } else {
      console.warn('⚠️ Failed to refresh user data:', error);
      return false;
    }
  }, [authState.token]);

  // Get default workspace function
  const getDefaultWorkspace = useCallback(async (): Promise<Workspace | null> => {
    if (!authState.token) {
      return null;
    }

    const apiUrl: string = getApiBaseUrl();
    const apiResult = await safeApiCall(
      `${apiUrl}/api/workspaces`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'getDefaultWorkspace'
    );

    const { data, error } = apiResult;

    if (!error && data?.success && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0]; // Return first workspace as default
    }

    return null;
  }, [authState.token]);

  // Get available workspaces function
  const getAvailableWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    if (!authState.token) {
      return [];
    }

    const apiUrl: string = getApiBaseUrl();
    const apiResult = await safeApiCall(
      `${apiUrl}/api/workspaces`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      },
      'getAvailableWorkspaces'
    );

    const { data, error } = apiResult;

    if (!error && data?.success) {
      return Array.isArray(data.data) ? data.data : [];
    }

    return [];
  }, [authState.token]);

  return {
    ...authState,
    login: loginFunction as AuthContextType['login'],
    signOut,
    switchWorkspace,
    refreshUser,
    getDefaultWorkspace,
    getAvailableWorkspaces
  };
}

// Export the main hook
export const useAuth = useAuthHook;

// Hook to use auth context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}