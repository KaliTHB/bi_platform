// web-application/src/components/dashboard/DashboardContainer.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Dashboard as DashboardIcon,
  BarChart as ChartIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

// ============================================================================
// TYPES
// ============================================================================

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
  onFullscreenChange?: (fullscreen: boolean) => void;
  onChartInteraction?: (event: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface DashboardContainerState {
  dashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  filters: Record<string, any>;
  lastRefresh: Date | null;
}

// ============================================================================
// LIVE DATA FUNCTIONS
// ============================================================================

const fetchLiveDashboard = async (dashboardId: string): Promise<Dashboard> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const response = await fetch(`${apiUrl}/api/v1/dashboards/${dashboardId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  dashboardId,
  workspaceId,
  fullscreen = false,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  onFullscreenChange,
  onChartInteraction,
  onError,
  className
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [state, setState] = useState<DashboardContainerState>({
    dashboard: null,
    loading: true,
    error: null,
    refreshing: false,
    filters: {},
    lastRefresh: null
  });

  const [autoRefreshActive, setAutoRefreshActive] = useState(autoRefresh);

  // ============================================================================
  // LIVE DASHBOARD LOADING
  // ============================================================================

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!dashboardId) return;

    setState(prev => ({ 
      ...prev, 
      loading: !isRefresh, 
      refreshing: isRefresh,
      error: null 
    }));

    try {
      console.log(`🔄 Loading live dashboard data: ${dashboardId}`);
      
      const dashboardData = await fetchLiveDashboard(dashboardId);
      
      setState(prev => ({
        ...prev,
        dashboard: dashboardData,
        loading: false,
        refreshing: false,
        lastRefresh: new Date(),
        error: null
      }));

      console.log('✅ Dashboard loaded:', {
        charts: dashboardData.charts?.length || 0,
        autoRefresh: dashboardData.config_json?.auto_refresh?.enabled,
        interval: dashboardData.config_json?.auto_refresh?.interval
      });

    } catch (error) {
      console.error('❌ Error loading live dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
      
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errorMessage,
        dashboard: null // Clear dashboard on error
      }));

      onError?.(errorMessage);
    }
  }, [dashboardId, onError]);

  // ============================================================================
  // EFFECTS - AUTO REFRESH & LIVE DATA
  // ============================================================================

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId, loadDashboard]);

  // Auto-refresh effect for live data
  useEffect(() => {
    if (!autoRefreshActive || !state.dashboard?.config_json?.auto_refresh?.enabled) {
      return;
    }

    const interval = state.dashboard.config_json.auto_refresh.interval * 1000;
    console.log(`🔄 Setting up auto-refresh every ${interval/1000}s`);
    
    const timer = setInterval(() => {
      if (!state.loading && !state.refreshing) {
        console.log('🔄 Auto-refreshing live dashboard data...');
        loadDashboard(true);
      }
    }, interval);

    return () => {
      console.log('🛑 Clearing auto-refresh timer');
      clearInterval(timer);
    };
  }, [autoRefreshActive, state.dashboard?.config_json?.auto_refresh, state.loading, state.refreshing, loadDashboard]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    loadDashboard(true);
  }, [loadDashboard]);

  const handleFullscreenToggle = useCallback(() => {
    onFullscreenChange?.(!fullscreen);
  }, [fullscreen, onFullscreenChange]);

  const handleChartClick = useCallback((chartId: string) => {
    console.log('📊 Chart clicked:', chartId);
    onChartInteraction?.({ type: 'click', chartId });
  }, [onChartInteraction]);

  const toggleAutoRefresh = () => {
    setAutoRefreshActive(!autoRefreshActive);
    console.log(`🔄 Auto-refresh ${!autoRefreshActive ? 'enabled' : 'disabled'}`);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderChart = (chartLayout: DashboardChart) => {
    return (
      <Grid 
        item 
        xs={12} 
        md={chartLayout.position.width === 12 ? 12 : chartLayout.position.width <= 6 ? 6 : 8}
        key={chartLayout.id}
      >
        <Card 
          sx={{ 
            height: chartLayout.position.height * 60,
            minHeight: 200,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-2px)'
            }
          }}
          onClick={() => handleChartClick(chartLayout.chart_id)}
        >
          <CardContent sx={{ height: '100%', p: 3, position: 'relative' }}>
            {/* Chart Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h3">
                {chartLayout.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={chartLayout.chart.chart_type} 
                  size="small" 
                  variant="outlined"
                  color="primary"
                />
              </Box>
            </Box>
            
            {/* Chart Content Area */}
            <Box
              sx={{
                height: 'calc(100% - 80px)',
                bgcolor: 'rgba(25, 118, 210, 0.04)',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '2px dashed rgba(25, 118, 210, 0.2)'
              }}
            >
              <ChartIcon sx={{ fontSize: 32 }} />
              <Typography variant="body1" color="primary.main" gutterBottom sx={{ mt: 1 }}>
                {chartLayout.chart.chart_type.toUpperCase()} Chart
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Dataset: {chartLayout.chart.dataset_ids[0]}
              </Typography>
            </Box>
          </CardContent>
        </Card>
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
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={200} />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width="30%" height={16} />
                    <Skeleton variant="text" width="30%" height={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalChartsCount = state.dashboard?.charts?.length || 0;

  // ============================================================================
  // MAIN RENDER
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
      {/* Dashboard Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4" component="h1">
                {state.dashboard.display_name}
              </Typography>
              {state.dashboard.config_json.auto_refresh?.enabled && (
                <Chip 
                  label={`Live Dashboard (${state.dashboard.config_json.auto_refresh.interval}s)`}
                  color="success" 
                  size="small"
                />
              )}
              {totalChartsCount > 0 && (
                <Chip 
                  label={`${totalChartsCount} Charts`}
                  color="info" 
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            {state.dashboard.description && (
              <Typography variant="body1" color="text.secondary">
                {state.dashboard.description}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 3 }}>
              {state.lastRefresh && (
                <Typography variant="caption" color="text.secondary">
                  Last refreshed: {state.lastRefresh.toLocaleTimeString()}
                </Typography>
              )}
              <Typography variant="caption" color={autoRefreshActive ? "success.main" : "text.secondary"}>
                Auto-refresh: {autoRefreshActive ? 'ON' : 'OFF'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={autoRefreshActive ? "Disable Auto-refresh" : "Enable Auto-refresh"}>
              <IconButton 
                onClick={toggleAutoRefresh} 
                color={autoRefreshActive ? "success" : "default"}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Dashboard">
              <IconButton 
                onClick={handleRefresh} 
                disabled={state.refreshing}
                color="primary"
              >
                <RefreshIcon sx={{ animation: state.refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <IconButton onClick={handleFullscreenToggle} color="primary">
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Dashboard Content */}
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
      `}</style>
    </Box>
  );
};

export default DashboardContainer;