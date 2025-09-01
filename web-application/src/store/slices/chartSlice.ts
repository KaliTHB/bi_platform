// src/store/slices/chartSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Chart, ChartConfig, ChartData, ChartFilter, ChartError } from '../../types/chart.types';
// import { ChartConfiguration } from '../../types/chart.types'; // Uncomment if needed for conversion
import { chartAPI } from '../../services/api';
import { castDraft } from "immer";

interface ChartQueryResult {
  data: any[];
  columns: any[];
  total_rows: number;
  execution_time: number;
  cached: boolean;
  query_id?: string;
}

interface FetchChartsParams {
  workspaceId?: string;
  dashboardId?: string;
}

interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan' | 'filter';
  chartId: string;
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
  timestamp: number;
}

interface ChartState {
  charts: Chart[];
  currentChart: Chart | null;
  selectedCharts: string[]; // For bulk operations
  chartData: Record<string, ChartQueryResult>; // Cache chart data by chart ID
  chartConfigurations: Record<string, ChartConfig>; // Chart configs cache - changed to ChartConfig
  interactions: ChartInteractionEvent[]; // Chart interaction history
  filters: ChartFilter[]; // Global chart filters
  activeFilters: Record<string, any>; // Currently applied filters
  
  // UI States
  loading: boolean;
  saving: boolean;
  rendering: Record<string, boolean>; // Track rendering state per chart
  errors: Record<string, ChartError>; // Track errors per chart
  
  // Chart Builder State
  chartBuilder: {
    isOpen: boolean;
    chartType: string | null;
    chartLibrary: string | null;
    data: any[] | null;
    configuration: Partial<ChartConfig>;  // Changed to ChartConfig
    preview: {
      enabled: boolean;
      data: any[] | null;
    };
  };
  
  // Export State
  exportState: {
    inProgress: Record<string, boolean>;
    lastExported: Record<string, string>; // timestamp by chart ID
  };
  
  lastUpdated: string | null;
}

const initialState: ChartState = {
  charts: [],
  currentChart: null,
  selectedCharts: [],
  chartData: {},
  chartConfigurations: {},
  interactions: [],
  filters: [],
  activeFilters: {},
  
  loading: false,
  saving: false,
  rendering: {},
  errors: {},
  
  chartBuilder: {
    isOpen: false,
    chartType: null,
    chartLibrary: null,
    data: null,
    configuration: {},
    preview: {
      enabled: false,
      data: null,
    },
  },
  
  exportState: {
    inProgress: {},
    lastExported: {},
  },
  
  lastUpdated: null,
};

// Helper function to convert ChartConfiguration to ChartConfig
// Keep this if you need to convert from ChartConfiguration elsewhere in your app
/*
const convertToChartConfig = (config: ChartConfiguration): ChartConfig => {
  // Handle null/undefined config
  if (!config) {
    return {
      dimensions: { width: 400, height: 300, margin: { top: 20, right: 20, bottom: 20, left: 20 } },
      series: [],
      axes: {
        x: { field: '', title: '', type: 'category', scale: 'linear', grid: true, labels: true },
        y: { field: '', title: '', type: 'value', scale: 'linear', grid: true, labels: true }
      },
      legend: { show: true, position: 'top', align: 'center', orientation: 'horizontal' },
      colors: [],
      animations: true,
      interactivity: true
    };
  }

  return {
    dimensions: config.dimensions || {
      width: 400,
      height: 300,
      margin: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    series: (config.series || []).map((series, index) => ({
      id: series.id || `series-${Date.now()}-${index}`,
      name: series.name || `Series ${index + 1}`,
      type: series.type || 'line',
      data_field: series.dataKey || series.data_field || '', // Handle both property names
      aggregation: series.aggregation,
      color: series.color,
      visible: series.visible !== false, // Default to true unless explicitly false
      order_index: series.order_index || index
    })),
    axes: config.axes || {
      x: config.xAxis || {
        field: '',
        title: '',
        type: 'category',
        scale: 'linear',
        grid: true,
        labels: true
      },
      y: config.yAxis || {
        field: '',
        title: '',
        type: 'value',
        scale: 'linear',
        grid: true,
        labels: true
      }
    },
    legend: config.legend ? {
      show: config.legend.show !== false,
      position: config.legend.position || 'top',
      align: config.legend.align === 'left' ? 'start' : 
             config.legend.align === 'right' ? 'end' : 'center',
      orientation: 'horizontal'
    } : {
      show: true,
      position: 'top',
      align: 'center',
      orientation: 'horizontal'
    },
    colors: config.colors || [],
    animations: config.animation !== false,
    interactivity: config.interactions !== undefined ? Object.keys(config.interactions).length > 0 : true,
    ...config // Include any additional properties
  };
};
*/

