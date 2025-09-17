// web-application/src/components/dashboard/ChartContainer.tsx - ENHANCED FOR REACT-GRID-LAYOUT
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
  Chip,
  Button,
  LinearProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';

// ============================================================================
// PRESERVED IMPORTS - KEEPING RTK QUERY INTEGRATION
// ============================================================================

import { 
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useRefreshChartMutation,
  useApplyChartFilterMutation,
  useExportChartMutation,
  useGetChartAnalyticsQuery,
  useToggleChartStatusMutation
} from '@/store/api/chartApi';

import { ChartRenderer } from '../chart/ChartRenderer'; // Dynamic renderer
import { ChartErrorBoundary } from '../chart/ChartErrorBoundary';

// Import types - PRESERVED
import {
  ChartContainerProps,
  ChartData,
  ChartConfiguration,
  ChartMetadata,
  ChartRefreshOptions,
  ChartExportOptions,
  ChartInteractionEvent,
  ChartError,
  ExportFormat,
} from '@/types/chart.types';

// ============================================================================
// ENHANCED TYPES - EXTENDING EXISTING ONES FOR GRID COMPATIBILITY
// ============================================================================

interface EnhancedChartContainerProps extends ChartContainerProps {
  // NEW: Enhanced error handling props
  maxRetries?: number;
  retryDelay?: number;
  showErrorInCard?: boolean;
  enableAutoRetry?: boolean;
  errorFallback?: React.ComponentType<{ error: ChartError; retry: () => void }>;
  
  // NEW: Performance monitoring
  performanceMetrics?: boolean;
  loadingTimeout?: number;
  
  // NEW: Grid layout compatibility
  gridItem?: boolean; // Indicates if this is inside a grid layout
  resizeObserver?: boolean; // Enable resize observer for responsive charts
}

interface ChartState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  errorState: {
    hasError: boolean;
    error: ChartError | null;
    retryCount: number;
    lastErrorTime: Date | null;
    canRetry: boolean;
  };
  performance: {
    loadTime: number;
    renderTime: number;
    dataSize: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
}

// ============================================================================
// ENHANCED CUSTOM HOOK FOR RESILIENT CHART DATA
// ============================================================================

const useResilientChartData = (
  chartId: string, 
  workspaceId: string,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    enableAutoRetry?: boolean;
    skip?: boolean;
    polling?: number;
  } = {}
) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableAutoRetry = true,
    skip = false,
    polling = 0
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Use the existing RTK Query hook but with enhanced error handling
  const {
    data,
    error: queryError,
    isLoading,
    isError,
    isFetching,
    refetch,
    isSuccess
  } = useGetChartDataQuery(
    { chartId, workspaceId },
    { 
      skip: skip || isRetrying,
      pollingInterval: polling,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
      refetchOnFocus: false,
    }
  );

  // Track performance
  useEffect(() => {
    if (isLoading && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [isLoading]);

  const performanceMetrics = useMemo(() => ({
    loadTime: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
    dataSize: data ? JSON.stringify(data).length : 0,
    hasData: !!data,
    isOptimal: startTimeRef.current ? (Date.now() - startTimeRef.current) < 3000 : true
  }), [data, startTimeRef.current]);

  // Enhanced error handling with automatic retry
  useEffect(() => {
    if (isError && enableAutoRetry && retryCount < maxRetries) {
      const delay = Math.min(retryDelay * Math.pow(2, retryCount), 10000); // Exponential backoff
      
      setIsRetrying(true);
      retryTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Auto-retrying chart ${chartId} (attempt ${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setIsRetrying(false);
        refetch();
      }, delay);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isError, retryCount, maxRetries, enableAutoRetry, retryDelay, chartId, refetch]);

  const manualRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    setRetryCount(0);
    setIsRetrying(false);
    startTimeRef.current = Date.now();
    refetch();
  }, [refetch]);

  const canRetry = retryCount < maxRetries || !enableAutoRetry;

  return {
    data,
    error: queryError,
    isLoading: isLoading || isRetrying,
    isError,
    isFetching,
    isSuccess,
    isRetrying,
    retryCount,
    canRetry,
    retry: manualRetry,
    performanceMetrics,
    refetch
  };
};

// ============================================================================
// RESIZE OBSERVER HOOK FOR GRID RESPONSIVENESS
// ============================================================================

const useResizeObserver = (enabled: boolean = false) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserverRef.current.observe(elementRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [enabled]);

  return { elementRef, dimensions };
};

