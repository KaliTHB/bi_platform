// File: web-application/src/components/builder/ChartBuilder.tsx
// 
// ✅ Fixed TypeScript conversion error by properly extracting nested properties 
// from API responses instead of treating the entire response as the target type.
// API responses have structure: { success: boolean, dataset: Dataset, message?: string }
// but we need to extract the `dataset` property, not use the whole response.
//
// ✅ Updated to work exclusively with LIVE DATA ONLY:
// - Removed all sample/mock data support
// - Made datasetId required prop
// - Loads full live dataset (no row limits)
// - Clear error messaging when no live data available
// - Enhanced UI to indicate live data status
//
'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Alert, 
  CircularProgress,
  Divider,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { ChartFactory } from '../../plugins/charts/factory/ChartFactory';
import { ColumnDefinition } from '@/types/chart.types';
import { Dataset } from '../../types/dataset.types';
import { datasetAPI, extractDataset, extractQueryData } from '../../services/datasetAPI';

// ============================================================================
// Type Definitions
// ============================================================================

interface DatasetColumn {
  name: string;
  type: string;
  display_name?: string;
  format_hint?: string;
  nullable?: boolean;
  description?: string;
}

interface DatasetSchema {
  columns: DatasetColumn[];
  row_count?: number;
  sample_data?: any[];
}

// Define possible response structures
interface DatasetQueryResponse {
  data: any[];
  columns: Array<{ name: string; type: string }>;
  total_rows: number;
  execution_time: number;
  cached: boolean;
}

