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

interface ChartBuilderProps {
  onChartSelect?: (chartType: string, chartLibrary: string) => void;
  initialData?: any[];
  initialConfig?: any;
  height?: number | string;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  onChartSelect,
  initialData,
  initialConfig,
  height = 400
}) => {
  const [selectedChart, setSelectedChart] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('echarts');
  const [chartData, setChartData] = useState<any[]>(initialData || []);
  const [chartConfig, setChartConfig] = useState<any>(initialConfig || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pluginService, setPluginService] = useState<EnhancedChartPluginService | null>(null);

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
          title: `Sample ${plugin.displayName || chartType}`,
          ...defaultConfig,
          ...initialConfig
        });
      }
    }

    // Notify parent component
    onChartSelect?.(chartType, selectedLibrary);
  };

  // Sample data for testing
  const sampleData = chartData.length > 0 ? chartData : [
    { name: 'Jan', value: 100, category: 'A', sales: 1200, profit: 300 },
    { name: 'Feb', value: 200, category: 'B', sales: 1900, profit: 450 },
    { name: 'Mar', value: 150, category: 'A', sales: 1500, profit: 320 },
    { name: 'Apr', value: 300, category: 'C', sales: 2100, profit: 580 },
    { name: 'May', value: 250, category: 'B', sales: 1800, profit: 420 },
    { name: 'Jun', value: 400, category: 'A', sales: 2500, profit: 680 }
  ];

  // Sample columns definition
  const sampleColumns = [
    { name: 'name', type: 'string', displayName: 'Month' },
    { name: 'value', type: 'number', displayName: 'Value' },
    { name: 'category', type: 'string', displayName: 'Category' },
    { name: 'sales', type: 'number', displayName: 'Sales' },
    { name: 'profit', type: 'number', displayName: 'Profit' }
  ];

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
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" color="textSecondary">
                    {currentPlugin?.displayName || selectedChart}
                    {currentPlugin?.description && ` - ${currentPlugin.description}`}
                  </Typography>
                  
                  <Divider sx={{ mt: 2 }} />
                </Box>

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
                  <ChartFactory
                    chartType={selectedChart}
                    chartLibrary={selectedLibrary}
                    data={{
                      rows: sampleData,
                      columns: sampleColumns,
                      metadata: {
                        totalRows: sampleData.length,
                        source: 'Sample Data'
                      }
                    }}
                    config={{
                      title: chartConfig.title || 'Sample Chart',
                      subtitle: 'Interactive chart preview',
                      ...chartConfig
                    }}
                    width="100%"
                    height={typeof height === 'number' ? height : undefined}
                    theme={{
                      backgroundColor: 'transparent',
                      textColor: '#333',
                      gridColor: '#eee'
                    }}
                    onError={handlePluginError}
                    onInteraction={(event) => {
                      console.log('Chart interaction:', event);
                    }}
                    fallbackComponent={(props) => (
                      <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        justifyContent="center"
                        minHeight={200}
                        textAlign="center"
                        p={3}
                      >
                        <Typography variant="h6" gutterBottom>
                          Chart Not Available
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          The selected chart type ({selectedChart}) is not currently available.
                          Please try selecting a different chart type.
                        </Typography>
                      </Box>
                    )}
                  />
                </Box>

                {/* Chart Info */}
                {currentPlugin && (
                  <Box mt={2} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Chart Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Library
                        </Typography>
                        <Typography variant="body2">
                          {currentPlugin.library || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Version
                        </Typography>
                        <Typography variant="body2">
                          {currentPlugin.version || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Data Columns
                        </Typography>
                        <Typography variant="body2">
                          {sampleColumns.length} available
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">
                          Data Rows
                        </Typography>
                        <Typography variant="body2">
                          {sampleData.length} records
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