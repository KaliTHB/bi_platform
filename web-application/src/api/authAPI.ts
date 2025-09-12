// web-application/src/api/authAPI.ts
import { apiClient, apiUtils } from '../utils/apiUtils';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  VerifyTokenResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  SwitchWorkspaceRequest,
  SwitchWorkspaceResponse,
} from '../types/auth.types';

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
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Email already exists');
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid registration data');
      } else {
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Registration failed');
      }
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
  verifyToken: async (): Promise<VerifyTokenResponse> => {
    try {
      const response = await apiClient.get<VerifyTokenResponse>('/auth/verify');
      return response.data;
    } catch (error: any) {
      // Clear invalid token
      apiUtils.clearAuthToken();
      return { valid: false };
    }
  },

  // Refresh token
  refreshToken: async (): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/refresh');
      
      // Update stored token
      if (response.data.token) {
        apiUtils.setAuthToken(response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      // Clear invalid token
      apiUtils.clearAuthToken();
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Token refresh failed');
    }
  },

  // Switch workspace
  switchWorkspace: async (workspaceSlug: string): Promise<SwitchWorkspaceResponse> => {
    try {
      const response = await apiClient.post<SwitchWorkspaceResponse>('/auth/switch-workspace', {
        workspace_slug: workspaceSlug,
      });
      
      // Update token if provided
      if (response.data.token) {
        apiUtils.setAuthToken(response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to switch workspace');
    }
  },

  // Request password reset
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { 
        email 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password reset request failed');
    }
  },

  // Reset password with token
  resetPassword: async (token: string, new_password: string): Promise<ResetPasswordResponse> => {
    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', { 
        token, 
        new_password 
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired reset token');
      } else {
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password reset failed');
      }
    }
  },

  // Change password (authenticated user)
  changePassword: async (currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> => {
    try {
      const response = await apiClient.post<ChangePasswordResponse>('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Current password is incorrect');
      } else {
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Password change failed');
      }
    }
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    try {
      const response = await apiClient.put<UpdateProfileResponse>('/auth/profile', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Profile update failed');
    }
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/profile');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch profile');
    }
  },

  // Upload user avatar
  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post<{ avatar_url: string }>('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Avatar upload failed');
    }
  },

  // Get user sessions
  getSessions: async (): Promise<{ sessions: any[] }> => {
    try {
      const response = await apiClient.get('/auth/sessions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch sessions');
    }
  },

  // Revoke session
  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to revoke session');
    }
  },

  // Revoke all sessions except current
  revokeAllSessions: async (): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post('/auth/revoke-all-sessions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to revoke sessions');
    }
  },

  // Check if API is available
  healthCheck: async (): Promise<boolean> => {
    try {
      await apiClient.get('/health');
      return true;
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  },

  // Validate email format
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  validatePassword: (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        valid: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      };
    }
    
    return { valid: true };
  },
};

export default authAPI;