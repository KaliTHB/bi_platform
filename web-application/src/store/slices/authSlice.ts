// web-application/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  workspace: null,
  token: null,
  permissions: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No token found');

      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Invalid token');
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      localStorage.removeItem('auth_token');
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{
      user: User;
      workspace?: Workspace;
      token: string;
      permissions: string[];
    }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace || null;
      state.token = action.payload.token;
      state.permissions = action.payload.permissions;
      state.isLoading = false;
      state.error = null;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.workspace = null;
      state.token = null;
      state.permissions = [];
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('auth_token');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.workspace = action.payload.workspace;
        state.permissions = action.payload.permissions || [];
        state.isLoading = false;
      })
      .addCase(validateToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.workspace = null;
        state.token = null;
        state.permissions = [];
        state.isLoading = false;
      });
  },
});

export const { loginSuccess, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;