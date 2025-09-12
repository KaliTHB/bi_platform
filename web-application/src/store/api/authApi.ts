// web-application/src/api/authAPI.ts - UPDATED WITH WORKSPACE CONTEXT SUPPORT

import { apiClient, apiUtils } from '../utils/apiUtils';

// ========================================================================
// EXISTING INTERFACES (KEEP AS IS)
// ========================================================================
export interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: number;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    settings?: any;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user_roles: string[];
  }>;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  workspace_ids: string[];
}

// ========================================================================
// NEW INTERFACES FOR WORKSPACE SUPPORT
// ========================================================================
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  user_role?: string;
  role_display_name?: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SwitchWorkspaceRequest {
  workspace_slug: string;
}

export interface RefreshTokenResponse {
  token: string;
  user: User;
  workspace?: Workspace;
  permissions?: string[];
  refreshed_at?: string;
}

// ========================================================================
// ENHANCED AUTH API WITH WORKSPACE SUPPORT
// ========================================================================
export const authAPI = {
  /**
   * Login with email/password - ENHANCED with workspace context
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        workspace_slug: credentials.workspace_slug,
      });
      
      // Store auth token
      if (response.data.token) {
        apiUtils.setAuthToken(response.data.token);
        
        // Store user data
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }

      // If login response includes workspace info, set workspace context
      if (response.data.workspaces && response.data.workspaces.length > 0) {
        // Use the first workspace or the one matching the requested slug
        let selectedWorkspace = response.data.workspaces[0];
        
        if (credentials.workspace_slug) {
          const matchingWorkspace = response.data.workspaces.find(
            ws => ws.slug === credentials.workspace_slug
          );
          if (matchingWorkspace) {
            selectedWorkspace = matchingWorkspace;
          }
        }

        // Set workspace context
        apiUtils.setWorkspaceContext({
          id: selectedWorkspace.id,
          slug: selectedWorkspace.slug
        });

        // Store workspace data
        if (typeof window !== 'undefined') {
          localStorage.setItem('workspace', JSON.stringify(selectedWorkspace));
        }

        console.log('🎉 Login successful with workspace:', selectedWorkspace.name);
      }
      
      return response.data;
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.name === 'NetworkError') {
        throw new Error('Unable to connect to server. Please check your connection.');
      } else {
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
      }
    }
  },

  /**
   * Register new user - EXISTING (keep as is)
   */
  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invitation_token?: string;
  }): Promise<{ user: User; message: string }> => {
    try {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Registration failed');
    }
  },

  /**
   * Logout - ENHANCED to clear workspace context
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear all context including workspace
      apiUtils.clearContext();
      console.log('👋 Logout successful');
    }
  },

  /**
   * Switch workspace - NEW FUNCTION
   */
  switchWorkspace: async (request: SwitchWorkspaceRequest): Promise<RefreshTokenResponse> => {
    try {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/switch-workspace', request);
      
      if (response.data.token) {
        // Update token
        apiUtils.setAuthToken(response.data.token);
        
        if (response.data.workspace) {
          // Update workspace context
          apiUtils.setWorkspaceContext({
            id: response.data.workspace.id,
            slug: response.data.workspace.slug
          });

          // Store updated data
          if (typeof window !== 'undefined') {
            localStorage.setItem('workspace', JSON.stringify(response.data.workspace));
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }

        console.log('🔄 Workspace switched to:', response.data.workspace?.name);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Workspace switch failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to switch workspace');
    }
  },

  /**
   * Refresh token - NEW FUNCTION
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    try {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');
      
      if (response.data.token) {
        // Update token and context
        apiUtils.setAuthToken(response.data.token);
        
        if (response.data.workspace) {
          apiUtils.setWorkspaceContext({
            id: response.data.workspace.id,
            slug: response.data.workspace.slug
          });

          // Update stored data
          if (typeof window !== 'undefined') {
            localStorage.setItem('workspace', JSON.stringify(response.data.workspace));
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }

        console.log('🔄 Token refreshed successfully');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      
      // If refresh fails, clear context and redirect to login
      apiUtils.clearContext();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      throw new Error('Session expired. Please login again.');
    }
  },

  /**
   * Get current user - NEW FUNCTION
   */
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
      
      // Update stored user data
      if (response.data.success && response.data.data && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to get current user:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get user profile');
    }
  },

  /**
   * Get user's default workspace - NEW FUNCTION
   */
  getDefaultWorkspace: async (): Promise<Workspace> => {
    try {
      const response = await apiClient.get<{ success: boolean; data?: Workspace; workspace?: Workspace }>('/user/default-workspace');
      
      const workspace = response.data.data || response.data.workspace;
      
      if (workspace) {
        // Set workspace context
        apiUtils.setWorkspaceContext({
          id: workspace.id,
          slug: workspace.slug
        });

        // Store workspace data
        if (typeof window !== 'undefined') {
          localStorage.setItem('workspace', JSON.stringify(workspace));
        }
      }
      
      return workspace!;
    } catch (error: any) {
      console.error('❌ Failed to get default workspace:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get default workspace');
    }
  },

  /**
   * Get user's workspaces - NEW FUNCTION
   */
  getUserWorkspaces: async (): Promise<Workspace[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data?: Workspace[]; workspaces?: Workspace[] }>('/user/workspaces');
      
      const workspaces = response.data.data || response.data.workspaces || [];
      return workspaces;
    } catch (error: any) {
      console.error('❌ Failed to get user workspaces:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get workspaces');
    }
  },

  /**
   * Get user permissions for current workspace - NEW FUNCTION
   */
  getUserPermissions: async (): Promise<{ permissions: string[] }> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { permissions: string[] } }>('/user/permissions');
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to get user permissions:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get permissions');
    }
  },

  /**
   * Verify current token - EXISTING (keep as is)
   */
  verifyToken: async (): Promise<{ valid: boolean; user?: User }> => {
    try {
      const response = await apiClient.get('/auth/verify');
      return {
        valid: response.data.valid,
        user: response.data.user,
      };
    } catch (error: any) {
      apiUtils.clearAuthToken();
      return { valid: false };
    }
  },

  /**
   * Request password reset - EXISTING (keep as is)
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password reset request failed');
    }
  },

  /**
   * Reset password with token - EXISTING (keep as is)
   */
  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post('/auth/reset-password', { 
        token, 
        new_password 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password reset failed');
    }
  },

  /**
   * Check if API is available - EXISTING (keep as is)
   */
  healthCheck: async (): Promise<boolean> => {
    return await apiUtils.healthCheck();
  },

  // ========================================================================
  // NEW UTILITY FUNCTIONS
  // ========================================================================

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('token');
    return !!token;
  },

  /**
   * Get stored user data
   */
  getStoredUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        return null;
      }
    }
    return null;
  },

  /**
   * Get stored workspace data
   */
  getStoredWorkspace: (): Workspace | null => {
    if (typeof window === 'undefined') return null;
    
    const workspaceData = localStorage.getItem('workspace');
    if (workspaceData) {
      try {
        return JSON.parse(workspaceData);
      } catch (e) {
        console.error('Failed to parse stored workspace data:', e);
        return null;
      }
    }
    return null;
  },
};

export default authAPI;