// ============================================================================
// ENHANCED CHART CONTAINER COMPONENT - GRID OPTIMIZED
// ============================================================================

export const ChartContainer: React.FC<EnhancedChartContainerProps> = ({
  // Existing props - PRESERVED
  chart,
  workspaceId,
  dashboardId,
  preview = false,
  fullscreen = false,
  filters = [],
  globalFilters = {},
  dimensions: propDimensions = { width: '100%', height: '100%' },
  position,
  theme,
  className,
  style,
  refreshInterval,
  autoRefresh = false,
  refreshOnMount = true,
  cacheEnabled = true,
  cacheTTL = 300,
  loading: externalLoading = false,
  initialLoading = false,
  refreshing: externalRefreshing = false,
  error: externalError = null,
  onError,
  onChartClick,
  onChartDoubleClick,
  onChartError,
  onChartLoad,
  onChartInteraction,
  onChartRefresh,
  onDataPointClick,
  onDataPointHover,
  onLegendClick,
  onZoom,
  onBrush,
  onDrillDown,
  onCrossfiltrer,
  config,
  configOverrides,
  data: externalData,
  columns: externalColumns,
  allowExport = true,
  exportFormats = ['png', 'svg', 'pdf', 'csv'],
  onExport,
  showMenu = true,
  menuActions = [],
  onMenuAction,
  lazy = false,
  virtualRendering = false,
  throttleResize = 100,
  debounceRefresh = 500,
  ariaLabel,
  ariaDescription,
  tabIndex,
  role = 'img',
  debug = false,
  showMetadata = false,

  // NEW: Enhanced error handling props
  maxRetries = 3,
  retryDelay = 1000,
  showErrorInCard = true,
  enableAutoRetry = true,
  errorFallback,
  performanceMetrics = false,
  loadingTimeout = 30000,
  
  // NEW: Grid layout props
  gridItem = false,
  resizeObserver = true,
  onClick,
}) => {
  // ============================================================================
  // ENHANCED STATE MANAGEMENT
  // ============================================================================

  const [chartState, setChartState] = useState<ChartState>({
    isRefreshing: false,
    lastRefresh: null,
    errorState: {
      hasError: false,
      error: null,
      retryCount: 0,
      lastErrorTime: null,
      canRetry: true,
    },
    performance: {
      loadTime: 0,
      renderTime: 0,
      dataSize: 0,
    },
    dimensions: {
      width: 0,
      height: 0,
    }
  });

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const renderStartTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // NEW: Resize observer for grid responsiveness
  const { elementRef: resizeRef, dimensions: observedDimensions } = useResizeObserver(
    gridItem && resizeObserver
  );

  // ============================================================================
  // RESILIENT DATA FETCHING
  // ============================================================================

  const {
    data,
    error: queryError,
    isLoading,
    isError,
    isFetching,
    isSuccess,
    isRetrying,
    retryCount,
    canRetry,
    retry,
    performanceMetrics: dataPerformance,
    refetch
  } = useResilientChartData(chart.id, workspaceId || '', {
    maxRetries,
    retryDelay,
    enableAutoRetry,
    skip: lazy || externalLoading,
    polling: autoRefresh ? (refreshInterval || 30000) : 0
  });

  // PRESERVED: Existing RTK Query mutations
  const [refreshChart] = useRefreshChartMutation();
  const [applyFilter] = useApplyChartFilterMutation();
  const [exportChart] = useExportChartMutation();
  const [toggleStatus] = useToggleChartStatusMutation();

  // ============================================================================
  // ENHANCED ERROR TRACKING
  // ============================================================================

  useEffect(() => {
    if (isError && queryError) {
      const errorData: ChartError = {
        message: queryError.message || 'Failed to load chart data',
        code: queryError.status?.toString() || 'UNKNOWN_ERROR',
        chartId: chart.id,
        timestamp: new Date().toISOString(),
        retryable: canRetry && !queryError.message?.includes('404')
      };

      setChartState(prev => ({
        ...prev,
        errorState: {
          hasError: true,
          error: errorData,
          retryCount,
          lastErrorTime: new Date(),
          canRetry: canRetry && !queryError.message?.includes('404')
        }
      }));

      onChartError?.(chart.id, errorData.message);
      onError?.(errorData);

      console.error(`❌ Chart ${chart.id} error:`, errorData);
    } else if (isSuccess) {
      // Clear error state on success
      setChartState(prev => ({
        ...prev,
        errorState: {
          hasError: false,
          error: null,
          retryCount: 0,
          lastErrorTime: null,
          canRetry: true,
        }
      }));
    }
  }, [isError, queryError, isSuccess, canRetry, retryCount, chart.id, onChartError, onError]);

  // ============================================================================
  // PERFORMANCE MONITORING & RESIZE HANDLING
  // ============================================================================

  useEffect(() => {
    if (isLoading) {
      renderStartTimeRef.current = Date.now();
    } else if (data) {
      const renderTime = Date.now() - renderStartTimeRef.current;
      setChartState(prev => ({
        ...prev,
        performance: {
          ...prev.performance,
          loadTime: dataPerformance.loadTime,
          renderTime,
          dataSize: dataPerformance.dataSize
        },
        lastRefresh: new Date(),
        dimensions: observedDimensions.width > 0 ? observedDimensions : prev.dimensions
      }));

      onChartLoad?.(chart.id, {
        loadTime: dataPerformance.loadTime,
        renderTime,
        dataSize: dataPerformance.dataSize,
        isOptimal: dataPerformance.isOptimal
      } as ChartMetadata);
    }
  }, [isLoading, data, dataPerformance, chart.id, onChartLoad, observedDimensions]);

  // ============================================================================
  // ENHANCED EVENT HANDLERS
  // ============================================================================

  const handleRetry = useCallback(() => {
    retry();
    setChartState(prev => ({
      ...prev,
      errorState: {
        ...prev.errorState,
        hasError: false,
        retryCount: 0
      }
    }));
  }, [retry]);

  const handleManualRefresh = useCallback(async () => {
    setChartState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      await refetch();
      onChartRefresh?.(chart.id);
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setChartState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [refetch, chart.id, onChartRefresh]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    
    try {
      const result = await exportChart({
        chartId: chart.id,
        format,
        workspaceId: workspaceId || '',
        config: { includeData: true }
      }).unwrap();
      
      onExport?.(format, result);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setMenuAnchorEl(null);
    }
  }, [exportChart, chart.id, workspaceId, onExport]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    // Prevent clicks from propagating to grid drag handlers
    if (gridItem) {
      event.stopPropagation();
    }
    
    onChartClick?.(chart);
    onClick?.(event);
  }, [chart, onChartClick, onClick, gridItem]);

  // ============================================================================
  // DIMENSION CALCULATIONS FOR GRID COMPATIBILITY
  // ============================================================================

  const finalDimensions = useMemo(() => {
    if (gridItem && observedDimensions.width > 0) {
      return {
        width: observedDimensions.width,
        height: observedDimensions.height
      };
    }
    
    if (typeof propDimensions === 'object') {
      return propDimensions;
    }
    
    return { width: propDimensions, height: propDimensions };
  }, [propDimensions, observedDimensions, gridItem]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderLoadingState = () => {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'action.hover'
      }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          {isRetrying ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading chart data...'}
        </Typography>
        {isRetrying && (
          <LinearProgress 
            sx={{ width: '100%', maxWidth: 200 }} 
            variant="indeterminate" 
            color="warning"
          />
        )}
        {debug && (
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.7 }}>
            Chart ID: {chart.id}
          </Typography>
        )}
      </Box>
    );
  };

  const renderErrorState = () => {
    const { error, retryCount, canRetry } = chartState.errorState;

    if (errorFallback) {
      return <errorFallback error={error!} retry={handleRetry} />;
    }

    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'error.light',
        color: 'error.contrastText',
        borderRadius: 1
      }}>
        <ErrorIcon sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
        <Typography variant="h6" gutterBottom align="center">
          Chart Unavailable
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }}>
          {error?.message || 'Failed to load chart data'}
        </Typography>
        
        {canRetry && (
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            sx={{ 
              borderColor: 'currentColor',
              color: 'inherit',
              '&:hover': {
                borderColor: 'currentColor',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Try Again
          </Button>
        )}

        {debug && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, fontSize: '0.75rem' }}>
            <Typography variant="caption" display="block">
              Chart ID: {chart.id}
            </Typography>
            <Typography variant="caption" display="block">
              Error Code: {error?.code}
            </Typography>
            <Typography variant="caption" display="block">
              Retry Count: {retryCount}/{maxRetries}
            </Typography>
            <Typography variant="caption" display="block">
              Dimensions: {finalDimensions.width} x {finalDimensions.height}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderSuccessState = () => {
    const finalData = externalData || data;

    console.log('finalData:', finalData);
    console.log('chart:', chart);

    // Show placeholder for missing data
    if (!finalData) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: 'success.light',
          color: 'success.contrastText',
          borderRadius: 1
        }}>
          <ChartIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {chart.chart_type.toUpperCase()} Chart
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            no Data received 
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.7 }}>
            {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Preserved: Original ChartRenderer with all functionality */}
        <ChartRenderer
          chart={chart}
          data={finalData}
          columns={externalColumns}
          config={{ ...config, ...configOverrides }}
          dimensions={finalDimensions}
          theme={theme}
          filters={filters}
          globalFilters={globalFilters}
          onDataPointClick={onDataPointClick}
          onDataPointHover={onDataPointHover}
          onLegendClick={onLegendClick}
          onZoom={onZoom}
          onBrush={onBrush}
          onDrillDown={onDrillDown}
          onCrossfiltrer={onCrossfiltrer}
          onInteraction={onChartInteraction}
          virtualRendering={virtualRendering}
          ariaLabel={ariaLabel}
          ariaDescription={ariaDescription}
          role={role}
        />

        {/* Chart Menu - PRESERVED */}
        {showMenu && !gridItem && ( // Hide menu in grid items to prevent interference
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation(); // Prevent grid interaction
                setMenuAnchorEl(event.currentTarget);
              }}
              sx={{ 
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Performance Indicator */}
        {performanceMetrics && !dataPerformance.isOptimal && (
          <Chip
            icon={<TrendingUpIcon />}
            label={`${chartState.performance.loadTime}ms`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: '0.7rem'
            }}
          />
        )}
      </Box>
    );
  };

  const renderChart = () => {
    const isCurrentlyLoading = isLoading || externalLoading || chartState.isRefreshing;
    const hasCurrentError = chartState.errorState.hasError || !!externalError;

    if (isCurrentlyLoading) {
      return renderLoadingState();
    }

    if (hasCurrentError) {
      return renderErrorState();
    }

    return renderSuccessState();
  };

  // ============================================================================
  // MAIN RENDER - OPTIMIZED FOR GRID LAYOUT
  // ============================================================================

  return (
    <ChartErrorBoundary>
      <Box
        ref={(el) => {
          containerRef.current = el;
          if (resizeRef) {
            resizeRef.current = el;
          }
        }}
        className={`enhanced-chart-container ${gridItem ? 'grid-chart-item' : ''} ${className || ''}`}
        sx={{
          width: finalDimensions.width,
          height: finalDimensions.height,
          position: 'relative',
          borderRadius: gridItem ? 0 : 1,
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
          ...style,
          ...(position && !gridItem && {
            position: 'absolute',
            left: position.x,
            top: position.y,
          }),
        }}
        onClick={handleClick}
        onDoubleClick={onChartDoubleClick ? () => onChartDoubleClick(chart) : undefined}
        tabIndex={tabIndex}
        role={role}
        aria-label={ariaLabel || `${chart.chart_type} chart: ${chart.display_name}`}
        aria-describedby={ariaDescription}
        data-chart-id={chart.id}
        data-chart-type={chart.chart_type}
        data-loading={isLoading}
        data-error={chartState.errorState.hasError}
        data-retry-count={chartState.errorState.retryCount}
        data-grid-item={gridItem}
      >
        {renderChart()}

        {/* Enhanced Menu with Export Options - PRESERVED */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem onClick={handleManualRefresh} disabled={chartState.isRefreshing}>
            <RefreshIcon sx={{ mr: 1 }} fontSize="small" />
            Refresh
          </MenuItem>
          
          {allowExport && (
            exportFormats.map((format) => (
              <MenuItem 
                key={format}
                onClick={() => handleExport(format as ExportFormat)}
                disabled={isExporting}
              >
                <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
                Export as {format.toUpperCase()}
              </MenuItem>
            ))
          )}

          {menuActions.map((action, index) => (
            <MenuItem 
              key={index}
              onClick={() => {
                onMenuAction?.(action);
                setMenuAnchorEl(null);
              }}
            >
              {action.icon && React.cloneElement(action.icon, { sx: { mr: 1 }, fontSize: "small" })}
              {action.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Metadata Display - PRESERVED */}
        {showMetadata && chartState.lastRefresh && !gridItem && (
          <Box sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            bgcolor: 'background.paper',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <TimeIcon fontSize="small" sx={{ fontSize: '0.8rem' }} />
            <Typography variant="caption">
              {chartState.lastRefresh.toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Box>
    </ChartErrorBoundary>
  );
};