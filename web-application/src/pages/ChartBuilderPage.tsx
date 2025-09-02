// File: web-application/src/components/pages/ChartBuilderPage.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  IconButton,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

// Import our chart components
import { ChartConfigPanel } from '@/components/builder/ChartConfigPanel';
import ChartRenderer from '@/components/charts/ChartRenderer';
import { ChartSelector } from '@/components/builder/ChartSelector';
import { DatasetSelector } from '@/components/builder/DatasetSelector';
import { QueryBuilder } from '@/components/builder/QueryBuilder';
import { AnalyticsPanel } from '@/components/builder/AnalyticsPanel';

// Import types
import {
  Chart,
  ChartConfiguration,
  ChartDimensions,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { Dataset } from '@/types/dashboard.types';

// Import utilities
import { createDefaultDimensions, createCompleteChartConfig } from '@/utils/chartUtils';
import { datasetAPI  } from '@/services/datasetAPI';
import { chartAPI  } from '@/services/api';


interface ChartBuilderPageProps {
  chartId?: string;
  workspaceId: string;
  dashboardId?: string;
  onSave?: (chart: Chart) => void;
  onCancel?: () => void;
  onPreview?: (chart: Chart) => void;
}

interface ChartBuilderState {
  selectedChart: Chart | null;
  availableDatasets: Dataset[];
  chartData: any[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  previewMode: boolean;
  activeTab: 'chart' | 'dataset' | 'query' | 'analytics';
}

const ChartBuilderPage: React.FC<ChartBuilderPageProps> = ({
  chartId,
  workspaceId,
  dashboardId,
  onSave,
  onCancel,
  onPreview
}) => {
  // State management
  const [state, setState] = useState<ChartBuilderState>({
    selectedChart: null,
    availableDatasets: [],
    chartData: [],
    loading: true,
    saving: false,
    error: null,
    success: null,
    previewMode: false,
    activeTab: 'chart'
  });

  // Chart dimensions for the renderer
  const chartDimensions: ChartDimensions = useMemo(() => 
    createDefaultDimensions(800, 500, {
      top: 40,
      right: 40,
      bottom: 60,
      left: 80
    }), []
  );

  // Initialize the page
  useEffect(() => {
    initializeBuilder();
  }, [chartId, workspaceId]);

  // Initialize builder data
  const initializeBuilder = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load datasets
      const datasets = await datasetAPI.getByWorkspace(workspaceId);

      // Load existing chart if editing
      let chart: Chart | null = null;
      let chartData: any[] = [];

      if (chartId) {
        chart = await chartAPI.getById(chartId);
        if (chart && chart.dataset_ids.length > 0) {
          chartData = await datasetAPI.getData(chart.dataset_ids[0]);
        }
      }

      setState(prev => ({
        ...prev,
        selectedChart: chart,
        availableDatasets: datasets,
        chartData: chartData,
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize chart builder',
        loading: false
      }));
    }
  };

  // Handle tab change
  const handleTabChange = useCallback((tab: ChartBuilderState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Handle chart selection
  const handleChartSelect = useCallback((chartType: string, library?: string) => {
    const newChart: Chart = {
      id: chartId || `temp-${Date.now()}`,
      name: `New ${chartType} Chart`,
      description: `A new ${chartType} chart`,
      workspace_id: workspaceId,
      chart_type: chartType,
      dataset_ids: [],
      config_json: createCompleteChartConfig(chartType, chartDimensions),
      tags: [],
      created_by: 'current-user', // Replace with actual user
      created_at: new Date(),
      updated_at: Date.now(),
      is_active: true
    };

    setState(prev => ({
      ...prev,
      selectedChart: newChart,
      activeTab: 'dataset'
    }));
  }, [chartId, workspaceId, chartDimensions]);

  // Handle dataset selection
  const handleDatasetSelect = useCallback(async (dataset: Dataset) => {
    if (!state.selectedChart) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Fetch data from selected dataset
      const data = await datasetAPI.getData(dataset.id);
      
      // Update chart with dataset
      const updatedChart: Chart = {
        ...state.selectedChart,
        dataset_ids: [dataset.id],
        updated_at: Date.now()
      };

      setState(prev => ({
        ...prev,
        selectedChart: updatedChart,
        chartData: data,
        loading: false,
        activeTab: 'chart' // Go back to chart config
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dataset',
        loading: false
      }));
    }
  }, [state.selectedChart]);

  // Handle query execution
  const handleQueryExecute = useCallback(async (query: string, datasetId: string) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Execute custom query
      const data = await datasetAPI.executeQuery(datasetId, query);
      
      setState(prev => ({
        ...prev,
        chartData: data,
        loading: false,
        success: 'Query executed successfully'
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to execute query',
        loading: false
      }));
    }
  }, []);

  // Handle chart configuration save
  const handleChartConfigSave = useCallback((updatedChart: Chart) => {
    setState(prev => ({
      ...prev,
      selectedChart: updatedChart,
      success: 'Chart configuration updated'
    }));
  }, []);

  // Handle chart save
  const handleSave = useCallback(async () => {
    if (!state.selectedChart) return;

    setState(prev => ({ ...prev, saving: true }));

    try {
      let savedChart: Chart;

      if (chartId && chartId !== state.selectedChart.id) {
        // Update existing chart
        savedChart = await chartAPI.update(chartId, state.selectedChart);
      } else {
        // Create new chart
        savedChart = await chartAPI.create(state.selectedChart);
      }

      setState(prev => ({
        ...prev,
        selectedChart: savedChart,
        saving: false,
        success: 'Chart saved successfully'
      }));

      onSave?.(savedChart);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save chart',
        saving: false
      }));
    }
  }, [state.selectedChart, chartId, onSave]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (!state.selectedChart) return;
    
    setState(prev => ({ ...prev, previewMode: !prev.previewMode }));
    onPreview?.(state.selectedChart);
  }, [state.selectedChart, onPreview]);

  // Handle chart interaction
  const handleChartInteraction = useCallback((event: ChartInteractionEvent) => {
    console.log('Chart interaction:', event);
    // Handle chart interactions (clicks, hovers, etc.)
  }, []);

  // Handle chart error
  const handleChartError = useCallback((error: ChartError) => {
    setState(prev => ({
      ...prev,
      error: error.message
    }));
  }, []);

  // Close alerts
  const handleCloseAlert = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  // Render the configuration panel content based on active tab
  const renderConfigPanelContent = () => {
    switch (state.activeTab) {
      case 'chart':
        return (
          <ChartConfigPanel
            open={true}
            onClose={() => {}}
            chart={state.selectedChart}
            datasets={state.availableDatasets}
            onSave={handleChartConfigSave}
          />
        );
      
      case 'dataset':
        return (
          <DatasetSelector
            datasets={state.availableDatasets}
            selectedDataset={state.selectedChart?.dataset_ids[0]}
            onSelect={handleDatasetSelect}
            onRefresh={initializeBuilder}
          />
        );
      
      case 'query':
        return (
          <QueryBuilder
            datasetId={state.selectedChart?.dataset_ids[0]}
            onExecute={handleQueryExecute}
            onSave={(query) => console.log('Query saved:', query)}
          />
        );
      
      case 'analytics':
        return (
          <AnalyticsPanel
            chartData={state.chartData}
            chartConfig={state.selectedChart?.config_json}
            onAnalysisComplete={(results) => console.log('Analysis:', results)}
          />
        );
      
      default:
        return (
          <ChartSelector
            onSelectChart={handleChartSelect}
            selectedChart={state.selectedChart?.chart_type}
          />
        );
    }
  };

  // Loading backdrop
  if (state.loading && !state.selectedChart) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: 1200 }}>
        <Box textAlign="center">
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Chart Builder...
          </Typography>
        </Box>
      </Backdrop>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          px: 3, 
          py: 2, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Breadcrumbs */}
          <Box>
            <Breadcrumbs>
              <Link color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Home
              </Link>
              {dashboardId && (
                <Link color="inherit" href={`/dashboards/${dashboardId}`} sx={{ display: 'flex', alignItems: 'center' }}>
                  <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                  Dashboard
                </Link>
              )}
              <Typography color="text.primary">
                {chartId ? 'Edit Chart' : 'New Chart'}
              </Typography>
            </Breadcrumbs>
            
            <Typography variant="h5" sx={{ mt: 1 }}>
              {state.selectedChart?.name || 'Chart Builder'}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={initializeBuilder}
              disabled={state.loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              disabled={!state.selectedChart || state.chartData.length === 0}
              color={state.previewMode ? 'primary' : 'inherit'}
            >
              {state.previewMode ? 'Exit Preview' : 'Preview'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!state.selectedChart || state.saving}
            >
              {state.saving ? 'Saving...' : 'Save Chart'}
            </Button>
            
            {onCancel && (
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={onCancel}
                color="error"
              >
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Panel - Chart Config Panel */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper 
              elevation={0} 
              sx={{ 
                height: '100%', 
                borderRight: '1px solid', 
                borderColor: 'divider',
                borderRadius: 0,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Config Panel Header */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                backgroundColor: 'background.default'
              }}>
                <Typography variant="h6" gutterBottom>
                  Chart Configuration
                </Typography>
                
                {/* Tab Navigation */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {[
                    { key: 'chart', label: 'Chart', icon: <SettingsIcon /> },
                    { key: 'dataset', label: 'Dataset', icon: <DashboardIcon /> },
                    { key: 'query', label: 'Query', icon: <SettingsIcon /> },
                    { key: 'analytics', label: 'Analytics', icon: <SettingsIcon /> }
                  ].map((tab) => (
                    <Button
                      key={tab.key}
                      size="small"
                      variant={state.activeTab === tab.key ? 'contained' : 'outlined'}
                      onClick={() => handleTabChange(tab.key as any)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Config Panel Content */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {renderConfigPanelContent()}
              </Box>
            </Paper>
          </Grid>

          {/* Right Panel - Chart Renderer */}
          <Grid item xs={12} md={8} lg={9}>
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: 'background.default'
            }}>
              {/* Chart Header */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                backgroundColor: 'background.paper'
              }}>
                <Typography variant="h6">
                  Chart Preview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.chartData.length > 0 
                    ? `Showing ${state.chartData.length} data points`
                    : 'No data available - select a dataset to preview your chart'
                  }
                </Typography>
              </Box>

              {/* Chart Content */}
              <Box sx={{ 
                flex: 1, 
                p: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto'
              }}>
                {state.selectedChart && state.chartData.length > 0 ? (
                  <ChartRenderer
                    chart={state.selectedChart}
                    data={state.chartData}
                    dimensions={chartDimensions}
                    onInteraction={handleChartInteraction}
                    onError={handleChartError}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: 'white'
                    }}
                  />
                ) : (
                  <Box textAlign="center" sx={{ color: 'text.secondary' }}>
                    <Typography variant="h6" gutterBottom>
                      {!state.selectedChart 
                        ? 'Select a chart type to begin'
                        : 'Select a dataset to preview your chart'
                      }
                    </Typography>
                    <Typography variant="body2">
                      {!state.selectedChart 
                        ? 'Choose from various chart types in the configuration panel'
                        : 'Configure your data source and chart will appear here'
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Alerts */}
      <Snackbar
        open={!!state.error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity="error" 
          variant="filled"
        >
          {state.error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!state.success}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity="success" 
          variant="filled"
        >
          {state.success}
        </Alert>
      </Snackbar>

      {/* Loading overlay for operations */}
      <Backdrop 
        open={state.loading && !!state.selectedChart} 
        sx={{ zIndex: 1000 }}
      >
        <CircularProgress color="primary" />
      </Backdrop>
    </Box>
  );
};

export default ChartBuilderPage;