// web-application/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  workspace_ids?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in?: number;
  workspace?: any;
  permissions?: string[];
  workspaces?: any[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
  permissions: string[];
  workspace: any | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: Date.now(),
  permissions: [],
  workspace: null,
};

// Helper function to transform user object from API response to Redux state format
const transformUserForState = (apiUser: any): User => {
  const transformedUser = { ...apiUser };
  
  // Transform roles from Role[] to string[] if needed
  if (transformedUser.roles && Array.isArray(transformedUser.roles)) {
    transformedUser.roles = transformedUser.roles.map((role: any) => 
      typeof role === 'string' ? role : (role.name || role.id || role)
    );
  }
  
  return transformedUser;
};

// Async thunks
export const login = createAsyncThunk<LoginResponse, LoginRequest>(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      // Clear any existing token first
      localStorage.removeItem('auth_token');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('Attempting login to:', `${apiUrl}/api/auth/login`);
      
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          workspace_slug: credentials.workspace_slug,
        }),
      });

      const data = await response.json();
      console.log('Login API response:', { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.errors?.[0]?.message || 'Login failed';
        throw new Error(errorMessage);
      }

      // Handle different response formats
      let responseData: LoginResponse;
      if (data.success && data.data) {
        // Backend format: { success: true, data: { user, token, ... } }
        responseData = data.data;
      } else if (data.token && data.user) {
        // Direct format: { token, user, workspace, permissions }
        responseData = data;
      } else {
        throw new Error('Invalid response format from server');
      }

      // Validate required fields
      if (!responseData.token || !responseData.user) {
        throw new Error('Missing token or user data in login response');
      }

      // Store token immediately
      localStorage.setItem('auth_token', responseData.token);
      console.log('Token stored successfully:', responseData.token.substring(0, 20) + '...');

      return responseData;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Clean up on error
      localStorage.removeItem('auth_token');
      
      let errorMessage = 'Login failed';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const validateToken = createAsyncThunk<any, void>(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || token === 'undefined' || token === 'null') {
        throw new Error('No valid token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const data = await response.json();
      return { ...data, token };
    } catch (error: any) {
      localStorage.removeItem('auth_token');
      const message = error.response?.data?.error || error.message || 'Token validation failed';
      return rejectWithValue(message);
    }
  }
);

export const switchWorkspace = createAsyncThunk<any, string>(
  'auth/switchWorkspace',
  async (workspaceSlug: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Workspace switch failed');
      }
      
      if (data.success && data.data) {
        // Update token if new one provided
        if (data.data.token) {
          localStorage.setItem('auth_token', data.data.token);
        }
        return data.data;
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Workspace switch failed');
    }
  }
);

export const logout = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token || localStorage.getItem('auth_token');
      
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('selected_workspace_id');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; workspace?: any; permissions?: string[] }>) => {
      console.log('Setting credentials in Redux:', action.payload);
      
      state.user = transformUserForState(action.payload.user);
      state.token = action.payload.token;
      state.workspace = action.payload.workspace || null;
      state.permissions = action.payload.permissions || [];
      state.isAuthenticated = true;
      state.lastActivity = Date.now();
      state.error = null;
      
      // Ensure token is stored in localStorage
      if (action.payload.token) {
        localStorage.setItem('auth_token', action.payload.token);
      }
    },
    
    restoreAuth: (state) => {
      const token = localStorage.getItem('auth_token');
      if (token && token !== 'undefined' && token !== 'null') {
        state.token = token;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        console.log('Auth restored from localStorage');
      } else {
        console.log('No valid token found in localStorage for restoration');
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.workspace = null;
        state.permissions = [];
      }
    },
    
    clearAuth: (state) => {
      console.log('Clearing auth state');
      state.user = null;
      state.token = null;
      state.workspace = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.lastActivity = Date.now();
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('selected_workspace_id');
    },
    
    updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.token = action.payload.accessToken;
      state.lastActivity = Date.now();
      localStorage.setItem('auth_token', action.payload.accessToken);
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log('Login fulfilled with payload:', action.payload);
        
        state.isLoading = false;
        state.user = transformUserForState(action.payload.user);
        state.token = action.payload.token;
        state.workspace = action.payload.workspace || null;
        state.permissions = action.payload.permissions || [];
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        console.error('Login rejected:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.workspace = null;
        state.permissions = [];
      });

    // Validate token
    builder
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.user) {
          state.user = transformUserForState(action.payload.user);
        }
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(validateToken.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.workspace = null;
        state.permissions = [];
      });

    // Switch workspace
    builder
      .addCase(switchWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(switchWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.user) {
          state.user = transformUserForState(action.payload.user);
        }
        if (action.payload.token) {
          state.token = action.payload.token;
        }
        state.workspace = action.payload.workspace;
        state.permissions = action.payload.permissions || [];
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(switchWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.lastActivity = Date.now();
        state.error = null;
        state.workspace = null;
        state.permissions = [];
      });
  },
});

export const { 
  setCredentials, 
  clearAuth, 
  restoreAuth,
  updateTokens, 
  clearError, 
  updateLastActivity, 
  updateUser, 
  setLoading,
  setError
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectUserPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectCurrentWorkspace = (state: { auth: AuthState }) => state.auth.workspace;