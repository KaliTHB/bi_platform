// web-application/src/components/dashboard/ChartContainer.tsx
// CRITICAL FIX: Ensure RTK Query parameters are correctly structured

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Button
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';

// ✅ FIX: RTK Query imports with proper error handling
import { 
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useRefreshChartMutation,
  useExportChartMutation
} from '@/store/api/chartApi';

import { ChartRenderer } from '@/plugins/charts/renderer/ChartRenderer';
import { ChartErrorBoundary } from '@/plugins/charts/renderer/ChartErrorBoundary';

// ============================================================================
// TYPES
// ============================================================================

interface Chart {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  dataset_ids: string[];
  config_json: any;
  position_json?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styling_config?: any;
  query_config?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChartContainerProps {
  chart: Chart;
  refreshTrigger?: number;
  onRefreshComplete?: (success: boolean) => void;
  onInteraction?: (event: any) => void;
  fullscreen?: boolean;
  workspaceId?: string;
  dashboardId?: string;
  maxRetries?: number;
  showErrorInCard?: boolean;
  performanceMetrics?: boolean;
  gridItem?: boolean;
  globalFilters?: Record<string, any>;
  dashboardAutoRefresh?: boolean;
  dashboardRefreshInterval?: number;
  dashboardRefreshTrigger?: number;
}

interface ChartError {
  message: string;
  type?: string;
  code?: string;
}

interface ChartPollingConfig {
  enabled: boolean;
  interval: number; // seconds
  max_failures?: number;
  backoff_strategy?: 'linear' | 'exponential' | 'fixed';
  pause_on_error?: boolean;
  pause_on_tab_hidden?: boolean;
  conditions?: {
    time_range?: { start: string; end: string; timezone?: string };
    days_of_week?: number[]; // 0 = Sunday
    data_freshness_threshold?: number; // seconds
  };
}

interface ChartState {
  // Data state
  data: any;
  loading: boolean;
  error: string | null;
  
