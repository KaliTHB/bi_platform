import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
      state.userPermissions = action.payload;
      state.lastUpdated = new Date();
      state.error = null;
    },
    setPermissionLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPermissionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearPermissions: (state) => {
      state.userPermissions = [];
      state.error = null;
      state.lastUpdated = null;
    },
  },
});

export const {
  setPermissions,
  setPermissionLoading,
  setPermissionError,
  clearPermissions,
} = permissionSlice.actions;

export default permissionSlice.reducer;