// File: ./src/components/builder/ChartBuilder.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  Backdrop
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';

// Import types and services
import {
  Chart,
  ChartDimensions,
  ChartInteractionEvent,
  ChartError,
  ChartConfiguration
} from '@/types/chart.types';
import {
  Dashboard,
  ColumnDefinition
} from '@/types';
import { Dataset} from '@/types/dataset.types';

import {
  dashboardAPI,
  chartAPI
} from '@/services/index';

// Import utility functions
import {
  normalizeDatasetApiResponse,
  buildSafeQueryOptions,
  validateBasicSQLQuery
} from '@/utils/datasetUtils';
import { datasetAPI  } from '@/services/datasetAPI';
// Import components
import { ChartConfigPanel } from '@/components/builder/ChartConfigPanel';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { ChartSelector } from '@/components/builder/ChartSelector';
import { QueryBuilder } from '@/components/builder/QueryBuilder';
import { DatasetSelector } from '@/components/builder/DatasetSelector';
import { ChartBuilderState } from '@/types/chart.types'
// ============================================================================
// Component Props & State Interfaces
// ============================================================================

interface ChartBuilderProps {
  chartId?: string;
  workspaceId: string;
  dashboardId?: string;
  onSave?: (chart: Chart) => void;
  onCancel?: () => void;
  onPreview?: (chart: Chart) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  chartId,
  workspaceId,
  dashboardId,
  onSave,
  onCancel,
  onPreview
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [state, setState] = useState<ChartBuilderState>({
    chart: null,
    chartConfiguration: null,
    availableDatasets: [],
    selectedDatasetId: undefined,
    chartData: null,
    dataColumns: [],
    activeStep: 'dataset',
    loading: false,
    queryLoading: false,
    error: null,
    previewDimensions: { width: 800, height: 400 },
    showPreview: false,
    isDirty: false
  });

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // ============================================================================
  // Data Loading Effects
  // ============================================================================

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [workspaceId, chartId]);

  const loadInitialData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Load available datasets
      const datasetsResponse = await datasetAPI.getDatasets(workspaceId);
      
      // Handle different response structures
      let datasets: Partial<Dataset>[] = [];
      if (datasetsResponse.success) {
        datasets = datasetsResponse.datasets || [];
      } else {
        // Handle direct array response or data property
        datasets = Array.isArray(datasetsResponse) 
          ? datasetsResponse 
          : datasetsResponse.datasets || [];
      }

      // If editing existing chart, load chart data
      let existingChart: Chart | null = null;
      if (chartId) {
        const chartResponse = await chartAPI.getChart(chartId);
        existingChart = chartResponse.chart || chartResponse;
      }

      setState(prev => ({
        ...prev,
        availableDatasets: datasets,
        chart: existingChart,
        chartConfiguration: existingChart?.config_json || null,
        selectedDatasetId: existingChart?.dataset_ids?.[0],
        activeStep: existingChart ? 'config' : 'dataset',
        loading: false
      }));

      // If editing existing chart with dataset, load its data
      if (existingChart?.dataset_ids?.[0]) {
        await loadDatasetData(existingChart.dataset_ids[0]);
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load data. Please try again.';
        
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // ============================================================================
  // Data Management Functions
  // ============================================================================

  const loadDatasetData = useCallback(async (datasetId: string) => {
    setState(prev => ({ ...prev, queryLoading: true, error: null }));
    
    try {
      const queryOptions = buildSafeQueryOptions({
        limit: 1000,
        offset: 0
      });
      
      const response = await datasetAPI.queryDataset(datasetId, queryOptions);
      const normalizedData = normalizeDatasetApiResponse(response);
      
      setState(prev => ({
        ...prev,
        chartData: normalizedData.data,
        dataColumns: normalizedData.columns,
        queryLoading: false,
        activeStep: prev.activeStep === 'dataset' ? 'chart' : prev.activeStep
      }));

    } catch (error) {
      console.error('Failed to load dataset data:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load dataset data. Please check your connection and try again.';
        
      setState(prev => ({
        ...prev,
        queryLoading: false,
        error: errorMessage
      }));
    }
  }, []);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDatasetSelect = useCallback(async (datasetId: string) => {
    setState(prev => ({
      ...prev,
      selectedDatasetId: datasetId,
      chartData: null,
      dataColumns: [],
      isDirty: true
    }));
    
    await loadDatasetData(datasetId);
  }, [loadDatasetData]);

  const handleExecute = useCallback(async (query: string, datasetId: string) => {
    setState(prev => ({ ...prev, queryLoading: true, error: null }));
    
    try {
      // Validate SQL query first
      const validation = validateBasicSQLQuery(query);
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      // Use the built-in executeQuery method (which uses validateDataset internally)
      const response = await datasetAPI.executeQuery(datasetId, query);
      const normalizedData = normalizeDatasetApiResponse(response);

      setState(prev => ({
        ...prev,
        chartData: normalizedData.data,
        dataColumns: normalizedData.columns,
        queryLoading: false,
        isDirty: true
      }));

      showNotification('Query executed successfully!', 'success');

    } catch (error) {
      console.error('Failed to execute query:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to execute query. Please check your SQL syntax and try again.';
      
      setState(prev => ({
        ...prev,
        queryLoading: false,
        error: errorMessage
      }));
    }
  }, []);

  const handleSave = useCallback((query: string) => {
    // Handle query save logic here
    showNotification('Query saved successfully!', 'success');
  }, []);

  const handleChartTypeSelect = useCallback((chartType: string) => {
    const newChart: Partial<Chart> = {
      ...state.chart,
      chart_type: chartType,
      dataset_ids: state.selectedDatasetId ? [state.selectedDatasetId] : [],
      is_active: true,
      version: 1
    };

    setState(prev => ({
      ...prev,
      chart: newChart,
      activeStep: 'config',
      isDirty: true
    }));
  }, [state.chart, state.selectedDatasetId]);

  const handleConfigurationChange = useCallback((configuration: ChartConfiguration) => {
    setState(prev => ({
      ...prev,
      chartConfiguration: configuration,
      chart: {
        ...prev.chart,
        config_json: configuration
      },
      isDirty: true
    }));
  }, []);

  const handlePreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPreview: true,
      activeStep: 'preview'
    }));
    
    if (onPreview && state.chart) {
      onPreview(state.chart as Chart);
    }
  }, [onPreview, state.chart]);

  const handleSaveChart = useCallback(async () => {
    if (!state.chart || !state.selectedDatasetId) {
      showNotification('Please complete chart configuration before saving', 'error');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const chartData: Partial<Chart> = {
        ...state.chart,
        workspace_id: workspaceId,
        dataset_ids: [state.selectedDatasetId],
        config_json: state.chartConfiguration || {},
        dashboard_id: dashboardId,
        is_active: true,
        version: state.chart.version || 1
      };

      const savedChart = chartId 
        ? await chartAPI.updateChart(chartId, chartData)
        : await chartAPI.createChart(chartData);

      setState(prev => ({
        ...prev,
        loading: false,
        isDirty: false,
        chart: savedChart.chart || savedChart
      }));

      showNotification('Chart saved successfully!', 'success');
      
      if (onSave) {
        onSave(savedChart.chart || savedChart);
      }

    } catch (error) {
      console.error('Failed to save chart:', error);
      setState(prev => ({ ...prev, loading: false }));
      showNotification('Failed to save chart. Please try again.', 'error');
    }
  }, [state.chart, state.selectedDatasetId, state.chartConfiguration, workspaceId, dashboardId, chartId, onSave]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  // ============================================================================
  // Render Steps
  // ============================================================================

  const renderStepContent = () => {
    switch (state.activeStep) {
      case 'dataset':
        return (
          <DatasetSelector
            datasets={state.availableDatasets}
            selectedDatasetId={state.selectedDatasetId}
            onDatasetSelect={handleDatasetSelect}
            loading={state.queryLoading}
          />
        );

      case 'query':
        return (
          <QueryBuilder
            datasetId={state.selectedDatasetId}  // FIXED: Changed from 'datasets' to 'datasetId'
            onExecute={handleExecute}
            onSave={handleSave}
            loading={state.queryLoading}         // FIXED: Added loading prop
          />
        );

      case 'chart':
        return (
          <ChartSelector
            onChartTypeSelect={handleChartTypeSelect}
            dataColumns={state.dataColumns}
            selectedChartType={state.chart?.chart_type}
          />
        );

      case 'config':
        return (
          <ChartConfigPanel
            chartType={state.chart?.chart_type || ''}
            configuration={state.chartConfiguration || {}}
            dataColumns={state.dataColumns}
            onConfigurationChange={handleConfigurationChange}
          />
        );

      case 'preview':
        return (
          <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Chart Preview
              </Typography>
              {state.chartData && state.chartConfiguration && (
                <ChartRenderer
                  data={state.chartData}
                  config={state.chartConfiguration}
                  dimensions={state.previewDimensions}
                  onInteraction={(event: ChartInteractionEvent) => {
                    console.log('Chart interaction:', event);
                  }}
                  onError={(error: ChartError) => {
                    console.error('Chart error:', error);
                    showNotification(`Chart error: ${error.message}`, 'error');
                  }}
                />
              )}
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  if (state.loading) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }} elevation={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            {chartId ? 'Edit Chart' : 'Create Chart'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              disabled={!state.chartConfiguration || !state.chartData}
            >
              Preview
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveChart}
              disabled={!state.chart || !state.selectedDatasetId || state.loading}
            >
              {state.loading ? <CircularProgress size={20} /> : 'Save Chart'}
            </Button>
            
            <Button
              startIcon={<CloseIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Display */}
      {state.error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {state.error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Step Navigation */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom>
                Build Process
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { key: 'dataset', label: 'Select Dataset', icon: <DashboardIcon /> },
                  { key: 'query', label: 'Query Builder', icon: <SettingsIcon /> },
                  { key: 'chart', label: 'Chart Type', icon: <DashboardIcon /> },
                  { key: 'config', label: 'Configuration', icon: <SettingsIcon /> },
                  { key: 'preview', label: 'Preview', icon: <PreviewIcon /> }
                ].map((step, index) => (
                  <Button
                    key={step.key}
                    startIcon={step.icon}
                    variant={state.activeStep === step.key ? 'contained' : 'outlined'}
                    onClick={() => setState(prev => ({ ...prev, activeStep: step.key as any }))}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {step.label}
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Step Content */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 2, height: '100%' }}>
              {renderStepContent()}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
      />
    </Box>
  );
};