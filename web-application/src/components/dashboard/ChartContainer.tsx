// web-application/src/components/dashboard/ChartContainer.tsx
// Enhanced with config-based data fetching - NO UI CHANGES
// Maintains original UI while adding polling based on chart.config_json

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

// RTK Query imports
import { 
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useRefreshChartMutation,
  useExportChartMutation
} from '@/store/api/chartApi';

import { ChartRenderer } from '../chart/ChartRenderer';
import { ChartErrorBoundary } from '../chart/ChartErrorBoundary';

// Types
import {
  ChartContainerProps,
  ChartData,
  ChartError,
  Chart
} from '@/types/chart.types';

// ============================================================================
// ENHANCED TYPES FOR CONFIG-BASED POLLING (Internal only)
// ============================================================================

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

interface EnhancedChartContainerProps extends ChartContainerProps {
  // Enhanced props (keeping original interface)
  maxRetries?: number;
  showErrorInCard?: boolean;
  performanceMetrics?: boolean;
  gridItem?: boolean;
  
  // Global state from dashboard
  globalFilters?: Record<string, any>;
  dashboardAutoRefresh?: boolean;
  dashboardRefreshInterval?: number;
  dashboardRefreshTrigger?: number;
  onRefreshComplete?: (chartId: string, success: boolean) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || 
         localStorage.getItem('token') ||
         sessionStorage.getItem('auth_token') ||
         sessionStorage.getItem('token');
};

const extractChartPollingConfig = (chart: Chart): ChartPollingConfig => {
  const refreshConfig = chart.config_json?.refresh_config;
  const autoRefresh = chart.config_json?.auto_refresh;
  
  const config = refreshConfig?.auto_refresh || autoRefresh;
  
  if (!config || !config.enabled) {
    return { enabled: false, interval: 30 };
  }
  
  return {
    enabled: true,
    interval: config.interval || 30,
    max_failures: config.max_failures || 3,
    backoff_strategy: config.backoff_strategy || 'exponential',
    pause_on_error: config.pause_on_error ?? true,
    pause_on_tab_hidden: config.pause_on_tab_hidden ?? true,
    conditions: config.conditions
  };
};

const isPollingAllowed = (config: ChartPollingConfig): boolean => {
  if (!config.enabled || !config.conditions) return config.enabled;
  
  const now = new Date();
  
  if (config.conditions.time_range) {
    const { start, end } = config.conditions.time_range;
    const startTime = new Date(`${now.toDateString()} ${start}`);
    const endTime = new Date(`${now.toDateString()} ${end}`);
    
    if (now < startTime || now > endTime) {
      return false;
    }
  }
  
  if (config.conditions.days_of_week) {
    const currentDay = now.getDay();
    if (!config.conditions.days_of_week.includes(currentDay)) {
      return false;
    }
  }
  
  return true;
};

const calculateBackoffDelay = (
  failures: number, 
  baseInterval: number, 
  strategy: ChartPollingConfig['backoff_strategy'] = 'exponential'
): number => {
  switch (strategy) {
    case 'linear':
      return baseInterval * (1 + failures * 0.5);
    case 'exponential':
      return baseInterval * Math.pow(2, failures);
    case 'fixed':
    default:
      return baseInterval;
  }
};

// ============================================================================
// MAIN COMPONENT - Original UI maintained
// ============================================================================

