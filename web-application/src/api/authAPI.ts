// web-application/src/services/authAPI.ts
import { apiClient, apiUtils } from '../utils/apiUtils';

export interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  user: {
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
  };
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
}

// Authentication API service
export const authAPI = {
  // Login with email/password
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

  // Register new user
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

  // Logout - clear token and call logout endpoint
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local auth data
      apiUtils.clearAuthToken();
    }
  },

  // Verify current token
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

  // Request password reset
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password reset request failed');
    }
  },

  // Reset password with token
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

  // Check if API is available
  healthCheck: async (): Promise<boolean> => {
    return await apiUtils.healthCheck();
  },
};

export default authAPI;