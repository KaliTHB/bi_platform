// web-application/src/store/slices/authSlice.ts - FIXED initialization
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/constants/index';

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

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginAt: string | null;
  isInitialized: boolean; // Track if we've tried to load from storage
}

const initialState: AuthState = {
  user: null,
  token: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true, // Start as loading during initialization
  error: null,
  lastLoginAt: null,
  isInitialized: false, // Not initialized yet
};

// ✅ FIXED: Async thunk for token validation
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (!token || !storedUser) {
        throw new Error('No stored credentials found');
      }

      // Verify token with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error('Invalid token response');
      }

      return {
        user: data.user,
        token,
        permissions: data.permissions || [],
        workspace: data.workspace
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token validation failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ 
      user: User; 
      token: string; 
      permissions?: string[];
      workspace?: any;
    }>) => {
      console.log('🔄 Redux: Setting credentials', {
        user: action.payload.user?.email,
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
      console.log('🔄 Redux: Setting permissions', {
        count: action.payload.length,
        permissions: action.payload
      });
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TOKEN, action.payload);
      }
    },
    
    logout: (state) => {
      console.log('🚪 Redux: Logging out user');
      
      // Clear localStorage (only in browser)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
        localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
        localStorage.removeItem('persist:root');
      }
      
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
    
    // ✅ FIXED: Synchronous initialization from localStorage
    initializeAuth: (state) => {
      // Only run in browser environment
      if (typeof window === 'undefined') {
        state.isLoading = false;
        state.isInitialized = true;
        return;
      }

      try {
        console.log('🔄 Redux: Initializing auth from localStorage');
        
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const storedPermissions = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);

        console.log('📦 Redux: Storage check', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          hasPermissions: !!storedPermissions
        });
        
        if (storedToken && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            const permissions = storedPermissions ? JSON.parse(storedPermissions) : [];
            
            console.log('🔄 Redux: Restoring auth from localStorage', {
              user: user.email,
              hasToken: !!storedToken,
              permissionCount: permissions.length
            });
            
            state.token = storedToken;
            state.user = user;
            state.permissions = permissions;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.isInitialized = true;
            state.error = null;
          } catch (parseError) {
            console.error('❌ Redux: Error parsing stored auth data', parseError);
          
            state.isLoading = false;
            state.isInitialized = true;
            state.isAuthenticated = false;
            state.error = 'Stored auth data was corrupted and has been cleared';
          }
        } else {
          console.log('📭 Redux: No stored auth data found');
          state.isLoading = false;
          state.isInitialized = true;
          state.isAuthenticated = false;
        }
      } catch (error) {
        console.error('❌ Redux: Error initializing auth from localStorage', error);
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.error = 'Failed to initialize authentication';
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