interface NestedDatasetResponse {
  data: {
    data: any[];
    columns: Array<{ name: string; type: string }>;
    total_rows: number;
    execution_time: number;
    cached: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

// Union type for all possible response structures
type QueryResponseType = 
  | DatasetQueryResponse 
  | NestedDatasetResponse 
  | ApiResponse<DatasetQueryResponse>
  | ApiResponse<any[]>
  | { data: any[] }
  | any[];

interface ChartBuilderProps {
  onChartSelect?: (chartType: string, chartLibrary: string) => void;
  initialConfig?: any;
  height?: number | string;
  datasetId: string; // Make required since we need live data
}

// Chart info interface with description
interface ChartInfo {
  type: string;
  library: string;
  displayName: string;
  category: string;
  description?: string;
}

// ============================================================================
// Dynamic Chart Configuration
// ============================================================================

// Remove fallback and let errors bubble up to UI
const getAvailableCharts = (): ChartInfo[] => {
  return ChartFactory.getAllCharts().map(chart => ({
    type: chart.name,
    library: chart.library,
    displayName: chart.displayName,
    category: chart.category,
    description: chart.description
  }));
};

// Get available categories dynamically
const getAvailableCategories = (): string[] => {
  return ChartFactory.getCategories();
};

// ============================================================================
// Main Component
// ============================================================================

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  onChartSelect,
  initialConfig = {},
  height = 400,
  datasetId
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [selectedChart, setSelectedChart] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availableCharts, setAvailableCharts] = useState<ChartInfo[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>(initialConfig);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  // Add error handling in component initialization
  const initializeCharts = () => {
    try {
      const charts = getAvailableCharts();
      setAvailableCharts(charts);
      setAvailableCategories(getAvailableCategories());
    } catch (error) {
      console.error('Failed to load chart plugins:', error);
      setError(`Chart factory initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAvailableCharts([]);
      setAvailableCategories([]);
    }
  };

  // Initialize charts on component mount
  useEffect(() => {
    initializeCharts();
  }, []);

  // ============================================================================
  // Data Loading Effects - Live Data Only
  // ============================================================================

  useEffect(() => {
    if (!datasetId) {
      setError('Dataset ID is required for live data');
      return;
    }
    loadDatasetData(datasetId);
  }, [datasetId]);

  useEffect(() => {
    if (chartData.length > 0) {
      generateColumnsFromData(chartData);
    }
  }, [chartData]);

  useEffect(() => {
    if (selectedChart && columns.length > 0) {
      setChartConfig(generateDefaultConfig(selectedChart, columns));
    }
  }, [selectedChart, columns, dataset]);

  // ============================================================================
  // Data Loading Functions
  // ============================================================================

  const loadDatasetData = async (datasetId: string) => {
    if (!datasetId) {
      setError('No dataset ID provided - live data required');
      return;
    }

    setLoadingData(true);
    setError(null);
    
    try {
      // Load dataset metadata using type-safe helper
      const datasetResponse = await datasetAPI.getDataset(datasetId);
      const datasetData = extractDataset(datasetResponse);
      
      if (!datasetData) {
        throw new Error('Dataset not found or inactive');
      }
      
      setDataset(datasetData);
      
      // Load live dataset data (no limit - get all data for production charts)
      const queryResponse = await datasetAPI.queryDataset(datasetId, {
        // No limit - get all live data
      });
      
      const queryData = extractQueryData(queryResponse);
      
      if (!queryData.data || queryData.data.length === 0) {
        throw new Error('No live data available in this dataset');
      }
      
      setChartData(queryData.data);
      
      console.log('Live dataset loaded:', {
        dataset: datasetData.name,
        rows: queryData.data.length,
        columns: queryData.columns.length,
        executionTime: queryData.executionTime,
        cached: queryData.cached
      });
      
    } catch (err) {
      console.error('Failed to load dataset:', err);
      setError(`Failed to load dataset: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setChartData([]);
      setDataset(null);
    } finally {
      setLoadingData(false);
    }
  };

  const generateColumnsFromData = (data: any[]) => {
    if (!data || data.length === 0) {
      setColumns([]);
      return;
    }

    const firstRow = data[0];
    const generatedColumns: ColumnDefinition[] = Object.keys(firstRow).map(key => {
      const value = firstRow[key];
      let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
      
      // Infer column type from first non-null value
      if (typeof value === 'number') {
        type = 'number';
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        type = 'date';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }

      return {
        name: key,
        displayName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: type,
        format: type === 'number' ? 'number' : type === 'date' ? 'date' : 'string'
      };
    });

    setColumns(generatedColumns);
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChartSelect = (chartType: string, library: string) => {
    setSelectedChart(chartType);
    setSelectedLibrary(library);
    setError(null); // Clear any previous errors
    
    if (onChartSelect) {
      onChartSelect(chartType, library);
    }
  };

  const handleRefreshCharts = async () => {
    setLoading(true);
    try {
      // Re-initialize chart factory to pick up any new plugins
      await ChartFactory.initialize?.();
      
      // Refresh available charts
      initializeCharts();
      
      console.log('Chart plugins refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh chart plugins:', error);
      setError('Failed to refresh chart plugins');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Configuration Generation
  // ============================================================================

  const generateDefaultConfig = (chartType: string, availableColumns: ColumnDefinition[]) => {
    const numericColumns = availableColumns.filter(col => col.type === 'number');
    const stringColumns = availableColumns.filter(col => col.type === 'string');
    const dateColumns = availableColumns.filter(col => col.type === 'date');
    
    // Basic default configuration
    const baseConfig = {
      title: dataset?.display_name || `${chartType} Chart`,
      colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
      animation: true,
      showGrid: true,
      showLegend: true,
    };

    // Chart-specific defaults
    switch (chartType) {
      case 'bar':
      case 'line':
        return {
          ...baseConfig,
          xAxis: {
            field: stringColumns[0]?.name || dateColumns[0]?.name || availableColumns[0]?.name,
            label: stringColumns[0]?.displayName || dateColumns[0]?.displayName || 'Category',
          },
          yAxis: {
            field: numericColumns[0]?.name || availableColumns[1]?.name,
            label: numericColumns[0]?.displayName || 'Value',
            format: numericColumns[0]?.format || 'number',
          },
        };
      
      case 'pie':
        return {
          ...baseConfig,
          category: {
            field: stringColumns[0]?.name || availableColumns[0]?.name,
            label: stringColumns[0]?.displayName || 'Category',
          },
          value: {
            field: numericColumns[0]?.name || availableColumns[1]?.name,
            label: numericColumns[0]?.displayName || 'Value',
            format: numericColumns[0]?.format || 'number',
          },
        };
      
      case 'scatter':
        return {
          ...baseConfig,
          xAxis: {
            field: numericColumns[0]?.name || availableColumns[0]?.name,
            label: numericColumns[0]?.displayName || 'X Value',
            format: numericColumns[0]?.format || 'number',
          },
          yAxis: {
            field: numericColumns[1]?.name || availableColumns[1]?.name,
            label: numericColumns[1]?.displayName || 'Y Value',
            format: numericColumns[1]?.format || 'number',
          },
        };
      
      default:
        return baseConfig;
    }
  };

  const renderChart = () => {
    if (!selectedChart) {
      return (
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          height={300}
          bgcolor="grey.50"
          borderRadius={1}
        >
          <Typography variant="body2" color="text.secondary">
            Select a chart type to visualize your live data
          </Typography>
        </Box>
      );
    }

    if (chartData.length === 0) {
      return (
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          height={300}
          bgcolor="grey.50"
          borderRadius={1}
        >
          <Typography variant="body2" color="text.secondary">
            No live data available in dataset: {dataset?.name || 'Unknown'}
          </Typography>
        </Box>
      );
    }

    try {
      // ✅ Use dynamic ChartFactory.createChart() method with live data
      return ChartFactory.createChart(selectedChart, selectedLibrary, {
        data: chartData,
        config: chartConfig,
        dimensions: { width: '100%', height: height },
        onError: (error) => {
          console.error('Chart rendering error:', error);
          setError(`Chart error: ${error.message}`);
        },
        onInteraction: (event) => {
          console.log('Chart interaction:', event);
          // Handle chart interactions here (zoom, click, etc.)
        }
      });
    } catch (err) {
      console.error('Chart factory error:', err);
      return (
        <Alert severity="error">
          Failed to create chart: {err instanceof Error ? err.message : 'Unknown error'}
        </Alert>
      );
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const filteredCharts = selectedCategory === 'all' 
    ? availableCharts 
    : availableCharts.filter(chart => chart.category === selectedCategory);

  // ============================================================================
  // Render - Early validation for live data requirements
  // ============================================================================

  // Validate that we have a datasetId for live data
  if (!datasetId) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <Alert severity="error" sx={{ width: '100%' }}>
          <Typography variant="body2" gutterBottom>
            <strong>Dataset Required:</strong>
          </Typography>
          <Typography variant="body2">
            ChartBuilder requires a live dataset ID to function. No sample or mock data is supported.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loadingData) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading live dataset data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Chart Factory Error Display */}
      {availableCharts.length === 0 && !loadingData && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Chart Factory Error:</strong>
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}

      {/* Live Data Info */}
      {dataset && chartData.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Live Dataset: {dataset.display_name || dataset.name}
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip 
              label={`${chartData.length} live rows`} 
              size="small" 
              color="success"
            />
            <Chip 
              label={`${columns.length} columns`} 
              size="small" 
              color="primary" 
            />
            <Chip 
              label="Live Data" 
              size="small" 
              color="info" 
              variant="outlined"
            />
            {dataset.description && (
              <Typography variant="body2" color="text.secondary" mt={1} sx={{ width: '100%' }}>
                {dataset.description}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Chart Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Chart Type
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleRefreshCharts}
                disabled={loading}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                🔄
              </Button>
            </Box>
            
            {/* Chart Plugin Info */}
            <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {availableCharts.length} chart types available
              </Typography>
            </Box>
            
            {/* Category Filter */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {availableCategories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Chart Type Grid */}
            <Grid container spacing={1}>
              {filteredCharts.map((chart) => (
                <Grid item xs={12} key={`${chart.type}-${chart.library}`}>
                  <Box
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: selectedChart === chart.type && selectedLibrary === chart.library ? 'primary.50' : 'background.paper',
                      borderColor: selectedChart === chart.type && selectedLibrary === chart.library ? 'primary.main' : 'grey.300',
                      '&:hover': { 
                        borderColor: 'primary.light',
                        bgcolor: 'grey.50' 
                      },
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleChartSelect(chart.type, chart.library)}
                  >
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      {chart.displayName}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {chart.library}
                      </Typography>
                      <Chip 
                        label={chart.category} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                    </Box>
                    
                    {chart.description && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          display: 'block', 
                          mt: 0.5,
                          fontSize: '0.7rem',
                          lineHeight: 1.2 
                        }}
                      >
                        {chart.description}
                      </Typography>
                    )}
                    
                    {/* Plugin Status Indicator */}
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'success.main'
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Live Chart Preview Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Live Data Chart Preview
            </Typography>
            
            <Box sx={{ minHeight: height, display: 'flex', flexDirection: 'column' }}>
              {renderChart()}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChartBuilder;