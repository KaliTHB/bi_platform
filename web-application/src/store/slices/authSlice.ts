// web-application/src/store/slices/authSlice.ts
// Complete authentication slice using RTK with constants

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginCredentials, AuthState, PermissionResponse } from '@/types/auth.types';
import { 
  authStorage, 
  workspaceStorage,
  tokenStorage 
} from '@/utils/storageUtils';
import { 
  API_ENDPOINTS, 
  API_CONFIG, 
  HTTP_STATUS,
  HTTP_METHODS,
  isSuccessStatus 
} from '@/constants/api';
import { 
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  AUTH_CONSTANTS,
  ROLE_LEVELS
} from '@/constants';

// ========================================
// INTERFACES & TYPES
// ========================================

interface LoginPayload {
  user: User;
  token: string;
  refreshToken?: string;
}

interface SetCredentialsPayload {
  user: User;
  token: string;
  refreshToken?: string;
}

interface RefreshTokenResponse {
  success: boolean;
  data?: {
    token: string;
    user?: User;
    expires_at?: string;
  };
  message?: string;
}

interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    refreshToken?: string;
    workspace?: any;
    expires_at?: string;
  };
  message?: string;
}

interface LoadPermissionsPayload {
  permissions: string[];
  workspaceId?: string;
  roles?: any[];
  isAdmin?: boolean;
  roleLevel?: number;
  userInfo?: any;
}

// ========================================
// INITIAL STATE
// ========================================

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  permissions: [],
  roles: [],
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  lastLoginTime: null,
  tokenExpiresAt: null,
  isAdmin: false,
  roleLevel: ROLE_LEVELS.USER
};

// ========================================
// ASYNC THUNKS
// ========================================

/**
 * Login user with credentials
 */
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔐 AuthSlice: Starting login process...', { email: credentials.email });

      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`;
      
      const response = await fetch(url, {
        method: HTTP_METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.message || ERROR_MESSAGES.LOGIN_FAILED);
      }

      const { user, token, refreshToken, workspace, expires_at } = data.data;

      // Store using storage utilities with constants
      authStorage.setUser(user);
      authStorage.setToken(token);
      
      if (refreshToken) {
        authStorage.setRefreshToken(refreshToken);
      }
      
      if (expires_at) {
        authStorage.setTokenExpiry(expires_at);
      }

      // Store workspace if provided
      if (workspace) {
        workspaceStorage.setCurrentWorkspace(workspace);
      }

      console.log('✅ AuthSlice: Login successful', {
        userId: user.id,
        email: user.email,
        workspace: workspace?.slug,
        hasRefreshToken: !!refreshToken
      });

      return { 
        user, 
        token, 
        refreshToken,
        workspace,
        tokenExpiresAt: expires_at 
      };

    } catch (error: any) {
      console.error('❌ AuthSlice: Login failed:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.LOGIN_FAILED);
    }
  }
);

/**
 * Refresh authentication token
 */
export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const currentRefreshToken = state.auth.refreshToken || authStorage.getRefreshToken();
      
      if (!currentRefreshToken) {
        throw new Error(ERROR_MESSAGES.NO_REFRESH_TOKEN);
      }

      console.log('🔄 AuthSlice: Refreshing token...');

      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;
      
      const response = await fetch(url, {
        method: HTTP_METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentRefreshToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
      }

      const data: RefreshTokenResponse = await response.json();
      
      if (!data.success || !data.data?.token) {
        throw new Error(data.message || ERROR_MESSAGES.TOKEN_REFRESH_FAILED);
      }

      const { token, user, expires_at } = data.data;

      // Update storage
      authStorage.setToken(token);
      
      if (user) {
        authStorage.setUser(user);
      }
      
      if (expires_at) {
        authStorage.setTokenExpiry(expires_at);
      }

      console.log('✅ AuthSlice: Token refreshed successfully');

      return { 
        token, 
        user,
        tokenExpiresAt: expires_at 
      };

    } catch (error: any) {
      console.error('❌ AuthSlice: Token refresh failed:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.TOKEN_REFRESH_FAILED);
    }
  }
);

/**
 * Load user permissions for current or specified workspace
 */
export const loadUserPermissions = createAsyncThunk(
  'auth/loadUserPermissions',
  async ({ workspaceId }: { workspaceId?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      if (!token) {
        throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
      }

      console.log('🔍 AuthSlice: Loading user permissions...', { workspaceId });

      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.PERMISSIONS}${
        workspaceId ? `?workspace_id=${workspaceId}` : ''
      }`;

      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
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
        throw new Error(data.message || ERROR_MESSAGES.PERMISSIONS_LOAD_FAILED);
      }

      const permissions = data.permissions || [];
      
      // Store using authStorage utility with constants
      authStorage.setPermissions(permissions, workspaceId);

      console.log('✅ AuthSlice: Permissions loaded successfully:', {
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
        roleLevel: data.role_level || ROLE_LEVELS.USER,
        userInfo: data.user_info
      };

    } catch (error: any) {
      console.error('❌ AuthSlice: Permission loading error:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.PERMISSIONS_LOAD_FAILED);
    }
  }
);

