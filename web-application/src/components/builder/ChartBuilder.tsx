'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Alert, 
  Snackbar, 
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { ChartSelector } from './ChartSelector';
import { ChartFactory, EnhancedChartPluginService } from '../../plugins/charts/factory/ChartFactory';
import { ColumnDefinition } from '../../plugins/charts/interfaces';
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
  datasetId?: string; // Add dataset ID prop
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  onChartSelect,
  initialData,
  initialConfig,
  height = 400,
  datasetId
}) => {
  const [selectedChart, setSelectedChart] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('echarts');
  const [chartData, setChartData] = useState<any[]>(initialData || []);
  const [chartConfig, setChartConfig] = useState<any>(initialConfig || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pluginService, setPluginService] = useState<EnhancedChartPluginService | null>(null);
  
  // New state for live data
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Initialize plugin service
  useEffect(() => {
    const initializePlugins = async () => {
      try {
        setLoading(true);
        const service = EnhancedChartPluginService.getInstance();
        await service.initialize();
        setPluginService(service);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize chart plugins');
        console.error('Plugin initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePlugins();
  }, []);

  // Load dataset and its data when datasetId is provided
  useEffect(() => {
    if (datasetId) {
      loadDatasetData(datasetId);
    }
  }, [datasetId]);

  // Function to load data from live dataset connection
  const loadDatasetData = async (id: string) => {
    try {
      setLoadingData(true);
      setError(null);

      // Fetch dataset metadata first
      const datasetResponse = await datasetAPI.getDataset(id);
      if (datasetResponse?.dataset) {
        setDataset(datasetResponse.dataset);
      }

      // Fetch dataset schema to get columns
      try {
        const schemaResponse = await datasetAPI.getDatasetSchema(id);
        if (schemaResponse?.schema?.columns && Array.isArray(schemaResponse.schema.columns)) {
          const chartColumns: ColumnDefinition[] = schemaResponse.schema.columns.map((col: DatasetColumn) => ({
            name: col.name,
            type: mapDataTypeToChartType(col.type || 'string'),
            displayName: col.display_name || col.name,
            format: col.format_hint
          }));
          setColumns(chartColumns);
        }
      } catch (schemaError) {
        console.warn('Failed to load dataset schema:', schemaError);
        // Continue without schema - we'll still try to get data
      }

      // Fetch actual data preview (limited rows for preview)
      try {
        const dataResponse = await datasetAPI.queryDataset(id, { 
          limit: 50,
          offset: 0 
        });
        
        if (dataResponse?.data && Array.isArray(dataResponse.data) && dataResponse.data.length > 0) {
          setChartData(dataResponse.data);
          
          // If we don't have schema columns, infer them from data
          if (columns.length === 0 && dataResponse.columns) {
            const inferredColumns: ColumnDefinition[] = dataResponse.columns.map((col: { name: string; type: string }) => ({
              name: col.name,
              type: mapDataTypeToChartType(col.type || 'string'),
              displayName: col.name
            }));
            setColumns(inferredColumns);
          }
        }
      } catch (dataError) {
        console.warn('Failed to load dataset data:', dataError);
        // This is not critical if we have schema at least
        if (columns.length === 0) {
          throw dataError; // Re-throw if we have no useful data at all
        }
      }

    } catch (err) {
      console.error('Failed to load dataset data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load dataset: ${errorMessage}`);
      
      // Reset data states on error
      setColumns([]);
      setChartData([]);
      setDataset(null);
    } finally {
      setLoadingData(false);
    }
  };

  // Helper function to map dataset data types to chart types
  const mapDataTypeToChartType = (dataType: string): 'string' | 'number' | 'date' | 'boolean' => {
    if (!dataType) return 'string';
    
    const lowercaseType = dataType.toLowerCase();
    
    // Handle numeric types
    if (lowercaseType.includes('int') || 
        lowercaseType.includes('float') || 
        lowercaseType.includes('double') ||
        lowercaseType.includes('decimal') || 
        lowercaseType.includes('numeric') ||
        lowercaseType.includes('number') ||
        lowercaseType === 'bigint' ||
        lowercaseType === 'smallint') {
      return 'number';
    }
    
    // Handle date/time types
    if (lowercaseType.includes('date') || 
        lowercaseType.includes('time') ||
        lowercaseType.includes('timestamp')) {
      return 'date';
    }
    
    // Handle boolean types
    if (lowercaseType.includes('bool') ||
        lowercaseType === 'bit') {
      return 'boolean';
    }
    
    // Default to string for text types
    return 'string';
  };

  // Fallback empty data for when no dataset is connected
  const fallbackData: ColumnDefinition[] = [];
  const fallbackRows: any[] = [];

  // Use live data if available, otherwise use fallback
  const activeColumns = columns.length > 0 ? columns : fallbackData;
  const activeData = chartData.length > 0 ? chartData : fallbackRows;

  // Handle chart selection
  const handleChartSelect = (chartType: string, library?: string) => {
    setSelectedChart(chartType);
    
    if (library) {
      setSelectedLibrary(library);
    } else {
      // Try to determine library from plugin service
      const plugin = pluginService?.getChart(chartType);
      if (plugin?.library) {
        setSelectedLibrary(plugin.library);
      }
    }

    // Initialize default config from plugin schema
    if (pluginService) {
      const plugin = pluginService.getChart(chartType);
      if (plugin?.configSchema) {
        const defaultConfig: any = {};
        
        // Extract defaults from schema
        if (plugin.configSchema.properties) {
          Object.entries(plugin.configSchema.properties).forEach(([key, schema]: [string, any]) => {
            if (schema.default !== undefined) {
              defaultConfig[key] = schema.default;
            }
          });
        }
        
        setChartConfig({
          title: dataset ? `${plugin.displayName || chartType} - ${dataset.display_name}` : `Sample ${plugin.displayName || chartType}`,
          ...defaultConfig,
          ...initialConfig
        });
      }
    }

    // Notify parent component
    onChartSelect?.(chartType, selectedLibrary);
  };

  // Handle plugin loading errors
  const handlePluginError = (error: Error) => {
    console.error('Chart plugin error:', error);
    setError(`Plugin Error: ${error.message}`);
  };

  // Get current chart plugin info
  const currentPlugin = selectedChart && pluginService ? 
    pluginService.getChart(selectedChart) || pluginService.getChart(`${selectedLibrary}-${selectedChart}`) : 
    null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" mt={2}>
            Loading Chart Plugins...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Left Panel - Chart Selector */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Chart Library
            </Typography>
            
            {pluginService && (
              <ChartSelector
                pluginService={pluginService}
                onSelectChart={handleChartSelect}
                selectedChart={selectedChart}
                selectedLibrary={selectedLibrary}
              />
            )}
          </Paper>
        </Grid>

        {/* Main Panel - Chart Preview */}
        <Grid item xs={12} md={8} lg={9}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedChart ? (
              <>
                {/* Chart Header */}
                <Box mb={2}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="h5">Chart Preview</Typography>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={selectedLibrary} 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                      />
                      {currentPlugin?.category && (
                        <Chip 
                          label={currentPlugin.category} 
                          color="secondary" 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                      {dataset && (
                        <Chip 
                          label="Live Data" 
                          color="success" 
                          size="small" 
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" color="textSecondary">
                    {currentPlugin?.displayName || selectedChart}
                    {currentPlugin?.description && ` - ${currentPlugin.description}`}
                  </Typography>
                  
                  {dataset && (
                    <Typography variant="body2" color="textSecondary" mt={1}>
                      Connected to: {dataset.display_name}
                    </Typography>
                  )}
                  
                  <Divider sx={{ mt: 2 }} />
                </Box>

                {/* Loading indicator for data */}
                {loadingData && (
                  <Box display="flex" justifyContent="center" alignItems="center" my={4}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" ml={2}>Loading dataset...</Typography>
                  </Box>
                )}

                {/* Data connection warning */}
                {!datasetId && !loadingData && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No dataset connected. Connect a dataset to see live data visualization.
                  </Alert>
                )}

                {/* Chart Container */}
                <Box 
                  flexGrow={1} 
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    p: 2,
                    minHeight: height,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {activeColumns.length > 0 || activeData.length > 0 ? (
                    <ChartFactory
                      chartType={selectedChart}
                      chartLibrary={selectedLibrary}
                      data={{
                        rows: activeData,
                        columns: activeColumns,
                        metadata: {
                          totalRows: activeData.length,
                          source: dataset ? dataset.display_name : 'No Data Source',
                          datasetId: dataset?.id
                        }
                      }}
                      config={{
                        title: chartConfig.title || (dataset ? `${dataset.display_name} Chart` : 'Chart Preview'),
                        subtitle: dataset ? `From dataset: ${dataset.name}` : 'Connect a dataset for live data',
                        ...chartConfig
                      }}
                      height={typeof height === 'number' ? height : 400}
                      onError={handlePluginError}
                    />
                  ) : (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center" 
                      flexGrow={1}
                      textAlign="center"
                      color="text.secondary"
                    >
                      <Box fontSize="3rem" mb={2}>📊</Box>
                      <Typography variant="h6" gutterBottom>
                        No Data Available
                      </Typography>
                      <Typography variant="body2">
                        Connect a dataset to visualize your data
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Data Information Panel */}
                {(activeColumns.length > 0 || dataset) && !loadingData && (
                  <Box mt={2}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Data Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Source
                        </Typography>
                        <Typography variant="body2">
                          {dataset?.display_name || 'No Dataset'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Plugin Version
                        </Typography>
                        <Typography variant="body2">
                          {currentPlugin?.version || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Data Columns
                        </Typography>
                        <Typography variant="body2">
                          {activeColumns.length} available
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Data Rows
                        </Typography>
                        <Typography variant="body2">
                          {activeData.length} records
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              /* Empty State */
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                flexGrow={1}
                textAlign="center"
                color="text.secondary"
              >
                <Box fontSize="4rem" mb={2}>📊</Box>
                <Typography variant="h4" gutterBottom>
                  Select a Chart Type
                </Typography>
                <Typography variant="body1" mb={3}>
                  Choose from the available chart types in the library panel to preview your visualization
                </Typography>
                
                {pluginService && (
                  <Box>
                    <Typography variant="body2">
                      {pluginService.getAllCharts().length} chart types available
                    </Typography>
                    <Typography variant="body2">
                      Libraries: {pluginService.getChartLibraries().join(', ')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChartBuilder;