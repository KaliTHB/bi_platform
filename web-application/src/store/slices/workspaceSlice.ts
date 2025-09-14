// File: web-application/src/store/slices/workspaceSlice.ts
// Fixed workspace slice using storage utilities instead of hard-coded keys

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Workspace } from '@/types/auth';
import { workspaceStorage, authStorage } from '@/utils/storageUtils';
import { API_ENDPOINTS, API_CONFIG } from '@/constants/api';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants';

// ========================================
// INTERFACES & TYPES
// ========================================
interface WorkspaceState {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
  isInitialized: boolean;
  isSwitching: boolean;
  error: string | null;
  lastSwitchTime: number | null;
}

interface SwitchWorkspacePayload {
  slug: string;
  workspaceId?: string;
}

interface WorkspaceApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// ========================================
// INITIAL STATE
// ========================================
const initialState: WorkspaceState = {
  currentWorkspace: null,
  availableWorkspaces: [],
  isLoading: false,
  isInitialized: false,
  isSwitching: false,
  error: null,
  lastSwitchTime: null,
};

// ========================================
// ASYNC THUNKS
// ========================================

/**
 * Initialize workspace state from localStorage
 * Uses storage utilities instead of direct localStorage access
 */
export const initializeWorkspace = createAsyncThunk(
  'workspace/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      console.log('🏢 WorkspaceSlice: Initializing workspace state');
      
      // ✅ Use storage utility instead of hard-coded localStorage key
      const storedWorkspace = workspaceStorage.getCurrentWorkspace();
      const availableWorkspaces = workspaceStorage.getAvailableWorkspaces() || [];
      
      if (storedWorkspace) {
        console.log('✅ WorkspaceSlice: Found stored workspace:', storedWorkspace.name);
        
        // Validate workspace is still in available workspaces
        const isValidWorkspace = availableWorkspaces.some(ws => ws.id === storedWorkspace.id);
        
        if (isValidWorkspace) {
          dispatch(setCurrentWorkspace(storedWorkspace));
          return {
            currentWorkspace: storedWorkspace,
            availableWorkspaces,
            initialized: true,
          };
        } else {
          console.warn('⚠️ WorkspaceSlice: Stored workspace not in available list, clearing');
          workspaceStorage.clearCurrentWorkspace();
        }
      }
      
      return {
        currentWorkspace: null,
        availableWorkspaces,
        initialized: true,
      };
    } catch (error) {
      console.error('❌ WorkspaceSlice: Failed to initialize workspace', error);
      return rejectWithValue('Failed to initialize workspace state');
    }
  }
);

/**
 * Fetch available workspaces for current user
 */