/**
 * Refresh user permissions
 */
export const refreshUserPermissions = createAsyncThunk(
  'auth/refreshUserPermissions',
  async ({ workspaceId }: { workspaceId?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      if (!token) {
        throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
      }

      console.log('🔄 AuthSlice: Refreshing user permissions...', { workspaceId });

      // Clear cached permissions first
      authStorage.clearPermissions(workspaceId);

      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_PERMISSIONS}${
        workspaceId ? `?workspace_id=${workspaceId}` : ''
      }`;

      const response = await fetch(url, {
        method: HTTP_METHODS.POST,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Permission refresh failed: ${response.status}`);
      }

      const data: PermissionResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || ERROR_MESSAGES.PERMISSIONS_REFRESH_FAILED);
      }

      const permissions = data.permissions || [];
      
      // Store refreshed permissions
      authStorage.setPermissions(permissions, workspaceId);

      console.log('✅ AuthSlice: Permissions refreshed successfully:', {
        count: permissions.length,
        workspaceId
      });

      return { 
        permissions, 
        workspaceId,
        roles: data.roles || [],
        isAdmin: data.is_admin || false,
        roleLevel: data.role_level || ROLE_LEVELS.USER
      };

    } catch (error: any) {
      console.error('❌ AuthSlice: Permission refresh error:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.PERMISSIONS_REFRESH_FAILED);
    }
  }
);

