// web-application/src/components/dashboard/ChartContainer.tsx - COMPLETE FIXED VERSION
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
  Chip
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

// ============================================================================
// FIXED IMPORTS - USING RTK QUERY HOOKS INSTEAD OF chartAPI
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

// Import types
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
// CHART CONTAINER COMPONENT - UPDATED WITH RTK QUERY
// ============================================================================

export const ChartContainer: React.FC<ChartContainerProps> = ({
  chart,
  workspaceId,
  dashboardId,
  preview = false,
  fullscreen = false,
  filters = [],
  globalFilters = {},
  dimensions = { width: 400, height: 300 },
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
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metadata, setMetadata] = useState<ChartMetadata | null>(null);
  const [renderAttempts, setRenderAttempts] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // RTK QUERY HOOKS - REPLACING chartAPI CALLS
  // ============================================================================

  // Get chart data with filters
  const {
    data: chartDataResponse,
    error: chartDataError,
    isLoading: isLoadingData,
    refetch: refetchChartData,
  } = useGetChartDataQuery(
    {
      id: chart.id,
      filters: [...filters, ...Object.entries(globalFilters).map(([key, value]) => ({ key, value }))],
      refresh: false,
    },
    {
      skip: lazy && !refreshOnMount,
      pollingInterval: autoRefresh ? (refreshInterval || 0) * 1000 : 0,
    }
  );

  // Lazy query for manual refresh
  const [triggerGetChartData] = useLazyGetChartDataQuery();

  // Mutation hooks
  const [refreshChart] = useRefreshChartMutation();
  const [applyChartFilter] = useApplyChartFilterMutation();
  const [exportChart] = useExportChartMutation();
  const [toggleChartStatus] = useToggleChartStatusMutation();

  // Analytics query (optional)
  const {
    data: analyticsData,
  } = useGetChartAnalyticsQuery(
    { id: chart.id },
    { skip: !debug }
  );

  // ============================================================================
  // DERIVED STATE AND MEMOIZED VALUES
  // ============================================================================

  const chartData = useMemo(() => {
    // Use external data if provided (for testing/preview)
    if (externalData && externalColumns) {
      return {
        data: externalData,
        columns: externalColumns,
        execution_time: 0,
        metadata: {
          row_count: externalData.length,
          execution_time_ms: 0,
          cache_hit: false,
          query_hash: 'external-data'
        },
      };
    }
    
    return chartDataResponse?.data || null;
  }, [externalData, externalColumns, chartDataResponse]);

  const finalError = useMemo(() => {
    return externalError || internalError || (chartDataError ? 'Failed to load chart data' : null);
  }, [externalError, internalError, chartDataError]);

  const isLoading = useMemo(() => {
    return externalLoading || initialLoading || isLoadingData;
  }, [externalLoading, initialLoading, isLoadingData]);

  const isRefreshingState = useMemo(() => {
    return externalRefreshing || isRefreshing;
  }, [externalRefreshing, isRefreshing]);

  const isEmpty = useMemo(() => {
    return chartData ? (!chartData.data || chartData.data.length === 0) : false;
  }, [chartData]);

  const finalConfig = useMemo(() => {
    return {
      ...chart.config_json,
      ...config,
      ...configOverrides,
    };
  }, [chart.config_json, config, configOverrides]);

  // ============================================================================
  // CHART REFRESH FUNCTION - USING RTK QUERY
  // ============================================================================

  const handleRefreshChart = useCallback(async (options: ChartRefreshOptions = {}) => {
    try {
      setIsRefreshing(true);
      setInternalError(null);
      
      // Use RTK Query refresh mutation
      const refreshResult = await refreshChart({
        id: chart.id,
        options: {
          force: true,
          showLoading: options.showLoading ?? true,
          updateCache: options.updateCache ?? true,
          timeout: options.timeout || 30000,
        }
      }).unwrap();

      // Refetch data after refresh
      await refetchChartData();
      
      setLastRefresh(new Date());
      setRenderAttempts(0);
      
      // Call external refresh handler
      onChartRefresh?.(chart.id);
      
      console.log('✅ Chart refreshed successfully:', refreshResult);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh chart';
      setInternalError(errorMessage);
      onChartError?.(chart.id, errorMessage);
      onError?.(errorMessage);
      console.error('❌ Chart refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [chart.id, refreshChart, refetchChartData, onChartRefresh, onChartError, onError]);

  // ============================================================================
  // CHART FILTER APPLICATION - USING RTK QUERY
  // ============================================================================

  const handleApplyFilters = useCallback(async (newFilters: any[]) => {
    try {
      setInternalError(null);
      
      const result = await applyChartFilter({
        id: chart.id,
        filters: newFilters
      }).unwrap();

      console.log('✅ Filters applied successfully:', result);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to apply filters';
      setInternalError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ Filter application failed:', error);
    }
  }, [chart.id, applyChartFilter, onError]);

  // ============================================================================
  // CHART EXPORT FUNCTION - USING RTK QUERY
  // ============================================================================

  const handleExportChart = useCallback(async (format: ExportFormat, options: ChartExportOptions = { format }) => {
    try {
      const exportOptions: ChartExportOptions = {
        format,
        filename: options.filename || `${chart.name}_${Date.now()}`,
        dimensions: options.dimensions || {
          width: typeof dimensions.width === 'number' ? dimensions.width : 800,
          height: typeof dimensions.height === 'number' ? dimensions.height : 600,
        },
        quality: options.quality || 1,
        backgroundColor: options.backgroundColor || theme?.backgroundColor || '#ffffff',
        include_data: options.include_data ?? true,
        includeMetadata: options.includeMetadata ?? false,
        ...options,
      };

      const exportResult = await exportChart({
        id: chart.id,
        options: exportOptions
      }).unwrap();

      // Call external export handler
      onExport?.(format, exportOptions);
      
      console.log('✅ Chart export initiated:', exportResult);
      
      // If download URL is immediately available, trigger download
      if (exportResult.export.download_url) {
        const link = document.createElement('a');
        link.href = exportResult.export.download_url;
        link.download = exportOptions.filename || `chart_${chart.id}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

    } catch (error: any) {
      const errorMessage = error.message || `Failed to export chart as ${format}`;
      setInternalError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ Chart export failed:', error);
    }
  }, [chart.id, chart.name, dimensions, theme, exportChart, onExport, onError]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleChartClick = useCallback(() => {
    onChartClick?.(chart);
  }, [chart, onChartClick]);

  const handleChartDoubleClick = useCallback(() => {
    onChartDoubleClick?.(chart);
  }, [chart, onChartDoubleClick]);

  const handleToggleStatus = useCallback(async () => {
    try {
      await toggleChartStatus({
        id: chart.id,
        is_active: !chart.is_active
      }).unwrap();
      handleMenuClose();
    } catch (error: any) {
      console.error('Failed to toggle chart status:', error);
    }
  }, [chart.id, chart.is_active, toggleChartStatus]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle chart load event
  useEffect(() => {
    if (chartData && !finalError) {
      const chartMetadata: ChartMetadata = {
        chartId: chart.id,
        executionTime: chartData.execution_time || 0,
        dataPointCount: chartData.data?.length || 0,
        cached: chartData.metadata?.cache_hit || false,
        lastUpdated: new Date(),
      };
      setMetadata(chartMetadata);
      onChartLoad?.(chart.id, chartMetadata);
    }
  }, [chartData, finalError, chart, onChartLoad]);

  // Handle filter changes
  useEffect(() => {
    if (filters.length > 0 || Object.keys(globalFilters).length > 0) {
      const allFilters = [...filters, ...Object.entries(globalFilters).map(([key, value]) => ({ key, value }))];
      handleApplyFilters(allFilters);
    }
  }, [filters, globalFilters, handleApplyFilters]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval && refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        handleRefreshChart({ showLoading: false });
      }, refreshInterval * 1000);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, handleRefreshChart]);

  // ============================================================================
  // RENDER LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <Box
        ref={containerRef}
        className={className}
        style={style}
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme?.backgroundColor || 'transparent',
          ...position && {
            position: 'absolute',
            left: position.x,
            top: position.y,
          },
        }}
        role={role}
        aria-label={ariaLabel || `Loading chart ${chart.display_name || chart.name}`}
        tabIndex={tabIndex}
      >
        <Box textAlign="center">
          <CircularProgress size={40} />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {initialLoading ? 'Initializing chart...' : 'Loading data...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // RENDER ERROR STATE
  // ============================================================================

  if (finalError) {
    return (
      <Box
        ref={containerRef}
        className={className}
        style={style}
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme?.backgroundColor || 'transparent',
          p: 2,
          ...position && {
            position: 'absolute',
            left: position.x,
            top: position.y,
          },
        }}
        role="alert"
        aria-label={`Chart error: ${finalError}`}
      >
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Chart Error
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mb: 2 }}>
          {finalError}
        </Typography>
        <Box>
          <IconButton
            size="small"
            onClick={() => handleRefreshChart()}
            disabled={isRefreshingState}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
        {debug && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem' }}>
            <Typography variant="caption" display="block">
              Chart ID: {chart.id}
            </Typography>
            <Typography variant="caption" display="block">
              Attempts: {renderAttempts}
            </Typography>
            {analyticsData && (
              <Typography variant="caption" display="block">
                Error Rate: {analyticsData.analytics.error_rate}%
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  }

  // ============================================================================
  // RENDER EMPTY STATE
  // ============================================================================

  if (isEmpty) {
    return (
      <Box
        ref={containerRef}
        className={className}
        style={style}
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme?.backgroundColor || 'transparent',
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 2,
          ...position && {
            position: 'absolute',
            left: position.x,
            top: position.y,
          },
        }}
        role={role}
        aria-label={`Empty chart: ${chart.display_name || chart.name}`}
      >
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No Data Available
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          This chart doesn't have any data to display.
        </Typography>
        <IconButton
          size="small"
          onClick={() => handleRefreshChart()}
          disabled={isRefreshingState}
          sx={{ mt: 1 }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  // ============================================================================
  // RENDER MAIN CHART
  // ============================================================================

  return (
    <Box
      ref={containerRef}
      className={className}
      style={style}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: theme?.backgroundColor || 'transparent',
        position: 'relative',
        ...position && {
          position: 'absolute',
          left: position.x,
          top: position.y,
        },
      }}
      onClick={handleChartClick}
      onDoubleClick={handleChartDoubleClick}
      role={role}
      aria-label={ariaLabel || `Chart: ${chart.display_name || chart.name}`}
      aria-description={ariaDescription}
      tabIndex={tabIndex}
    >
      {/* Chart Header with Actions */}
      {(showMenu || isRefreshingState) && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1000,
            display: 'flex',
            gap: 0.5,
          }}
        >
          {isRefreshingState && (
            <Tooltip title="Refreshing...">
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <CircularProgress size={16} />
              </Box>
            </Tooltip>
          )}
          
          {showMenu && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* Status Indicators */}
      {metadata && showMetadata && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 999,
          }}
        >
          {metadata.cached && (
            <Chip
              size="small"
              icon={<SuccessIcon />}
              label="Cached"
              color="success"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.6rem' }}
            />
          )}
          
          <Chip
            size="small"
            icon={<TimeIcon />}
            label={`${metadata.executionTime}ms`}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.6rem' }}
          />
        </Box>
      )}

      {/* Main Chart Renderer */}
      <ChartRenderer
        chart={chart}
        data={chartData}
        config={finalConfig}
        dimensions={dimensions}
        theme={theme}
        preview={preview}
        workspaceId={workspaceId}
        onDataPointClick={onDataPointClick}
        onDataPointHover={onDataPointHover}
        onLegendClick={onLegendClick}
        onZoom={onZoom}
        onBrush={onBrush}
        onDrillDown={onDrillDown}
        onCrossfiltrer={onCrossfiltrer}
        onInteraction={onChartInteraction}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleRefreshChart()}>
          <RefreshIcon sx={{ mr: 1 }} />
          Refresh
        </MenuItem>
        
        {allowExport && exportFormats.map((format) => (
          <MenuItem key={format} onClick={() => handleExportChart(format)}>
            <DownloadIcon sx={{ mr: 1 }} />
            Export as {format.toUpperCase()}
          </MenuItem>
        ))}
        
        <MenuItem onClick={handleToggleStatus}>
          {chart.is_active ? 'Disable' : 'Enable'} Chart
        </MenuItem>
        
        {menuActions.map((action, index) => (
          <React.Fragment key={action.id}>
            {action.separator && index > 0 && <MenuItem divider />}
            <MenuItem
              onClick={() => {
                action.onClick();
                onMenuAction?.(action.id, chart);
                handleMenuClose();
              }}
              disabled={action.disabled}
            >
              {action.icon && <Box sx={{ mr: 1 }}>{action.icon}</Box>}
              {action.label}
            </MenuItem>
          </React.Fragment>
        ))}
      </Menu>

      {/* Debug Panel */}
      {debug && (
        <Paper
          sx={{
            position: 'absolute',
            top: 40,
            right: 8,
            p: 1,
            fontSize: '0.75rem',
            maxWidth: 200,
            zIndex: 998,
            opacity: 0.9,
          }}
        >
          <Typography variant="caption" display="block">
            ID: {chart.id}
          </Typography>
          <Typography variant="caption" display="block">
            Type: {chart.chart_type}
          </Typography>
          <Typography variant="caption" display="block">
            Data Points: {chartData?.data?.length || 0}
          </Typography>
          <Typography variant="caption" display="block">
            Last Refresh: {lastRefresh.toLocaleTimeString()}
          </Typography>
          {analyticsData && (
            <>
              <Typography variant="caption" display="block">
                Avg Load: {analyticsData.analytics.avg_load_time}ms
              </Typography>
              <Typography variant="caption" display="block">
                Views: {analyticsData.analytics.view_count}
              </Typography>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};