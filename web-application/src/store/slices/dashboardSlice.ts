// web-application/src/store/slices/dashboardSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DashboardState {
  dashboards: any[];
  currentDashboard: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  dashboards: [],
  currentDashboard: null,
  isLoading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboards: (state, action: PayloadAction<any[]>) => {
      state.dashboards = action.payload;
    },
    setCurrentDashboard: (state, action: PayloadAction<any | null>) => {
      state.currentDashboard = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setDashboards, setCurrentDashboard, setLoading, setError } = dashboardSlice.actions;
export default dashboardSlice.reducer;

