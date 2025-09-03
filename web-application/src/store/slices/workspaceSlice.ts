// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  role: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceState {
  current: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  current: null,
  workspaces: [],
  isLoading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.current = action.payload;
    },
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload;
    },
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(action.payload);
    },
    updateWorkspace: (state, action: PayloadAction<Workspace>) => {
      const index = state.workspaces.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.workspaces[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
    },
    removeWorkspace: (state, action: PayloadAction<string>) => {
      state.workspaces = state.workspaces.filter(w => w.id !== action.payload);
      if (state.current?.id === action.payload) {
        state.current = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearWorkspaces: (state) => {
      state.workspaces = [];
      state.current = null;
      state.error = null;
    },
  },
});

export const {
  setCurrentWorkspace,
  setWorkspaces,
  addWorkspace,
  updateWorkspace,
  removeWorkspace,
  setLoading,
  setError,
  clearError,
  clearWorkspaces,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;

// Selectors
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => state.workspace.current;
export const selectWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.workspaces;
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.isLoading;
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => state.workspace.error;








