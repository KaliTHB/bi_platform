// File: web-application/src/store/slices/authSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, Workspace, Permission } from '../../types';

const initialState: AuthState = {
  user: null,
  token: null,
  workspace: null,
  permissions: [],
  isAuthenticated: false,
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
    loginSuccess: (state, action: PayloadAction<{
      user: User;
      token: string;
      workspace: Workspace;
      permissions: Permission[];
    }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.workspace = action.payload.workspace;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.workspace = null;
      state.permissions = [];
      state.isAuthenticated = false;
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
      permissions: Permission[];
    }>) => {
      state.workspace = action.payload.workspace;
      state.permissions = action.payload.permissions;
    },
    updatePermissions: (state, action: PayloadAction<Permission[]>) => {
      state.permissions = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  switchWorkspace,
  updatePermissions,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;