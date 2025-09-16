// web-application/src/store/slices/authSlice.ts - COMPLETE VERSION

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/constants/index';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// Types
interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginAt: string | null;
  isInitialized: boolean;
  refreshTokenExpiry: number | null;
  loginAttempts: number;
  isAccountLocked: boolean;
  accountLockUntil: number | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

interface LoginResponse {
  success: boolean;
  token: string;
  refresh_token?: string;
  user: User;
  permissions?: string[];
  workspace?: Workspace;
  expires_at?: number;
  message?: string;
}

interface PermissionResponse {
  success: boolean;
  permissions: string[];
  roles?: string[];
  is_admin?: boolean;
  role_level?: number;
  user_info?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
  workspace_used?: string;
  warning?: string;
  message?: string;
}

const initialState: AuthState = {
  user: null,
  token: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastLoginAt: null,
  isInitialized: false,
  refreshTokenExpiry: null,
  loginAttempts: 0,
  isAccountLocked: false,
  accountLockUntil: null,
};

// ========================================
// ASYNC THUNKS
// ========================================

/**
 * Login user with credentials
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('🔍 Auth: Logging in user...', credentials.email);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || 'Invalid login response');
      }

      console.log('✅ Auth: Login successful', {
        user: data.user.email,
        hasToken: !!data.token,
        permissionCount: data.permissions?.length || 0
      });

      return data;

    } catch (error: any) {
      console.error('❌ Auth: Login failed:', error);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Validate existing token
 */
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = authStorage.getToken();
      const storedUser = authStorage.getUser();
      const storedPermissions = authStorage.getPermissions();
      
      if (!token || !storedUser) {
        throw new Error('No stored credentials found');
      }

      console.log('🔍 Auth: Validating token with backend...');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Auth: Token validation failed with status:', response.status);
        throw new Error(errorData.message || `Token validation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        console.log('❌ Auth: Invalid token response structure:', data);
        throw new Error('Invalid token response');
      }

      let permissions: string[] = [];
      
      if (data.permissions && Array.isArray(data.permissions)) {
        permissions = data.permissions;
        console.log('✅ Auth: Using permissions from backend response:', permissions.length);
      } else if (storedPermissions && Array.isArray(storedPermissions)) {
        permissions = storedPermissions;
        console.log('✅ Auth: Using permissions from storage:', permissions.length);
      } else {
        console.warn('⚠️ Auth: No permissions found, using empty array');
        permissions = [];
      }

      // Update storage with fresh permissions if available
      if (data.permissions && Array.isArray(data.permissions)) {
        authStorage.setPermissions(data.permissions);
      }

      console.log('✅ Auth: Token validation successful', {
        user: data.user.email,
        workspace: data.workspace?.name || 'none',
        permissionsCount: permissions.length
      });

      return {
        user: data.user,
        token,
        permissions,
        workspace: data.workspace
      };

    } catch (error: any) {
      console.error('❌ Auth: Token validation error:', error);
      
      // Clear invalid stored data using storage utilities
      authStorage.clearAuth();
      
      return rejectWithValue(error.message || 'Token validation failed');
    }
  }
);

/**
 * Load user permissions for specific workspace
 */
export const loadUserPermissions = createAsyncThunk(
  'auth/loadUserPermissions',
  async ({ workspaceId }: { workspaceId?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Auth: Loading user permissions...', { workspaceId });

      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/permissions${
        workspaceId ? `?workspace_id=${workspaceId}` : ''
      }`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Permission loading failed: ${response.status}`);
      }

      const data: PermissionResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Permission loading failed');
      }

      const permissions = data.permissions || [];
      
      // Store using authStorage utility
      authStorage.setPermissions(permissions, workspaceId);

      console.log('✅ Auth: Permissions loaded successfully:', {
        count: permissions.length,
        workspaceId,
        sample: permissions.slice(0, 3),
        isAdmin: data.is_admin,
        roleLevel: data.role_level
      });

      return { 
        permissions, 
        workspaceId,
        roles: data.roles || [],
        isAdmin: data.is_admin || false,
        roleLevel: data.role_level || 0,
        userInfo: data.user_info
      };

    } catch (error: any) {
      console.error('❌ Auth: Permission loading error:', error);
      return rejectWithValue(error.message || 'Failed to load permissions');
    }
  }
);

/**
 * Refresh user permissions
 */
export const refreshUserPermissions = createAsyncThunk(
  'auth/refreshUserPermissions',
  async ({ workspaceId }: { workspaceId?: string }, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 Auth: Refreshing user permissions...', { workspaceId });

      // Clear cached permissions
      authStorage.clearPermissions(workspaceId);
      
      // Reload permissions
      const result = await dispatch(loadUserPermissions({ workspaceId }));
      
      if (loadUserPermissions.rejected.match(result)) {
        throw new Error(result.payload as string);
      }

      console.log('✅ Auth: Permissions refreshed successfully');
      return result.payload;

    } catch (error: any) {
      console.error('❌ Auth: Permission refresh error:', error);
      return rejectWithValue(error.message || 'Failed to refresh permissions');
    }
  }
);

/**
 * Refresh authentication token
 */
export const refreshAuthToken = createAsyncThunk(
  'auth/refreshAuthToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const refreshToken = authStorage.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Auth: Refreshing authentication token...');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.token) {
        throw new Error(data.message || 'Token refresh failed');
      }

      // Update stored token
      authStorage.setToken(data.token, data.expires_at);
      if (data.refresh_token) {
        authStorage.setRefreshToken(data.refresh_token);
      }

      console.log('✅ Auth: Token refreshed successfully');

      return {
        token: data.token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at
      };

    } catch (error: any) {
      console.error('❌ Auth: Token refresh error:', error);
      
      // Clear invalid tokens
      authStorage.clearAuth();
      
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

/**
 * Update user profile
 */
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (updates: Partial<User>, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔄 Auth: Updating user profile...');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Profile update failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Profile update failed');
      }

      console.log('✅ Auth: Profile updated successfully');

      return data.user || updates;

    } catch (error: any) {
      console.error('❌ Auth: Profile update error:', error);
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

/**
 * Logout user
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      console.log('🔄 Auth: Logging out user...');

      // Try to call logout endpoint if token exists
      if (token) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            console.warn('⚠️ Auth: Logout endpoint failed, proceeding with local cleanup');
          }
        } catch (error) {
          console.warn('⚠️ Auth: Logout endpoint error, proceeding with local cleanup:', error);
        }
      }

      // Clear all stored data regardless of API response
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();

      console.log('✅ Auth: Logout completed');

      return true;

    } catch (error: any) {
      console.error('❌ Auth: Logout error:', error);
      
      // Still clear local data even if API fails
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();
      
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// ========================================
// SLICE DEFINITION
// ========================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set credentials directly (for login success)
    setCredentials: (state, action: PayloadAction<{ 
      user: User; 
      token: string; 
      permissions?: string[];
      workspace?: any;
      refreshToken?: string;
      expiresAt?: number;
    }>) => {
      const { user, token, permissions, workspace, refreshToken, expiresAt } = action.payload;
      
      console.log('🔄 Redux: Setting credentials', {
        user: user?.email,
        token: token ? 'present' : 'missing',
        permissionCount: permissions?.length || 0
      });

      state.user = user;
      state.token = token;
      state.permissions = permissions || [];
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      state.lastLoginAt = new Date().toISOString();
      state.isInitialized = true;
      state.loginAttempts = 0;
      state.isAccountLocked = false;
      state.accountLockUntil = null;
      state.refreshTokenExpiry = expiresAt || null;

      // Store using authStorage utilities
      authStorage.setToken(token, expiresAt);
      authStorage.setUser(user);
      authStorage.setPermissions(permissions || []);
      
      if (refreshToken) {
        authStorage.setRefreshToken(refreshToken);
      }
      
      // Store workspace if provided
      if (workspace) {
        workspaceStorage.setCurrentWorkspace(workspace);
      }
    },

    // Logout (clear all auth state)
    logout: (state) => {
      console.log('🔄 Redux: Logging out user');
      
      // Clear all auth and workspace data using storage utilities
      authStorage.clearAuth();
      
      // Reset state to initial values
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.lastLoginAt = null;
      state.isInitialized = true;
      state.refreshTokenExpiry = null;
      state.loginAttempts = 0;
      state.isAccountLocked = false;
      state.accountLockUntil = null;
    },
    
    // Initialize auth from storage
    initializeAuth: (state) => {
      if (typeof window === 'undefined') {
        state.isLoading = false;
        state.isInitialized = true;
        return;
      }

      try {
        console.log('🔄 Redux: Initializing auth from storage utilities');
        
        const storedToken = authStorage.getToken();
        const storedUser = authStorage.getUser();
        const storedPermissions = authStorage.getPermissions();

        console.log('📦 Redux: Storage check', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          hasPermissions: !!storedPermissions
        });
        
        if (storedToken && storedUser) {
          try {
            let permissions: string[] = [];
            
            if (storedPermissions && Array.isArray(storedPermissions)) {
              permissions = storedPermissions;
            } else {
              // Initialize empty permissions if none found
              authStorage.setPermissions([]);
              permissions = [];
            }
            
            console.log('🔄 Redux: Restoring auth from storage', {
              user: storedUser.email,
              hasToken: !!storedToken,
              permissionCount: permissions.length
            });
            
            state.token = storedToken;
            state.user = storedUser;
            state.permissions = permissions;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.isInitialized = true;
            state.error = null;
          } catch (parseError) {
            console.error('❌ Redux: Error processing stored auth data', parseError);
            
            // Clear corrupted data using storage utilities
            authStorage.clearAuth();
          
            state.isLoading = false;
            state.isInitialized = true;
            state.isAuthenticated = false;
            state.error = 'Stored auth data was corrupted and has been cleared';
          }
        } else {
          console.log('📭 Redux: No stored auth data found');
          // Initialize empty permissions
          authStorage.setPermissions([]);
          state.isLoading = false;
          state.isInitialized = true;
          state.isAuthenticated = false;
        }
      } catch (error: any) {
        console.error('❌ Redux: Error initializing auth from storage', error);
        // Ensure permissions are initialized even on error
        authStorage.setPermissions([]);
        state.isLoading = false;
        state.isInitialized = true;
        state.error = error.message || 'Auth initialization failed';
      }
    },

    // Set permissions directly
    setPermissions: (state, action: PayloadAction<string[]>) => {
      console.log('🔄 Redux: Setting permissions', {
        count: action.payload?.length || 0,
        sample: action.payload?.slice(0, 3) || []
      });
      state.permissions = action.payload || [];
    },

    // Clear permissions
    clearPermissions: (state) => {
      console.log('🔄 Redux: Clearing permissions');
      state.permissions = [];
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Increment login attempts
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (state.loginAttempts >= 5) {
        state.isAccountLocked = true;
        state.accountLockUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
      }
    },

    // Reset login attempts
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.isAccountLocked = false;
      state.accountLockUntil = null;
    },

    // Update user profile in state
    updateUserInState: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        authStorage.setUser(state.user);
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      // ========================================
      // LOGIN USER CASES
      // ========================================
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { user, token, permissions, workspace } = action.payload;
        
        console.log('✅ Redux: Login successful', {
          user: user.email,
          hasToken: !!token,
          permissionCount: permissions?.length || 0
        });
        
        state.user = user;
        state.token = token;
        state.permissions = permissions || [];
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.lastLoginAt = new Date().toISOString();
        state.isInitialized = true;
        state.loginAttempts = 0;
        state.isAccountLocked = false;
        state.accountLockUntil = null;

        // Store using storage utilities
        authStorage.setToken(token);
        authStorage.setUser(user);
        authStorage.setPermissions(permissions || []);
        
        if (workspace) {
          workspaceStorage.setCurrentWorkspace(workspace);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
        state.loginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (state.loginAttempts >= 5) {
          state.isAccountLocked = true;
          state.accountLockUntil = Date.now() + (30 * 60 * 1000);
        }
      })

      // ========================================
      // VALIDATE TOKEN CASES
      // ========================================
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        const { user, token, permissions, workspace } = action.payload;
        
        console.log('✅ Redux: Token validation successful', {
          user: user.email,
          hasToken: !!token,
          permissionCount: permissions?.length || 0
        });
        
        state.user = user;
        state.token = token;
        state.permissions = permissions || [];
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.lastLoginAt = new Date().toISOString();
        state.isInitialized = true;

        // Store using storage utilities
        authStorage.setToken(token);
        authStorage.setUser(user);
        authStorage.setPermissions(permissions || []);
        
        if (workspace) {
          workspaceStorage.setCurrentWorkspace(workspace);
        }
      })
      .addCase(validateToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.permissions = [];
        state.error = action.payload as string;
        state.isInitialized = true;
      })

      // ========================================
      // LOAD USER PERMISSIONS CASES
      // ========================================
      .addCase(loadUserPermissions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUserPermissions.fulfilled, (state, action) => {
        const { permissions } = action.payload;
        state.permissions = permissions;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loadUserPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ========================================
      // REFRESH USER PERMISSIONS CASES
      // ========================================
      .addCase(refreshUserPermissions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshUserPermissions.fulfilled, (state, action) => {
        if (action.payload && action.payload.permissions) {
          state.permissions = action.payload.permissions;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(refreshUserPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ========================================
      // REFRESH AUTH TOKEN CASES
      // ========================================
      .addCase(refreshAuthToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        const { token, expiresAt } = action.payload;
        state.token = token;
        state.refreshTokenExpiry = expiresAt || null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(refreshAuthToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.permissions = [];
        state.error = action.payload as string;
      })

      // ========================================
      // UPDATE USER PROFILE CASES
      // ========================================
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          authStorage.setUser(state.user);
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ========================================
      // LOGOUT USER CASES
      // ========================================
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset to initial state
        return {
          ...initialState,
          isInitialized: true,
          isLoading: false,
        };
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Still logout locally even if API fails
        return {
          ...initialState,
          isInitialized: true,
          isLoading: false,
          error: action.payload as string,
        };
      });
  },
});

// ========================================
// EXPORTS
// ========================================

export const { 
  setCredentials, 
  logout, 
  initializeAuth,
  setPermissions,
  clearPermissions,
  clearError,
  setLoading,
  incrementLoginAttempts,
  resetLoginAttempts,
  updateUserInState,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;

// Export types for use in components
export type { User, Workspace, AuthState, LoginCredentials };