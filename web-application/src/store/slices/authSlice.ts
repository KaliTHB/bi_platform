import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '@/services/api';
import { User, LoginRequest, LoginResponse } from '@/types/auth.types';

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

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      
      // Store token in localStorage for API calls
      if (response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await authAPI.verifyToken();
      return { ...response, token };
    } catch (error: any) {
      localStorage.removeItem('auth_token');
      const message = error.response?.data?.error || error.message || 'Token validation failed';
      return rejectWithValue(message);
    }
  }
);

export const switchWorkspace = createAsyncThunk(
  'auth/switchWorkspace',
  async (workspaceSlug: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug }),
      });
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.data.token);
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Workspace switch failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (state.auth.token) {
        await authAPI.logout();
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; workspace: any; permissions: string[] }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.workspace = action.payload.workspace;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
      state.lastActivity = Date.now();
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.workspace = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.lastActivity = Date.now();
      state.error = null;
    },
    updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.token = action.payload.accessToken;
      state.lastActivity = Date.now();
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
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.workspace = action.payload.workspace;
        state.permissions = action.payload.permissions || [];
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.workspace = null;
        state.permissions = [];
        state.error = action.payload as string;
      });

    // Validate token
    builder
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.workspace = action.payload.workspace;
        state.permissions = action.payload.permissions || [];
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
        state.user = action.payload.user;
        state.token = action.payload.token;
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
  updateTokens, 
  clearError, 
  updateLastActivity, 
  updateUser, 
  setLoading 
} = authSlice.actions;

export default authSlice.reducer;