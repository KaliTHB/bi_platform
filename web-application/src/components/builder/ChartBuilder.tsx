// File: web-application/src/components/builder/ChartBuilder.tsx
// 
// ✅ Fixed TypeScript conversion error by properly extracting nested properties 
// from API responses instead of treating the entire response as the target type.
// API responses have structure: { success: boolean, dataset: Dataset, message?: string }
// but we need to extract the `dataset` property, not use the whole response.
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
import { datasetAPI } from '../../services/api';

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
  initialData?: any[];
  initialConfig?: any;
  height?: number | string;
  datasetId?: string;
}

// ============================================================================
// Dynamic Chart Configuration
// ============================================================================

// Get available chart types dynamically from ChartFactory
const getAvailableCharts = () => {
  try {
    return ChartFactory.getAllCharts().map(chart => ({
      type: chart.name,
      library: chart.library,
      displayName: chart.displayName,
      category: chart.category,
      description: chart.description
    }));
  } catch (error) {
    console.warn('Could not load dynamic charts, using fallback:', error);
    // Fallback to static list if dynamic loading fails
    return [
      { type: 'bar', library: 'echarts', displayName: 'Bar Chart', category: 'basic' },
      { type: 'line', library: 'echarts', displayName: 'Line Chart', category: 'basic' },
      { type: 'pie', library: 'echarts', displayName: 'Pie Chart', category: 'basic' },
      { type: 'scatter', library: 'echarts', displayName: 'Scatter Plot', category: 'statistical' },
      { type: 'area', library: 'echarts', displayName: 'Area Chart', category: 'basic' },
      { type: 'donut', library: 'chartjs', displayName: 'Donut Chart', category: 'basic' },
      { type: 'radar', library: 'chartjs', displayName: 'Radar Chart', category: 'basic' },
      { type: 'polar', library: 'chartjs', displayName: 'Polar Area', category: 'basic' },
    ];
  }
};

// Get available categories dynamically
const getAvailableCategories = () => {
  try {
    return ChartFactory.getCategories();
  } catch (error) {
    console.warn('Could not load dynamic categories, using fallback:', error);
    return ['basic', 'statistical', 'advanced', 'geographic', 'financial'];
  }
};

// ============================================================================
// Main Component
// ============================================================================

// ============================================================================
// Type-Safe API Response Helpers
// ============================================================================

/**
 * Safely extract dataset from API response
 */
function extractDatasetFromResponse(response: any): Dataset {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response format');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  
  if (!response.dataset) {
    throw new Error('Dataset not found in response');
  }
  
  return response.dataset as Dataset;
}

/**
 * Safely extract schema from API response
 */
function extractSchemaFromResponse(response: any): DatasetSchema {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response format');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  
  if (!response.schema) {
    throw new Error('Schema not found in response');
  }
  
  return response.schema as DatasetSchema;
}

/**
 * Safely extract query data from API response
 */
function extractQueryDataFromResponse(response: any): any[] {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response format');
  }
  
  if ('success' in response && !response.success) {
    throw new Error(response.message || 'Query failed');
  }
  
  if ('data' in response && Array.isArray(response.data)) {
    return response.data;
  }
  
  // For backward compatibility with other response formats
  return extractDataFromResponse(response);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if response has nested data structure
 */
function hasNestedData(response: any): response is NestedDatasetResponse {
  return response?.data && 
         typeof response.data === 'object' && 
         !Array.isArray(response.data) &&
         Array.isArray(response.data.data);
}

/**
 * Type guard to check if response has direct data array
 */
function hasDirectData(response: any): response is DatasetQueryResponse {
  return response?.data && Array.isArray(response.data);
}

/**
 * Type guard to check if response is wrapped in ApiResponse structure
 */
function isApiResponse(response: any): response is ApiResponse<any> {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         'data' in response;
}

/**
 * Extract data array from various response structures
 */
function extractDataFromResponse(response: QueryResponseType): any[] {
  // Handle direct array response
  if (Array.isArray(response)) {
    return response;
  }

  // Handle ApiResponse wrapper
  if (isApiResponse(response)) {
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // Check if wrapped data has nested structure
    if (hasNestedData({ data: response.data })) {
      return response.data.data;
    }
    // If data is an object with data property
    if (response.data && typeof response.data === 'object' && Array.isArray(response.data.data)) {
      return response.data.data;
    }
  }

  // Handle nested data structure
  if (hasNestedData(response)) {
    return response.data.data;
  }

  // Handle direct data structure
  if (hasDirectData(response)) {
    return response.data;
  }

  // Handle object with data property
  if (response && typeof response === 'object' && Array.isArray(response.data)) {
    return response.data;
  }

  // Fallback to empty array
  console.warn('Could not extract data from response structure:', response);
  return [];
}

