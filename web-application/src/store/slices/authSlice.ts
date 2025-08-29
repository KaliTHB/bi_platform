import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface Workspace {
  id: string;
  name: string;
  display_name: string;
  slug: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  workspace: Workspace | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  workspace: null,
  permissions: [],
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    login: (state, action: PayloadAction<{
      user: User;
      token: string;
      workspace: Workspace;
      permissions: string[];
    }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.workspace = action.payload.workspace;
      state.permissions = action.payload.permissions;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.workspace = null;
      state.permissions = [];
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.workspace = null;
      state.permissions = [];
      state.loading = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    switchWorkspace: (state, action: PayloadAction<{
      workspace: Workspace;
      permissions: string[];
    }>) => {
      state.workspace = action.payload.workspace;
      state.permissions = action.payload.permissions;
    },
  },
});

export const {
  loginStart,
  login,
  loginFailure,
  logout,
  updateUser,
  switchWorkspace,
} = authSlice.actions;

export default authSlice.reducer;