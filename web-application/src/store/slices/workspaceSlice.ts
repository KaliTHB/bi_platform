// web-application/src/store/slices/workspaceSlice.ts - BASIC WORKSPACE SLICE
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  user_role?: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  availableWorkspaces: [],
  isLoading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      console.log('🏢 Redux: Setting current workspace', action.payload);
      state.currentWorkspace = action.payload;
      state.error = null;
      
      // Store in localStorage for persistence
      localStorage.setItem('workspace', JSON.stringify(action.payload));
    },
    
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      console.log('🏢 Redux: Setting available workspaces', action.payload.length);
      state.availableWorkspaces = action.payload;
    },
    
    clearWorkspace: (state) => {
      console.log('🏢 Redux: Clearing workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.error = null;
      
      // Clear from localStorage
      localStorage.removeItem('workspace');
    },
    
    clearWorkspaces: (state) => {
      console.log('🏢 Redux: Clearing all workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.error = null;
      
      // Clear from localStorage
      localStorage.removeItem('workspace');
    },
    
    setWorkspaceLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setWorkspaceError: (state, action: PayloadAction<string>) => {
      console.log('❌ Redux: Setting workspace error', action.payload);
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearWorkspaceError: (state) => {
      state.error = null;
    },
    
    // Initialize workspace from localStorage
    initializeWorkspace: (state) => {
      try {
        const storedWorkspace = localStorage.getItem('workspace');
        
        if (storedWorkspace) {
          const workspace = JSON.parse(storedWorkspace);
          console.log('🏢 Redux: Initializing workspace from localStorage', workspace);
          state.currentWorkspace = workspace;
        } else {
          console.log('🏢 Redux: No stored workspace found');
        }
      } catch (error) {
        console.error('❌ Redux: Error initializing workspace from localStorage', error);
        localStorage.removeItem('workspace');
      }
    },
  },
});

export const {
  setCurrentWorkspace,
  setAvailableWorkspaces,
  clearWorkspace,
  clearWorkspaces,
  setWorkspaceLoading,
  setWorkspaceError,
  clearWorkspaceError,
  initializeWorkspace,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;

// Selectors
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => state.workspace.currentWorkspace;
export const selectAvailableWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.availableWorkspaces;
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.isLoading;
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => state.workspace.error;