// ============================================================================
// ASYNC THUNKS
// ============================================================================

export const fetchCharts = createAsyncThunk<
  any[],  // Return type (charts array)
  FetchChartsParams,  // Argument type
  { rejectValue: string }  // Rejected value type
>(
  'chart/fetchCharts',
  async (params: FetchChartsParams, { rejectWithValue }) => {
    try {
      const response = await chartAPI.getCharts(params);
      if (response.success) {
        return response.charts;
      }
      return rejectWithValue(response.message || 'Failed to fetch charts');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch charts');
    }
  }
);

export const createChart = createAsyncThunk(
  'chart/createChart',
  async (chartData: Partial<Chart>, { rejectWithValue }) => {
    try {
      const response = await chartAPI.createChart(chartData);
      if (response.success) {
        return response.chart;
      }
      return rejectWithValue(response.message || 'Failed to create chart');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create chart');
    }
  }
);

export const updateChart = createAsyncThunk(
  'chart/updateChart',
  async (params: { chartId: string; data: Partial<Chart> }, { rejectWithValue }) => {
    try {
      const response = await chartAPI.updateChart(params.chartId, params.data);
      if (response.success) {
        return response.chart;
      }
      return rejectWithValue(response.message || 'Failed to update chart');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update chart');
    }
  }
);

export const deleteChart = createAsyncThunk(
  'chart/deleteChart',
  async (chartId: string, { rejectWithValue }) => {
    try {
      const response = await chartAPI.deleteChart(chartId);
      if (response.success) {
        return chartId;
      }
      return rejectWithValue(response.message || 'Failed to delete chart');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete chart');
    }
  }
);

export const fetchChartData = createAsyncThunk(
  'chart/fetchChartData',
  async (params: {
    chartId: string;
    filters?: ChartFilter[];
    refresh?: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await chartAPI.getChartData(params.chartId, {
        filters: params.filters,
        refresh: params.refresh,
      });
      if (response.success) {
        return {
          chartId: params.chartId,
          queryResult: {
            data: response.data,
            columns: response.columns || [],
            total_rows: response.data?.length || 0,
            execution_time: response.execution_time || 0,
            cached: false, // API doesn't return cached flag in this response
            query_id: undefined // API doesn't return query_id in this response
          } as ChartQueryResult
        };
      }
      return rejectWithValue(response.message || 'Failed to fetch chart data');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chart data');
    }
  }
);

export const exportChart = createAsyncThunk(
  'chart/exportChart',
  async (params: {
    chartId: string;
    format: 'png' | 'svg' | 'pdf' | 'jpg' | 'html';
    options?: any;
  }, { rejectWithValue }) => {
    try {
      const response = await chartAPI.exportChart(params.chartId, {
        format: params.format,
        ...params.options
      });
      if (response.success) {
        return {
          chartId: params.chartId,
          exportData: response.export.data,
          filename: response.export.filename,
          format: params.format,
        };
      }
      return rejectWithValue(response.message || 'Failed to export chart');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to export chart');
    }
  }
);

