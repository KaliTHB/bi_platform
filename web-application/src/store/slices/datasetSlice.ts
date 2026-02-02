// web-application/src/store/slices/datasetSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DatasetState {
  datasets: any[];
  currentDataset: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialDatasetState: DatasetState = {
  datasets: [],
  currentDataset: null,
  isLoading: false,
  error: null,
};

const datasetSlice = createSlice({
  name: 'dataset',
  initialState: initialDatasetState,
  reducers: {
    setDatasets: (state, action: PayloadAction<any[]>) => {
      state.datasets = action.payload;
    },
    setCurrentDataset: (state, action: PayloadAction<any | null>) => {
      state.currentDataset = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setDatasets, setCurrentDataset } = datasetSlice.actions;
export default datasetSlice.reducer;

