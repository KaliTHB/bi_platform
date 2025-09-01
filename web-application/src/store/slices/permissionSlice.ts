// src/store/slices/permissionSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { castDraft } from "immer";
interface PermissionState {
  userPermissions: string[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const initialState: PermissionState = {
  userPermissions: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

const permissionSlice = createSlice({
  name: 'permission',
  initialState,
  reducers: {
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.userPermissions = castDraft(action.payload);
      state.lastUpdated = Date.now();
      state.error = null;
    },
    
    setPermissionLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setPermissionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    clearPermissionError: (state) => {
      state.error = null;
    },
    
    clearPermissions: (state) => {
      state.userPermissions = [];
      state.error = null;
      state.lastUpdated = null;
    },
    
    // Individual permission operations
    addPermission: (state, action: PayloadAction<string>) => {
      if (!state.userPermissions.includes(action.payload)) {
        state.userPermissions.push(action.payload);
        state.lastUpdated = Date.now();
      }
    },
    
    removePermission: (state, action: PayloadAction<string>) => {
      const initialLength = state.userPermissions.length;
      state.userPermissions = state.userPermissions.filter(p => p !== action.payload);
      
      if (state.userPermissions.length !== initialLength) {
        state.lastUpdated = Date.now();
      }
    },
    
    // Bulk permission operations
    addPermissions: (state, action: PayloadAction<string[]>) => {
      const newPermissions = action.payload.filter(p => !state.userPermissions.includes(p));
      if (newPermissions.length > 0) {
        state.userPermissions.push(...newPermissions);
        state.lastUpdated = Date.now();
      }
    },
    
    removePermissions: (state, action: PayloadAction<string[]>) => {
      const permissionsToRemove = new Set(action.payload);
      const originalLength = state.userPermissions.length;
      state.userPermissions = state.userPermissions.filter(p => !permissionsToRemove.has(p));
      
      if (state.userPermissions.length !== originalLength) {
        state.lastUpdated = Date.now();
      }
    },
    
    // Update specific permission (replace old with new)
    updatePermission: (state, action: PayloadAction<{ oldPermission: string; newPermission: string }>) => {
      const { oldPermission, newPermission } = action.payload;
      const index = state.userPermissions.indexOf(oldPermission);
      
      if (index !== -1) {
        state.userPermissions[index] = newPermission;
        state.lastUpdated = Date.now();
      }
    },
    
    // Toggle permission (add if missing, remove if present)
    togglePermission: (state, action: PayloadAction<string>) => {
      const permission = action.payload;
      const index = state.userPermissions.indexOf(permission);
      
      if (index >= 0) {
        state.userPermissions.splice(index, 1);
      } else {
        state.userPermissions.push(permission);
      }
      
      state.lastUpdated = Date.now();
    },
    
    // Refresh permissions timestamp
    refreshPermissionsTimestamp: (state) => {
      state.lastUpdated = Date.now();
    },
    
    // Permission validation helpers
    validatePermissions: (state, action: PayloadAction<string[]>) => {
      // Filter out any invalid permissions that aren't in the valid list
      const validPermissions = new Set(action.payload);
      const filteredPermissions = state.userPermissions.filter(p => validPermissions.has(p));
      
      if (filteredPermissions.length !== state.userPermissions.length) {
        state.userPermissions = filteredPermissions;
        state.lastUpdated = Date.now();
      }
    },
    
    // Merge permissions from different sources
    mergePermissions: (state, action: PayloadAction<{ permissions: string[]; source: string }>) => {
      const newPermissions = action.payload.permissions.filter(p => !state.userPermissions.includes(p));
      if (newPermissions.length > 0) {
        state.userPermissions.push(...newPermissions);
        state.lastUpdated = Date.now();
      }
    },
    
    resetPermissionState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setPermissions,
  setPermissionLoading,
  setPermissionError,
  clearPermissionError,
  clearPermissions,
  addPermission,
  removePermission,
  addPermissions,
  removePermissions,
  updatePermission,
  togglePermission,
  refreshPermissionsTimestamp,
  validatePermissions,
  mergePermissions,
  resetPermissionState,
} = permissionSlice.actions;

export default permissionSlice.reducer;