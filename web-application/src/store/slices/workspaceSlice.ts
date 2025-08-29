// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Workspace {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  description?: string;
}

interface WorkspaceState {
  current: Workspace | null;
  available: Workspace[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  current: null,
  available: [],
  loading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.current = action.payload;
      state.error = null;
    },
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.available = action.payload;
    },
    clearWorkspace: (state) => {
      state.current = null;
      state.available = [];
      state.error = null;
    },
    setWorkspaceLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setWorkspaceError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setCurrentWorkspace,
  setAvailableWorkspaces,
  clearWorkspace,
  setWorkspaceLoading,
  setWorkspaceError,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;