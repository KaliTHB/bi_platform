// src/store/slices/workspaceSlice.ts
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

// ============================================================================
// ASYNC THUNKS
// ============================================================================

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

export const fetchWorkspaceMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.getWorkspaceMembers(workspaceId);
      if (response.success) {
        return response.members;
      }
      return rejectWithValue(response.message || 'Failed to fetch workspace members');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workspace members');
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
      const response = await workspaceAPI.inviteUser(workspaceId, { email, role });
      if (response.success) {
        return { workspaceId, email, role };
      }
      return rejectWithValue(response.message || 'Failed to add member');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to add member';
      return rejectWithValue(message);
    }
  }
);

export const updateWorkspaceMemberRole = createAsyncThunk(
  'workspace/updateMemberRole',
  async (
    { workspaceId, userId, roleIds }: { workspaceId: string; userId: string; roleIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      const response = await workspaceAPI.updateUserRole(workspaceId, userId, { role_ids: roleIds });
      if (response.success) {
        return { workspaceId, userId, roleIds };
      }
      return rejectWithValue(response.message || 'Failed to update member role');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update member role';
      return rejectWithValue(message);
    }
  }
);

export const removeWorkspaceMember = createAsyncThunk(
  'workspace/removeMember',
  async ({ workspaceId, userId }: { workspaceId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await workspaceAPI.removeUser(workspaceId, userId);
      if (response.success) {
        return userId;
      }
      return rejectWithValue(response.message || 'Failed to remove member');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to remove member';
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// WORKSPACE SLICE
// ============================================================================

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    // ========================================================================
    // WORKSPACE MANAGEMENT
    // ========================================================================
    
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
    
    // ========================================================================
    // MEMBER MANAGEMENT
    // ========================================================================
    
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

    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    resetWorkspaceState: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // ========================================================================
    // FETCH WORKSPACES
    // ========================================================================
    
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

    // ========================================================================
    // FETCH WORKSPACE
    // ========================================================================
    
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

    // ========================================================================
    // CREATE WORKSPACE
    // ========================================================================
    
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

    // ========================================================================
    // UPDATE WORKSPACE
    // ========================================================================
    
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

    // ========================================================================
    // DELETE WORKSPACE
    // ========================================================================
    
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

    // ========================================================================
    // FETCH WORKSPACE MEMBERS
    // ========================================================================
    
    builder
      .addCase(fetchWorkspaceMembers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.members = castDraft(action.payload);
      })
      .addCase(fetchWorkspaceMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // ADD WORKSPACE MEMBER (INVITE)
    // ========================================================================
    
    builder
      .addCase(addWorkspaceMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addWorkspaceMember.fulfilled, (state, action) => {
        state.isLoading = false;
        // action.payload is { workspaceId: string; email: string; role: string; }
        // Since inviteUser only sends an invitation and doesn't return updated workspace data,
        // we just update the loading state. The member will appear when they accept the invitation
        // and when we next fetch the members list.
      })
      .addCase(addWorkspaceMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // UPDATE WORKSPACE MEMBER ROLE
    // ========================================================================
    
    builder
      .addCase(updateWorkspaceMemberRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorkspaceMemberRole.fulfilled, (state, action) => {
        state.isLoading = false;
        const { userId, roleIds } = action.payload;
        const memberIndex = state.members.findIndex(m => m.user_id === userId);
        if (memberIndex !== -1) {
          // Update the member's role information
          state.members[memberIndex] = castDraft({
            ...state.members[memberIndex],
            role_ids: roleIds,
            updated_at: new Date().toISOString()
          });
        }
      })
      .addCase(updateWorkspaceMemberRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // REMOVE WORKSPACE MEMBER
    // ========================================================================
    
    builder
      .addCase(removeWorkspaceMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeWorkspaceMember.fulfilled, (state, action) => {
        state.isLoading = false;
        // action.payload is the userId that was removed
        state.members = state.members.filter(member => member.user_id !== action.payload);
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
  resetWorkspaceState,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;