export const ChartContainer: React.FC<EnhancedChartContainerProps> = ({
  chart,
  workspaceId = '',
  dashboardId,
  preview = false,
  fullscreen = false,
  filters = [],
  globalFilters = {},
  dimensions,
  theme,
  className,
  style,
  loading: externalLoading = false,
  error: externalError = null,
  
  // Enhanced props
  maxRetries = 3,
  showErrorInCard = true,
  performanceMetrics = false,
  gridItem = false,
  
  // Dashboard-level settings
  dashboardAutoRefresh = false,
  dashboardRefreshInterval = 30,
  dashboardRefreshTrigger,
  onRefreshComplete,
  
  // Event handlers
  onChartClick,
  onChartError,
  onChartLoad,
  onChartRefresh,
  onClick,
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT - Enhanced with polling
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

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Refs for polling management
  const autoRefreshRef = useRef<NodeJS.Timeout>();
  const loadStartTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTabHiddenRef = useRef<boolean>(false);

  // ============================================================================
  // CONFIG EXTRACTION AND POLLING SETUP
  // ============================================================================
  
  const pollingConfig = useMemo(() => {
    return extractChartPollingConfig(chart);
  }, [chart]);

  // Calculate effective refresh settings
  const effectiveAutoRefresh = useMemo(() => {
    if (pollingConfig.enabled) return true;
    return dashboardAutoRefresh;
  }, [pollingConfig.enabled, dashboardAutoRefresh]);

  const effectiveRefreshInterval = useMemo(() => {
    if (pollingConfig.enabled) {
      return calculateBackoffDelay(
        chartState.consecutiveErrors,
        pollingConfig.interval,
        pollingConfig.backoff_strategy
      );
    }
    return dashboardRefreshInterval;
  }, [pollingConfig, chartState.consecutiveErrors, dashboardRefreshInterval]);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  const loadChartData = useCallback(async (forceRefresh = false, isDashboardRefresh = false) => {
    if (!chart.id || !workspaceId) {
      console.warn('⚠️ Chart ID or workspace ID missing');
      return;
    }

    const chartId = chart.id;
    
    // Check cache first
    if (!forceRefresh && chartState.data && chartState.lastRefresh) {
      const cacheAge = Date.now() - chartState.lastRefresh.getTime();
      const cacheValidTime = 30 * 1000; // 30 seconds
      
      if (cacheAge < cacheValidTime) {
        if (isDashboardRefresh) {
          onRefreshComplete?.(chartId, true);
        }
        return;
      }
    }

    console.log(`🔄 Loading chart data: ${chartId}`);
    
    setChartState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));
    
    loadStartTimeRef.current = Date.now();

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const queryParams = new URLSearchParams();
      if (filters.length > 0) {
        queryParams.append('filters', JSON.stringify(filters));
      }
      if (Object.keys(globalFilters).length > 0) {
        queryParams.append('global_filters', JSON.stringify(globalFilters));
      }

      const url = `/api/workspaces/${workspaceId}/charts/${chartId}/data${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-ID': workspaceId
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const loadTime = Date.now() - loadStartTimeRef.current;
      const now = new Date();

      console.log(`✅ Chart data loaded: ${chartId}`, { 
        loadTime: `${loadTime}ms`,
        dataRows: result.data?.data?.length || 0 
      });

      setChartState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        error: null,
        lastRefresh: now,
        nextRefresh: effectiveAutoRefresh ? 
          new Date(now.getTime() + effectiveRefreshInterval * 1000) : null,
        refreshCount: prev.refreshCount + 1,
        consecutiveErrors: 0,
        isInitialized: true
      }));

      // Notify parent components
      onChartLoad?.(chartId, { 
        loadTime, 
        dataSize: JSON.stringify(result.data).length,
        refreshCount: chartState.refreshCount + 1
      });

      if (isDashboardRefresh) {
        onRefreshComplete?.(chartId, true);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const loadTime = Date.now() - loadStartTimeRef.current;
      
      console.error(`❌ Chart data loading error (${chartId}):`, err);
      
      setChartState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        consecutiveErrors: prev.consecutiveErrors + 1
      }));

      onChartError?.(chartId, errorMessage);

      if (isDashboardRefresh) {
        onRefreshComplete?.(chartId, false);
      }

      // Pause auto refresh if too many consecutive errors
      if (chartState.consecutiveErrors >= maxRetries) {
        setChartState(prev => ({ ...prev, isPaused: true }));
      }
    }
  }, [
    chart.id, 
    workspaceId, 
    filters, 
    globalFilters, 
    chartState.data, 
    chartState.lastRefresh,
    chartState.refreshCount,
    chartState.consecutiveErrors,
    effectiveAutoRefresh,
    effectiveRefreshInterval,
    maxRetries,
    onChartLoad,
    onChartError,
    onRefreshComplete
  ]);

  // ============================================================================
  // AUTO REFRESH MANAGEMENT
  // ============================================================================

  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    if (!effectiveAutoRefresh || 
        chartState.isPaused || 
        !isPollingAllowed(pollingConfig) ||
        (pollingConfig.pause_on_tab_hidden && isTabHiddenRef.current)) {
      return;
    }

    const intervalMs = Math.max(effectiveRefreshInterval * 1000, 5000); // Min 5s
    
    autoRefreshRef.current = setInterval(() => {
      loadChartData(true);
    }, intervalMs);

    setChartState(prev => ({ 
      ...prev, 
      autoRefresh: true,
      refreshInterval: effectiveRefreshInterval
    }));
  }, [effectiveAutoRefresh, effectiveRefreshInterval, chartState.isPaused, pollingConfig, loadChartData]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = undefined;
    }
    
    setChartState(prev => ({ 
      ...prev, 
      autoRefresh: false,
      nextRefresh: null
    }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
      
      if (pollingConfig.pause_on_tab_hidden && chartState.isInitialized) {
        if (document.hidden) {
          stopAutoRefresh();
        } else {
          startAutoRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pollingConfig, chartState.isInitialized, startAutoRefresh, stopAutoRefresh]);

  // Initialize chart data loading
  useEffect(() => {
    if (!chartState.isInitialized && chart.id && workspaceId) {
      loadChartData();
    }
  }, [chartState.isInitialized, chart.id, workspaceId, loadChartData]);

  // Setup auto refresh
  useEffect(() => {
    if (chartState.isInitialized) {
      startAutoRefresh();
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [chartState.isInitialized, startAutoRefresh]);

  // Update auto refresh when settings change
  useEffect(() => {
    if (effectiveAutoRefresh && chartState.isInitialized) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }, [effectiveAutoRefresh, effectiveRefreshInterval, startAutoRefresh, stopAutoRefresh, chartState.isInitialized]);

  // Listen for dashboard refresh triggers
  useEffect(() => {
    if (dashboardRefreshTrigger && chartState.isInitialized) {
      console.log(`🔄 Dashboard refresh triggered for chart ${chart.id}`);
      loadChartData(true, true);
    }
  }, [dashboardRefreshTrigger, chartState.isInitialized, loadChartData, chart.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  // ============================================================================
  // EVENT HANDLERS - Original handlers maintained
  // ============================================================================

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleRefresh = async () => {
    handleMenuClose();
    
    // Reset consecutive errors on manual refresh
    setChartState(prev => ({ 
      ...prev, 
      consecutiveErrors: 0, 
      isPaused: false 
    }));
    
    await loadChartData(true);
    onChartRefresh?.(chart.id);
  };

  const handleExport = async (format: 'png' | 'pdf' | 'csv') => {
    handleMenuClose();
    setIsExporting(true);
    
    try {
      console.log(`📊 Exporting chart ${chart.id} as ${format}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================================
  // RENDER - Original UI maintained, no visual changes
  // ============================================================================

  // Combined loading state (external + internal)
  const isLoadingData = (externalLoading || chartState.loading);
  const hasError = (!!externalError || !!chartState.error);
  const errorToShow = externalError || chartState.error;
  const dataToShow = chartState.data;

  return (
    <ChartErrorBoundary>
      <Paper
        ref={containerRef}
        className={className}
        style={style}
        elevation={preview ? 0 : 1}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? { elevation: 2 } : {},
        }}
        onClick={onClick}
      >
        {/* Header - Original design */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 48,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <ChartIcon color="action" sx={{ mr: 1, flexShrink: 0 }} />
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 600, flex: 1 }}
            >
              {chart.display_name || chart.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>            
            {isLoadingData && (
              <Tooltip title="Loading">
                <CircularProgress size={20} />
              </Tooltip>
            )}

            {hasError && (
              <Tooltip title={String(errorToShow)}>
                <ErrorIcon color="error" fontSize="small" />
              </Tooltip>
            )}

            <IconButton
              size="small"
              onClick={handleMenuOpen}
              disabled={isExporting}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content - Original design */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {hasError && showErrorInCard ? (
            <Alert 
              severity="error" 
              sx={{ m: 1 }}
              action={
                <Button size="small" onClick={handleRefresh}>
                  Retry
                </Button>
              }
            >
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Failed to load chart data
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {errorToShow}
              </Typography>
            </Alert>
          ) : dataToShow ? (
            <ChartRenderer
              chart={chart}
              data={dataToShow}
              theme={theme}
              fullscreen={fullscreen}
              onDataPointClick={onClick}
            />
          ) : isLoadingData ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2
              }}
            >
              <CircularProgress size={40} />
              <Typography variant="body2" color="textSecondary">
                Loading chart data...
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Typography variant="body2" color="textSecondary">
                No data available
              </Typography>
            </Box>
          )}
        </Box>

        {/* Context Menu - Original design */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 180 }
          }}
        >
          <MenuItem onClick={handleRefresh} disabled={isLoadingData}>
            <RefreshIcon sx={{ mr: 1 }} fontSize="small" />
            Refresh Data
          </MenuItem>
          
          <MenuItem onClick={() => handleExport('png')} disabled={isExporting}>
            <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
            Export as PNG
          </MenuItem>
          
          <MenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
            <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
            Export as PDF
          </MenuItem>
          
          <MenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
            <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
            Export Data (CSV)
          </MenuItem>
        </Menu>
      </Paper>
    </ChartErrorBoundary>
  );
};