import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  availableWorkspaces: [],
  isLoading: false,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.currentWorkspace = action.payload;
    },
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.availableWorkspaces = action.payload;
    },
    setWorkspaceLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearWorkspace: (state) => {
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.isLoading = false;
    },
  },
});

export const { 
  setCurrentWorkspace, 
  setAvailableWorkspaces, 
  setWorkspaceLoading, 
  clearWorkspace 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;