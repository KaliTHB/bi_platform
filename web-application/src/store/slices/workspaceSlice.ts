// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Workspace, WorkspaceMember, CreateWorkspaceRequest, UpdateWorkspaceRequest } from '../../types';
import { workspaceAPI } from '../../services/api';
import { castDraft } from "immer";

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspaces();
      if (response.success) {
        return response.workspaces;
      }
      return rejectWithValue(response.message || 'Failed to fetch workspaces');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workspaces');
    }
  }
);

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchWorkspace',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspace(workspaceId);
      if (response.success) {
        return response.workspace;
      }
      return rejectWithValue(response.message || 'Failed to fetch workspace');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workspace');
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (workspaceData: CreateWorkspaceRequest, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.createWorkspace(workspaceData);
      if (response.success) {
        return response.workspace;
      }
      return rejectWithValue(response.message || 'Failed to create workspace');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create workspace');
    }
  }
);

export const updateWorkspace = createAsyncThunk(
  'workspace/updateWorkspace',
  async (
    { workspaceId, updates }: { workspaceId: string; updates: UpdateWorkspaceRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await workspaceAPI.updateWorkspace(workspaceId, updates);
      if (response.success) {
        return response.workspace;
      }
      return rejectWithValue(response.message || 'Failed to update workspace');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update workspace');
    }
  }
);

export const deleteWorkspace = createAsyncThunk(
  'workspace/deleteWorkspace',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.deleteWorkspace(workspaceId);
      if (response.success) {
        return workspaceId;
      }
      return rejectWithValue(response.message || 'Failed to delete workspace');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete workspace');
    }
  }
);

export const addWorkspaceMember = createAsyncThunk(
  'workspace/addMember',
  async (
    { workspaceId, email, role }: { workspaceId: string; email: string; role: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await workspaceAPI.addMember(workspaceId, email, role);
      if (response.success) {
        return response.workspace;
      }
      return rejectWithValue(response.message || 'Failed to add member');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to add member';
      return rejectWithValue(message);
    }
  }
);

export const removeUser = createAsyncThunk(
  'workspace/removeUser',
  async ({ workspaceId, userId }: { workspaceId: string; userId: string }, { rejectWithValue }) => {
    try {
      await workspaceAPI.removeUser(workspaceId, userId);
      return userId;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to remove user';
      return rejectWithValue(message);
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.currentWorkspace = castDraft(action.payload);
    },
    
    clearWorkspace: (state) => {
      state.currentWorkspace = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateWorkspaceLocal: (state, action: PayloadAction<Partial<Workspace>>) => {
      if (state.currentWorkspace) {
        state.currentWorkspace = castDraft({ ...state.currentWorkspace, ...action.payload });
      }
    },
    
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = castDraft(action.payload);
    },
    
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(castDraft(action.payload));
    },
    
    removeWorkspace: (state, action: PayloadAction<string>) => {
      state.workspaces = state.workspaces.filter(w => w.id !== action.payload);
      if (state.currentWorkspace?.id === action.payload) {
        state.currentWorkspace = null;
      }
    },
    
    setMembers: (state, action: PayloadAction<WorkspaceMember[]>) => {
      state.members = castDraft(action.payload);
    },
    
    addMember: (state, action: PayloadAction<WorkspaceMember>) => {
      state.members.push(castDraft(action.payload));
    },
    
    removeMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter(m => m.user_id !== action.payload);
    },
    
    updateMember: (state, action: PayloadAction<WorkspaceMember>) => {
      const index = state.members.findIndex(m => m.user_id === action.payload.user_id);
      if (index !== -1) {
        state.members[index] = castDraft(action.payload);
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
        state.workspaces = castDraft(action.payload);
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch workspace
    builder
      .addCase(fetchWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorkspace = castDraft(action.payload);
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create workspace
    builder
      .addCase(createWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workspaces.push(castDraft(action.payload));
        state.currentWorkspace = castDraft(action.payload);
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update workspace
    builder
      .addCase(updateWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.workspaces.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = castDraft(action.payload);
        }
        if (state.currentWorkspace?.id === action.payload.id) {
          state.currentWorkspace = castDraft(action.payload);
        }
      })
      .addCase(updateWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete workspace
    builder
      .addCase(deleteWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workspaces = state.workspaces.filter(w => w.id !== action.payload);
        if (state.currentWorkspace?.id === action.payload) {
          state.currentWorkspace = null;
        }
      })
      .addCase(deleteWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add member
    builder
      .addCase(addWorkspaceMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addWorkspaceMember.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentWorkspace) {
          state.currentWorkspace = castDraft(action.payload);
        }
        const index = state.workspaces.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = castDraft(action.payload);
        }
      })
      .addCase(addWorkspaceMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Remove member
    builder
      .addCase(removeWorkspaceMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeWorkspaceMember.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentWorkspace) {
          state.currentWorkspace = castDraft(action.payload);
        }
        const index = state.workspaces.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = castDraft(action.payload);
        }
      })
      .addCase(removeWorkspaceMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setWorkspace,
  clearWorkspace,
  clearError,
  updateWorkspaceLocal,
  setWorkspaces,
  addWorkspace,
  removeWorkspace,
  setMembers,
  addMember,
  removeMember,
  updateMember,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;