// ============================================================================
// Main Component
// ============================================================================

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  onChartSelect,
  initialData,
  initialConfig,
  height = 400,
  datasetId
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [selectedChart, setSelectedChart] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('echarts');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartData, setChartData] = useState<any[]>(initialData || []);
  const [chartConfig, setChartConfig] = useState<any>(initialConfig || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for live data
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  // Dynamic chart configuration
  const [availableCharts, setAvailableCharts] = useState(() => getAvailableCharts());
  const [availableCategories, setAvailableCategories] = useState(() => getAvailableCategories());

  // ============================================================================
  // Effects
  // ============================================================================

  // Load dataset data if datasetId is provided
  useEffect(() => {
    if (datasetId && !initialData) {
      loadDatasetData();
    }
  }, [datasetId, initialData]);

  // Refresh available charts when component mounts or chart library changes
  useEffect(() => {
    const refreshCharts = async () => {
      try {
        // Ensure ChartFactory is initialized
        await ChartFactory.initialize?.();
        
        // Get updated chart list
        setAvailableCharts(getAvailableCharts());
        setAvailableCategories(getAvailableCategories());
      } catch (error) {
        console.warn('Could not refresh chart plugins:', error);
      }
    };

    refreshCharts();
  }, []); // Run once on mount

  // ============================================================================
  // Data Loading Functions
  // ============================================================================

  const loadDatasetData = async () => {
    if (!datasetId) return;

    try {
      setLoadingData(true);
      setError(null);
      
      // Fetch dataset metadata with type-safe extraction
      const datasetResponse = await datasetAPI.getDataset(datasetId);
      const datasetData = extractDatasetFromResponse(datasetResponse);
      setDataset(datasetData);
      
      // Fetch dataset schema with type-safe extraction
      const schemaResponse = await datasetAPI.getDatasetSchema(datasetId);
      const schemaData = extractSchemaFromResponse(schemaResponse);
      
      // Convert to ColumnDefinition format
      const columnDefinitions: ColumnDefinition[] = schemaData.columns.map((col: DatasetColumn) => ({
        name: col.name,
        type: col.type as 'string' | 'number' | 'date' | 'boolean',
        displayName: col.display_name || col.name,
        format: col.format_hint,
      }));
      
      setColumns(columnDefinitions);
      
      // Fetch sample data for preview (limit to 1000 rows)
      const queryResponse = await datasetAPI.queryDataset(datasetId, {
        limit: 1000,
        offset: 0
      });
      
      // Extract data with type-safe helper
      const queryData = extractQueryDataFromResponse(queryResponse);
      setChartData(queryData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dataset data';
      setError(errorMessage);
      console.error('Dataset loading error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChartSelect = (chartType: string, library: string) => {
    setSelectedChart(chartType);
    setSelectedLibrary(library);
    
    // Generate default config based on available data
    if (chartData.length > 0) {
      const defaultConfig = generateDefaultConfig(chartType, columns || []);
      setChartConfig(defaultConfig);
    }
    
    onChartSelect?.(chartType, library);
  };

  const handleRefreshCharts = async () => {
    setLoading(true);
    try {
      // Re-initialize chart factory to pick up any new plugins
      await ChartFactory.initialize?.();
      
      // Refresh available charts
      setAvailableCharts(getAvailableCharts());
      setAvailableCategories(getAvailableCategories());
      
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
    if (!selectedChart || chartData.length === 0) {
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
            Select a chart type and ensure data is loaded to see preview
          </Typography>
        </Box>
      );
    }

    try {
      // ✅ Use dynamic ChartFactory.createChart() method
      // The factory will automatically choose between static and dynamic plugins
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
  // Render
  // ============================================================================

  if (loadingData) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading dataset data...
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

      {/* Data Info */}
      {dataset && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dataset: {dataset.display_name || dataset.name}
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip 
              label={`${chartData.length} rows`} 
              size="small" 
              color="primary" 
            />
            <Chip 
              label={`${columns.length} columns`} 
              size="small" 
              color="secondary" 
            />
            {dataset.description && (
              <Typography variant="body2" color="text.secondary" mt={1}>
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
                {availableCharts.length} chart types available across {availableCategories.length} categories
              </Typography>
            </Box>
            
            {/* Category Filter */}
            <FormControl fullWidth sx={{ mb: 2 }}>
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

            {/* Chart Type Grid */}
            <Grid container spacing={1}>
              {filteredCharts.map((chart) => (
                <Grid item xs={12} sm={6} key={`${chart.type}-${chart.library}`}>
                  <Paper
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      border: selectedChart === chart.type && selectedLibrary === chart.library ? 2 : 1,
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
                          bgcolor: ChartFactory.isChartSupported?.(chart.type, chart.library) ? 'success.main' : 'warning.main'
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Chart Preview */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Chart Preview
              </Typography>
              {selectedChart && (
                <Chip 
                  label={`${selectedChart} (${selectedLibrary})`}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Chart Render Area */}
            <Box sx={{ minHeight: height, position: 'relative' }}>
              {renderChart()}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Column Information */}
      {columns.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Available Columns
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {columns.map((column) => (
              <Chip
                key={column.name}
                label={`${column.displayName || column.name} (${column.type})`}
                variant="outlined"
                size="small"
                color={column.type === 'number' ? 'primary' : 
                       column.type === 'date' ? 'secondary' : 'default'}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Debug Information (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
          <Typography variant="subtitle2" gutterBottom>
            🔧 Debug Information
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • Available Charts: {availableCharts.length}
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • Available Categories: {availableCategories.join(', ')}
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • Selected: {selectedChart ? `${selectedLibrary}.${selectedChart}` : 'None'}
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • Chart Data Rows: {chartData.length}
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • Chart Supported: {selectedChart && selectedLibrary ? 
              (ChartFactory.isChartSupported?.(selectedChart, selectedLibrary) ? '✅' : '❌') : 'N/A'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};