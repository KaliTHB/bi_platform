// File: web-application/src/store/slices/workspaceSlice.ts
// Complete updated workspace slice with proper API response handling

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
      console.log('✅ Workspace stored:', workspace.name);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      console.log('✅ Workspace storage cleared');
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
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return null;
  }
};

const clearWorkspaceStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }
};

// 🔥 UPDATED: Async thunk to match your API format
export const fetchUserWorkspaces = createAsyncThunk(
  'workspace/fetchUserWorkspaces',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔄 Fetching user workspaces...');

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

      // Extract workspaces from your API format: { success: true, count: 2, data: [...] }
      const workspaces = data.data || [];
      
      // Get currentWorkspace from localStorage (frontend-managed)
      let currentWorkspace = null;
      try {
        const storedWorkspace = getWorkspaceStorage();
        if (storedWorkspace && storedWorkspace.id) {
          // Validate that the stored workspace still exists in available workspaces
          const workspaceExists = workspaces.find((ws: any) => ws.id === storedWorkspace.id);
          if (workspaceExists) {
            currentWorkspace = storedWorkspace;
            console.log('✅ Valid stored workspace found:', currentWorkspace.name);
          } else {
            console.log('⚠️ Stored workspace no longer exists, clearing...');
            clearWorkspaceStorage();
          }
        }
      } catch (error) {
        console.error('❌ Error handling stored workspace:', error);
        clearWorkspaceStorage();
      }

      console.log('✅ fetchUserWorkspaces success:', {
        count: data.count,
        workspaceCount: workspaces.length,
        currentWorkspace: currentWorkspace?.name || 'None selected',
        workspaces: workspaces.map((ws: any) => `${ws.name} (${ws.slug})`)
      });

      return {
        workspaces,
        currentWorkspace,
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
      const availableWorkspaces = state.workspace.availableWorkspaces;
      
      // Find the workspace to switch to
      const targetWorkspace = availableWorkspaces.find((ws: any) => ws.slug === workspaceSlug);
      
      if (!targetWorkspace) {
        throw new Error('Workspace not found');
      }

      console.log('🔄 Switching to workspace:', targetWorkspace.name);
      
      // Store in localStorage
      setWorkspaceStorage(targetWorkspace);

      return targetWorkspace;
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
      console.log('🏢 Redux: Setting current workspace', action.payload.name);
      state.currentWorkspace = action.payload;
      state.error = null;
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
      setWorkspaceStorage(null);
    },
    
    clearWorkspaces: (state) => {
      console.log('🏢 Redux: Clearing all workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.error = null;
      state.isInitialized = false;
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
    
    initializeWorkspace: (state) => {
      if (state.isInitialized) {
        console.log('🏢 Redux: Workspace already initialized, skipping');
        return;
      }

      try {
        const storedWorkspace = getWorkspaceStorage();
        
        console.log('🏢 Redux: Initializing workspace from localStorage', {
          hasStoredWorkspace: !!storedWorkspace,
          storedData: storedWorkspace?.name || 'None'
        });
        
        if (storedWorkspace && storedWorkspace.id && storedWorkspace.name) {
          console.log('✅ Redux: Valid workspace found, setting as current', storedWorkspace.name);
          state.currentWorkspace = storedWorkspace;
        }
        
        state.isInitialized = true;
        
      } catch (error) {
        console.error('❌ Redux: Error initializing workspace from localStorage', error);
        clearWorkspaceStorage();
        state.isInitialized = true;
      }
    },

    resetWorkspaceInitialization: (state) => {
      state.isInitialized = false;
    },
  },

  extraReducers: (builder) => {
    builder
      // Handle fetchUserWorkspaces
      .addCase(fetchUserWorkspaces.pending, (state) => {
        console.log('🔄 Redux: Fetching workspaces...');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserWorkspaces.fulfilled, (state, action) => {
        console.log('✅ Redux: Workspaces fetched successfully', {
          workspaceCount: action.payload.workspaces.length,
          currentWorkspace: action.payload.currentWorkspace?.name || 'None'
        });
        
        // Set available workspaces from API
        state.availableWorkspaces = action.payload.workspaces;
        
        // Set current workspace from localStorage (already validated)
        if (action.payload.currentWorkspace) {
          state.currentWorkspace = action.payload.currentWorkspace;
        } else if (state.availableWorkspaces.length > 0 && !state.currentWorkspace) {
          // Auto-select first workspace if none is currently selected
          const firstWorkspace = state.availableWorkspaces[0];
          state.currentWorkspace = firstWorkspace;
          setWorkspaceStorage(firstWorkspace);
          console.log('🔄 Redux: Auto-selected first workspace:', firstWorkspace.name);
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
        console.log('🔄 Redux: Switching workspace...');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(switchWorkspace.fulfilled, (state, action) => {
        console.log('✅ Redux: Workspace switched successfully to:', action.payload.name);
        state.currentWorkspace = action.payload;
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