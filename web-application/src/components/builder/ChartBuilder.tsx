'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Create as CreateIcon 
} from '@mui/icons-material';
import { ChartFactory, ChartPluginInfo } from '@/plugins/charts/factory/ChartFactory';
import { ChartProps } from '@/types/chart.types';

// ============================================================================
// Type Definitions
// ============================================================================

interface ChartInfo {
  type: string;
  library: string;
  displayName: string;
  category: string;
  description?: string;
  version?: string;
  tags?: string[];
}

interface ChartBuilderProps {
  data: any[];
  onChartSelect?: (chartType: string, library: string) => void;
  onChartCreate?: (chartElement: React.ReactElement) => void;
  selectedDataset?: any;
  columns?: ColumnDefinition[];
  workspaceId?: string;
  dashboardId?: string;
}

interface ColumnDefinition {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
}

interface ChartCreationState {
  isCreating: boolean;
  error: string | null;
}

// ============================================================================
// Main ChartBuilder Component
// ============================================================================

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  data,
  onChartSelect,
  onChartCreate,
  selectedDataset,
  columns = [],
  workspaceId,
  dashboardId
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [availableCharts, setAvailableCharts] = useState<ChartInfo[]>([]);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartFactoryInitialized, setChartFactoryInitialized] = useState(false);
  const [chartCreationState, setChartCreationState] = useState<ChartCreationState>({
    isCreating: false,
    error: null
  });
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  // ============================================================================
  // Chart Factory Initialization
  // ============================================================================
  
  const initializeCharts = useCallback(async (isRetry = false) => {
    try {
      setIsLoadingCharts(true);
      setError(null);

      if (isRetry) {
        setInitializationAttempts(prev => prev + 1);
      }

      // Initialize ChartFactory with timeout
      const initPromise = ChartFactory.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      );

      await Promise.race([initPromise, timeoutPromise]);
      setChartFactoryInitialized(true);

      // Get available charts
      const charts = await ChartFactory.getAllCharts();
      
      // Transform to the expected format
      const chartInfo: ChartInfo[] = charts.map((chart: ChartPluginInfo) => ({
        type: chart.name.includes('-') ? chart.name.split('-').slice(1).join('-') : chart.name,
        library: chart.library,
        displayName: chart.displayName || formatDisplayName(chart.name),
        category: chart.category,
        description: chart.description,
        version: chart.version,
        tags: extractTagsFromChart(chart)
      }));

      setAvailableCharts(chartInfo);
      
      // Log success for debugging
      console.log('ChartBuilder: Successfully loaded', chartInfo.length, 'charts');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load charts';
      setError(errorMessage);
      console.error('ChartBuilder initialization error:', err);
      
      // Set fallback charts if available
      setAvailableCharts(getFallbackCharts());
    } finally {
      setIsLoadingCharts(false);
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    initializeCharts();
  }, [initializeCharts]);

  // ============================================================================
  // Chart Selection Handlers
  // ============================================================================
  
  const handleChartSelect = useCallback((chartType: string, library: string) => {
    setSelectedChart(chartType);
    setSelectedLibrary(library);
    setChartCreationState({ isCreating: false, error: null });
    
    onChartSelect?.(chartType, library);
    
    console.log('ChartBuilder: Selected chart', { chartType, library });
  }, [onChartSelect]);

  const handleClearSelection = useCallback(() => {
    setSelectedChart(null);
    setSelectedLibrary(null);
    setChartCreationState({ isCreating: false, error: null });
  }, []);

  // ============================================================================
  // Chart Creation
  // ============================================================================
  
  const handleCreateChart = useCallback(async () => {
    if (!selectedChart || !selectedLibrary || !chartFactoryInitialized) {
      return;
    }

    try {
      setChartCreationState({ isCreating: true, error: null });

      // Validate data
      if (!data || data.length === 0) {
        throw new Error('No data available for chart creation');
      }

      // Generate appropriate config
      const config = generateDefaultConfig(selectedChart, columns, data);
      
      console.log('ChartBuilder: Creating chart with config', {
        type: selectedChart,
        library: selectedLibrary,
        config,
        dataLength: data.length
      });

      // Create chart element
      const chartElement = ChartFactory.createChart(
        selectedChart,
        selectedLibrary,
        {
          data,
          config,
          dimensions: { width: 800, height: 400 },
          onError: (error) => {
            console.error('Chart runtime error:', error);
            setChartCreationState(prev => ({ 
              ...prev, 
              error: `Chart Error: ${error.message}` 
            }));
          },
          onInteraction: (event) => {
            console.log('Chart interaction:', event);
          }
        }
      );

      // Notify parent component
      onChartCreate?.(chartElement);
      
      setChartCreationState({ isCreating: false, error: null });
      
      console.log('ChartBuilder: Chart created successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chart';
      setChartCreationState({ 
        isCreating: false, 
        error: errorMessage 
      });
      console.error('Chart creation error:', err);
    }
  }, [selectedChart, selectedLibrary, data, columns, chartFactoryInitialized, onChartCreate]);

  // ============================================================================
  // Configuration Generation
  // ============================================================================
  
  const generateDefaultConfig = useCallback((chartType: string, availableColumns: ColumnDefinition[], chartData: any[]) => {
    const numericColumns = availableColumns.filter(col => col.type === 'number');
    const stringColumns = availableColumns.filter(col => col.type === 'string');
    const dateColumns = availableColumns.filter(col => col.type === 'date');
    
    // Analyze data if no column definitions
    const dataColumns = availableColumns.length > 0 ? availableColumns : analyzeDataColumns(chartData);
    
    // Base configuration
    const baseConfig = {
      title: `${formatDisplayName(chartType)} Chart`,
      colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4'],
      animation: true,
      showGrid: true,
      showLegend: true,
    };

    // Chart-specific configurations
    switch (chartType) {
      case 'bar':
        return {
          ...baseConfig,
          xField: stringColumns[0]?.name || dateColumns[0]?.name || dataColumns[0]?.name || 'category',
          yField: numericColumns[0]?.name || dataColumns.find(col => col.type === 'number')?.name || 'value',
          orientation: 'vertical',
          showValues: true
        };
      
      case 'line':
        return {
          ...baseConfig,
          xField: dateColumns[0]?.name || stringColumns[0]?.name || dataColumns[0]?.name || 'x',
          yField: numericColumns[0]?.name || dataColumns.find(col => col.type === 'number')?.name || 'y',
          smooth: false,
          showPoints: true,
          fillArea: false
        };
      
      case 'pie':
        return {
          ...baseConfig,
          labelField: stringColumns[0]?.name || dataColumns[0]?.name || 'name',
          valueField: numericColumns[0]?.name || dataColumns.find(col => col.type === 'number')?.name || 'value',
          isDonut: false,
          showLabels: true,
          legendPosition: 'right'
        };
      
      case 'scatter':
        return {
          ...baseConfig,
          xField: numericColumns[0]?.name || dataColumns[0]?.name || 'x',
          yField: numericColumns[1]?.name || dataColumns[1]?.name || 'y',
          sizeField: numericColumns[2]?.name,
          symbolSize: 20
        };

      case 'radar':
        return {
          ...baseConfig,
          nameField: stringColumns[0]?.name || dataColumns[0]?.name || 'name',
          valueFields: numericColumns.slice(0, 6).map(col => col.name) || 
                      dataColumns.filter(col => col.type === 'number').slice(0, 6).map(col => col.name)
        };

      case 'waterfall':
        return {
          ...baseConfig,
          xField: stringColumns[0]?.name || dataColumns[0]?.name || 'category',
          yField: numericColumns[0]?.name || dataColumns.find(col => col.type === 'number')?.name || 'value',
          showConnect: true,
          showValues: true
        };
      
      default:
        // Generic config for unknown chart types
        return {
          ...baseConfig,
          xField: dataColumns[0]?.name || 'x',
          yField: dataColumns[1]?.name || 'y'
        };
    }
  }, []);

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const formatDisplayName = (name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const extractTagsFromChart = (chart: ChartPluginInfo): string[] => {
    // Extract tags from chart name, category, and description
    const tags = new Set<string>();
    
    if (chart.category) tags.add(chart.category);
    if (chart.library) tags.add(chart.library);
    
    // Add common tags based on chart type
    const chartType = chart.name.toLowerCase();
    if (chartType.includes('bar')) tags.add('comparison');
    if (chartType.includes('pie')) tags.add('proportion');
    if (chartType.includes('line')) tags.add('trends');
    if (chartType.includes('scatter')) tags.add('correlation');
    
    return Array.from(tags);
  };

  const analyzeDataColumns = (data: any[]): ColumnDefinition[] => {
    if (!data || data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).map(key => {
      const value = sample[key];
      let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
      
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        type = 'date';
      }

      return {
        name: key,
        displayName: formatDisplayName(key),
        type,
        format: type === 'number' ? 'number' : type === 'date' ? 'date' : 'string'
      };
    });
  };

  const getFallbackCharts = (): ChartInfo[] => {
    return [
      {
        type: 'bar',
        library: 'echarts',
        displayName: 'Bar Chart',
        category: 'basic',
        description: 'Basic bar chart visualization'
      },
      {
        type: 'line',
        library: 'echarts',
        displayName: 'Line Chart',
        category: 'basic',
        description: 'Line chart for trends'
      },
      {
        type: 'pie',
        library: 'echarts',
        displayName: 'Pie Chart',
        category: 'basic',
        description: 'Pie chart for proportions'
      }
    ];
  };

  // ============================================================================
  // Computed Values
  // ============================================================================
  
  const chartsByCategory = useMemo(() => {
    const grouped: Record<string, ChartInfo[]> = {};
    
    availableCharts.forEach(chart => {
      const category = chart.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(chart);
    });
    
    return grouped;
  }, [availableCharts]);

  const selectedChartInfo = useMemo(() => {
    return availableCharts.find(
      chart => chart.type === selectedChart && chart.library === selectedLibrary
    );
  }, [availableCharts, selectedChart, selectedLibrary]);

  const canCreateChart = useMemo(() => {
    return !!(
      selectedChart && 
      selectedLibrary && 
      chartFactoryInitialized && 
      data && 
      data.length > 0 &&
      !chartCreationState.isCreating
    );
  }, [selectedChart, selectedLibrary, chartFactoryInitialized, data, chartCreationState.isCreating]);

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  const renderLoadingState = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
      <Box textAlign="center">
        <CircularProgress size={48} />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading chart types...
        </Typography>
        {initializationAttempts > 0 && (
          <Typography variant="caption" color="text.secondary">
            Attempt {initializationAttempts + 1}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const renderErrorState = () => (
    <Alert 
      severity="error" 
      sx={{ mb: 2 }}
      action={
        <Button 
          size="small" 
          startIcon={<RefreshIcon />}
          onClick={() => initializeCharts(true)}
          disabled={isLoadingCharts}
        >
          Retry
        </Button>
      }
    >
      <Typography variant="subtitle2">Failed to load chart system</Typography>
      <Typography variant="body2">{error}</Typography>
      {availableCharts.length > 0 && (
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Using fallback charts ({availableCharts.length} available)
        </Typography>
      )}
    </Alert>
  );

  const renderEmptyState = () => (
    <Alert severity="warning">
      <Typography variant="subtitle2">No chart types available</Typography>
      <Typography variant="body2">
        Please ensure chart plugins are properly configured.
      </Typography>
    </Alert>
  );

  const renderChartCard = (chart: ChartInfo) => {
    const isSelected = selectedChart === chart.type && selectedLibrary === chart.library;
    
    return (
      <Card 
        key={`${chart.library}-${chart.type}`}
        sx={{ 
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 2,
            transform: 'translateY(-2px)'
          },
          transition: 'all 0.2s ease-in-out'
        }}
        onClick={() => handleChartSelect(chart.type, chart.library)}
      >
        <CardContent sx={{ pb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="subtitle2" component="div" fontWeight={600}>
              {chart.displayName}
            </Typography>
            <Chip 
              label={chart.library} 
              size="small" 
              variant={isSelected ? 'filled' : 'outlined'}
              color="primary"
              sx={{ ml: 1 }}
            />
          </Box>
          
          {chart.description && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {chart.description}
            </Typography>
          )}

          {chart.tags && chart.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {chart.tags.slice(0, 3).map(tag => (
                <Chip 
                  key={tag}
                  label={tag} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: '20px' }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSelectedChartInfo = () => {
    if (!selectedChartInfo) return null;

    return (
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Selected: {selectedChartInfo.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Library: {selectedChartInfo.library} • Category: {selectedChartInfo.category}
            </Typography>
            {selectedChartInfo.description && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {selectedChartInfo.description}
              </Typography>
            )}
          </Box>
          <Button
            size="small"
            onClick={handleClearSelection}
            sx={{ ml: 2 }}
          >
            Clear
          </Button>
        </Box>
      </Paper>
    );
  };

  const renderCreationState = () => {
    if (!chartCreationState.error && !chartCreationState.isCreating) return null;

    return (
      <Box sx={{ mb: 2 }}>
        {chartCreationState.isCreating && (
          <Alert severity="info" sx={{ mb: 1 }}>
            <Box display="flex" alignItems="center">
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Creating chart...
            </Box>
          </Alert>
        )}
        
        {chartCreationState.error && (
          <Alert severity="error">
            <Typography variant="subtitle2">Chart Creation Error</Typography>
            <Typography variant="body2">{chartCreationState.error}</Typography>
          </Alert>
        )}
      </Box>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================
  
  // Loading state
  if (isLoadingCharts) {
    return renderLoadingState();
  }

  // Error state (but continue if we have fallback charts)
  const showError = error && availableCharts.length === 0;
  
  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Choose Chart Type
        </Typography>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Chart Factory Status">
            <IconButton size="small" color={chartFactoryInitialized ? 'success' : 'warning'}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => initializeCharts(true)}
            disabled={isLoadingCharts}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error State */}
      {error && renderErrorState()}

      {/* Empty State */}
      {showError && renderEmptyState()}

      {/* Selected Chart Info */}
      {renderSelectedChartInfo()}

      {/* Chart Creation State */}
      {renderCreationState()}

      {/* Chart Selection Grid */}
      {availableCharts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {Object.entries(chartsByCategory).map(([category, charts]) => (
            <Box key={category} sx={{ mb: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  color: 'text.primary'
                }}
              >
                {category} Charts ({charts.length})
              </Typography>
              
              <Grid container spacing={2}>
                {charts.map(renderChartCard)}
              </Grid>
              
              {Object.keys(chartsByCategory).indexOf(category) < Object.keys(chartsByCategory).length - 1 && (
                <Divider sx={{ mt: 3 }} />
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Actions */}
      <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          onClick={handleClearSelection}
          disabled={!selectedChart}
        >
          Clear Selection
        </Button>
        
        <Button
          variant="contained"
          startIcon={chartCreationState.isCreating ? <CircularProgress size={16} /> : <CreateIcon />}
          onClick={handleCreateChart}
          disabled={!canCreateChart}
        >
          {chartCreationState.isCreating ? 'Creating...' : 'Create Chart'}
        </Button>
      </Box>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" display="block">
            <strong>Debug Info:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            • Charts loaded: {availableCharts.length}
          </Typography>
          <Typography variant="caption" display="block">
            • Factory initialized: {chartFactoryInitialized ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="caption" display="block">
            • Data rows: {data?.length || 0}
          </Typography>
          <Typography variant="caption" display="block">
            • Columns: {columns.length}
          </Typography>
          <Typography variant="caption" display="block">
            • Selected: {selectedChart ? `${selectedLibrary}-${selectedChart}` : 'None'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ChartBuilder;