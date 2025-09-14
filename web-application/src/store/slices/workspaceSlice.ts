// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Workspace } from '@/types/auth';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  availableWorkspaces: [],
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Consolidated localStorage key
const WORKSPACE_STORAGE_KEY = 'currentWorkspace';

// Helper functions for localStorage operations
const setWorkspaceStorage = (workspace: Workspace | null) => {
  if (typeof window !== 'undefined') {
    if (workspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }
};

const getWorkspaceStorage = (): Workspace | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('❌ Error parsing stored workspace:', error);
    // Clear corrupted data
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return null;
  }
};

const clearWorkspaceStorage = () => {
  if (typeof window !== 'undefined') {
    // Remove new key
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    
    // Clean up old keys for migration
    localStorage.removeItem('workspace');
    localStorage.removeItem('auth_workspace');
    localStorage.removeItem('selected_workspace_id');
  }
};

// Async thunks
export const fetchUserWorkspaces = createAsyncThunk(
  'workspace/fetchUserWorkspaces',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/user/workspaces`, {
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
      
      // Store in localStorage using consolidated key
      setWorkspaceStorage(action.payload);
    },
    
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      console.log('🏢 Redux: Setting available workspaces', action.payload.length);
      state.availableWorkspaces = action.payload;
    },
    
    clearWorkspace: (state) => {
      console.log('🏢 Redux: Clearing current workspace');
      state.currentWorkspace = null;
      state.error = null;
      
      // Clear from localStorage using consolidated key
      setWorkspaceStorage(null);
    },
    
    clearWorkspaces: (state) => {
      console.log('🏢 Redux: Clearing all workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.error = null;
      state.isInitialized = false;
      
      // Clear from localStorage using consolidated key
      clearWorkspaceStorage();
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
    
    // Initialize workspace from localStorage only if not already initialized
    initializeWorkspace: (state) => {
      // Prevent re-initialization
      if (state.isInitialized) {
        console.log('🏢 Redux: Workspace already initialized, skipping');
        return;
      }

      try {
        const storedWorkspace = getWorkspaceStorage();
        
        console.log('🏢 Redux: Initializing workspace from localStorage', {
          hasStoredWorkspace: !!storedWorkspace,
          storedData: storedWorkspace
        });
        
        if (storedWorkspace && storedWorkspace.id && storedWorkspace.name) {
          console.log('✅ Redux: Valid workspace found, setting as current', storedWorkspace);
          state.currentWorkspace = storedWorkspace;
        } else if (storedWorkspace) {
          console.log('❌ Redux: Invalid workspace data found, clearing');
          clearWorkspaceStorage();
        } else {
          console.log('🏢 Redux: No stored workspace found');
        }
        
        state.isInitialized = true;
        
      } catch (error) {
        console.error('❌ Redux: Error initializing workspace from localStorage', error);
        // Clear corrupted data
        clearWorkspaceStorage();
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
          // Store in localStorage using consolidated key
          setWorkspaceStorage(action.payload.currentWorkspace);
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
        
        // Store in localStorage using consolidated key
        setWorkspaceStorage(action.payload);
        
        state.isLoading = false;
        state.error = null;
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