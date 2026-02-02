// web-application/src/components/dashboard/DashboardContainer.tsx
// OPTIMIZED FOR REACT GRID LAYOUT WITH ACTUAL API RESPONSE: { success, data, message }

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
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
  BarChart as ChartIcon,
  Sync as SyncIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { Responsive as ResponsiveGridLayout, WidthProvider, Layout } from 'react-grid-layout';

import { authStorage, workspaceStorage } from '@/utils/storageUtils';
import { useGetDashboardQuery } from '@/store/api/dashboardApi';
import { ChartContainer } from './ChartContainer';
import { ChartErrorBoundary } from '../chart/ChartErrorBoundary';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveReactGridLayout = WidthProvider(ResponsiveGridLayout);

// ============================================================================
// TYPES MATCHING ACTUAL API RESPONSE
// ============================================================================

interface DashboardApiResponse {
  success: boolean;
  data: Dashboard;
  message?: string;
}

interface Dashboard {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  workspace_id: string;
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
  
  // Grid layout specific props
  isEditable?: boolean;
  onLayoutChange?: (layout: Layout[], layouts: { [key: string]: Layout[] }) => void;
  onLayoutSave?: (layouts: { [key: string]: Layout[] }) => void;
  
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
// GRID LAYOUT CONFIGURATION
// ============================================================================

const GRID_BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0
};

const GRID_COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2
};