export const duplicateChart = createAsyncThunk(
  'chart/duplicateChart', 
  async (params: { chartId: string; name: string; dashboardId?: string }, { rejectWithValue }) => {
    try {
      const { chartId, name, dashboardId } = params;
      const response = await chartAPI.duplicateChart(chartId, {
        name,
        dashboard_id: dashboardId
      });
      return response.success ? response.chart : rejectWithValue(response.message);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to duplicate chart');
    }
  }
);

// ============================================================================
// CHART SLICE
// ============================================================================

const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    // ========================================================================
    // BASIC CHART OPERATIONS
    // ========================================================================
    
    setCurrentChart: (state, action: PayloadAction<Chart | null>) => {
      state.currentChart = action.payload ? castDraft(action.payload) : null;
    },
    
    clearCurrentChart: (state) => {
      state.currentChart = null;
    },
    
    addChart: (state, action: PayloadAction<Chart>) => {
      state.charts.push(castDraft(action.payload));
      state.lastUpdated = Date.now().toISOString();
    },
    
    updateChartLocal: (state, action: PayloadAction<Chart>) => {
      const index = state.charts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.charts[index] = castDraft(action.payload);
      }
      
      // Update current chart if it's the same one
      if (state.currentChart?.id === action.payload.id) {
        state.currentChart = castDraft(action.payload);
      }
      
      state.lastUpdated = Date.now().toISOString();
    },
    
    removeChart: (state, action: PayloadAction<string>) => {
      state.charts = state.charts.filter(c => c.id !== action.payload);
      
      // Clear current chart if it's the deleted one
      if (state.currentChart?.id === action.payload) {
        state.currentChart = null;
      }
      
      // Clean up related data
      delete state.chartData[action.payload];
      delete state.chartConfigurations[action.payload];
      delete state.rendering[action.payload];
      delete state.errors[action.payload];
      delete state.exportState.inProgress[action.payload];
      delete state.exportState.lastExported[action.payload];
      
      state.lastUpdated = Date.now().toISOString();
    },
    
    // ========================================================================
    // CHART SELECTION
    // ========================================================================
    
    selectChart: (state, action: PayloadAction<string>) => {
      if (!state.selectedCharts.includes(action.payload)) {
        state.selectedCharts.push(action.payload);
      }
    },
    
    deselectChart: (state, action: PayloadAction<string>) => {
      state.selectedCharts = state.selectedCharts.filter(id => id !== action.payload);
    },
    
    toggleChartSelection: (state, action: PayloadAction<string>) => {
      const chartId = action.payload;
      const index = state.selectedCharts.indexOf(chartId);
      
      if (index >= 0) {
        state.selectedCharts.splice(index, 1);
      } else {
        state.selectedCharts.push(chartId);
      }
    },
    
    selectAllCharts: (state) => {
      state.selectedCharts = state.charts.map(chart => chart.id);
    },
    
    clearChartSelection: (state) => {
      state.selectedCharts = [];
    },
    
    // ========================================================================
    // CHART DATA MANAGEMENT
    // ========================================================================
    
    setChartData: (state, action: PayloadAction<{ chartId: string; queryResult: ChartQueryResult }>) => {
      state.chartData[action.payload.chartId] = castDraft(action.payload.queryResult);
    },
    
    clearChartData: (state, action: PayloadAction<string>) => {
      delete state.chartData[action.payload];
    },
    
    clearAllChartData: (state) => {
      state.chartData = {};
    },
    
    // ========================================================================
    // CHART CONFIGURATION
    // ========================================================================
    
    updateChartConfiguration: (state, action: PayloadAction<{
      chartId: string;
      configuration: ChartConfig;  // Changed to ChartConfig to match the error
    }>) => {
      const { chartId, configuration } = action.payload;
      
      // Store the ChartConfig in the cache
      state.chartConfigurations[chartId] = castDraft(configuration);
      
      // Update the chart if it exists
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        chart.config_json = castDraft(configuration);
      }
      
      // Update current chart if it's the same one
      if (state.currentChart?.id === chartId) {
        state.currentChart.config_json = castDraft(configuration);
      }
      
      state.lastUpdated = Date.now().toISOString();
    },
    
    updateChartPosition: (state, action: PayloadAction<{
      chartId: string;
      position: any;
    }>) => {
      const { chartId, position } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      
      if (chart) {
        chart.position_json = castDraft(position);
      }
      
      if (state.currentChart?.id === chartId) {
        state.currentChart.position_json = castDraft(position);
      }
    },
    
    // ========================================================================
    // CHART INTERACTIONS
    // ========================================================================
    
    addChartInteraction: (state, action: PayloadAction<Omit<ChartInteractionEvent, 'timestamp'>>) => {
      const interaction: ChartInteractionEvent = {
        ...action.payload,
        timestamp: Date.now(),
      };
      
      state.interactions.unshift(castDraft(interaction));
      
      // Keep only last 100 interactions
      if (state.interactions.length > 100) {
        state.interactions = state.interactions.slice(0, 100);
      }
    },
    
    clearChartInteractions: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        // Clear interactions for specific chart
        state.interactions = state.interactions.filter(i => i.chartId !== action.payload);
      } else {
        // Clear all interactions
        state.interactions = [];
      }
    },
    
    // ========================================================================
    // CHART FILTERS
    // ========================================================================
    
    setChartFilters: (state, action: PayloadAction<ChartFilter[]>) => {
      state.filters = castDraft(action.payload);
    },
    
    addChartFilter: (state, action: PayloadAction<ChartFilter>) => {
      state.filters.push(castDraft(action.payload));
    },
    
    updateChartFilter: (state, action: PayloadAction<{ index: number; filter: ChartFilter }>) => {
      if (state.filters[action.payload.index]) {
        state.filters[action.payload.index] = castDraft(action.payload.filter);
      }
    },
    
    removeChartFilter: (state, action: PayloadAction<number>) => {
      state.filters.splice(action.payload, 1);
    },
    
    clearChartFilters: (state) => {
      state.filters = [];
      state.activeFilters = {};
    },
    
    setActiveFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.activeFilters = action.payload;
    },
    
    updateActiveFilter: (state, action: PayloadAction<{ key: string; value: any }>) => {
      state.activeFilters[action.payload.key] = action.payload.value;
    },
    
    removeActiveFilter: (state, action: PayloadAction<string>) => {
      delete state.activeFilters[action.payload];
    },
    
    // ========================================================================
    // CHART BUILDER
    // ========================================================================
    
    openChartBuilder: (state, action: PayloadAction<{
      chartType?: string;
      chartLibrary?: string;
      data?: any[];
    }>) => {
      state.chartBuilder.isOpen = true;
      state.chartBuilder.chartType = action.payload.chartType || null;
      state.chartBuilder.chartLibrary = action.payload.chartLibrary || null;
      state.chartBuilder.data = action.payload.data ? castDraft(action.payload.data) : null;
      state.chartBuilder.configuration = {};
    },
    
    closeChartBuilder: (state) => {
      state.chartBuilder.isOpen = false;
      state.chartBuilder.chartType = null;
      state.chartBuilder.chartLibrary = null;
      state.chartBuilder.data = null;
      state.chartBuilder.configuration = {};
      state.chartBuilder.preview.enabled = false;
      state.chartBuilder.preview.data = null;
    },
    
    updateChartBuilderConfiguration: (state, action: PayloadAction<Partial<ChartConfig>>) => {
      state.chartBuilder.configuration = castDraft({
        ...state.chartBuilder.configuration,
        ...action.payload,
      });
    },
    
    setChartBuilderData: (state, action: PayloadAction<any[]>) => {
      state.chartBuilder.data = castDraft(action.payload);
    },
    
    setChartBuilderType: (state, action: PayloadAction<{ type: string; library: string }>) => {
      state.chartBuilder.chartType = action.payload.type;
      state.chartBuilder.chartLibrary = action.payload.library;
    },
    
    toggleChartBuilderPreview: (state) => {
      state.chartBuilder.preview.enabled = !state.chartBuilder.preview.enabled;
    },
    
    setChartBuilderPreviewData: (state, action: PayloadAction<any[]>) => {
      state.chartBuilder.preview.data = castDraft(action.payload);
    },
    
    // ========================================================================
    // UI STATE MANAGEMENT
    // ========================================================================
    
    setChartLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setChartSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
    },
    
    setChartRendering: (state, action: PayloadAction<{ chartId: string; rendering: boolean }>) => {
      state.rendering[action.payload.chartId] = action.payload.rendering;
    },
    
    setChartError: (state, action: PayloadAction<{ chartId: string; error: ChartError | null }>) => {
      if (action.payload.error) {
        state.errors[action.payload.chartId] = castDraft(action.payload.error);
      } else {
        delete state.errors[action.payload.chartId];
      }
    },
    
    clearChartError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },
    
    clearAllChartErrors: (state) => {
      state.errors = {};
    },
    
    // ========================================================================
    // BULK OPERATIONS
    // ========================================================================
    
    bulkUpdateCharts: (state, action: PayloadAction<Chart[]>) => {
      action.payload.forEach(updatedChart => {
        const index = state.charts.findIndex(c => c.id === updatedChart.id);
        if (index !== -1) {
          state.charts[index] = castDraft(updatedChart);
        }
      });
      state.lastUpdated = Date.now().toISOString();
    },
    
    bulkDeleteCharts: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = new Set(action.payload);
      
      // Remove charts
      state.charts = state.charts.filter(c => !idsToDelete.has(c.id));
      
      // Clean up related data
      action.payload.forEach(chartId => {
        delete state.chartData[chartId];
        delete state.chartConfigurations[chartId];
        delete state.rendering[chartId];
        delete state.errors[chartId];
        delete state.exportState.inProgress[chartId];
        delete state.exportState.lastExported[chartId];
      });
      
      // Clear selection
      state.selectedCharts = state.selectedCharts.filter(id => !idsToDelete.has(id));
      
      // Clear current chart if it was deleted
      if (state.currentChart && idsToDelete.has(state.currentChart.id)) {
        state.currentChart = null;
      }
      
      state.lastUpdated = Date.now().toISOString();
    },
    
    // ========================================================================
    // EXPORT MANAGEMENT
    // ========================================================================
    
    setChartExportInProgress: (state, action: PayloadAction<{ chartId: string; inProgress: boolean }>) => {
      state.exportState.inProgress[action.payload.chartId] = action.payload.inProgress;
    },
    
    setChartLastExported: (state, action: PayloadAction<{ chartId: string; timestamp: string }>) => {
      state.exportState.lastExported[action.payload.chartId] = action.payload.timestamp;
    },
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    refreshChartsData: (state, action: PayloadAction<string[]>) => {
      // Clear cached data for specified charts to force refresh
      action.payload.forEach(chartId => {
        delete state.chartData[chartId];
        delete state.errors[chartId];
      });
    },
    
    resetChartState: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch charts
    builder
      .addCase(fetchCharts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCharts.fulfilled, (state, action) => {
        state.loading = false;
        state.charts = castDraft(action.payload);
        state.lastUpdated = Date.now().toISOString();
      })
      .addCase(fetchCharts.rejected, (state, action) => {
        state.loading = false;
      });

    // Create chart
    builder
      .addCase(createChart.pending, (state) => {
        state.saving = true;
      })
      .addCase(createChart.fulfilled, (state, action) => {
        state.saving = false;
        state.charts.push(castDraft(action.payload));
        state.lastUpdated = Date.now().toISOString();
      })
      .addCase(createChart.rejected, (state) => {
        state.saving = false;
      });

    // Update chart
    builder
      .addCase(updateChart.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateChart.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.charts.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.charts[index] = castDraft(action.payload);
        }
        if (state.currentChart?.id === action.payload.id) {
          state.currentChart = castDraft(action.payload);
        }
        state.lastUpdated = Date.now().toISOString();
      })
      .addCase(updateChart.rejected, (state) => {
        state.saving = false;
      });

    // Delete chart
    builder
      .addCase(deleteChart.fulfilled, (state, action) => {
        const chartId = action.payload;
        state.charts = state.charts.filter(c => c.id !== chartId);
        if (state.currentChart?.id === chartId) {
          state.currentChart = null;
        }
        // Clean up related data
        delete state.chartData[chartId];
        delete state.chartConfigurations[chartId];
        delete state.rendering[chartId];
        delete state.errors[chartId];
        delete state.exportState.inProgress[chartId];
        delete state.exportState.lastExported[chartId];
        state.lastUpdated = Date.now().toISOString();
      });

    // Fetch chart data
    builder
      .addCase(fetchChartData.pending, (state, action) => {
        const chartId = action.meta.arg.chartId;
        state.rendering[chartId] = true;
        delete state.errors[chartId];
      })
      .addCase(fetchChartData.fulfilled, (state, action) => {
        const { chartId, queryResult } = action.payload;
        state.rendering[chartId] = false;
        state.chartData[chartId] = castDraft(queryResult);
        delete state.errors[chartId];
      })
      .addCase(fetchChartData.rejected, (state, action) => {
        const chartId = action.meta.arg.chartId;
        state.rendering[chartId] = false;
        state.errors[chartId] = castDraft({
          message: action.payload as string || 'Failed to fetch chart data',
          code: 'DATA_FETCH_ERROR',
        });
      });

    // Export chart
    builder
      .addCase(exportChart.pending, (state, action) => {
        const chartId = action.meta.arg.chartId;
        state.exportState.inProgress[chartId] = true;
      })
      .addCase(exportChart.fulfilled, (state, action) => {
        const { chartId } = action.payload;
        state.exportState.inProgress[chartId] = false;
        state.exportState.lastExported[chartId] = Date.now().toISOString();
      })
      .addCase(exportChart.rejected, (state, action) => {
        const chartId = action.meta.arg.chartId;
        state.exportState.inProgress[chartId] = false;
      });
  },
});