export const fetchAvailableWorkspaces = createAsyncThunk(
  'workspace/fetchAvailable',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📡 WorkspaceSlice: Fetching available workspaces');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.WORKSPACES.LIST}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: API_CONFIG.TIMEOUT,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data: WorkspaceApiResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid response format');
      }
      
      const workspaces = Array.isArray(data.data) ? data.data : [data.data];
      
      // ✅ Use storage utility to cache workspaces
      workspaceStorage.setAvailableWorkspaces(workspaces);
      
      console.log(`✅ WorkspaceSlice: Fetched ${workspaces.length} workspaces`);
      return workspaces;
      
    } catch (error) {
      console.error('❌ WorkspaceSlice: Failed to fetch workspaces', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Switch to a different workspace
 */
export const switchWorkspace = createAsyncThunk(
  'workspace/switch',
  async (payload: SwitchWorkspacePayload, { getState, dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 WorkspaceSlice: Switching workspace to:', payload.slug);
      
      const state = getState() as any;
      const currentWorkspace = state.workspace.currentWorkspace;
      
      // Don't switch if already in the target workspace
      if (currentWorkspace?.slug === payload.slug) {
        console.log('ℹ️ WorkspaceSlice: Already in target workspace');
        return { workspace: currentWorkspace, switched: false };
      }
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Make API call to switch workspace
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.WORKSPACES.SWITCH}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: payload.slug,
          workspace_id: payload.workspaceId,
        }),
        timeout: API_CONFIG.TIMEOUT,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || ERROR_MESSAGES.WORKSPACE.SWITCH_FAILED || `HTTP ${response.status}`);
      }
      
      const data: WorkspaceApiResponse = await response.json();
      
      if (!data.success || !data.data?.workspace) {
        throw new Error(data.error || 'Invalid workspace switch response');
      }
      
      const newWorkspace = data.data.workspace;
      
      // ✅ Use storage utility to persist workspace
      workspaceStorage.setCurrentWorkspace(newWorkspace);
      
      // Update session data if present
      if (data.data.session) {
        // ✅ Use storage utility for session data
        const sessionData = workspaceStorage.getSessionData() || {};
        workspaceStorage.setSessionData({
          ...sessionData,
          currentWorkspace: newWorkspace,
          lastWorkspaceSwitch: Date.now(),
        });
      }
      
      console.log('✅ WorkspaceSlice: Successfully switched to workspace:', newWorkspace.name);
      
      return {
        workspace: newWorkspace,
        switched: true,
        message: data.message || SUCCESS_MESSAGES.WORKSPACE.SWITCHED,
      };
      
    } catch (error) {
      console.error('❌ WorkspaceSlice: Failed to switch workspace', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Get default workspace for user
 */
export const getDefaultWorkspace = createAsyncThunk(
  'workspace/getDefault',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📡 WorkspaceSlice: Fetching default workspace');
      
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER.DEFAULT_WORKSPACE}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: API_CONFIG.TIMEOUT,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data: WorkspaceApiResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid response format');
      }
      
      const defaultWorkspace = data.data;
      
      // ✅ Use storage utility to set default workspace
      workspaceStorage.setCurrentWorkspace(defaultWorkspace);
      
      console.log('✅ WorkspaceSlice: Set default workspace:', defaultWorkspace.name);
      return defaultWorkspace;
      
    } catch (error) {
      console.error('❌ WorkspaceSlice: Failed to get default workspace', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Clear workspace state (for logout)
 */
export const clearWorkspaceState = createAsyncThunk(
  'workspace/clear',
  async (_, { dispatch }) => {
    console.log('🧹 WorkspaceSlice: Clearing workspace state');
    
    // ✅ Use storage utilities to clear all workspace data
    workspaceStorage.clearCurrentWorkspace();
    workspaceStorage.clearAvailableWorkspaces();
    workspaceStorage.clearSessionData();
    workspaceStorage.clearWorkspacePreferences();
    
    return null;
  }
);

// ========================================
// WORKSPACE SLICE DEFINITION
// ========================================
const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    // Synchronous actions
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload;
      state.error = null;
      
      // ✅ Use storage utility to persist
      if (action.payload) {
        workspaceStorage.setCurrentWorkspace(action.payload);
        console.log('✅ WorkspaceSlice: Set current workspace:', action.payload.name);
      } else {
        workspaceStorage.clearCurrentWorkspace();
        console.log('✅ WorkspaceSlice: Cleared current workspace');
      }
    },
    
    setAvailableWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.availableWorkspaces = action.payload;
      
      // ✅ Use storage utility to persist
      workspaceStorage.setAvailableWorkspaces(action.payload);
      console.log(`✅ WorkspaceSlice: Set ${action.payload.length} available workspaces`);
    },
    
    updateWorkspace: (state, action: PayloadAction<Partial<Workspace> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      
      // Update current workspace if it's the one being updated
      if (state.currentWorkspace?.id === id) {
        state.currentWorkspace = { ...state.currentWorkspace, ...updates };
        // ✅ Use storage utility to persist updated workspace
        workspaceStorage.setCurrentWorkspace(state.currentWorkspace);
      }
      
      // Update in available workspaces list
      state.availableWorkspaces = state.availableWorkspaces.map(workspace =>
        workspace.id === id ? { ...workspace, ...updates } : workspace
      );
      
      // ✅ Use storage utility to persist updated list
      workspaceStorage.setAvailableWorkspaces(state.availableWorkspaces);
      
      console.log('✅ WorkspaceSlice: Updated workspace:', id);
    },
    
    removeWorkspace: (state, action: PayloadAction<string>) => {
      const workspaceId = action.payload;
      
      // Clear current workspace if it's being removed
      if (state.currentWorkspace?.id === workspaceId) {
        state.currentWorkspace = null;
        workspaceStorage.clearCurrentWorkspace();
      }
      
      // Remove from available workspaces
      state.availableWorkspaces = state.availableWorkspaces.filter(
        workspace => workspace.id !== workspaceId
      );
      
      // ✅ Use storage utility to persist updated list
      workspaceStorage.setAvailableWorkspaces(state.availableWorkspaces);
      
      console.log('✅ WorkspaceSlice: Removed workspace:', workspaceId);
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetWorkspaceState: (state) => {
      return { ...initialState };
    },
  },
  
  // Handle async thunk actions
  extraReducers: (builder) => {
    // Initialize workspace
    builder
      .addCase(initializeWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload.currentWorkspace) {
          state.currentWorkspace = action.payload.currentWorkspace;
        }
        state.availableWorkspaces = action.payload.availableWorkspaces;
        state.error = null;
      })
      .addCase(initializeWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true; // Still mark as initialized even if failed
        state.error = action.payload as string;
      });
    
    // Fetch available workspaces
    builder
      .addCase(fetchAvailableWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableWorkspaces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableWorkspaces = action.payload;
        state.error = null;
      })
      .addCase(fetchAvailableWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Switch workspace
    builder
      .addCase(switchWorkspace.pending, (state) => {
        state.isSwitching = true;
        state.error = null;
      })
      .addCase(switchWorkspace.fulfilled, (state, action) => {
        state.isSwitching = false;
        if (action.payload.switched) {
          state.currentWorkspace = action.payload.workspace;
          state.lastSwitchTime = Date.now();
        }
        state.error = null;
      })
      .addCase(switchWorkspace.rejected, (state, action) => {
        state.isSwitching = false;
        state.error = action.payload as string;
      });
    
    // Get default workspace
    builder
      .addCase(getDefaultWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDefaultWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorkspace = action.payload;
        state.error = null;
      })
      .addCase(getDefaultWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Clear workspace state
    builder
      .addCase(clearWorkspaceState.fulfilled, (state) => {
        return { ...initialState, isInitialized: true };
      });
  },
});