const DEFAULT_CHART_SIZE = {
  w: 4,
  h: 3,
  minW: 2,
  minH: 2
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
  refreshInterval = 30,
  loadingStrategy = 'immediate',
  progressiveDelay = 500,
  showLoadingProgress = true,
  isEditable = false,
  onLayoutChange,
  onLayoutSave,
  onFullscreenChange,
  onChartInteraction,
  onError,
  className
}) => {
  
  // ============================================================================
  // RTK QUERY INTEGRATION
  // ============================================================================
  
  const currentWorkspaceFromStorage = workspaceStorage.getCurrentWorkspace();
  const effectiveWorkspaceId = workspaceId || currentWorkspaceFromStorage?.id;

  // ✅ RTK Query for actual API response: { success, data, message }
  const {
    data: apiResponse,
    isLoading,
    error: queryError,
    refetch: refetchDashboard
  } = useGetDashboardQuery(
    dashboardId,
    {
      skip: !dashboardId || !effectiveWorkspaceId,
      pollingInterval: autoRefresh ? refreshInterval * 1000 : 0,
      refetchOnMountOrArgChange: true
    }
  );

  // ✅ OPTIMIZED: Extract dashboard from actual API response structure
  const dashboard = useMemo((): Dashboard | null => {
    if (!apiResponse) {
      console.log('🔍 No API response yet');
      return null;
    }

    console.log('🔍 Full API Response:', {
      success: apiResponse.success,
      hasData: !!apiResponse.data,
      dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : null
    });

    if (!apiResponse.success) {
      console.log('❌ Dashboard API response failed:', apiResponse.message);
      return null;
    }

    if (!apiResponse.data) {
      console.log('❌ No data in dashboard API response');
      return null;
    }

    // 🔍 DETAILED CHARTS DEBUGGING
    console.log('🔍 Dashboard Data Debug:', {
      id: apiResponse.data.id,
      name: apiResponse.data.name,
      hasCharts: !!apiResponse.data.charts,
      chartsType: typeof apiResponse.data.charts,
      chartsIsArray: Array.isArray(apiResponse.data.charts),
      chartsLength: apiResponse.data.charts?.length || 0,
      rawCharts: apiResponse.data.charts
    });

    // Log each chart if they exist
    if (apiResponse.data.charts && Array.isArray(apiResponse.data.charts)) {
      console.log('📊 Charts found:', apiResponse.data.charts.map(chart => ({
        id: chart.id,
        name: chart.name,
        display_name: chart.display_name,
        is_active: chart.is_active,
        position: chart.position_json
      })));
    }

    console.log('✅ Dashboard data extracted in container:', {
      id: apiResponse.data.id,
      name: apiResponse.data.name,
      charts: apiResponse.data.charts?.length || 0
    });

    return apiResponse.data;
  }, [apiResponse]);

  // ✅ Enhanced error handling for actual API structure
  const error = useMemo(() => {
    if (queryError) {
      if ('status' in queryError) {
        return `API Error ${queryError.status}: ${queryError.data || 'Unknown error'}`;
      } else if ('message' in queryError) {
        return queryError.message;
      }
      return 'Failed to load dashboard';
    }
    if (apiResponse && !apiResponse.success) {
      return apiResponse.message || 'Dashboard request failed';
    }
    return null;
  }, [queryError, apiResponse]);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [refreshState, setRefreshState] = useState<ChartRefreshState>({
    refreshingCharts: new Set(),
    refreshResults: {},
    lastRefreshTime: null
  });
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  // ============================================================================
  // GRID LAYOUT HELPERS
  // ============================================================================

  const convertChartToLayout = useCallback((chart: DashboardChart): Layout => {
    const position = chart.position_json || {
      x: 0,
      y: 0,
      width: DEFAULT_CHART_SIZE.w,
      height: DEFAULT_CHART_SIZE.h
    };

    return {
      i: chart.id,
      x: position.x,
      y: position.y,
      w: position.width || DEFAULT_CHART_SIZE.w,
      h: position.height || DEFAULT_CHART_SIZE.h,
      minW: position.min_width || DEFAULT_CHART_SIZE.minW,
      minH: position.min_height || DEFAULT_CHART_SIZE.minH,
      isDraggable: isEditable && editMode,
      isResizable: isEditable && editMode
    };
  }, [isEditable, editMode]);

  const generateLayouts = useCallback(() => {
    if (!dashboard?.charts) return {};

    const baseLayout = dashboard.charts.map(convertChartToLayout);
    
    return {
      lg: baseLayout,
      md: baseLayout.map(item => ({ ...item, w: Math.min(item.w, GRID_COLS.md) })),
      sm: baseLayout.map(item => ({ ...item, w: Math.min(item.w, GRID_COLS.sm) })),
      xs: baseLayout.map(item => ({ ...item, w: Math.min(item.w, GRID_COLS.xs) })),
      xxs: baseLayout.map(item => ({ ...item, w: Math.min(item.w, GRID_COLS.xxs) }))
    };
  }, [dashboard?.charts, convertChartToLayout]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const refreshStats = useMemo(() => 
    Object.values(refreshState.refreshResults),
    [refreshState.refreshResults]
  );
  const successfulRefreshes = refreshStats.filter(r => r.success).length;
  const failedRefreshes = refreshStats.filter(r => !r.success).length;

  const gridMargin = useMemo(() => {
    const margin = dashboard?.config_json?.layout?.margin || 16;
    return [margin, margin] as [number, number];
  }, [dashboard?.config_json?.layout?.margin]);

  const containerPadding = useMemo(() => {
    const padding = dashboard?.config_json?.layout?.padding || 16;
    return [padding, padding] as [number, number];
  }, [dashboard?.config_json?.layout?.padding]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDashboardRefresh = useCallback(() => {
    if (!dashboard?.charts) {
      console.warn('⚠️ No charts to refresh');
      return;
    }

    console.log('🔄 DashboardContainer refresh initiated', { chartCount: dashboard.charts.length });
    
    setRefreshState(prev => ({
      ...prev,
      refreshResults: {},
      lastRefreshTime: new Date()
    }));
    
    const chartIds = new Set(dashboard.charts.map(chart => chart.id));
    setRefreshState(prev => ({
      ...prev,
      refreshingCharts: chartIds
    }));
    
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

  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    console.log('📐 Layout changed:', { layout: layout.length, allLayouts: Object.keys(allLayouts) });
    setLayouts(allLayouts);
    onLayoutChange?.(layout, allLayouts);
  }, [onLayoutChange]);

  const handleSaveLayout = useCallback(() => {
    if (layouts && Object.keys(layouts).length > 0) {
      console.log('💾 Saving layout...', layouts);
      onLayoutSave?.(layouts);
    }
  }, [layouts, onLayoutSave]);

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  const toggleFullscreen = () => {
    onFullscreenChange?.(!fullscreen);
  };

  const handleRefreshDashboard = useCallback(() => {
    console.log('🔄 Refreshing dashboard via RTK Query...', dashboardId);
    refetchDashboard();
  }, [refetchDashboard, dashboardId]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (queryError && 'status' in queryError && queryError.status === 401) {
      authStorage.clearAuth();
      workspaceStorage.clearWorkspace();
    }
  }, [queryError]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  useEffect(() => {
    if (dashboard?.charts) {
      const generatedLayouts = generateLayouts();
      console.log('🔍 Grid Layout Debug:', {
        dashboardId: dashboard.id,
        chartsCount: dashboard.charts.length,
        generatedLayouts: Object.keys(generatedLayouts),
        lgLayoutLength: generatedLayouts.lg?.length || 0,
        sampleLayout: generatedLayouts.lg?.[0]
      });
      setLayouts(generatedLayouts);
    } else {
      console.log('🔍 No charts to generate layouts for:', {
        dashboard: !!dashboard,
        charts: dashboard?.charts,
        chartsLength: dashboard?.charts?.length
      });
    }
  }, [dashboard?.charts, generateLayouts]);

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  // Loading state
  if (isLoading) {
    return (
      <Box className={className} sx={{ p: 2 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1">Loading dashboard...</Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {dashboardId}
          </Typography>
          {showLoadingProgress && (
            <LinearProgress sx={{ width: '100%' }} />
          )}
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box className={className} sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Dashboard Load Error</Typography>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="caption" color="text.secondary">
            Dashboard ID: {dashboardId}
          </Typography>
        </Alert>
        <Button variant="contained" onClick={handleRefreshDashboard} startIcon={<RefreshIcon />}>
          Retry Loading
        </Button>
      </Box>
    );
  }

  // No dashboard data
  if (!dashboard) {
    return (
      <Box className={className} sx={{ p: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6">No Dashboard Data</Typography>
          <Typography variant="body2">
            Dashboard could not be loaded from the API.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dashboard ID: {dashboardId}
          </Typography>
        </Alert>
        <Button variant="outlined" onClick={handleRefreshDashboard} startIcon={<RefreshIcon />}>
          Try Again
        </Button>
      </Box>
    );
  }

  // Main render
  return (
    <Box className={className} sx={{ width: '100%', height: '100%' }}>
      {/* Dashboard Controls */}
      {!fullscreen && (
        <Paper sx={{ p: 1, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh All Charts">
              <IconButton onClick={handleDashboardRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton onClick={toggleFullscreen} size="small">
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>

            {isEditable && (
              <>
                <Tooltip title={editMode ? "Lock Layout" : "Edit Layout"}>
                  <IconButton onClick={toggleEditMode} size="small" color={editMode ? "primary" : "default"}>
                    {editMode ? <LockOpenIcon /> : <LockIcon />}
                  </IconButton>
                </Tooltip>

                {editMode && (
                  <Tooltip title="Save Layout">
                    <Button size="small" onClick={handleSaveLayout} variant="outlined">
                      Save Layout
                    </Button>
                  </Tooltip>
                )}
              </>
            )}

            <Typography variant="body2" color="text.secondary" noWrap>
              {dashboard.display_name}
            </Typography>

            <Chip
              label={`${dashboard.charts?.length || 0} charts`}
              size="small"
              variant="outlined"
            />

            {editMode && (
              <Chip
                label="Edit Mode"
                size="small"
                color="warning"
                variant="filled"
              />
            )}

            {autoRefresh && (
              <Chip
                icon={<SyncIcon />}
                label={`Auto: ${refreshInterval}s`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            {refreshState.refreshingCharts.size > 0 && (
              <Chip
                icon={<CircularProgress size={16} />}
                label={`Refreshing ${refreshState.refreshingCharts.size}`}
                size="small"
                color="primary"
              />
            )}

            {refreshStats.length > 0 && (
              <Stack direction="row" spacing={1}>
                {successfulRefreshes > 0 && (
                  <Chip
                    label={`✓ ${successfulRefreshes}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {failedRefreshes > 0 && (
                  <Chip
                    label={`✗ ${failedRefreshes}`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {/* Charts Grid Layout */}
      <Box sx={{ flexGrow: 1 }}>
        {(() => {
          console.log('🔍 Render Check:', {
            hasDashboard: !!dashboard,
            hasCharts: !!dashboard?.charts,
            chartsLength: dashboard?.charts?.length,
            chartsIsArray: Array.isArray(dashboard?.charts)
          });
          
          return null; // This is just for logging
        })()}
        
        {dashboard.charts && dashboard.charts.length > 0 ? (
          <>
            {console.log('🔍 Rendering ResponsiveGridLayout with:', {
              chartsToRender: dashboard.charts.length,
              layouts: Object.keys(layouts),
              firstChart: dashboard.charts[0]?.id
            })}
            <ResponsiveReactGridLayout
              className="layout"
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              breakpoints={GRID_BREAKPOINTS}
              cols={GRID_COLS}
              rowHeight={60}
              margin={gridMargin}
              containerPadding={containerPadding}
              isDraggable={isEditable && editMode}
              isResizable={isEditable && editMode}
              resizeHandles={['se']}
              compactType="vertical"
              preventCollision={false}
              useCSSTransforms={true}
            >
              {dashboard.charts.map((chart, index) => {
                console.log('🔍 Rendering chart:', {
                  index,
                  chartId: chart.id,
                  chartName: chart.name,
                  position: chart.position_json
                });
                
                return (
                  <div key={chart.id} style={{ border: editMode ? '2px dashed #1976d2' : '1px solid #e0e0e0' }}>
                    <ChartErrorBoundary>
                      <ChartContainer
                        chart={chart}
                        refreshTrigger={refreshTrigger}
                        onRefreshComplete={(success) => handleChartRefreshComplete(chart.id, success)}
                        onInteraction={onChartInteraction}
                        fullscreen={fullscreen}
                        workspaceId={effectiveWorkspaceId}
                      />
                    </ChartErrorBoundary>
                  </div>
                );
              })}
            </ResponsiveReactGridLayout>
          </>
        ) : (
          <>
            {console.log('🔍 Showing empty state because:', {
              hasDashboard: !!dashboard,
              hasCharts: !!dashboard?.charts,
              chartsLength: dashboard?.charts?.length,
              chartsType: typeof dashboard?.charts
            })}
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ChartIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No charts in this dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add charts to see them here
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Charts: {dashboard?.charts?.length || 0} | Type: {typeof dashboard?.charts}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};