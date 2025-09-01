// web-application/src/store/slices/dashboardSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Dashboard, DashboardFilter, DashboardWithCharts } from '../../types/dashboard.types';
import { dashboardAPI } from '../../services/api';
import { castDraft } from "immer";

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: DashboardWithCharts | null;
  filters: DashboardFilter[];
  activeFilters: Record<string, any>;
  layouts: Record<string, any>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastUpdated: string | null;
  gridBreakpoint: string;
}

const initialState: DashboardState = {
  dashboards: [],
  currentDashboard: null,
  filters: [],
  activeFilters: {},
  layouts: {},
  loading: false,
  saving: false,
  error: null,
  lastUpdated: null,
  gridBreakpoint: 'lg',
};

// Async thunks
export const fetchDashboards = createAsyncThunk(
  'dashboard/fetchDashboards',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.getDashboards(workspaceId);
      if (response.success) {
        return response.dashboards;
      }
      return rejectWithValue(response.message || 'Failed to fetch dashboards');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboards');
    }
  }
);

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (dashboardId: string, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.getDashboard(dashboardId);
      if (response.success) {
        return response.dashboard;
      }
      return rejectWithValue(response.message || 'Failed to fetch dashboard');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard');
    }
  }
);

export const saveDashboard = createAsyncThunk(
  'dashboard/saveDashboard',
  async (
    { dashboardId, updates }: { dashboardId: string; updates: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await dashboardAPI.updateDashboard(dashboardId, updates);
      if (response.success) {
        return response.dashboard;
      }
      return rejectWithValue(response.message || 'Failed to save dashboard');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save dashboard');
    }
  }
);

export const createDashboard = createAsyncThunk(
  'dashboard/createDashboard',
  async (dashboardData: any, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.createDashboard(dashboardData);
      if (response.success) {
        return response.dashboard;
      }
      return rejectWithValue(response.message || 'Failed to create dashboard');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create dashboard');
    }
  }
);

export const deleteDashboard = createAsyncThunk(
  'dashboard/deleteDashboard',
  async (dashboardId: string, { rejectWithValue }) => {
    try {
      const response = await dashboardAPI.deleteDashboard(dashboardId);
      if (response.success) {
        return dashboardId;
      }
      return rejectWithValue(response.message || 'Failed to delete dashboard');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete dashboard');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setCurrentDashboard: (state, action: PayloadAction<DashboardWithCharts | null>) => {
      state.currentDashboard = action.payload ? castDraft(action.payload) : null;
      state.activeFilters = {};
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setActiveFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    
    clearActiveFilters: (state) => {
      state.activeFilters = {};
    },
    
    updateFilter: (state, action: PayloadAction<{ filterId: string; value: any }>) => {
      const { filterId, value } = action.payload;
      state.activeFilters[filterId] = value;
    },
    
    removeFilter: (state, action: PayloadAction<string>) => {
      delete state.activeFilters[action.payload];
    },
    
    setLayouts: (state, action: PayloadAction<Record<string, any>>) => {
      state.layouts = action.payload;
    },
    
    updateLayout: (state, action: PayloadAction<{ breakpoint: string; layout: any[] }>) => {
      const { breakpoint, layout } = action.payload;
      state.layouts[breakpoint] = layout;
      state.lastUpdated = new Date().toISOString();
    },
    
    setGridBreakpoint: (state, action: PayloadAction<string>) => {
      state.gridBreakpoint = action.payload;
    },
    
    addDashboard: (state, action: PayloadAction<Dashboard>) => {
      state.dashboards.push(castDraft(action.payload));
    },
    
    updateDashboard: (state, action: PayloadAction<Dashboard>) => {
      const index = state.dashboards.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.dashboards[index] = castDraft(action.payload);
      }
      if (state.currentDashboard?.id === action.payload.id) {
        state.currentDashboard = { ...state.currentDashboard, ...castDraft(action.payload) } as any;
      }
    },
    
    removeDashboard: (state, action: PayloadAction<string>) => {
      state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
      if (state.currentDashboard?.id === action.payload) {
        state.currentDashboard = null;
      }
    },
    
    setFilters: (state, action: PayloadAction<DashboardFilter[]>) => {
      state.filters = castDraft(action.payload);
    },
    
    addFilter: (state, action: PayloadAction<DashboardFilter>) => {
      state.filters.push(castDraft(action.payload));
    },
    
    updateDashboardFilter: (state, action: PayloadAction<DashboardFilter>) => {
      const index = state.filters.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.filters[index] = castDraft(action.payload);
      }
    },
    
    removeFilterConfig: (state, action: PayloadAction<string>) => {
      state.filters = state.filters.filter(f => f.id !== action.payload);
    },
    
    resetDashboardState: (state) => {
      Object.assign(state, initialState);
    },
    
    // Additional dashboard operations
    setDashboards: (state, action: PayloadAction<Dashboard[]>) => {
      state.dashboards = castDraft(action.payload);
    },
    
    duplicateDashboard: (state, action: PayloadAction<Dashboard>) => {
      state.dashboards.push(castDraft(action.payload));
    },
    
    archiveDashboard: (state, action: PayloadAction<string>) => {
      const dashboard = state.dashboards.find(d => d.id === action.payload);
      if (dashboard) {
        dashboard.status = 'archived';
      }
    },
    
    restoreDashboard: (state, action: PayloadAction<string>) => {
      const dashboard = state.dashboards.find(d => d.id === action.payload);
      if (dashboard) {
        dashboard.status = 'published';
      }
    },
    
    updateDashboardMetadata: (state, action: PayloadAction<{ id: string; metadata: Partial<Dashboard> }>) => {
      const index = state.dashboards.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.dashboards[index] = castDraft({ ...state.dashboards[index], ...action.payload.metadata });
      }
      if (state.currentDashboard?.id === action.payload.id) {
        state.currentDashboard = castDraft({ ...state.currentDashboard, ...action.payload.metadata });
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch dashboards
    builder
      .addCase(fetchDashboards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboards = castDraft(action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch dashboard
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDashboard = castDraft(action.payload);
        if (action.payload.filters) {
          state.filters = castDraft(action.payload.filters);
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Save dashboard
    builder
      .addCase(saveDashboard.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveDashboard.fulfilled, (state, action) => {
        state.saving = false;
        if (state.currentDashboard?.id === action.payload.id) {
          state.currentDashboard = castDraft(action.payload);
        }
        const index = state.dashboards.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.dashboards[index] = castDraft(action.payload);
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(saveDashboard.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // Create dashboard
    builder
      .addCase(createDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboards.push(castDraft(action.payload));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete dashboard
    builder
      .addCase(deleteDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
        if (state.currentDashboard?.id === action.payload) {
          state.currentDashboard = null;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentDashboard,
  clearError,
  setActiveFilters,
  clearActiveFilters,
  updateFilter,
  removeFilter,
  setLayouts,
  updateLayout,
  setGridBreakpoint,
  addDashboard,
  updateDashboard,
  removeDashboard,
  setFilters,
  addFilter,
  updateDashboardFilter,
  removeFilterConfig,
  resetDashboardState,
  setDashboards,
  duplicateDashboard,
  archiveDashboard,
  restoreDashboard,
  updateDashboardMetadata,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;