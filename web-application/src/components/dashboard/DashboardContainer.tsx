// web-application/src/components/dashboard/DashboardContainer.tsx
// Enhanced DashboardContainer that handles all chart management and uses enhanced ChartContainer

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Paper,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  BarChart  as ChartIcon
} from '@mui/icons-material';
import Sync  from '@mui/icons-material/Sync';

// Import storage utilities
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// Import enhanced ChartContainer
import { ChartContainer } from './ChartContainer';
import { ChartErrorBoundary } from '../chart/ChartErrorBoundary';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardChart {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  dataset_ids: string[];
  config_json: any;
  position_json: ChartPosition;
  styling_config: any;
  query_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  tab_id?: string;
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
    layout?: {
      grid_size: number;
      margin: number;
      padding: number;
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
  
  // Event handlers
  onFullscreenChange?: (fullscreen: boolean) => void;
  onChartInteraction?: (event: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ChartRefreshState {
  refreshingCharts: Set<string>;
  refreshResults: Record<string, { success: boolean; time: number }>;
  lastRefreshTime: Date | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  dashboardId,
  workspaceId,
  fullscreen = false,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 30,
  loadingStrategy = 'immediate',
  progressiveDelay = 500,
  showLoadingProgress = true,
  onFullscreenChange,
  onChartInteraction,
  onError,
  className
}) => {
  
  // ============================================================================
  // RTK QUERY INTEGRATION
  // ============================================================================
  
  // Get effective workspace ID from props or storage
  const currentWorkspaceFromStorage = workspaceStorage.getCurrentWorkspace();
  const effectiveWorkspaceId = workspaceId || currentWorkspaceFromStorage?.id;

  // Use RTK Query to fetch dashboard data (if not already provided by parent)
  const {
    data: dashboardResponse,
    isLoading,
    error: queryError,
    refetch: refetchDashboard
  } = useGetDashboardQuery(
    dashboardId,
    {
      skip: !dashboardId || !effectiveWorkspaceId,
      pollingInterval: autoRefresh ? refreshInterval * 1000 : 0,
    }
  );

  // ============================================================================
  // LOCAL STATE MANAGEMENT
  // ============================================================================
  
  // Dashboard-controlled refresh state
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());
  const [refreshState, setRefreshState] = useState<ChartRefreshState>({
    refreshingCharts: new Set(),
    refreshResults: {},
    lastRefreshTime: null
  });

  // ============================================================================
  // COMPUTED VALUES - Use RTK Query data
  // ============================================================================

  // Extract dashboard from RTK Query response
  const dashboard = useMemo(() => {
    if (!dashboardResponse?.success || !dashboardResponse?.data) {
      return null;
    }

    const dashboardData = dashboardResponse.data;

    // Process dashboard data with defaults
    const processedDashboard: Dashboard = {
      ...dashboardData,
      config_json: dashboardData.config_json || {
        auto_refresh: { enabled: autoRefresh, interval: refreshInterval },
        layout: { grid_size: 12, margin: 8, padding: 16 }
      },
      charts: dashboardData.charts || []
    };

    return processedDashboard;
  }, [dashboardResponse, autoRefresh, refreshInterval]);

  // RTK Query states
  const loading = isLoading;
  const error = useMemo(() => {
    if (queryError) {
      if ('status' in queryError) {
        switch (queryError.status) {
          case 401:
            return 'Authentication expired - please login again';
          case 403:
            return 'Access denied to this dashboard';
          case 404:
            return 'Dashboard not found';
          default:
            return `Failed to load dashboard (${queryError.status})`;
        }
      }
      return 'Failed to load dashboard';
    }
    return null;
  }, [queryError]);

  const visibleCharts = useMemo(() => 
    dashboard?.charts?.filter(chart => chart.is_active) || []
  , [dashboard?.charts]);

  const isRefreshing = refreshState.refreshingCharts.size > 0;
  const refreshStats = Object.values(refreshState.refreshResults);
  const successfulRefreshes = refreshStats.filter(r => r.success).length;
  const failedRefreshes = refreshStats.filter(r => !r.success).length;

  // ============================================================================
  // DASHBOARD REFRESH MANAGEMENT
  // ============================================================================

  const handleDashboardRefresh = useCallback(() => {
    if (!dashboard?.charts) {
      console.warn('⚠️ No charts to refresh');
      return;
    }

    console.log('🔄 DashboardContainer refresh initiated', { chartCount: dashboard.charts.length });
    
    // Reset refresh results
    setRefreshState(prev => ({
      ...prev,
      refreshResults: {},
      lastRefreshTime: new Date()
    }));
    
    // Set all charts as refreshing
    const chartIds = new Set(dashboard.charts.map(chart => chart.id));
    setRefreshState(prev => ({
      ...prev,
      refreshingCharts: chartIds
    }));
    
    // Trigger refresh by updating timestamp
    setRefreshTrigger(Date.now());
  }, [dashboard?.charts]);

  const handleChartRefreshComplete = useCallback((chartId: string, success: boolean) => {
    console.log(`📊 Chart ${chartId} refresh ${success ? 'completed' : 'failed'}`);
    
    setRefreshState(prev => {
      const newRefreshingCharts = new Set(prev.refreshingCharts);
      newRefreshingCharts.delete(chartId);
      
      return {
        ...prev,
        refreshingCharts: newRefreshingCharts,
        refreshResults: {
          ...prev.refreshResults,
          [chartId]: { 
            success, 
            time: Date.now() 
          }
        }
      };
    });
  }, []);

  const toggleFullscreen = () => {
    onFullscreenChange?.(!fullscreen);
  };

  const handleRefreshDashboard = useCallback(() => {
    console.log('🔄 Refreshing dashboard via RTK Query...');
    refetchDashboard();
  }, [refetchDashboard]);

  // ============================================================================
  // EFFECTS - Simplified with RTK Query
  // ============================================================================

  // Handle authentication errors
  useEffect(() => {
    if (queryError && 'status' in queryError && queryError.status === 401) {
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();
    }
  }, [queryError]);

  // Notify parent of errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // ============================================================================
  // LOADING AND ERROR STATES - Using RTK Query states  
  // ============================================================================

  if (loading) {
    return (
      <Box className={className}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading Dashboard...
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Preparing charts and data sources
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dashboard Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={handleRefreshDashboard}
          variant="outlined"
        >
          Retry Loading
        </Button>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box className={className}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DashboardIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Dashboard Not Available
          </Typography>
          <Typography variant="body2" color="text.disabled">
            The requested dashboard could not be loaded.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Box className={className}>
      {/* Dashboard Controls Header */}
      <Paper elevation={0} sx={{ mb: 3, p: 2, borderRadius: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <DashboardIcon sx={{ mr: 1 }} />
              {dashboard.display_name || dashboard.name}
            </Typography>
            
            {/* Dashboard Stats */}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {visibleCharts.length} charts
              </Typography>
              
              {dashboard.config_json.auto_refresh?.enabled && (
                <Chip
                  icon={<Sync />}
                  label={`Auto: ${dashboard.config_json.auto_refresh.interval}s`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              
              {refreshState.lastRefreshTime && (
                <Typography variant="body2" color="text.secondary">
                  Last refresh: {refreshState.lastRefreshTime.toLocaleTimeString()}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Refresh Results */}
            {Object.keys(refreshState.refreshResults).length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {successfulRefreshes > 0 && (
                  <Chip
                    label={`${successfulRefreshes} updated`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {failedRefreshes > 0 && (
                  <Chip
                    label={`${failedRefreshes} failed`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                )}
              </Box>
            )}

            {/* Manual Refresh Button */}
            <Tooltip title={isRefreshing ? 'Refreshing...' : 'Refresh all charts'}>
              <IconButton
                onClick={handleDashboardRefresh}
                disabled={isRefreshing}
                color="primary"
              >
                {isRefreshing ? (
                  <CircularProgress size={24} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>

            {/* RTK Query Refresh Button */}
            <Tooltip title="Refresh dashboard data">
              <IconButton
                onClick={handleRefreshDashboard}
                disabled={isLoading}
                color="secondary"
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Sync />
                )}
              </IconButton>
            </Tooltip>

            {/* Fullscreen Toggle */}
            <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              <IconButton onClick={toggleFullscreen}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </Paper>

      {/* Loading Progress Bar */}
      {isRefreshing && showLoadingProgress && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Charts Grid */}
      {visibleCharts.length > 0 ? (
        <Grid container spacing={3}>
          {visibleCharts.map((chart) => {
            // Calculate grid size based on chart position
            const getGridSize = (width: number = 6) => {
              if (width >= 12) return 12;
              if (width >= 8) return 8; 
              if (width >= 6) return 6;
              return 4;
            };

            const gridWidth = getGridSize(chart.position_json?.width);

            return (
              <Grid item xs={12} md={gridWidth} key={chart.id}>
                <ChartErrorBoundary>
                  <ChartContainer
                    chart={chart}
                    workspaceId={effectiveWorkspaceId}
                    dashboardId={dashboardId}
                    
                    // Dashboard-controlled refresh
                    dashboardRefreshTrigger={refreshTrigger}
                    onRefreshComplete={handleChartRefreshComplete}
                    
                    // Dashboard-level settings
                    dashboardAutoRefresh={dashboard.config_json.auto_refresh?.enabled || autoRefresh}
                    dashboardRefreshInterval={dashboard.config_json.auto_refresh?.interval || refreshInterval}
                    
                    // Enhanced features
                    performanceMetrics={true}
                    showErrorInCard={true}
                    maxRetries={3}
                    gridItem={true}
                    
                    // Display settings
                    fullscreen={fullscreen}
                    
                    // Event handlers
                    onChartLoad={(chartId, metadata) => {
                      console.log('📊 Chart loaded:', chartId, metadata);
                    }}
                    onChartError={(chartId, error) => {
                      console.error('📊 Chart error:', chartId, error);
                    }}
                    onChartRefresh={(chartId) => {
                      console.log('📊 Chart manually refreshed:', chartId);
                    }}
                    onClick={(event) => {
                      onChartInteraction?.({ 
                        type: 'click', 
                        chartId: chart.id, 
                        chart: chart 
                      });
                    }}
                  />
                </ChartErrorBoundary>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Charts Available
          </Typography>
          <Typography variant="body2" color="text.disabled">
            This dashboard doesn't have any active charts.
          </Typography>
        </Paper>
      )}

      {/* Refresh Progress Indicator */}
      {isRefreshing && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 1000
          }}
          elevation={3}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">
            Refreshing {refreshState.refreshingCharts.size} of {visibleCharts.length} charts...
          </Typography>
        </Paper>
      )}
    </Box>
  );
};