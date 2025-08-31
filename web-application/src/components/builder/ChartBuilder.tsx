// File: web-application/src/components/builder/ChartBuilder.tsx
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

// Additional types for API responses
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

interface DatasetQueryResponse {
  data: any[];
  columns: Array<{ name: string; type: string }>;
  total_rows: number;
  execution_time: number;
  cached: boolean;
}

interface ChartBuilderProps {
  onChartSelect?: (chartType: string, chartLibrary: string) => void;
  initialData?: any[];
  initialConfig?: any;
  height?: number | string;
  datasetId?: string;
}

// Available chart types (simplified registry)
const AVAILABLE_CHARTS = [
  { type: 'bar', library: 'echarts', displayName: 'Bar Chart', category: 'basic' },
  { type: 'line', library: 'echarts', displayName: 'Line Chart', category: 'basic' },
  { type: 'pie', library: 'echarts', displayName: 'Pie Chart', category: 'basic' },
  { type: 'scatter', library: 'echarts', displayName: 'Scatter Plot', category: 'statistical' },
  { type: 'area', library: 'echarts', displayName: 'Area Chart', category: 'basic' },
  { type: 'donut', library: 'chartjs', displayName: 'Donut Chart', category: 'basic' },
  { type: 'radar', library: 'chartjs', displayName: 'Radar Chart', category: 'basic' },
  { type: 'polar', library: 'chartjs', displayName: 'Polar Area', category: 'basic' },
];

const CHART_CATEGORIES = ['basic', 'statistical', 'advanced', 'geographic', 'financial'];

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  onChartSelect,
  initialData,
  initialConfig,
  height = 400,
  datasetId
}) => {
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

  // Load dataset data if datasetId is provided
  useEffect(() => {
    if (datasetId && !initialData) {
      loadDatasetData();
    }
  }, [datasetId, initialData]);

  const loadDatasetData = async () => {
    if (!datasetId) return;

    try {
      setLoadingData(true);
      setError(null);
      
      // Fetch dataset metadata
      const datasetResponse = await datasetAPI.getDataset(datasetId);
      setDataset(datasetResponse.dataset);
      
      // Fetch dataset schema for column definitions
      const schemaResponse = await datasetAPI.getDatasetSchema(datasetId);
      const schemaData: DatasetSchema = schemaResponse.schema;
      
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
      
      // Handle different response structures
      let queryData: any[];
      if (Array.isArray(queryResponse.data)) {
        // Direct array response
        queryData = queryResponse.data;
      } else if (queryResponse.data && Array.isArray(queryResponse.data.data)) {
        // Nested response structure
        queryData = queryResponse.data.data;
      } else {
        // Fallback - use empty array
        queryData = [];
      }
      
      setChartData(queryData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dataset data');
    } finally {
      setLoadingData(false);
    }
  };

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

  const filteredCharts = selectedCategory === 'all' 
    ? AVAILABLE_CHARTS 
    : AVAILABLE_CHARTS.filter(chart => chart.category === selectedCategory);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading chart builder...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* Chart Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Select Chart Type
            </Typography>
            
            {dataset && (
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={`Dataset: ${dataset.display_name}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {columns.length} columns, {chartData.length} rows
                </Typography>
              </Box>
            )}
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Category Filter */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {CHART_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Chart Type Grid */}
            <Grid container spacing={2}>
              {filteredCharts.map((chart) => (
                <Grid item xs={6} key={`${chart.library}-${chart.type}`}>
                  <Paper
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: selectedChart === chart.type && selectedLibrary === chart.library ? '2px solid' : '1px solid',
                      borderColor: selectedChart === chart.type && selectedLibrary === chart.library ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => handleChartSelect(chart.type, chart.library)}
                  >
                    <Typography variant="body2" sx={{ fontWeight: selectedChart === chart.type ? 'bold' : 'normal' }}>
                      {chart.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {chart.library}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            {filteredCharts.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                No charts available in this category
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Chart Preview Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Chart Preview
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ 
              height: typeof height === 'string' ? height : `${height}px`,
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {loadingData ? (
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>Loading data...</Typography>
                </Box>
              ) : selectedChart && chartData.length > 0 ? (
                <ChartFactory
                  chartType={selectedChart}
                  chartLibrary={selectedLibrary}
                  data={chartData}
                  config={chartConfig}
                  dimensions={{
                    width: typeof height === 'string' ? 600 : height,
                    height: typeof height === 'string' ? 400 : height * 0.7
                  }}
                  onError={(err) => setError(err.message)}
                />
              ) : (
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body1">
                    {!selectedChart 
                      ? 'Select a chart type to preview'
                      : 'No data available for preview'
                    }
                  </Typography>
                  {!datasetId && !initialData && (
                    <Button variant="outlined" sx={{ mt: 2 }} onClick={() => {}}>
                      Load Sample Data
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};