export const {
  // Basic operations
  setCurrentChart,
  clearCurrentChart,
  addChart,
  updateChartLocal,
  removeChart,  
  // Selection
  selectChart,
  deselectChart,
  toggleChartSelection,
  selectAllCharts,
  clearChartSelection,
  
  // Data management
  setChartData,
  clearChartData,
  clearAllChartData,
  
  // Configuration
  updateChartConfiguration,
  updateChartPosition,
  
  // Interactions
  addChartInteraction,
  clearChartInteractions,
  
  // Filters
  setChartFilters,
  addChartFilter,
  updateChartFilter,
  removeChartFilter,
  clearChartFilters,
  setActiveFilters,
  updateActiveFilter,
  removeActiveFilter,
  
  // Chart Builder
  openChartBuilder,
  closeChartBuilder,
  updateChartBuilderConfiguration,
  setChartBuilderData,
  setChartBuilderType,
  toggleChartBuilderPreview,
  setChartBuilderPreviewData,
  
  // UI State
  setChartLoading,
  setChartSaving,
  setChartRendering,
  setChartError,
  clearChartError,
  clearAllChartErrors,
  
  // Bulk operations
  bulkUpdateCharts,
  bulkDeleteCharts,
  
  // Export
  setChartExportInProgress,
  setChartLastExported,
  
  // Utilities
  refreshChartsData,
  resetChartState,
} = chartSlice.actions;

export default chartSlice.reducer;