// ========================================
// EXPORT ACTIONS AND REDUCER
// ========================================
export const {
  setCurrentWorkspace,
  setAvailableWorkspaces,
  updateWorkspace,
  removeWorkspace,
  clearError,
  resetWorkspaceState,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;

// ========================================
// SELECTORS
// ========================================
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => state.workspace.currentWorkspace;
export const selectAvailableWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.availableWorkspaces;
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.isLoading;
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => state.workspace.error;
export const selectWorkspaceInitialized = (state: { workspace: WorkspaceState }) => state.workspace.isInitialized;
export const selectWorkspaceSwitching = (state: { workspace: WorkspaceState }) => state.workspace.isSwitching;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if user has access to a specific workspace
 */
export const hasWorkspaceAccess = (workspaceId: string, availableWorkspaces: Workspace[]): boolean => {
  return availableWorkspaces.some(ws => ws.id === workspaceId);
};

/**
 * Get workspace by slug from available workspaces
 */
export const getWorkspaceBySlug = (slug: string, availableWorkspaces: Workspace[]): Workspace | null => {
  return availableWorkspaces.find(ws => ws.slug === slug) || null;
};

/**
 * Get workspace display name with fallback
 */
export const getWorkspaceDisplayName = (workspace: Workspace | null): string => {
  return workspace?.display_name || workspace?.name || 'Unknown Workspace';
};

/**
 * Check if workspace switching is needed
 */
export const shouldSwitchWorkspace = (targetSlug: string, currentWorkspace: Workspace | null): boolean => {
  return !currentWorkspace || currentWorkspace.slug !== targetSlug;
};