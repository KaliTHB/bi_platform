// src/store/slices/datasetSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Dataset, DatasetColumn, TransformationConfig, ColumnDefinition } from '../../types/dataset.types';
import { datasetAPI }  from '@/services/index';
import { castDraft } from "immer";

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
  queryResults: Record<string, DatasetQueryResult>;
  transformations: TransformationConfig | null;
  preview: {
    data: any[];
    columns: ColumnDefinition[];
    loading: boolean;
    error: string | null;
  };
  schema: {
    columns: ColumnDefinition[];
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

// Helper function to convert API columns to ColumnDefinition (for schema API responses)
const convertSchemaApiColumnsToColumnDefinitions = (
  apiColumns: Array<{ 
    name: string; 
    type: string; 
    nullable?: boolean; 
    primaryKey?: boolean; 
    description?: string;
    display_name?: string;
  }>
): ColumnDefinition[] => {
  return apiColumns.map(col => ({
    name: col.name,
    display_name: col.display_name || col.name,
    data_type: col.type,
    is_nullable: col.nullable !== undefined ? col.nullable : true,
    is_primary_key: col.primaryKey !== undefined ? col.primaryKey : false,
    default_value: undefined,
    description: col.description,
    format_hint: undefined,
  }));
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

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
            columns: convertSchemaApiColumnsToColumnDefinitions(response.columns || []),
            total_rows: response.total_rows,
            execution_time: response.execution_time,
            cached: response.cached
            // query_id is optional and not provided by API, so omit it
          } as DatasetQueryResult,
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
          columns: convertSchemaApiColumnsToColumnDefinitions(response.columns || []),
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
        return {
          columns: convertSchemaApiColumnsToColumnDefinitions(response.schema?.columns || [])
        };
      }
      return rejectWithValue(response.message || 'Failed to fetch dataset schema');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dataset schema');
    }
  }
);

// ============================================================================
// DATASET SLICE
// ============================================================================

const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    // ========================================================================
    // BASIC DATASET OPERATIONS
    // ========================================================================
    
    setCurrentDataset: (state, action: PayloadAction<Dataset | null>) => {
      state.currentDataset = action.payload ? castDraft(action.payload) : null;
    },

    clearError: (state) => {
      state.error = null;
    },

    // ========================================================================
    // TRANSFORMATION MANAGEMENT
    // ========================================================================
    
    setTransformations: (state, action: PayloadAction<TransformationConfig>) => {
      state.transformations = castDraft(action.payload);
    },

    clearTransformations: (state) => {
      state.transformations = null;
    },

    addTransformationStep: (state, action: PayloadAction<any>) => {
      if (!state.transformations) {
        state.transformations = { steps: [] };
      }
      state.transformations.steps.push(castDraft(action.payload));
    },

    updateTransformationStep: (state, action: PayloadAction<{ index: number; step: any }>) => {
      if (state.transformations && state.transformations.steps[action.payload.index]) {
        state.transformations.steps[action.payload.index] = castDraft(action.payload.step);
      }
    },

    removeTransformationStep: (state, action: PayloadAction<number>) => {
      if (state.transformations) {
        state.transformations.steps.splice(action.payload, 1);
      }
    },

    // ========================================================================
    // QUERY RESULTS MANAGEMENT
    // ========================================================================
    
    clearQueryResults: (state) => {
      state.queryResults = {};
    },

    // ========================================================================
    // LOCAL STATE MANAGEMENT
    // ========================================================================
    
    addDataset: (state, action: PayloadAction<Dataset>) => {
      state.datasets.push(castDraft(action.payload));
      state.lastUpdated = Date.now().toISOString();
    },

    updateDatasetLocal: (state, action: PayloadAction<Dataset>) => {
      const index = state.datasets.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.datasets[index] = castDraft(action.payload);
      }
      if (state.currentDataset?.id === action.payload.id) {
        state.currentDataset = castDraft(action.payload);
      }
      state.lastUpdated = Date.now().toISOString();
    },

    removeDataset: (state, action: PayloadAction<string>) => {
      state.datasets = state.datasets.filter(d => d.id !== action.payload);
      if (state.currentDataset?.id === action.payload) {
        state.currentDataset = null;
      }
      state.lastUpdated = Date.now().toISOString();
    },

    // ========================================================================
    // UI STATE MANAGEMENT
    // ========================================================================
    
    clearPreview: (state) => {
      state.preview = {
        data: [],
        columns: [],
        loading: false,
        error: null,
      };
    },

    clearSchema: (state) => {
      state.schema = {
        columns: [],
        loading: false,
        error: null,
      };
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    resetDatasetState: (state) => {
      return initialState;
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
        state.datasets = castDraft(action.payload);
        state.lastUpdated = Date.now().toISOString();
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
        state.currentDataset = castDraft(action.payload);
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
        state.datasets.push(castDraft(action.payload));
        state.lastUpdated = Date.now().toISOString();
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
          state.currentDataset = castDraft(action.payload);
        }
        // Update in datasets list
        const index = state.datasets.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.datasets[index] = castDraft(action.payload);
        }
        state.lastUpdated = Date.now().toISOString();
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
        state.lastUpdated = Date.now().toISOString();
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
        state.queryResults[queryId] = castDraft(result);
        state.lastUpdated = Date.now().toISOString();
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
        state.preview.data = castDraft(action.payload.preview);
        state.preview.columns = castDraft(action.payload.columns);
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
        state.schema.columns = castDraft(action.payload.columns);
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