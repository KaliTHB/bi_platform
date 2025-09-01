// web-application/src/store/slices/datasetSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Dataset, DatasetColumn, TransformationConfig,convertApiResponseToQueryResult ,DatasetQueryApiResponse} from '../../types/dataset.types';
import { datasetAPI } from '../../services/api';
 // Usage in your datasetSlice.ts:
import { mapApiColumnsToColumnDefinitions } from '../../utils/columnMapper';
interface DatasetQueryResult {
  data: any[];
  columns: DatasetColumn[];
  total_rows: number;
  execution_time: number;
  cached: boolean;
  query_id?: string;
}

interface DatasetState {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  queryResults: Record<string, DatasetQueryResult>; // Cache query results by query hash
  transformations: TransformationConfig | null;
  preview: {
    data: any[];
    columns: DatasetColumn[];
    loading: boolean;
    error: string | null;
  };
  schema: {
    columns: DatasetColumn[];
    loading: boolean;
    error: string | null;
  };
  loading: boolean;
  querying: boolean;
  testing: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DatasetState = {
  datasets: [],
  currentDataset: null,
  queryResults: {},
  transformations: null,
  preview: {
    data: [],
    columns: [],
    loading: false,
    error: null,
  },
  schema: {
    columns: [],
    loading: false,
    error: null,
  },
  loading: false,
  querying: false,
  testing: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchDatasets = createAsyncThunk(
  'dataset/fetchDatasets',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.getDatasets(workspaceId);
      if (response.success) {
        return response.datasets;
      }
      return rejectWithValue(response.message || 'Failed to fetch datasets');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch datasets');
    }
  }
);

export const fetchDataset = createAsyncThunk(
  'dataset/fetchDataset',
  async (datasetId: string, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.getDataset(datasetId);
      if (response.success) {
        return response.dataset;
      }
      return rejectWithValue(response.message || 'Failed to fetch dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dataset');
    }
  }
);

export const createDataset = createAsyncThunk(
  'dataset/createDataset',
  async (datasetData: any, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.createDataset(datasetData);
      if (response.success) {
        return response.dataset;
      }
      return rejectWithValue(response.message || 'Failed to create dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create dataset');
    }
  }
);

export const updateDataset = createAsyncThunk(
  'dataset/updateDataset',
  async (
    { datasetId, updates }: { datasetId: string; updates: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await datasetAPI.updateDataset(datasetId, updates);
      if (response.success) {
        return response.dataset;
      }
      return rejectWithValue(response.message || 'Failed to update dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update dataset');
    }
  }
);

export const deleteDataset = createAsyncThunk(
  'dataset/deleteDataset',
  async (datasetId: string, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.deleteDataset(datasetId);
      if (response.success) {
        return datasetId;
      }
      return rejectWithValue(response.message || 'Failed to delete dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete dataset');
    }
  }
);

export const queryDataset = createAsyncThunk(
  'dataset/queryDataset',
  async (
    { datasetId, queryOptions }: { datasetId: string; queryOptions: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await datasetAPI.queryDataset(datasetId, queryOptions);
      if (response.success) {
        return {
          queryId: `${datasetId}_${JSON.stringify(queryOptions)}`,
          result: {
            data: response.data,
            columns: response.columns,
            total_rows: response.total_rows,
            execution_time: response.execution_time,
            cached: response.cached,
          },
        };
      }
      return rejectWithValue(response.message || 'Failed to query dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to query dataset');
    }
  }
);

export const testDataset = createAsyncThunk(
  'dataset/testDataset',
  async (datasetId: string, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.testDataset(datasetId);
      if (response.success) {
        return {
          preview: response.preview || [],
          columns: response.columns || [],
          execution_time: response.execution_time || 0,
        };
      }
      return rejectWithValue(response.error || response.message || 'Failed to test dataset');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to test dataset');
    }
  }
);

export const fetchDatasetSchema = createAsyncThunk(
  'dataset/fetchDatasetSchema',
  async (datasetId: string, { rejectWithValue }) => {
    try {
      const response = await datasetAPI.getDatasetSchema(datasetId);
      if (response.success) {
        return response.schema;
      }
      return rejectWithValue(response.message || 'Failed to fetch dataset schema');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dataset schema');
    }
  }
);

