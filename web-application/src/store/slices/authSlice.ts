import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  workspace: Workspace | null;
  permissions: string[];
  roles: string[];
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  user: null,
  workspace: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      accessToken: string;
      refreshToken: string;
      user: User;
      workspace: Workspace;
    }>) => {
      state.isAuthenticated = true;
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      state.error = null;
    },
    setPermissions: (state, action: PayloadAction<{
      permissions: string[];
      roles: string[];
    }>) => {
      state.permissions = action.payload.permissions;
      state.roles = action.payload.roles;
    },
    updateTokens: (state, action: PayloadAction<{
      accessToken: string;
      refreshToken: string;
    }>) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    switchWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.workspace = null;
      state.permissions = [];
      state.roles = [];
      state.error = null;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setCredentials,
  setPermissions,
  updateTokens,
  switchWorkspace,
  clearAuth,
  setAuthLoading,
  setAuthError,
} = authSlice.actions;

export default authSlice.reducer;