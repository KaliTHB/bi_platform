// web-application/src/components/dashboard/DashboardContainer.tsx
// Enhanced with chart loading states - using existing ChartContainer component

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';

// Import your existing ChartContainer component
import {ChartContainer} from './ChartContainer';
import { ChartContainerProps } from '@/types/chart.types';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// ============================================================================
// TYPES - Enhanced with loading states
// ============================================================================

interface ChartLoadingState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  retryCount: number;
}

interface DashboardChart {
  id: string;
  chart_id: string;
  dashboard_id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  title: string;
  order_index: number;
  is_visible: boolean;
  chart: {
    id: string;
    name: string;
    display_name: string;
    chart_type: string;
    config_json: any;
    dataset_ids: string[];
    is_active: boolean;
    version: number;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
}

interface Dashboard {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  config_json: {
    auto_refresh?: {
      enabled: boolean;
      interval: number;
    };
  };
  theme_config: {
    primary_color?: string;
    background_color?: string;
  };
  charts?: DashboardChart[];
  tabs: any[];
  global_filters: any[];
  is_public: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DashboardContainerProps {
  dashboardId: string;
  workspaceId?: string;
  fullscreen?: boolean;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  
  // Enhanced props for loading strategy
  loadingStrategy?: 'immediate' | 'on-demand' | 'progressive';
  progressiveDelay?: number;
  showLoadingProgress?: boolean;
  
  onFullscreenChange?: (fullscreen: boolean) => void;
  onChartInteraction?: (event: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

// ============================================================================
// DASHBOARD CONTAINER COMPONENT - Enhanced with existing ChartContainer
// ============================================================================

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  dashboardId,
  workspaceId,
  fullscreen = false,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 30000,
  loadingStrategy = 'on-demand',
  progressiveDelay = 500,
  showLoadingProgress = true,
  onFullscreenChange,
  onChartInteraction,
  onError,
  className
}) => {
  
  // ============================================================================
  // STATE - Enhanced with chart loading states
  // ============================================================================

  const [state, setState] = useState<{
    dashboard: Dashboard | null;
    loading: boolean;
    error: string | null;
  }>({
    dashboard: null,
    loading: true,
    error: null
  });

  // New chart loading state management
  const [chartLoadingStates, setChartLoadingStates] = useState<Record<string, ChartLoadingState>>({});
  const [autoRefreshActive, setAutoRefreshActive] = useState(autoRefresh);

  // ============================================================================
  // CHART LOADING STATE MANAGEMENT
  // ============================================================================

  const updateChartState = useCallback((chartId: string, updates: Partial<ChartLoadingState>) => {
    setChartLoadingStates(prev => ({
      ...prev,
      [chartId]: {
        loading: false,
        loaded: false,
        error: null,
        retryCount: 0,
        ...prev[chartId],
        ...updates
      }
    }));
  }, []);

  const setChartLoading = useCallback((chartId: string, loading: boolean) => {
    updateChartState(chartId, { 
      loading,
      ...(loading && { error: null }) // Clear error when starting to load
    });
  }, [updateChartState]);

  const setChartLoaded = useCallback((chartId: string) => {
    updateChartState(chartId, {
      loading: false,
      loaded: true,
      error: null
    });
  }, [updateChartState]);

  const setChartError = useCallback((chartId: string, error: string) => {
    updateChartState(chartId, {
      loading: false,
      error,
      retryCount: (chartLoadingStates[chartId]?.retryCount || 0) + 1
    });
  }, [updateChartState, chartLoadingStates]);

  // ============================================================================
  // COMPUTED VALUES - Enhanced with loading stats
  // ============================================================================

  const totalChartsCount = state.dashboard?.charts?.length || 0;
  const visibleCharts = useMemo(() => 
    state.dashboard?.charts?.filter(chart => chart.is_visible) || []
  , [state.dashboard?.charts]);

  const loadingStats = useMemo(() => {
    const states = Object.values(chartLoadingStates);
    const total = visibleCharts.length;
    const loading = states.filter(s => s.loading).length;
    const loaded = states.filter(s => s.loaded).length;
    const errors = states.filter(s => s.error).length;
    const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
    
    return { total, loading, loaded, errors, progress };
  }, [chartLoadingStates, visibleCharts.length]);

  // ============================================================================
  // LOADING STRATEGY IMPLEMENTATION - Simplified to prevent duplicate API calls
  // ============================================================================

  // We don't need these functions anymore since ChartContainer handles loading
  // Just keep them for potential future use or remove entirely

  // ============================================================================
  // EVENT HANDLERS - Simplified to work with ChartContainer's natural behavior
  // ============================================================================

  const loadDashboard = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Replace with your actual dashboard API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock dashboard data - replace with actual API call
      const mockDashboard: Dashboard = {
        id: dashboardId,
        name: 'Sales Dashboard',
        display_name: 'Sales Performance Dashboard',
        description: 'Comprehensive sales performance dashboard with key metrics and trends',
        config_json: {
          auto_refresh: { enabled: true, interval: 30000 }
        },
        theme_config: {
          primary_color: '#1976d2',
          background_color: '#f5f5f5'
        },
        charts: [
          {
            id: 'chart-1',
            chart_id: 'chart-1',
            dashboard_id: dashboardId,
            position: { x: 0, y: 0, width: 6, height: 4 },
            title: 'Monthly Revenue Trend',
            order_index: 1,
            is_visible: true,
            chart: {
              id: 'chart-1',
              name: 'revenue_trend',
              display_name: 'Monthly Revenue Trend',
              chart_type: 'line',
              config_json: {},
              dataset_ids: ['revenue-data'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: '2024-01-01',
              updated_at: '2024-01-01'
            }
          },
          {
            id: 'chart-2',
            chart_id: 'chart-2',
            dashboard_id: dashboardId,
            position: { x: 6, y: 0, width: 6, height: 4 },
            title: 'Sales by Region',
            order_index: 2,
            is_visible: true,
            chart: {
              id: 'chart-2',
              name: 'sales_by_region',
              display_name: 'Sales by Region',
              chart_type: 'bar',
              config_json: {},
              dataset_ids: ['regional-sales'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: '2024-01-01',
              updated_at: '2024-01-01'
            }
          },
          {
            id: 'chart-3',
            chart_id: 'chart-3',
            dashboard_id: dashboardId,
            position: { x: 0, y: 4, width: 12, height: 4 },
            title: 'Top Performing Products',
            order_index: 3,
            is_visible: true,
            chart: {
              id: 'chart-3',
              name: 'top_products',
              display_name: 'Top Performing Products',
              chart_type: 'pie',
              config_json: {},
              dataset_ids: ['product-performance'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: '2024-01-01',
              updated_at: '2024-01-01'
            }
          }
        ],
        tabs: [],
        global_filters: [],
        is_public: false,
        status: 'published',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };
      
      setState(prev => ({ ...prev, dashboard: mockDashboard, loading: false }));
      
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error?.message || 'Failed to load dashboard' 
      }));
      onError?.(error?.message || 'Failed to load dashboard');
    }
  }, [dashboardId, onError]);

  const handleFullscreenToggle = useCallback(() => {
    onFullscreenChange?.(!fullscreen);
  }, [fullscreen, onFullscreenChange]);

  const handleChartClick = useCallback((chart: any) => {
    console.log('📊 Chart clicked:', chart.id);
    onChartInteraction?.({ type: 'click', chartId: chart.id });
  }, [onChartInteraction]);

  const handleChartLoad = useCallback((chartId: string, metadata: any) => {
    console.log('📊 Chart loaded:', chartId, metadata);
    setChartLoaded(chartId);
  }, [setChartLoaded]);

  const handleChartError = useCallback((chartId: string, error: string) => {
    console.log('📊 Chart error:', chartId, error);
    setChartError(chartId, error);
  }, [setChartError]);

  const toggleAutoRefresh = () => {
    setAutoRefreshActive(!autoRefreshActive);
    console.log(`🔄 Auto-refresh ${!autoRefreshActive ? 'enabled' : 'disabled'}`);
  };

  const handleLoadAllCharts = useCallback(() => {
    // Just trigger a re-render, let ChartContainer handle loading
    visibleCharts.forEach(chart => {
      updateChartState(chart.chart_id, { loading: false, loaded: false, error: null });
    });
  }, [visibleCharts, updateChartState]);

  // ============================================================================
  // EFFECTS - Simplified to not interfere with ChartContainer loading
  // ============================================================================

  useEffect(() => {
    loadDashboard();
  }, [dashboardId]);

  // No need to manually trigger loading strategies - ChartContainer handles it based on props

  // ============================================================================
  // RENDER HELPERS - Using existing ChartContainer
  // ============================================================================

  const renderChart = (dashboardChart: DashboardChart) => {
    const chartState = chartLoadingStates[dashboardChart.chart_id] || {
      loading: false,
      loaded: false,
      error: null,
      retryCount: 0
    };

    // Calculate grid size based on position width
    const getGridSize = (width: number) => {
      if (width >= 12) return 12;
      if (width >= 8) return 8;
      if (width >= 6) return 6;
      return 12;
    };

    // Create props for your existing ChartContainer - Simplified to prevent duplicate API calls
    const chartContainerProps: ChartContainerProps = {
      // Core required props
      chart: {
        ...dashboardChart.chart,
        // Convert DashboardChart.chart to Chart type
        workspace_id: workspaceId || '',
        dashboard_id: dashboardId,
        chart_library: dashboardChart.chart.config_json?.chart_library || 'echarts',
        position_json: dashboardChart.position,
        query_config: dashboardChart.chart.config_json?.query_config || {},
        visualization_config: dashboardChart.chart.config_json?.visualization_config || {},
        filters: [],
        tags: [],
        is_public: false,
        updated_by: dashboardChart.chart.created_by,
        created_at: new Date(dashboardChart.chart.created_at),
        updated_at: new Date(dashboardChart.chart.updated_at),
        owner: {
          id: dashboardChart.chart.created_by,
          name: 'Chart Owner',
          email: 'owner@example.com'
        }
      },
      
      // Context props
      workspaceId,
      dashboardId,
      
      // Dimensions based on position
      dimensions: {
        width: '100%',
        height: dashboardChart.position.height * 60
      },
      
      // Event handlers - just track what ChartContainer reports back
      onChartLoad: (chartId: string, metadata: any) => handleChartLoad(chartId, metadata),
      onChartError: (chartId: string, error: string) => handleChartError(chartId, error),
      onChartClick: handleChartClick,
      onChartDoubleClick: handleChartClick,
      
      // Auto-refresh settings
      autoRefresh: autoRefreshActive,
      refreshInterval: autoRefreshActive ? refreshInterval : undefined,
      
      // Let ChartContainer handle loading based on strategy
      refreshOnMount: loadingStrategy === 'immediate',
      lazy: loadingStrategy === 'on-demand',
      
      // Display
      className: 'dashboard-chart-container'
    };

    return (
      <Grid 
        item 
        xs={12} 
        md={getGridSize(dashboardChart.position.width)}
        key={dashboardChart.id}
        sx={{ 
          order: dashboardChart.order_index || 999
        }}
      >
        {/* Use your existing ChartContainer component */}
        <ChartContainer {...chartContainerProps} />
      </Grid>
    );
  };

  const renderEmptyDashboard = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          textAlign: 'center',
          py: 4
        }}
      >
        <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Empty Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This dashboard doesn't have any charts yet.
        </Typography>
      </Box>
    );
  };

  const renderLoadingState = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Skeleton variant="text" width={300} height={32} />
            <Skeleton variant="text" width={200} height={24} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Box sx={{ height: 240 }}>
                <Skeleton variant="rectangular" height="100%" />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // ============================================================================
  // MAIN RENDER - Enhanced with loading progress
  // ============================================================================

  if (state.loading) {
    return (
      <Box sx={{ height: '100%' }}>
        {renderLoadingState()}
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dashboard Error
          </Typography>
          <Typography variant="body2">
            {state.error}
          </Typography>
        </Alert>
        <Button variant="outlined" onClick={() => loadDashboard()} startIcon={<RefreshIcon />}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (!state.dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            Dashboard not found
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100%',
        bgcolor: state.dashboard.theme_config.background_color || 'background.default'
      }}
      className={className}
    >
      {/* Unified Dashboard Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left: Dashboard Info & Stats */}
          <Box sx={{ flex: 1, mr: 2 }}>
            {/* Title & Description */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {state.dashboard.display_name || state.dashboard.name}
              </Typography>
              {state.dashboard.description && (
                <Typography variant="body1" color="text.secondary">
                  {state.dashboard.description}
                </Typography>
              )}
            </Box>
            
            {/* Stats & Progress in one row */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {/* Chart Stats */}
              <Chip 
                label={`${totalChartsCount} Charts`} 
                size="small" 
                variant="outlined" 
              />
              
              {/* Loading Stats - only show if there's activity */}
              {loadingStats.loading > 0 && (
                <Chip 
                  label={`${loadingStats.loading} Loading`} 
                  size="small" 
                  color="primary"
                />
              )}
              {loadingStats.loaded > 0 && (
                <Chip 
                  label={`${loadingStats.loaded} Loaded`} 
                  size="small" 
                  color="success"
                />
              )}
              {loadingStats.errors > 0 && (
                <Chip 
                  label={`${loadingStats.errors} Errors`} 
                  size="small" 
                  color="error"
                />
              )}

              {/* Loading Strategy - only show if not default */}
              {loadingStrategy !== 'on-demand' && (
                <Chip 
                  label={`${loadingStrategy.charAt(0).toUpperCase() + loadingStrategy.slice(1)} Loading`} 
                  size="small" 
                  variant="outlined"
                  color="secondary"
                />
              )}

              {/* Auto-refresh indicator */}
              {autoRefreshActive && (
                <Chip 
                  label={`Auto-refresh: ${Math.round(refreshInterval / 1000)}s`} 
                  size="small" 
                  color="info"
                  variant="outlined"
                />
              )}

              {/* Inline Progress Bar - compact version */}
              {showLoadingProgress && loadingStats.loading > 0 && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  ml: 1,
                  minWidth: 120 
                }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={loadingStats.progress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      flexGrow: 1,
                      minWidth: 60
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                    {loadingStats.progress}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: Dashboard Controls */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Tooltip title={autoRefreshActive ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}>
              <IconButton 
                onClick={toggleAutoRefresh}
                color={autoRefreshActive ? 'primary' : 'default'}
                size="small"
              >
                {autoRefreshActive ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Dashboard">
              <IconButton 
                onClick={() => loadDashboard()}
                size="small"
                disabled={state.loading}
              >
                <RefreshIcon sx={{ 
                  animation: state.loading ? 'spin 1s linear infinite' : 'none' 
                }} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <IconButton 
                onClick={handleFullscreenToggle} 
                color="primary"
                size="small"
              >
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Dashboard Content - Using existing ChartContainer components */}
      <Box sx={{ px: 3, pb: 3 }}>
        {state.dashboard.charts && state.dashboard.charts.length > 0 ? (
          <Grid container spacing={3}>
            {state.dashboard.charts
              .filter(chart => chart.is_visible)
              .sort((a, b) => a.order_index - b.order_index)
              .map(renderChart)}
          </Grid>
        ) : (
          renderEmptyDashboard()
        )}
      </Box>

      {/* CSS for animations */}
      <style jsx>{`
       @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
		 /* ============================================================================ */
        /* REACT GRID LAYOUT STYLES - ENHANCED FOR DASHBOARD BUILDER */
        /* ============================================================================ */
        
        .dashboard-grid-layout {
          position: relative !important;
          background: transparent !important;
          min-height: 600px !important;
          width: 100% !important;
        }

        .react-grid-layout {
          position: relative !important;
          background: transparent !important;
          min-height: 600px !important;
        }

        .react-grid-item {
          transition: all 200ms ease !important;
          transition-property: left, top, transform !important;
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
        }

        .react-grid-item:hover {
          border-color: #1976d2 !important;
          box-shadow: 0 4px 12px 0 rgba(25, 118, 210, 0.15) !important;
          transform: translateY(-1px) !important;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform !important;
        }

        .react-grid-item.react-draggable-dragging {
          z-index: 1000 !important;
          box-shadow: 0 8px 25px 0 rgba(0, 0, 0, 0.3) !important;
          transform: rotate(2deg) !important;
          border-color: #1976d2 !important;
        }

        .react-grid-item.resizing {
          opacity: 0.8 !important;
          z-index: 999 !important;
        }

        /* Enhanced resize handle */
        .react-grid-item > .react-resizable-handle {
          position: absolute !important;
          width: 16px !important;
          height: 16px !important;
          bottom: 0 !important;
          right: 0 !important;
          cursor: se-resize !important;
          opacity: 0 !important;
          transition: opacity 0.2s ease !important;
          border-radius: 0 0 8px 0 !important;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDEwSDEzVjEzSDEwVjEwWiIgZmlsbD0iIzk5QTNBRiIvPgo8cGF0aCBkPSJNMTMgMTNIMTZWMTZIMTNWMTNaIiBmaWxsPSIjOTlBM0FGIi8+CjxwYXRoIGQ9Ik0xMCAxM0gxM1YxNkgxMFYxM1oiIGZpbGw9IiM5OUEzQUYiLz4KPC9zdmc+Cg==') no-repeat center !important;
          background-size: 12px 12px !important;
        }

        .react-grid-item:hover > .react-resizable-handle {
          opacity: 1 !important;
        }

        /* Placeholder styling */
        .react-grid-placeholder {
          background: linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.2) 100%) !important;
          border: 2px dashed #1976d2 !important;
          border-radius: 8px !important;
          transition-duration: 100ms !important;
          z-index: 2 !important;
          animation: pulse 2s infinite !important;
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
          }
          50% { 
            opacity: 0.5; 
          }
        }

        /* Grid item states */
        .react-grid-item.static {
          background: #f8f9fa !important;
          border-style: dashed !important;
          opacity: 0.7 !important;
        }

        .react-grid-item.no-drag {
          cursor: default !important;
        }

        /* Grid item content */
        .grid-item-card {
          width: 100% !important;
          height: 100% !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
        }

        /* Chart container inside grid */
        .enhanced-chart-container.grid-chart-item {
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
        }

        .dashboard-chart-container {
          width: 100% !important;
          height: 100% !important;
        }

        /* ============================================================================ */
        /* CHART CONTAINER STYLES - ENHANCED FOR BI PLATFORM */
        /* ============================================================================ */

        .chart-container {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          border-radius: 8px !important;
          background: white !important;
          position: relative !important;
        }

        .chart-header {
          padding: 12px 16px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #fafbfc !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          min-height: 48px !important;
        }

        .chart-content {
          flex: 1 !important;
          position: relative !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .chart-loading {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100% !important;
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(4px) !important;
          color: #64748b !important;
        }

        .chart-error {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100% !important;
          text-align: center !important;
          padding: 24px !important;
          color: #dc2626 !important;
          background: #fef2f2 !important;
        }

        .chart-empty {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100% !important;
          text-align: center !important;
          padding: 24px !important;
          color: #64748b !important;
          background: #f8f9fa !important;
        }

        .chart-footer {
          padding: 8px 16px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #f8f9fa !important;
          font-size: 0.75rem !important;
          color: #64748b !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        /* Chart type specific styles */
        .chart-type-table .chart-content {
          padding: 0 !important;
        }

        .chart-type-metric .chart-content {
          padding: 24px !important;
        }

        .chart-type-gauge .chart-content {
          padding: 16px !important;
        }

        /* ============================================================================ */
        /* RESPONSIVE DESIGN */
        /* ============================================================================ */

        @media (max-width: 1200px) {
          .react-grid-item {
            min-width: 0 !important;
          }
          
          .dashboard-grid-layout {
            padding: 8px !important;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 8px !important;
          }
          
          .dashboard-grid-layout {
            padding: 4px !important;
          }
          
          .react-grid-item {
            border-radius: 4px !important;
          }
          
          .react-grid-item > .react-resizable-handle {
            width: 20px !important;
            height: 20px !important;
            background-size: 16px 16px !important;
          }
        }

        /* ============================================================================ */
        /* LOADING AND ERROR STATES */
        /* ============================================================================ */

        .chart-loading-state {
          background: rgba(0, 0, 0, 0.02) !important;
          border: 2px dashed #e0e0e0 !important;
        }

        .chart-error-state {
          background: #fef2f2 !important;
          border: 2px solid #fecaca !important;
        }

        .chart-success-state {
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
        }

        /* Enhanced focus styles for accessibility */
        .react-grid-item:focus {
          outline: 2px solid #1976d2 !important;
          outline-offset: 2px !important;
        }

        /* Loading spinner animation */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-spinner {
          animation: spin 1s linear infinite !important;
        }

        /* ============================================================================ */
        /* CUSTOM SCROLLBAR STYLES */
        /* ============================================================================ */

        .dashboard-container ::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
        }

        .dashboard-container ::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
          border-radius: 3px !important;
        }

        .dashboard-container ::-webkit-scrollbar-thumb {
          background: #c1c1c1 !important;
          border-radius: 3px !important;
          transition: background-color 0.2s ease !important;
        }

        .dashboard-container ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1 !important;
        }

        .dashboard-container ::-webkit-scrollbar-corner {
          background: #f1f1f1 !important;
        }
      `}</style>
    </Box>
  );
};

export default DashboardContainer;
