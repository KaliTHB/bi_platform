// ===============================================

// web-application/src/store/slices/dashboardSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Dashboard {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  workspace_id: string;
  layout_config?: any;
  theme_config?: any;
  is_public: boolean;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardState {
  dashboards: Dashboard[];
  current: Dashboard | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    search?: string;
    category_id?: string;
    is_public?: boolean;
    is_featured?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: DashboardState = {
  dashboards: [],
  current: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboards: (state, action: PayloadAction<Dashboard[]>) => {
      state.dashboards = action.payload;
    },
    setCurrentDashboard: (state, action: PayloadAction<Dashboard | null>) => {
      state.current = action.payload;
    },
    addDashboard: (state, action: PayloadAction<Dashboard>) => {
      state.dashboards.push(action.payload);
    },
    updateDashboard: (state, action: PayloadAction<Dashboard>) => {
      const index = state.dashboards.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.dashboards[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
    },
    removeDashboard: (state, action: PayloadAction<string>) => {
      state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
      if (state.current?.id === action.payload) {
        state.current = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearDashboards: (state) => {
      state.dashboards = [];
      state.current = null;
      state.error = null;
      state.filters = {};
      state.pagination = initialState.pagination;
    },
  },
});

export const {
  setDashboards,
  setCurrentDashboard,
  addDashboard,
  updateDashboard,
  removeDashboard,
  setLoading,
  setError,
  setFilters,
  setPagination,
  clearDashboards,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;