// web-application/src/store/slices/workspaceSlice.ts - FIXED VERSION
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

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
  is_active?: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean; // Track if workspace has been initialized
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  availableWorkspaces: [],
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Async thunk to fetch user's workspaces
export const fetchUserWorkspaces = createAsyncThunk(
  'workspace/fetchUserWorkspaces',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/user/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workspaces: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch workspaces');
      }

      return {
        workspaces: data.workspaces || [],
        currentWorkspace: data.currentWorkspace || null,
      };
    } catch (error: any) {
      console.error('❌ Error fetching workspaces:', error);
      return rejectWithValue(error.message || 'Failed to fetch workspaces');
    }
  }
);

// Async thunk to switch workspace
export const switchWorkspace = createAsyncThunk(
  'workspace/switchWorkspace',
  async (workspaceSlug: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/user/workspace/${workspaceSlug}/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to switch workspace: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to switch workspace');
      }

      return data.workspace;
    } catch (error: any) {
      console.error('❌ Error switching workspace:', error);
      return rejectWithValue(error.message || 'Failed to switch workspace');
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
      console.log('🏢 Redux: Setting current workspace', action.payload);
      state.currentWorkspace = action.payload;
      state.error = null;
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('workspace', JSON.stringify(action.payload));
        localStorage.setItem('selected_workspace_id', action.payload.id);
      }
    },
    
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      console.log('🏢 Redux: Setting available workspaces', action.payload.length);
      state.availableWorkspaces = action.payload;
    },
    
    clearWorkspace: (state) => {
      console.log('🏢 Redux: Clearing current workspace');
      state.currentWorkspace = null;
      state.error = null;
      
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('workspace');
        localStorage.removeItem('selected_workspace_id');
      }
    },
    
    clearWorkspaces: (state) => {
      console.log('🏢 Redux: Clearing all workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.error = null;
      state.isInitialized = false;
      
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('workspace');
        localStorage.removeItem('selected_workspace_id');
      }
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
    
    // FIXED: Initialize workspace from localStorage only if not already initialized
    initializeWorkspace: (state) => {
      // Prevent re-initialization
      if (state.isInitialized) {
        console.log('🏢 Redux: Workspace already initialized, skipping');
        return;
      }

      try {
        if (typeof window === 'undefined') {
          console.log('🏢 Redux: Server-side rendering, skipping localStorage access');
          return;
        }

        const storedWorkspace = localStorage.getItem('workspace');
        
        console.log('🏢 Redux: Initializing workspace from localStorage', {
          hasStoredWorkspace: !!storedWorkspace,
          storedData: storedWorkspace ? JSON.parse(storedWorkspace) : null
        });
        
        if (storedWorkspace) {
          const workspace = JSON.parse(storedWorkspace);
          
          // Validate workspace object structure
          if (workspace && workspace.id && workspace.name) {
            console.log('✅ Redux: Valid workspace found, setting as current', workspace);
            state.currentWorkspace = workspace;
          } else {
            console.log('❌ Redux: Invalid workspace data found, clearing');
            localStorage.removeItem('workspace');
          }
        } else {
          console.log('🏢 Redux: No stored workspace found');
        }
        
        state.isInitialized = true;
        
      } catch (error) {
        console.error('❌ Redux: Error initializing workspace from localStorage', error);
        // Clear corrupted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('workspace');
          localStorage.removeItem('selected_workspace_id');
        }
        state.isInitialized = true;
      }
    },

    // Reset initialization state (useful for testing or re-initialization)
    resetWorkspaceInitialization: (state) => {
      state.isInitialized = false;
    },
  },

  extraReducers: (builder) => {
    // Handle fetchUserWorkspaces
    builder
      .addCase(fetchUserWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserWorkspaces.fulfilled, (state, action) => {
        console.log('✅ Redux: Workspaces fetched successfully');
        state.availableWorkspaces = action.payload.workspaces;
        
        if (action.payload.currentWorkspace) {
          state.currentWorkspace = action.payload.currentWorkspace;
          // Store in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('workspace', JSON.stringify(action.payload.currentWorkspace));
          }
        }
        
        state.isLoading = false;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(fetchUserWorkspaces.rejected, (state, action) => {
        console.log('❌ Redux: Failed to fetch workspaces', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
        state.isInitialized = true;
      })
      
      // Handle switchWorkspace
      .addCase(switchWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(switchWorkspace.fulfilled, (state, action) => {
        console.log('✅ Redux: Workspace switched successfully');
        state.currentWorkspace = action.payload;
        state.isLoading = false;
        state.error = null;
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('workspace', JSON.stringify(action.payload));
        }
      })
      .addCase(switchWorkspace.rejected, (state, action) => {
        console.log('❌ Redux: Failed to switch workspace', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });
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
  resetWorkspaceInitialization,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;

// Selectors
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => state.workspace.currentWorkspace;
export const selectAvailableWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.availableWorkspaces;
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.isLoading;
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => state.workspace.error;
export const selectWorkspaceInitialized = (state: { workspace: WorkspaceState }) => state.workspace.isInitialized;