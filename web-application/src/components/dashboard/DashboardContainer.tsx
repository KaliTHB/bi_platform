// web-application/src/components/dashboard/DashboardContainer.tsx - ENHANCED WITH EMBEDDED CSS
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Paper,
  Snackbar,
  Card,
  CardContent
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Dashboard as DashboardIcon,
  BarChart as ChartIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  GridView as GridIcon
} from '@mui/icons-material';

// React Grid Layout imports - PRESERVED
import { Responsive, WidthProvider, Layouts, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { authStorage, workspaceStorage } from '@/utils/storageUtils';
import { ChartContainer } from './ChartContainer';

// Make ResponsiveGridLayout responsive - PRESERVED
const ResponsiveGridLayout = WidthProvider(Responsive);

// ============================================================================
// ENHANCED TYPES - PRESERVING ORIGINAL STRUCTURE
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
    expected_chart_count?: number; // NEW: Fixed number of chart slots
    grid_settings?: {
      cols: { lg: number; md: number; sm: number; xs: number; xxs: number };
      breakpoints: { lg: number; md: number; sm: number; xs: number; xxs: number };
      margin: [number, number];
      containerPadding: [number, number];
      rowHeight: number;
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
  expectedChartCount?: number; // NEW: Override expected chart count
  onFullscreenChange?: (fullscreen: boolean) => void;
  onChartInteraction?: (event: any) => void;
  onError?: (error: string) => void;
  onLayoutChange?: (layouts: Layouts) => void; // NEW: Layout change handler
  className?: string;
  style?: React.CSSProperties;
}

// NEW: Enhanced state management for error tracking
interface DashboardState {
  dashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  failedCharts: Set<string>;
  chartErrors: Map<string, { error: string; timestamp: Date; retryCount: number }>;
  retryAttempts: number;
}

interface ApiFailureNotification {
  show: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// ENHANCED DASHBOARD CONTAINER COMPONENT WITH REACT-GRID-LAYOUT
// ============================================================================

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  dashboardId,
  workspaceId: propWorkspaceId,
  fullscreen = false,
  showFilters = true,
  autoRefresh: propAutoRefresh = false,
  refreshInterval: propRefreshInterval = 30000,
  expectedChartCount = 6, // NEW: Default expected chart count
  onFullscreenChange,
  onChartInteraction,
  onError,
  onLayoutChange,
  className,
  style,
}) => {
  // ============================================================================
  // ENHANCED STATE MANAGEMENT
  // ============================================================================

  const [state, setState] = useState<DashboardState>({
    dashboard: null,
    loading: false,
    error: null,
    lastRefresh: null,
    failedCharts: new Set(),
    chartErrors: new Map(),
    retryAttempts: 0
  });

  const [autoRefreshActive, setAutoRefreshActive] = useState(propAutoRefresh);
  const [notification, setNotification] = useState<ApiFailureNotification>({
    show: false,
    message: '',
    severity: 'info'
  });

  // NEW: Grid layout state
  const [layouts, setLayouts] = useState<Layouts>({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  // Refs for cleanup and request management
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ============================================================================
  // GRID LAYOUT CONFIGURATION - PRESERVED FROM ORIGINAL
  // ============================================================================

  const defaultGridSettings = {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    margin: [16, 16] as [number, number],
    containerPadding: [16, 16] as [number, number],
    rowHeight: 60
  };

  const gridSettings = useMemo(() => {
    return state.dashboard?.config_json?.grid_settings || defaultGridSettings;
  }, [state.dashboard?.config_json?.grid_settings]);

  // ============================================================================
  // ENHANCED API FUNCTIONS WITH RETRY LOGIC - PRESERVED FROM PREVIOUS
  // ============================================================================

  const workspaceId = propWorkspaceId || workspaceStorage.getCurrentWorkspace()?.id;
  const authToken = authStorage.getToken();

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    // Cleanup previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      retryAttempts: forceRefresh ? 0 : prev.retryAttempts
    }));

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}${forceRefresh ? '?refresh=true' : ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'x-workspace-id': workspaceId || '',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = `Failed to load dashboard (${response.status})`;
        
        switch (response.status) {
          case 404:
            errorMessage = 'Dashboard not found';
            break;
          case 403:
            errorMessage = 'Access denied to this dashboard';
            break;
          case 500:
            errorMessage = 'Server error loading dashboard';
            break;
        }
        
        throw new Error(errorMessage);
      }

      const dashboardData = await response.json();

      if (!abortController.signal.aborted) {
        setState(prev => ({
          ...prev,
          dashboard: dashboardData.dashboard || dashboardData,
          loading: false,
          error: null,
          lastRefresh: new Date(),
          retryAttempts: 0
        }));

        console.log('✅ Dashboard loaded successfully:', dashboardData.dashboard?.display_name);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          retryAttempts: prev.retryAttempts + 1
        }));

        // Auto-retry for recoverable errors
        if (state.retryAttempts < 3 && !errorMessage.includes('404') && !errorMessage.includes('403')) {
          const retryDelay = Math.min(1000 * Math.pow(2, state.retryAttempts), 10000);
          
          setTimeout(() => {
            console.log(`🔄 Retrying dashboard load (attempt ${state.retryAttempts + 1}/3)...`);
            loadDashboard(true);
          }, retryDelay);
        }

        onError?.(errorMessage);
        console.error('❌ Dashboard load error:', err);
      }
    }
  }, [dashboardId, workspaceId, authToken, onError, state.retryAttempts]);

  // ============================================================================
  // NEW: CHART ERROR TRACKING - PRESERVED FROM PREVIOUS
  // ============================================================================

  const handleChartError = useCallback((chartId: string, error: string) => {
    setState(prev => {
      const newFailedCharts = new Set(prev.failedCharts);
      const newChartErrors = new Map(prev.chartErrors);
      
      newFailedCharts.add(chartId);
      
      const existingError = newChartErrors.get(chartId);
      newChartErrors.set(chartId, {
        error,
        timestamp: new Date(),
        retryCount: (existingError?.retryCount || 0) + 1
      });

      return {
        ...prev,
        failedCharts: newFailedCharts,
        chartErrors: newChartErrors
      };
    });

    // Show notification for chart errors
    setNotification({
      show: true,
      message: `Chart "${chartId}" failed to load`,
      severity: 'error'
    });

    console.error(`❌ Chart ${chartId} error:`, error);
  }, []);

  const handleChartRetry = useCallback((chartId: string) => {
    setState(prev => {
      const newFailedCharts = new Set(prev.failedCharts);
      const newChartErrors = new Map(prev.chartErrors);
      
      newFailedCharts.delete(chartId);
      newChartErrors.delete(chartId);

      return {
        ...prev,
        failedCharts: newFailedCharts,
        chartErrors: newChartErrors
      };
    });

    setNotification({
      show: true,
      message: `Retrying chart: ${chartId}`,
      severity: 'info'
    });

    console.log(`🔄 Retrying chart: ${chartId}`);
  }, []);

  // ============================================================================
  // ENHANCED CHART LAYOUT WITH FIXED POSITIONS AND GRID SUPPORT
  // ============================================================================

  const stableChartLayout = useMemo(() => {
    const charts = state.dashboard?.charts || [];
    const expectedCount = state.dashboard?.config_json?.expected_chart_count || expectedChartCount;
    const layout: DashboardChart[] = [...charts];

    // Fill missing slots with placeholders to maintain consistent layout
    while (layout.length < expectedCount) {
      const index = layout.length;
      const chartsPerRow = Math.floor(gridSettings.cols.lg / 3); // 4 charts per row (3 cols each)
      const colIndex = index % chartsPerRow;
      const rowIndex = Math.floor(index / chartsPerRow);
      
      layout.push({
        id: `placeholder-${index}`,
        chart_id: `placeholder-${index}`,
        dashboard_id: dashboardId,
        position: {
          x: colIndex * 3, // 3 columns each
          y: rowIndex * 4, // 4 rows height
          width: 3,
          height: 4,
        },
        title: `Chart Slot ${index + 1}`,
        order_index: index,
        is_visible: true,
        chart: {
          id: `placeholder-${index}`,
          name: `placeholder-${index}`,
          display_name: `Chart Slot ${index + 1}`,
          chart_type: 'placeholder',
          config_json: {},
          dataset_ids: [],
          is_active: false,
          version: 1,
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
    }

    return layout;
  }, [state.dashboard?.charts, state.dashboard?.config_json?.expected_chart_count, expectedChartCount, dashboardId, gridSettings.cols.lg]);

  // ============================================================================
  // CONVERT TO GRID LAYOUT FORMAT
  // ============================================================================

  const gridLayoutItems = useMemo(() => {
    const layoutItems: Layout[] = stableChartLayout.map((chart) => ({
      i: chart.chart_id,
      x: chart.position.x,
      y: chart.position.y,
      w: chart.position.width,
      h: chart.position.height,
      minW: 2,
      minH: 2,
      maxW: gridSettings.cols.lg,
      maxH: 12,
      static: chart.chart_id.startsWith('placeholder-'), // Make placeholders static
    }));

    return layoutItems;
  }, [stableChartLayout, gridSettings.cols.lg]);

  // ============================================================================
  // EXISTING FUNCTIONALITY PRESERVED
  // ============================================================================

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Cleanup retry timeouts
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  }, [dashboardId, loadDashboard]);

  useEffect(() => {
    if (autoRefreshActive && propRefreshInterval) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard...');
        loadDashboard(true);
      }, propRefreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshActive, propRefreshInterval, loadDashboard]);

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

  const refreshAllCharts = useCallback(() => {
    setState(prev => ({
      ...prev,
      failedCharts: new Set(),
      chartErrors: new Map()
    }));
    loadDashboard(true);
    
    setNotification({
      show: true,
      message: 'Refreshing all charts...',
      severity: 'info'
    });
  }, [loadDashboard]);

  // ============================================================================
  // GRID LAYOUT EVENT HANDLERS
  // ============================================================================

  const handleLayoutChange = useCallback((layout: Layout[], layouts: Layouts) => {
    setLayouts(layouts);
    onLayoutChange?.(layouts);
    
    // Optional: Save layout changes to backend
    console.log('📐 Layout changed:', layout);
  }, [onLayoutChange]);

  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
    console.log('📱 Breakpoint changed:', breakpoint);
  }, []);

  // ============================================================================
  // ENHANCED RENDER HELPERS
  // ============================================================================

  const renderChart = (chartData: DashboardChart) => {
    const isPlaceholder = chartData.chart_id.startsWith('placeholder-');
    const hasError = state.failedCharts.has(chartData.chart_id);
    const chartError = state.chartErrors.get(chartData.chart_id);

    if (isPlaceholder) {
      return (
        <div key={chartData.chart_id} className="grid-item-card">
          <Card sx={{ 
            height: '100%',
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CardContent sx={{ 
              textAlign: 'center',
              color: 'text.secondary'
            }}>
              <DashboardIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                {chartData.title}
              </Typography>
              <Typography variant="body2">
                Chart slot available
              </Typography>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div key={chartData.chart_id} className="grid-item-card">
        <Card sx={{ 
          height: '100%',
          border: hasError ? '2px solid' : '1px solid',
          borderColor: hasError ? 'error.main' : 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Enhanced Chart Header */}
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: hasError ? 'error.light' : 'background.paper',
            minHeight: 60
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h3" sx={{
                color: hasError ? 'error.contrastText' : 'text.primary'
              }}>
                {chartData.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={chartData.chart.chart_type} 
                  size="small" 
                  variant="outlined"
                  color={hasError ? "error" : "primary"}
                />
                {hasError && (
                  <Tooltip title={`Error: ${chartError?.error}`}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChartRetry(chartData.chart_id);
                      }}
                      sx={{ color: 'inherit' }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Chart Content - Use Enhanced ChartContainer */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ChartContainer
              chart={chartData.chart}
              workspaceId={workspaceId}
              dashboardId={dashboardId}
              dimensions={{
                width: '100%',
                height: '100%'
              }}
              onChartError={handleChartError}
              onChartLoad={(chartId) => handleChartRetry(chartId)}
              onError={(error) => handleChartError(chartData.chart_id, typeof error === 'string' ? error : error.message)}
              className="dashboard-chart-container"
              // Enable resilient error handling
              maxRetries={3}
              retryDelay={1000}
              showErrorInCard={true}
              gridItem={true}
              resizeObserver={true}
              onClick={() => handleChartClick(chartData.chart_id)}
            />
          </Box>
        </Card>
      </div>
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
        <Button variant="contained" color="primary">
          Add Charts
        </Button>
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
        
        <Box sx={{ minHeight: 600 }}>
          <Skeleton variant="rectangular" width="100%" height={600} />
        </Box>
      </Box>
    );
  };

  // ============================================================================
  // ENHANCED ERROR SUMMARY
  // ============================================================================

  const renderErrorSummary = () => {
    const errorCount = state.failedCharts.size;
    
    if (errorCount === 0) return null;

    return (
      <Alert 
        severity={errorCount > Math.ceil(stableChartLayout.length / 2) ? "error" : "warning"} 
        sx={{ mb: 3 }}
        action={
          <Button color="inherit" size="small" onClick={refreshAllCharts}>
            <RefreshIcon sx={{ mr: 1 }} />
            Retry All
          </Button>
        }
        icon={errorCount > Math.ceil(stableChartLayout.length / 2) ? <ErrorIcon /> : <WarningIcon />}
      >
        <Typography variant="body2">
          {errorCount === 1 
            ? 'One chart is experiencing issues'
            : `${errorCount} charts are experiencing issues`
          }
          {errorCount > Math.ceil(stableChartLayout.length / 2) && 
            '. This may indicate a service interruption.'
          }
        </Typography>
      </Alert>
    );
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalChartsCount = stableChartLayout.length;
  const activeChartsCount = stableChartLayout.filter(c => !c.chart_id.startsWith('placeholder-')).length;
  const failedChartsCount = state.failedCharts.size;

  // ============================================================================
  // MAIN RENDER WITH REACT-GRID-LAYOUT
  // ============================================================================

  if (state.loading) {
    return (
      <Box sx={{ height: '100%' }} className={className} style={style}>
        {renderLoadingState()}
      </Box>
    );
  }

  if (state.error && !state.dashboard) {
    return (
      <Box sx={{ p: 3 }} className={className} style={style}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dashboard Error
          </Typography>
          <Typography variant="body2">
            {state.error}
          </Typography>
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => loadDashboard(true)} 
          startIcon={<RefreshIcon />}
          disabled={state.loading}
        >
          {state.retryAttempts > 0 ? `Retry (${state.retryAttempts}/3)` : 'Try Again'}
        </Button>
      </Box>
    );
  }

  if (!state.dashboard) {
    return (
      <Box sx={{ p: 3 }} className={className} style={style}>
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
        bgcolor: state.dashboard.theme_config.background_color || 'background.default',
        p: 2
      }}
      className={`dashboard-container ${className || ''}`}
      style={style}
    >
      {/* Enhanced Dashboard Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {state.dashboard.display_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state.dashboard.description}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip 
                size="small" 
                label={`${totalChartsCount} slots`} 
                color="default"
                icon={<GridIcon />}
              />
              <Chip 
                size="small" 
                label={`${activeChartsCount} active`} 
                color="primary"
              />
              {failedChartsCount > 0 && (
                <Chip 
                  size="small" 
                  label={`${failedChartsCount} errors`} 
                  color="error"
                />
              )}
              {state.lastRefresh && (
                <Typography variant="caption" color="text.secondary">
                  Updated: {state.lastRefresh.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={autoRefreshActive ? 'Disable auto-refresh' : 'Enable auto-refresh'}>
              <IconButton onClick={toggleAutoRefresh} color={autoRefreshActive ? 'primary' : 'default'}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              <IconButton onClick={handleFullscreenToggle}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Error Summary */}
      {renderErrorSummary()}

      {/* React Grid Layout - MAIN DASHBOARD GRID */}
      <Box sx={{ minHeight: 600 }}>
        {stableChartLayout.length === 0 ? (
          renderEmptyDashboard()
        ) : (
          <ResponsiveGridLayout
            className="dashboard-grid-layout"
            layouts={layouts}
            breakpoints={gridSettings.breakpoints}
            cols={gridSettings.cols}
            rowHeight={gridSettings.rowHeight}
            margin={gridSettings.margin}
            containerPadding={gridSettings.containerPadding}
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={handleBreakpointChange}
            isDraggable={!fullscreen} // Disable dragging in fullscreen
            isResizable={!fullscreen} // Disable resizing in fullscreen
            useCSSTransforms={true}
            preventCollision={false}
            autoSize={true}
          >
            {gridLayoutItems.map((layoutItem) => {
              const chartData = stableChartLayout.find(c => c.chart_id === layoutItem.i);
              return chartData ? renderChart(chartData) : null;
            })}
          </ResponsiveGridLayout>
        )}
      </Box>

      {/* Enhanced Notification System */}
      <Snackbar
        open={notification.show}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={notification.severity} 
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* EMBEDDED CSS STYLES */}
      <style jsx global>{`
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