const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    setCurrentDataset: (state, action: PayloadAction<Dataset | null>) => {
      state.currentDataset = action.payload;
      // Clear related data when switching datasets
      if (!action.payload) {
        state.transformations = null;
        state.preview.data = [];
        state.preview.columns = [];
        state.schema.columns = [];
      }
    },
    clearError: (state) => {
      state.error = null;
      state.preview.error = null;
      state.schema.error = null;
    },
    setTransformations: (state, action: PayloadAction<TransformationConfig>) => {
      state.transformations = action.payload;
    },
    clearTransformations: (state) => {
      state.transformations = null;
    },
    addTransformationStep: (state, action: PayloadAction<any>) => {
      if (!state.transformations) {
        state.transformations = { steps: [] };
      }
      state.transformations.steps.push(action.payload);
    },
    updateTransformationStep: (state, action: PayloadAction<{ index: number; step: any }>) => {
      if (state.transformations && state.transformations.steps[action.payload.index]) {
        state.transformations.steps[action.payload.index] = action.payload.step;
      }
    },
    removeTransformationStep: (state, action: PayloadAction<number>) => {
      if (state.transformations) {
        state.transformations.steps.splice(action.payload, 1);
      }
    },
    clearQueryResults: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        delete state.queryResults[action.payload];
      } else {
        state.queryResults = {};
      }
    },
    addDataset: (state, action: PayloadAction<Dataset>) => {
      state.datasets.push(action.payload);
    },
    updateDatasetLocal: (state, action: PayloadAction<Dataset>) => {
      const index = state.datasets.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.datasets[index] = action.payload;
      }
      // Update current dataset if it's the same one
      if (state.currentDataset?.id === action.payload.id) {
        state.currentDataset = action.payload;
      }
    },
    removeDataset: (state, action: PayloadAction<string>) => {
      state.datasets = state.datasets.filter(d => d.id !== action.payload);
      // Clear current dataset if it's the deleted one
      if (state.currentDataset?.id === action.payload) {
        state.currentDataset = null;
      }
    },
    clearPreview: (state) => {
      state.preview.data = [];
      state.preview.columns = [];
      state.preview.error = null;
    },
    clearSchema: (state) => {
      state.schema.columns = [];
      state.schema.error = null;
    },
    resetDatasetState: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    // Fetch datasets
    builder
      .addCase(fetchDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.loading = false;
        state.datasets = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch dataset
    builder
      .addCase(fetchDataset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataset.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDataset = action.payload;
        if (action.payload.transformation_config) {
          state.transformations = action.payload.transformation_config;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDataset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create dataset
    builder
      .addCase(createDataset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDataset.fulfilled, (state, action) => {
        state.loading = false;
        state.datasets.push(action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createDataset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update dataset
    builder
      .addCase(updateDataset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDataset.fulfilled, (state, action) => {
        state.loading = false;
        // Update current dataset
        if (state.currentDataset?.id === action.payload.id) {
          state.currentDataset = action.payload;
        }
        // Update in datasets list
        const index = state.datasets.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.datasets[index] = action.payload;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateDataset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete dataset
    builder
      .addCase(deleteDataset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDataset.fulfilled, (state, action) => {
        state.loading = false;
        state.datasets = state.datasets.filter(d => d.id !== action.payload);
        if (state.currentDataset?.id === action.payload) {
          state.currentDataset = null;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteDataset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Query dataset
    builder
      .addCase(queryDataset.pending, (state) => {
        state.querying = true;
        state.error = null;
      })
      .addCase(queryDataset.fulfilled, (state, action) => {
        state.querying = false;
        const { queryId, result } = action.payload;
        state.queryResults[queryId] = convertApiResponseToQueryResult(result as DatasetQueryApiResponse);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(queryDataset.rejected, (state, action) => {
        state.querying = false;
        state.error = action.payload as string;
      });

    // Test dataset
    builder
      .addCase(testDataset.pending, (state) => {
        state.testing = true;
        state.preview.loading = true;
        state.preview.error = null;
      })
     .addCase(testDataset.fulfilled, (state, action) => {
  state.testing = false;
  state.preview.loading = false;
  state.preview.data = action.payload.preview;
  state.preview.columns = mapApiColumnsToColumnDefinitions(action.payload.columns);
})
      .addCase(testDataset.rejected, (state, action) => {
        state.testing = false;
        state.preview.loading = false;
        state.preview.error = action.payload as string;
      });

    // Fetch dataset schema
    builder
      .addCase(fetchDatasetSchema.pending, (state) => {
        state.schema.loading = true;
        state.schema.error = null;
      })
      .addCase(fetchDatasetSchema.fulfilled, (state, action) => {
        state.schema.loading = false;
        state.schema.columns = action.payload.columns || [];
      })
      .addCase(fetchDatasetSchema.rejected, (state, action) => {
        state.schema.loading = false;
        state.schema.error = action.payload as string;
      });
  },
});

export const {
  setCurrentDataset,
  clearError,
  setTransformations,
  clearTransformations,
  addTransformationStep,
  updateTransformationStep,
  removeTransformationStep,
  clearQueryResults,
  addDataset,
  updateDatasetLocal,
  removeDataset,
  clearPreview,
  clearSchema,
  resetDatasetState,
} = datasetSlice.actions;

export default datasetSlice.reducer;