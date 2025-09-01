// web-application/src/store/slices/workspaceSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { workspaceAPI } from '@/services/api';
// Fix: Import from workspace.types.ts instead of auth.types.ts
import { Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest } from '@/types/workspace.types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  members: any[];
  activity: any[];
  membersLoading: boolean;
  activityLoading: boolean;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
  members: [],
  activity: [],
  membersLoading: false,
  activityLoading: false,
};

// Async thunks
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspaces();
      return response.workspaces;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch workspaces';
      return rejectWithValue(message);
    }
  }
);

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchWorkspace',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspace(workspaceId);
      return response.workspace;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch workspace';
      return rejectWithValue(message);
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (data: CreateWorkspaceRequest, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.createWorkspace(data);
      return response.workspace;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to create workspace';
      return rejectWithValue(message);
    }
  }
);

export const updateWorkspace = createAsyncThunk(
  'workspace/updateWorkspace',
  async ({ workspaceId, data }: { workspaceId: string; data: UpdateWorkspaceRequest }, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.updateWorkspace(workspaceId, data);
      return response.workspace;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to update workspace';
      return rejectWithValue(message);
    }
  }
);

export const deleteWorkspace = createAsyncThunk(
  'workspace/deleteWorkspace',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      await workspaceAPI.deleteWorkspace(workspaceId);
      return workspaceId;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to delete workspace';
      return rejectWithValue(message);
    }
  }
);

export const fetchWorkspaceMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspaceMembers(workspaceId);
      return response.members;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch workspace members';
      return rejectWithValue(message);
    }
  }
);

export const fetchWorkspaceActivity = createAsyncThunk(
  'workspace/fetchActivity',
  async ({ workspaceId, params }: { workspaceId: string; params?: any }, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspaceActivity(workspaceId, params);
      return response.activity;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch workspace activity';
      return rejectWithValue(message);
    }
  }
);

export const inviteUser = createAsyncThunk(
  'workspace/inviteUser',
  async ({ workspaceId, userData }: { workspaceId: string; userData: any }, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.inviteUser(workspaceId, userData);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to invite user';
      return rejectWithValue(message);
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'workspace/updateUserRole',
  async ({ workspaceId, userId, roleIds }: { workspaceId: string; userId: string; roleIds: string[] }, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.updateUserRole(workspaceId, userId, { role_ids: roleIds });
      return response;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to update user role';
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

// Slice
const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.currentWorkspace = action.payload;
    },
    clearWorkspace: (state) => {
      state.currentWorkspace = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateWorkspaceLocal: (state, action: PayloadAction<Partial<Workspace>>) => {
      if (state.currentWorkspace) {
        state.currentWorkspace = { ...state.currentWorkspace, ...action.payload };
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
        state.currentWorkspace = action.payload;
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
        state.workspaces.push(action.payload);
        state.currentWorkspace = action.payload;
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
        state.currentWorkspace = action.payload;
        // Update in workspaces array
        const index = state.workspaces.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = action.payload;
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

    // Fetch members
    builder
      .addCase(fetchWorkspaceMembers.pending, (state) => {
        state.membersLoading = true;
      })
      .addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
        state.membersLoading = false;
        state.members = action.payload;
      })
      .addCase(fetchWorkspaceMembers.rejected, (state, action) => {
        state.membersLoading = false;
        state.error = action.payload as string;
      });

    // Fetch activity
    builder
      .addCase(fetchWorkspaceActivity.pending, (state) => {
        state.activityLoading = true;
      })
      .addCase(fetchWorkspaceActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchWorkspaceActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.error = action.payload as string;
      });

    // Invite user
    builder
      .addCase(inviteUser.fulfilled, (state, action) => {
        // Optionally update members list or show success message
      });

    // Update user role
    builder
      .addCase(updateUserRole.fulfilled, (state, action) => {
        // Optionally update members list
      });

    // Remove user
    builder
      .addCase(removeUser.fulfilled, (state, action) => {
        state.members = state.members.filter(member => member.id !== action.payload);
      });
  },
});

export const { 
  setWorkspace, 
  clearWorkspace, 
  clearError, 
  updateWorkspaceLocal 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;