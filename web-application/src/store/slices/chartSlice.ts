// ===============================================

// web-application/src/store/slices/chartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Chart {
  id: string;
  name: string;
  description?: string;
  dashboard_id: string;
  dataset_id: string;
  plugin_key: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChartState {
  charts: Chart[];
  current: Chart | null;
  isLoading: boolean;
  error: string | null;
  dashboardCharts: { [dashboardId: string]: Chart[] };
}

const initialState: ChartState = {
  charts: [],
  current: null,
  isLoading: false,
  error: null,
  dashboardCharts: {},
};

const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    setCharts: (state, action: PayloadAction<Chart[]>) => {
      state.charts = action.payload;
    },
    setCurrentChart: (state, action: PayloadAction<Chart | null>) => {
      state.current = action.payload;
    },
    setDashboardCharts: (state, action: PayloadAction<{ dashboardId: string; charts: Chart[] }>) => {
      state.dashboardCharts[action.payload.dashboardId] = action.payload.charts;
    },
    addChart: (state, action: PayloadAction<Chart>) => {
      state.charts.push(action.payload);
      // Add to dashboard charts if dashboard_id exists
      if (action.payload.dashboard_id) {
        if (!state.dashboardCharts[action.payload.dashboard_id]) {
          state.dashboardCharts[action.payload.dashboard_id] = [];
        }
        state.dashboardCharts[action.payload.dashboard_id].push(action.payload);
      }
    },
    updateChart: (state, action: PayloadAction<Chart>) => {
      const index = state.charts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.charts[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
      // Update in dashboard charts
      if (action.payload.dashboard_id && state.dashboardCharts[action.payload.dashboard_id]) {
        const dashboardIndex = state.dashboardCharts[action.payload.dashboard_id].findIndex(
          c => c.id === action.payload.id
        );
        if (dashboardIndex !== -1) {
          state.dashboardCharts[action.payload.dashboard_id][dashboardIndex] = action.payload;
        }
      }
    },
    removeChart: (state, action: PayloadAction<string>) => {
      const chart = state.charts.find(c => c.id === action.payload);
      state.charts = state.charts.filter(c => c.id !== action.payload);
      if (state.current?.id === action.payload) {
        state.current = null;
      }
      // Remove from dashboard charts
      if (chart?.dashboard_id && state.dashboardCharts[chart.dashboard_id]) {
        state.dashboardCharts[chart.dashboard_id] = state.dashboardCharts[chart.dashboard_id].filter(
          c => c.id !== action.payload
        );
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearCharts: (state) => {
      state.charts = [];
      state.current = null;
      state.error = null;
      state.dashboardCharts = {};
    },
  },
});

export const {
  setCharts,
  setCurrentChart,
  setDashboardCharts,
  addChart,
  updateChart,
  removeChart,
  setLoading,
  setError,
  clearCharts,
} = chartSlice.actions;

export default chartSlice.reducer;