  // Auto refresh state
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  
  // Internal tracking
  refreshCount: number;
  consecutiveErrors: number;
  isInitialized: boolean;
  isPaused: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChartContainer: React.FC<ChartContainerProps> = ({
  chart,
  refreshTrigger,
  onRefreshComplete,
  onInteraction,
  fullscreen = false,
  workspaceId,
  dashboardId,
  maxRetries = 3,
  showErrorInCard = true,
  performanceMetrics = false,
  gridItem = true,
  globalFilters = {},
  dashboardAutoRefresh = false,
  dashboardRefreshInterval = 30,
  dashboardRefreshTrigger = 0
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [chartState, setChartState] = useState<ChartState>({
    data: null,
    loading: false,
    error: null,
    autoRefresh: false,
    refreshInterval: 30,
    lastRefresh: null,
    nextRefresh: null,
    refreshCount: 0,
    consecutiveErrors: 0,
    isInitialized: false,
    isPaused: false
  });

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(performanceMetrics);

  // Refs for auto-refresh management
  const autoRefreshRef = useRef<NodeJS.Timeout>();
  const isTabHiddenRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController>();

  // ============================================================================
  // CONFIGURATION EXTRACTION
  // ============================================================================

  // Extract polling configuration from chart.config_json
  const pollingConfig: ChartPollingConfig = useMemo(() => {
    const config = chart.config_json || {};
    const polling = config.polling || config.auto_refresh || {};
    
    return {
      enabled: polling.enabled || dashboardAutoRefresh || false,
      interval: polling.interval || dashboardRefreshInterval || 30,
      max_failures: polling.max_failures || 5,
      backoff_strategy: polling.backoff_strategy || 'exponential',
      pause_on_error: polling.pause_on_error !== false,
      pause_on_tab_hidden: polling.pause_on_tab_hidden !== false,
      conditions: polling.conditions
    };
  }, [chart.config_json, dashboardAutoRefresh, dashboardRefreshInterval]);

  // ============================================================================
  // RTK QUERY INTEGRATION WITH PROPER PARAMETERS
  // ============================================================================

  console.log('🔍 ChartContainer Debug:', {
    chartId: chart.id,
    chartIdType: typeof chart.id,
    workspaceId,
    workspaceIdType: typeof workspaceId,
    globalFilters: Object.keys(globalFilters).length
  });

  // ✅ CRITICAL FIX: Use RTK Query with proper parameter structure
  const {
    data: chartDataResponse,
    error: queryError,
    isLoading: queryLoading,
    refetch: refetchChartData
  } = useGetChartDataQuery(
    {
      // ✅ FIXED: Ensure all parameters are properly structured
      id: chart.id,
      workspaceId: workspaceId || undefined,
      filters: Object.keys(globalFilters).length > 0 ? globalFilters : undefined
    },
    {
      skip: !chart.id || !workspaceId,
      refetchOnMountOrArgChange: true,
      pollingInterval: pollingConfig.enabled ? pollingConfig.interval * 1000 : 0
    }
  );

  // ✅ FIX: Export mutation with error handling
  const [exportChart] = useExportChartMutation();

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================

  // Process chart data from response
  const processedData = useMemo(() => {
    console.log('📊 Chart Data Response:', chartDataResponse);
    
    if (!chartDataResponse?.success || !chartDataResponse.data) {
      return null;
    }

    const rawData = chartDataResponse.data;
    
    // Apply any data transformations based on chart config
    if (chart.config_json?.dataTransformations) {
      // Apply transformations here if needed
      return rawData;
    }

    return rawData;
  }, [chartDataResponse, chart.config_json]);

  // Handle errors from RTK Query
  const chartError = useMemo(() => {
    if (queryError) {
      if ('status' in queryError) {
        return `API Error ${queryError.status}: ${queryError.data || 'Unknown error'}`;
      } else if ('message' in queryError) {
        return queryError.message;
      }
      return 'Failed to load chart data';
    }
    if (chartDataResponse && !chartDataResponse.success) {
      return chartDataResponse.message || 'Chart data request failed';
    }
    return chartState.error;
  }, [queryError, chartDataResponse, chartState.error]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      console.log('🔄 Refreshing chart:', chart.id);
      setChartState(prev => ({ ...prev, loading: true, error: null }));
      await refetchChartData();
      onRefreshComplete?.(true);
      setChartState(prev => ({ 
        ...prev, 
        loading: false, 
        lastRefresh: new Date(),
        consecutiveErrors: 0,
        refreshCount: prev.refreshCount + 1
      }));
    } catch (error) {
      console.error('Chart refresh failed:', error);
      onRefreshComplete?.(false);
      setChartState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Refresh failed',
        consecutiveErrors: prev.consecutiveErrors + 1
      }));
    }
  }, [refetchChartData, onRefreshComplete, chart.id]);

  const handleExport = useCallback(async (format: string) => {
    try {
      console.log('📁 Exporting chart:', chart.id, 'as', format);
      await exportChart({
        chartId: chart.id,
        format,
        options: { includeData: true }
      });
      handleMenuClose();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [exportChart, chart.id]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle refresh trigger from dashboard
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger, handleRefresh]);

  // Initialize chart state
  useEffect(() => {
    setChartState(prev => ({
      ...prev,
      loading: queryLoading,
      error: chartError,
      data: processedData,
      isInitialized: true
    }));
  }, [queryLoading, chartError, processedData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  // Loading state
  if (chartState.loading || queryLoading) {
    return (
      <Paper 
        elevation={gridItem ? 1 : 0} 
        sx={{ 
          p: 2, 
          height: fullscreen ? '100vh' : 'auto',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading chart...
          </Typography>
          {chart.display_name && (
            <Typography variant="caption" color="text.secondary">
              {chart.display_name}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            ID: {chart.id}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (chartError && showErrorInCard) {
    return (
      <Paper 
        elevation={gridItem ? 1 : 0} 
        sx={{ 
          p: 2, 
          height: fullscreen ? '100vh' : 'auto',
          minHeight: 200
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="text.primary">
            {chart.display_name}
          </Typography>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        
        <Alert severity="error" sx={{ mb: 1 }}>
          <Typography variant="body2">{chartError}</Typography>
          <Typography variant="caption" color="text.secondary">
            Chart ID: {chart.id}
          </Typography>
        </Alert>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  // No data state
  if (!processedData) {
    return (
      <Paper 
        elevation={gridItem ? 1 : 0} 
        sx={{ 
          p: 2, 
          height: fullscreen ? '100vh' : 'auto',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <ChartIcon sx={{ fontSize: 48, color: 'grey.400' }} />
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {chart.display_name}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Main chart render
  return (
    <ChartErrorBoundary>
      <Paper 
        elevation={gridItem ? 1 : 0} 
        sx={{ 
          height: fullscreen ? '100vh' : 'auto',
          minHeight: 200,
          position: 'relative'
        }}
      >
        {/* Chart Header */}
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="space-between" 
          p={1}
          borderBottom={1}
          borderColor="divider"
        >
          <Typography variant="subtitle2" color="text.primary" noWrap>
            {chart.display_name}
          </Typography>

          <Box display="flex" alignItems="center" gap={0.5}>
            {chartState.lastRefresh && (
              <Tooltip title={`Last updated: ${chartState.lastRefresh.toLocaleTimeString()}`}>
                <SuccessIcon sx={{ fontSize: 16, color: 'success.main' }} />
              </Tooltip>
            )}
            
            <Tooltip title="More options">
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Chart Content */}
        <Box sx={{ p: 1, height: 'calc(100% - 48px)' }}>
          <ChartRenderer
            chart={chart}
            data={processedData}
            config={chart.config_json}
            dimensions={{
              width: chart.position_json?.width || 400,
              height: chart.position_json?.height || 300
            }}
            onInteraction={onInteraction}
            onError={(error) => setChartState(prev => ({ 
              ...prev, 
              error: typeof error === 'string' ? error : error.message 
            }))}
          />
        </Box>

        {/* Performance Metrics */}
        {showPerformanceMetrics && (
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 8, 
              left: 8, 
              right: 8,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              fontSize: '0.75rem'
            }}
          >
            <Typography variant="caption">
              Refreshes: {chartState.refreshCount} | 
              Errors: {chartState.consecutiveErrors} |
              {chartState.lastRefresh && ` Updated: ${chartState.lastRefresh.toLocaleTimeString()}`}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleRefresh}>
          <RefreshIcon sx={{ mr: 1 }} />
          Refresh
        </MenuItem>
        <MenuItem onClick={() => handleExport('png')}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export PNG
        </MenuItem>
        <MenuItem onClick={() => handleExport('svg')}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export SVG
        </MenuItem>
        <MenuItem onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}>
          <ChartIcon sx={{ mr: 1 }} />
          {showPerformanceMetrics ? 'Hide' : 'Show'} Metrics
        </MenuItem>
      </Menu>
    </ChartErrorBoundary>
  );
};