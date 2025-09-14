// web-application/src/store/slices/workspaceSlice.ts - FIXED VERSION
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
    console.error('Error parsing workspace from localStorage:', error);
    return null;
  }
};

const clearWorkspaceStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }
};

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Fetch user workspaces from API
export const fetchUserWorkspaces = createAsyncThunk(
  'workspace/fetchUserWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Fetching workspaces from API...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/workspaces`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch workspaces');
      }

      const data = await response.json();
      const workspaces = data.workspaces || [];

      // Check if stored workspace is still valid
      let currentWorkspace = null;
      try {
        const storedWorkspace = getWorkspaceStorage();
        if (storedWorkspace && storedWorkspace.id) {
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

// ✅ FIXED: Switch workspace with API call
export const switchWorkspace = createAsyncThunk(
  'workspace/switchWorkspace',
  async (workspaceSlug: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const availableWorkspaces = state.workspace.availableWorkspaces;
      
      // Find the workspace to switch to
      const targetWorkspace = availableWorkspaces.find((ws: any) => ws.slug === workspaceSlug);
      
      if (!targetWorkspace) {
        // If not found locally, try to fetch fresh workspaces first
        console.log('⚠️ Workspace not found locally, this might be a data sync issue');
        throw new Error(`Workspace '${workspaceSlug}' not found in available workspaces`);
      }

      console.log('🔄 Switching to workspace via API:', targetWorkspace.name);
      
      // ✅ NEW: Make API call to backend to switch workspace
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          workspace_id: targetWorkspace.id  // ✅ Send workspace_id, not slug
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to switch to workspace: ${targetWorkspace.name}`);
      }

      const data = await response.json();
      
      // ✅ Update token in localStorage if provided
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        console.log('✅ New token received and stored');
      }

      // ✅ Update workspace data from API response
      const updatedWorkspace = data.data?.workspace || targetWorkspace;
      
      // Store in localStorage
      setWorkspaceStorage(updatedWorkspace);

      console.log('✅ Workspace switched successfully:', updatedWorkspace.name);
      return updatedWorkspace;
      
    } catch (error: any) {
      console.error('❌ Error switching workspace:', error);
      return rejectWithValue(error.message || 'Failed to switch workspace');
    }
  }
);

// Create workspace slice
const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      console.log('🔄 Redux: Setting current workspace', action.payload?.name || 'null');
      state.currentWorkspace = action.payload;
      setWorkspaceStorage(action.payload);
    },
    
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      console.log('🔄 Redux: Setting available workspaces', action.payload.length);
      state.availableWorkspaces = action.payload;
    },
    
    clearWorkspace: (state) => {
      console.log('🧹 Redux: Clearing current workspace');
      state.currentWorkspace = null;
      clearWorkspaceStorage();
    },
    
    clearWorkspaces: (state) => {
      console.log('🧹 Redux: Clearing all workspace data');
      state.currentWorkspace = null;
      state.availableWorkspaces = [];
      state.isInitialized = false;
      state.error = null;
      clearWorkspaceStorage();
    },
    
    setWorkspaceLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setWorkspaceError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearWorkspaceError: (state) => {
      state.error = null;
    },
    
    initializeWorkspace: (state) => {
      console.log('🚀 Redux: Initializing workspace from localStorage');
      
      try {
        const storedWorkspace = getWorkspaceStorage();
        
        console.log('🔍 Redux: Workspace initialization check:', {
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