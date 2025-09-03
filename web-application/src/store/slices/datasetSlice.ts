// ===============================================

// web-application/src/store/slices/datasetSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  data_source_id: string;
  workspace_id: string;
  query?: string;
  schema?: any;
  status: 'draft' | 'active' | 'inactive' | 'error';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetState {
  datasets: Dataset[];
  current: Dataset | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    search?: string;
    status?: string;
    data_source_id?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: DatasetState = {
  datasets: [],
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

const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    setDatasets: (state, action: PayloadAction<Dataset[]>) => {
      state.datasets = action.payload;
    },
    setCurrentDataset: (state, action: PayloadAction<Dataset | null>) => {
      state.current = action.payload;
    },
    addDataset: (state, action: PayloadAction<Dataset>) => {
      state.datasets.push(action.payload);
    },
    updateDataset: (state, action: PayloadAction<Dataset>) => {
      const index = state.datasets.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.datasets[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
    },
    removeDataset: (state, action: PayloadAction<string>) => {
      state.datasets = state.datasets.filter(d => d.id !== action.payload);
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
    clearDatasets: (state) => {
      state.datasets = [];
      state.current = null;
      state.error = null;
      state.filters = {};
      state.pagination = initialState.pagination;
    },
  },
});

export const {
  setDatasets,
  setCurrentDataset,
  addDataset,
  updateDataset,
  removeDataset,
  setLoading,
  setError,
  setFilters,
  setPagination,
  clearDatasets,
} = datasetSlice.actions;

export default datasetSlice.reducer;
