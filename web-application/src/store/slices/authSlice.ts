// web-application/src/store/slices/authSlice.ts - UPDATED WITH WORKSPACE INIT
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginAt: string | null;
  isInitialized: boolean; // Add this to track initialization
}

const initialState: AuthState = {
  user: null,
  token: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true, // Start as loading until initialized
  error: null,
  lastLoginAt: null,
  isInitialized: false,
};

// Async thunk for token validation
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const data = await response.json();
      
      if (!data.success || !data.valid) {
        throw new Error('Invalid token');
      }

      return {
        user: data.user,
        token,
        permissions: data.permissions || [],
        workspace: data.workspace,
      };
    } catch (error: any) {
      // Clear invalid token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
      
      return rejectWithValue(error.message || 'Token validation failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; permissions?: string[] }>) => {
      console.log('🔄 Redux: Setting credentials', {
        user: action.payload.user,
        token: action.payload.token ? 'Present' : 'Missing',
        permissions: action.payload.permissions?.length || 0
      });
      
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.permissions = action.payload.permissions || [];
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      state.lastLoginAt = new Date().toISOString();
      state.isInitialized = true;
    },
    
    setUser: (state, action: PayloadAction<User>) => {
      console.log('🔄 Redux: Updating user data');
      state.user = action.payload;
    },
    
    setPermissions: (state, action: PayloadAction<string[]>) => {
      console.log('🔄 Redux: Setting permissions', action.payload);
      state.permissions = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setError: (state, action: PayloadAction<string>) => {
      console.log('❌ Redux: Setting auth error', action.payload);
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateToken: (state, action: PayloadAction<string>) => {
      console.log('🔄 Redux: Updating token');
      state.token = action.payload;
      // Update localStorage as well
      localStorage.setItem('token', action.payload);
    },
    
    logout: (state) => {
      console.log('🚪 Redux: Logging out user');
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
      localStorage.removeItem('persist:root');
      
      // Reset state
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.lastLoginAt = null;
      state.isInitialized = true; // Keep initialized true after logout
    },
    
    // Action to initialize auth state from localStorage on app startup
    initializeAuth: (state) => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('🔄 Redux: Initializing auth', {
          hasToken: !!storedToken,
          hasUser: !!storedUser
        });
        
        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          console.log('🔄 Redux: Restoring auth from localStorage', {
            user: user,
            hasToken: !!storedToken
          });
          
          state.token = storedToken;
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
          state.isInitialized = true;
        } else {
          console.log('🔄 Redux: No stored auth data found');
          state.isLoading = false;
          state.isInitialized = true;
          state.isAuthenticated = false;
        }
      } catch (error) {
        console.error('❌ Redux: Error initializing auth from localStorage', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('workspace');
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
      }
    },
  },
  
  extraReducers: (builder) => {
    // Handle validateToken async thunk
    builder
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        console.log('✅ Redux: Token validation successful');
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(validateToken.rejected, (state, action) => {
        console.log('❌ Redux: Token validation failed', action.payload);
        state.user = null;
        state.token = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.payload as string;
        state.isInitialized = true;
      });
  },
});

export const { 
  setCredentials, 
  setUser, 
  setPermissions,
  setLoading, 
  setError,
  clearError,
  updateToken,
  logout,
  initializeAuth
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;