/**
 * Initialize auth state from storage
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔧 AuthSlice: Initializing auth state from storage...');

      // Get stored data using storage utilities with constants
      const storedUser = authStorage.getUser();
      const storedToken = authStorage.getToken();
      const storedRefreshToken = authStorage.getRefreshToken();
      const tokenExpiry = authStorage.getTokenExpiry();
      
      if (!storedUser || !storedToken) {
        console.log('ℹ️ AuthSlice: No stored credentials found');
        return { initialized: true };
      }

      // Check token expiry
      if (tokenExpiry && new Date(tokenExpiry) <= new Date()) {
        console.log('⚠️ AuthSlice: Stored token expired, attempting refresh...');
        
        if (storedRefreshToken) {
          // Try to refresh token
          await dispatch(refreshTokenAsync()).unwrap();
        } else {
          // Clear expired credentials
          authStorage.clearAuth();
          throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
        }
      }

      console.log('✅ AuthSlice: Auth initialized from storage', {
        userId: storedUser.id,
        email: storedUser.email,
        hasRefreshToken: !!storedRefreshToken
      });

      return {
        user: storedUser,
        token: storedToken,
        refreshToken: storedRefreshToken,
        tokenExpiresAt: tokenExpiry,
        initialized: true
      };

    } catch (error: any) {
      console.error('❌ AuthSlice: Auth initialization error:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.AUTH_INIT_FAILED);
    }
  }
);

// ========================================
// AUTH SLICE
// ========================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set user credentials manually
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      const { user, token, refreshToken } = action.payload;
      
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken || state.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      state.lastLoginTime = Date.now();
      
      console.log('✅ AuthSlice: Credentials set', { userId: user.id, email: user.email });
    },

    // Set permissions manually
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
      console.log('🔑 AuthSlice: Permissions set', { count: action.payload.length });
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      console.error('❌ AuthSlice: Error set:', action.payload);
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update user profile
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        authStorage.setUser(state.user);
        console.log('👤 AuthSlice: User profile updated');
      }
    },

    // Update token expiry
    setTokenExpiry: (state, action: PayloadAction<string>) => {
      state.tokenExpiresAt = action.payload;
      authStorage.setTokenExpiry(action.payload);
    },

    // Mark as initialized
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },

    // Logout action
    logout: (state) => {
      // Clear state
      Object.assign(state, initialState);
      state.isInitialized = true; // Keep initialized as true
      
      // Clear storage using utilities
      authStorage.clearAuth();
      workspaceStorage.clearAll();
      
      console.log('🚪 AuthSlice: User logged out');
    }
  },

  // ========================================
  // EXTRA REDUCERS FOR ASYNC THUNKS
  // ========================================
  extraReducers: (builder) => {
    // Login async thunk
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        const { user, token, refreshToken, tokenExpiresAt } = action.payload;
        
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken || null;
        state.tokenExpiresAt = tokenExpiresAt || null;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.lastLoginTime = Date.now();
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })

    // Refresh token async thunk
    builder
      .addCase(refreshTokenAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        const { token, user, tokenExpiresAt } = action.payload;
        
        state.token = token;
        state.tokenExpiresAt = tokenExpiresAt || null;
        
        if (user) {
          state.user = user;
        }
        
        state.isLoading = false;
        state.error = null;
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        // On refresh failure, logout user
        Object.assign(state, initialState);
        state.isInitialized = true;
        state.error = action.payload as string;
        
        // Clear storage
        authStorage.clearAuth();
      })

    // Load permissions async thunk
    builder
      .addCase(loadUserPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadUserPermissions.fulfilled, (state, action) => {
        const { permissions, roles, isAdmin, roleLevel } = action.payload;
        
        state.permissions = permissions;
        state.roles = roles || [];
        state.isAdmin = isAdmin || false;
        state.roleLevel = roleLevel || ROLE_LEVELS.USER;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loadUserPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Refresh permissions async thunk
    builder
      .addCase(refreshUserPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshUserPermissions.fulfilled, (state, action) => {
        const { permissions, roles, isAdmin, roleLevel } = action.payload;
        
        state.permissions = permissions;
        state.roles = roles || [];
        state.isAdmin = isAdmin || false;
        state.roleLevel = roleLevel || ROLE_LEVELS.USER;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(refreshUserPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Initialize auth async thunk
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        const { user, token, refreshToken, tokenExpiresAt, initialized } = action.payload;
        
        if (user && token) {
          state.user = user;
          state.token = token;
          state.refreshToken = refreshToken || null;
          state.tokenExpiresAt = tokenExpiresAt || null;
          state.isAuthenticated = true;
        }
        
        state.isInitialized = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isInitialized = true;
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });
  },
});

// ========================================
// EXPORTS
// ========================================

// Export actions
export const {
  setCredentials,
  setPermissions,
  setLoading,
  setError,
  clearError,
  updateUser,
  setTokenExpiry,
  setInitialized,
  logout
} = authSlice.actions;

// Export selectors for convenience
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsAdmin = (state: { auth: AuthState }) => state.auth.isAdmin;
export const selectRoleLevel = (state: { auth: AuthState }) => state.auth.roleLevel;

// Export reducer as default
export default authSlice.reducer;

// Type exports for convenience
export type { AuthState, LoginPayload, SetCredentialsPayload };