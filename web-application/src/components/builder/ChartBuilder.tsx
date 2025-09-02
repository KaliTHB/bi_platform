// src/components/builder/ChartBuilder.tsx - Complete Fixed Template
//
// KEY FIXES APPLIED:
// ✅ Fixed import: Chart from @/types/chart.types (includes is_active, version)
// ✅ Fixed API response unwrapping: response.dashboard, response.chart, response.data
// ✅ Fixed column type conversion: API columns → ColumnDefinition[]
// ✅ Fixed Chart object creation: Added required is_active, version properties
// ✅ Fixed variable scoping: Moved operations inside proper conditional blocks
// ✅ Fixed API method calls: getData() → queryDataset(), executeQuery() → queryDataset()
// ✅ Added comprehensive error handling with proper state management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';

// Import types and services - FIXED IMPORTS
import {
  Chart,
  ChartDimensions,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types'; // ✅ Chart types only
import {
  Dashboard,
  Dataset,
  ColumnDefinition // ✅ Import ColumnDefinition from main types
} from '@/types'; // General types (includes dataset.types exports)
import {
  dashboardAPI,
  datasetAPI,
  chartAPI
} from '@/services/api';

import {ChartConfigPanel} from '@/components/builder/ChartConfigPanel';
import {ChartRenderer} from '@/components/charts/ChartRenderer';
import {ChartSelector} from '@/components/builder/ChartSelector';
import {QueryBuilder} from '@/components/builder/QueryBuilder';
import { DatasetSelector } from '@/components/builder/DatasetSelector';

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

interface ChartBuilderState {
  // Data
  dashboard: Dashboard | null;
  availableDatasets: Dataset[];
  selectedChart: Chart | null;
  chartData: any[];
  columns: ColumnDefinition[];
  layouts: { lg: any[] };
  
  // UI State
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  previewMode: boolean;
  activeTab: 'chart' | 'dataset' | 'query' | 'analytics';
}

// ============================================================================
// Main Component
// ============================================================================

const ChartBuilder: React.FC<ChartBuilderProps> = ({
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
    dashboard: null,
    availableDatasets: [],
    selectedChart: null,
    chartData: [],
    columns: [],
    layouts: { lg: [] },
    loading: true,
    saving: false,
    error: null,
    success: null,
    previewMode: false,
    activeTab: 'chart'
  });

  // Chart dimensions for the renderer
  const chartDimensions: ChartDimensions = useMemo(() => ({
    width: 800,
    height: 500,
    margin: { top: 40, right: 40, bottom: 60, left: 80 }
  }), []);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  // Convert API column format to ColumnDefinition format
  const convertApiColumnsToColumnDefinitions = useCallback((apiColumns: Array<{ name: string; type: string; }>): ColumnDefinition[] => {
    return apiColumns.map(col => ({
      name: col.name,
      display_name: col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      data_type: col.type,
      is_nullable: true, // Default assumption
      is_primary_key: false // Default assumption
    }));
  }, []);

  // Convert API chart format to builder format
  const convertApiChartToBuilderChart = useCallback((apiChart: any): Chart => {
    return {
      id: apiChart.id,
      name: apiChart.name,
      display_name: apiChart.display_name,
      description: apiChart.description,
      workspace_id: apiChart.workspace_id,
      dashboard_id: apiChart.dashboard_id,
      chart_type: apiChart.chart_type,
      chart_category: apiChart.chart_category || 'basic',
      chart_library: apiChart.chart_library || 'echarts',
      dataset_ids: apiChart.dataset_ids || [],
      config_json: apiChart.config_json || {},
      position_json: apiChart.position_json || { x: 0, y: 0, width: 4, height: 3 },
      styling_config: apiChart.styling_config || undefined,
      interaction_config: apiChart.interaction_config || undefined,
      drilldown_config: apiChart.drilldown_config || undefined, // ✅ Use undefined for optional configs
      calculated_fields: apiChart.calculated_fields || [],
      conditional_formatting: apiChart.conditional_formatting || [],
      export_config: apiChart.export_config || undefined, // ✅ Use undefined for optional configs  
      cache_config: apiChart.cache_config || undefined, // ✅ Use undefined for optional configs
      tab_id: apiChart.tab_id,
      is_active: apiChart.is_active ?? true, // ✅ Required property
      version: apiChart.version || 1, // ✅ Required property
      created_by: apiChart.created_by,
      created_at: apiChart.created_at,
      updated_at: apiChart.updated_at
    };
  }, []);

  // Generate grid layout from charts
  const generateGridLayout = useCallback((charts: any[]) => {
    return charts.map((chart, index) => ({
      i: chart.id,
      x: (index % 3) * 4,
      y: Math.floor(index / 3) * 3,
      w: chart.position?.width || 4,
      h: chart.position?.height || 3
    }));
  }, []);

  // ============================================================================
  // Initialization & Data Loading
  // ============================================================================

  // Initialize the builder
  useEffect(() => {
    initializeBuilder();
  }, [chartId, workspaceId, dashboardId]);

  const initializeBuilder = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load datasets first (always needed)
      await loadDatasets();

      // Load dashboard if provided
      if (dashboardId) {
        await loadDashboard();
      }

      // Load existing chart if editing
      if (chartId) {
        await loadChart();
      }

      setState(prev => ({ ...prev, loading: false }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize chart builder',
        loading: false
      }));
    }
  };

  // Load dashboard data
  const loadDashboard = async () => {
    if (!dashboardId) return;

    try {
      const response = await dashboardAPI.getDashboard(dashboardId);
      
      if (response.success && response.dashboard) {
        const dashboard = response.dashboard;
        setState(prev => ({ ...prev, dashboard }));

        // Convert API charts to builder format and generate layout
        if (dashboard.charts && dashboard.charts.length > 0) {
          const builderCharts = dashboard.charts.map(convertApiChartToBuilderChart);
          const gridLayout = generateGridLayout(builderCharts);
          setState(prev => ({ 
            ...prev, 
            layouts: { lg: gridLayout }
          }));
        } else {
          // No charts in dashboard
          setState(prev => ({ ...prev, layouts: { lg: [] } }));
        }
      } else {
        console.error('Failed to load dashboard:', response.message);
        setState(prev => ({ ...prev, layouts: { lg: [] } }));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setState(prev => ({ ...prev, layouts: { lg: [] } }));
      throw new Error('Failed to load dashboard');
    }
  };

  // Load available datasets
  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.getDatasets(workspaceId);
      
      if (response.success && response.datasets) {
        setState(prev => ({ 
          ...prev, 
          availableDatasets: response.datasets || []
        }));
      } else {
        console.warn('Failed to load datasets:', response.message);
        setState(prev => ({ ...prev, availableDatasets: [] }));
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
      setState(prev => ({ ...prev, availableDatasets: [] }));
    }
  };

  // Load existing chart for editing
  const loadChart = async () => {
    if (!chartId) return;

    try {
      const response = await chartAPI.getChart(chartId);
      
      if (response.success && response.chart) {
        // Ensure the chart has all required properties matching Chart interface
        const chart: Chart = {
          id: response.chart.id,
          name: response.chart.name,
          display_name: response.chart.display_name,
          description: response.chart.description,
          workspace_id: response.chart.workspace_id,
          dashboard_id: response.chart.dashboard_id,
          chart_type: response.chart.chart_type,
          chart_category: response.chart.chart_category || 'basic',
          chart_library: response.chart.chart_library || 'echarts',
          dataset_ids: response.chart.dataset_ids || [],
          config_json: response.chart.config_json || {},
          position_json: response.chart.position_json || { x: 0, y: 0, width: 4, height: 3 },
          styling_config: response.chart.styling_config || undefined, // ✅ Use undefined for optional configs
          interaction_config: response.chart.interaction_config || undefined, // ✅ Use undefined for optional configs
          drilldown_config: response.chart.drilldown_config || undefined, // ✅ Use undefined for optional configs
          calculated_fields: response.chart.calculated_fields || [],
          conditional_formatting: response.chart.conditional_formatting || [],
          export_config: response.chart.export_config || undefined, // ✅ Use undefined for optional configs
          cache_config: response.chart.cache_config || undefined, // ✅ Use undefined for optional configs
          tab_id: response.chart.tab_id,
          is_active: response.chart.is_active ?? true, // ✅ Required property
          version: response.chart.version || 1, // ✅ Required property
          created_by: response.chart.created_by,
          created_at: response.chart.created_at,
          updated_at: response.chart.updated_at
        };
        
        setState(prev => ({ ...prev, selectedChart: chart }));

        // Load chart data if dataset is available
        if (chart.dataset_ids && chart.dataset_ids.length > 0) {
          await loadChartData(chart.dataset_ids[0]);
        }
      } else {
        throw new Error(response.message || 'Chart not found');
      }
    } catch (error) {
      console.error('Error loading chart:', error);
      throw new Error('Failed to load chart');
    }
  };

  // Load data for a specific dataset
  const loadChartData = async (datasetId: string) => {
    try {
      const response = await datasetAPI.queryDataset(datasetId, {
        limit: 1000, // Reasonable limit for chart data
        offset: 0
      });
      
      if (response.success) {
        const data = response.data || [];
        const apiColumns = response.columns || [];
        const columns = convertApiColumnsToColumnDefinitions(apiColumns);
        
        setState(prev => ({
          ...prev,
          chartData: data,
          columns: columns
        }));
      } else {
        console.error('Failed to load chart data:', response.message);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  // Handle tab change
  const handleTabChange = useCallback((tab: ChartBuilderState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Handle dataset selection
  const handleDatasetSelect = useCallback(async (dataset: Dataset) => {
    if (!state.selectedChart) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Fetch data from selected dataset using dataset.id
      const response = await datasetAPI.queryDataset(dataset.id, {
        limit: 1000,
        offset: 0
      });
      
      if (response.success) {
        const data = response.data || [];
        const apiColumns = response.columns || [];
        const columns = convertApiColumnsToColumnDefinitions(apiColumns);
        
        // Update chart with dataset - only valid Chart properties
        const updatedChart: Chart = {
          ...state.selectedChart,
          dataset_ids: [dataset.id], // ✅ Use dataset.id from Dataset object
          updated_at: new Date().toISOString(),
          version: (state.selectedChart.version || 1) + 1 // ✅ Increment version
        };

        setState(prev => ({
          ...prev,
          selectedChart: updatedChart,
          chartData: data,
          columns: columns,
          loading: false,
          activeTab: 'chart' // Go back to chart config
        }));
      } else {
        throw new Error(response.message || 'Failed to load dataset');
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dataset',
        loading: false
      }));
    }
  }, [state.selectedChart, convertApiColumnsToColumnDefinitions]);

  // Handle query execution
  const handleQueryExecute = useCallback(async (query: string, datasetId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Execute custom query using queryDataset with custom query parameter
      const response = await datasetAPI.queryDataset(datasetId, {
        query: query, // Custom SQL query
        limit: 1000
      });
      
      if (response.success) {
        const data = response.data || [];
        const apiColumns = response.columns || [];
        const columns = convertApiColumnsToColumnDefinitions(apiColumns);
        
        setState(prev => ({
          ...prev,
          chartData: data,
          columns: columns,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || 'Query execution failed',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to execute query',
        loading: false
      }));
    }
  }, [convertApiColumnsToColumnDefinitions]);

  // Handle chart configuration save
  const handleChartConfigSave = useCallback((updatedChart: Chart) => {
    // Ensure the updated chart has all required properties and proper optional properties
    const completeChart: Chart = {
      id: updatedChart.id,
      name: updatedChart.name,
      display_name: updatedChart.display_name,
      description: updatedChart.description,
      workspace_id: updatedChart.workspace_id,
      dashboard_id: updatedChart.dashboard_id,
      chart_type: updatedChart.chart_type,
      chart_category: updatedChart.chart_category,
      chart_library: updatedChart.chart_library,
      dataset_ids: updatedChart.dataset_ids,
      config_json: updatedChart.config_json,
      position_json: updatedChart.position_json,
      styling_config: updatedChart.styling_config || undefined, // ✅ Use undefined for optional configs
      interaction_config: updatedChart.interaction_config || undefined, // ✅ Use undefined for optional configs
      drilldown_config: updatedChart.drilldown_config || undefined, // ✅ Use undefined for optional configs
      calculated_fields: updatedChart.calculated_fields || [],
      conditional_formatting: updatedChart.conditional_formatting || [],
      export_config: updatedChart.export_config || undefined, // ✅ Use undefined for optional configs
      cache_config: updatedChart.cache_config || undefined, // ✅ Use undefined for optional configs
      tab_id: updatedChart.tab_id,
      is_active: updatedChart.is_active ?? true, // ✅ Required property
      version: (updatedChart.version || 1) + 1, // ✅ Increment version
      created_by: updatedChart.created_by,
      created_at: updatedChart.created_at,
      updated_at: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      selectedChart: completeChart,
      success: 'Chart configuration updated'
    }));
  }, []);

  // Handle chart save
  const handleSave = useCallback(async () => {
    if (!state.selectedChart) return;

    setState(prev => ({ ...prev, saving: true, error: null }));

    try {
      if (chartId && chartId === state.selectedChart.id) {
        // Update existing chart
        const updateResponse = await chartAPI.updateChart(chartId, state.selectedChart);
        
        if (updateResponse.success && updateResponse.chart) {
          setState(prev => ({
            ...prev,
            selectedChart: updateResponse.chart,
            saving: false,
            success: 'Chart updated successfully'
          }));

          onSave?.(updateResponse.chart);
        } else {
          throw new Error(updateResponse.message || 'Failed to update chart');
        }
      } else {
        // Create new chart
        const chartData = {
          ...state.selectedChart,
          workspace_id: workspaceId,
          dashboard_id: dashboardId
        };
        
        const createResponse = await chartAPI.createChart(chartData);
        
        if (createResponse.success && createResponse.chart) {
          setState(prev => ({
            ...prev,
            selectedChart: createResponse.chart,
            saving: false,
            success: 'Chart created successfully'
          }));

          onSave?.(createResponse.chart);
        } else {
          throw new Error(createResponse.message || 'Failed to create chart');
        }
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save chart',
        saving: false
      }));
    }
  }, [state.selectedChart, chartId, workspaceId, dashboardId, onSave]);

  // Handle preview toggle
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

  // ============================================================================
  // Render Methods
  // ============================================================================

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
            selectedDataset={state.selectedChart?.dataset_ids?.[0]}
            onSelect={handleDatasetSelect}
            onRefresh={loadDatasets}
          />
        );
      
      case 'query':
        return (
          <QueryBuilder
            datasets={state.availableDatasets}
            selectedDatasetId={state.selectedChart?.dataset_ids?.[0]}
            onExecute={handleQueryExecute}
            onSave={(query: string) => console.log('Query saved:', query)} // ✅ Add explicit type
          />
        );
      
      case 'analytics':
        return (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Chart Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View performance metrics and usage statistics for this chart.
            </Typography>
            {/* Add analytics content here */}
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
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" ml={2}>
          Loading Chart Builder...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Chart Builder
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center">
            <Button
              variant={state.previewMode ? 'contained' : 'outlined'}
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              disabled={!state.selectedChart}
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

      {/* Alert Messages */}
      <Snackbar
        open={!!state.error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={handleCloseAlert}>
          {state.error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!state.success}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={handleCloseAlert}>
          {state.success}
        </Alert>
      </Snackbar>

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
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                      sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
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
                    columns={state.columns}
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
                        ? 'Use the configuration panel to choose your chart type and settings'
                        : 'Choose a dataset from the Dataset tab to load data for your chart'
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ChartBuilder;