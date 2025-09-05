// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types
interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_default?: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  lastSwitched?: string; // timestamp of last workspace switch
}

// Initial state
const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
  lastSwitched: undefined,
};

// Async thunks (for future use)
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.workspaces || [];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const switchWorkspace = createAsyncThunk(
  'workspace/switchWorkspace',
  async (workspaceSlug: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/auth/switch-workspace', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspace_slug: workspaceSlug }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    // Set current workspace
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload;
      state.lastSwitched = new Date().toISOString();
    },

    // Set available workspaces
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload;
    },

    // Clear workspace data
    clearWorkspace: (state) => {
      state.currentWorkspace = null;
      state.workspaces = [];
      state.error = null;
      state.lastSwitched = undefined;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Update workspace settings
    updateWorkspaceSettings: (state, action: PayloadAction<Record<string, any>>) => {
      if (state.currentWorkspace) {
        state.currentWorkspace.settings = {
          ...state.currentWorkspace.settings,
          ...action.payload,
        };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch workspaces
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workspaces = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Switch workspace
    builder
      .addCase(switchWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(switchWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorkspace = action.payload.workspace;
        state.lastSwitched = new Date().toISOString();
        state.error = null;
      })
      .addCase(switchWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setCurrentWorkspace,
  setWorkspaces,
  clearWorkspace,
  setLoading,
  setError,
  updateWorkspaceSettings,
} = workspaceSlice.actions;

// Export reducer
export default workspaceSlice.reducer;

// Selectors
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => 
  state.workspace.currentWorkspace;

export const selectWorkspaces = (state: { workspace: WorkspaceState }) => 
  state.workspace.workspaces;

export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => 
  state.workspace.isLoading;

export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => 
  state.workspace.error;