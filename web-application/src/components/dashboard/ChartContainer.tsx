// ============================================================================
// FILE: /src/components/dashboard/ChartContainer.tsx
// PURPOSE: Dashboard chart container - NO DIRECT RENDERER IMPORTS
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
// IMPORTS FROM EXTERNAL FILES - NO DIRECT RENDERERS
// ============================================================================

import { chartAPI } from '@/api/index';
import { ChartRenderer } from '../chart/ChartRenderer'; // ONLY dynamic renderer

// REMOVED: All direct renderer imports
// import EChartsRenderer from '@/plugins/charts/renderer/EChartsRenderer';
// import D3ChartRenderer from '@/plugins/charts/renderer/D3ChartRenderer';

// Types from external file
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

import {
  createChartMetadata,
  isChartDataEmpty,
  DEFAULT_CHART_DIMENSIONS,
  validateChartForRendering
} from '@/utils/chartUtils';

// Utilities from external file
import {
  generatePluginKeyFromChart,
  formatQueryTime,
  formatLargeNumber,
  mergeChartConfigurations,
  createDefaultDimensions
} from '@/utils/chartUtils';

// ============================================================================
// CONSTANTS
// ============================================================================

const REFRESH_DEBOUNCE_MS = 500;
const MAX_EXPORT_ROWS = 100000;
const LOADING_TIMEOUT_MS = 30000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChartContainer: React.FC<ChartContainerProps> = ({
  chart,
  data: initialData,
  config: overrideConfig,
  dimensions = DEFAULT_CHART_DIMENSIONS,
  theme,
  filters = [],
  refreshOptions,
  exportOptions,
  interactionMode = 'default',
  onChartClick,
  onChartInteraction,
  onChartError,
  onDataRefresh,
  className,
  style,
  showMetadata = false,
  showActions = true,
  autoRefresh = false,
  refreshInterval = 30000,
  enableExport = true,
  enableFullscreen = false
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [chartData, setChartData] = useState<ChartData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [metadata, setMetadata] = useState<ChartMetadata | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Enhanced chart with runtime overrides
  const enhancedChart = useMemo(() => ({
    ...chart,
    // Force consistent library usage - can be overridden if needed
    chart_library: chart.chart_library || 'echarts'
  }), [chart]);

  // Plugin information for debugging
  const pluginInfo = useMemo(() => ({
    primaryKey: generatePluginKeyFromChart(enhancedChart),
    library: enhancedChart.chart_library,
    type: enhancedChart.chart_type,
    version: enhancedChart.version || '1.0.0'
  }), [enhancedChart]);

  // Merged configuration
  const chartConfig: ChartConfiguration = useMemo(() => 
    mergeChartConfigurations(enhancedChart.config_json || {}, overrideConfig || {})
  , [enhancedChart.config_json, overrideConfig]);

  // Chart dimensions with defaults
  const chartDimensions = useMemo(() => 
    createDefaultDimensions(dimensions, enhancedChart.position_json)
  , [dimensions, enhancedChart.position_json]);

  // Validation
  const isValidChart = useMemo(() => 
    validateChartForRendering(enhancedChart, chartData)
  , [enhancedChart, chartData]);

  // ============================================================================
  // DATA LOADING AND REFRESH
  // ============================================================================

  // Load chart data
  const loadChartData = async (options: ChartRefreshOptions = {}) => {
    if (!enhancedChart.id) {
      setError('Chart ID is required');
      return;
    }

    try {
      setError(null);
      if (!options.silent) {
        setLoading(true);
      }

      console.log(`🔄 Loading data for chart "${enhancedChart.name}" (${pluginInfo.primaryKey})`);

      const response = await chartAPI.getChartData(enhancedChart.id, {
        filters: [...filters, ...(options.additionalFilters || [])],
        refresh: options.forceRefresh || false,
        timeout: options.timeout || 30000
      });

      if (response.data) {
        setChartData(response.data);
        setMetadata(createChartMetadata(response.data, enhancedChart));
        setLastRefresh(new Date());
        
        console.log(`✅ Chart data loaded:`, {
          chartId: enhancedChart.id,
          rows: response.data.data?.length || 0,
          columns: response.data.columns?.length || 0,
          queryTime: response.data.metadata?.queryTime
        });

        onDataRefresh?.(response.data, enhancedChart);
      } else {
        throw new Error('No data returned from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
      setError(errorMessage);
      console.error('Chart data loading failed:', err);
      onChartError?.({
        code: 'DATA_LOAD_ERROR',
        message: errorMessage,
        timestamp: Date.now(),
        details: {
          chartId: enhancedChart.id,
          pluginKey: pluginInfo.primaryKey
        }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced refresh function
  const debouncedRefresh = (options: ChartRefreshOptions = {}) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      loadChartData(options);
    }, REFRESH_DEBOUNCE_MS);
  };

  // Manual refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    debouncedRefresh({ 
      forceRefresh: true,
      ...refreshOptions
    });
  };

  // ============================================================================
  // AUTO-REFRESH LOGIC
  // ============================================================================

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && !loading && !error) {
      autoRefreshTimeoutRef.current = setTimeout(() => {
        debouncedRefresh({ 
          silent: true,
          forceRefresh: false,
          ...refreshOptions
        });
      }, refreshInterval);

      return () => {
        if (autoRefreshTimeoutRef.current) {
          clearTimeout(autoRefreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, loading, error, refreshOptions]);

  // ============================================================================
  // INITIAL DATA LOAD
  // ============================================================================

  useEffect(() => {
    if (!initialData && enhancedChart.id) {
      loadChartData();
    } else if (initialData) {
      setChartData(initialData);
      setMetadata(createChartMetadata(initialData, enhancedChart));
      setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, [enhancedChart.id, initialData]);

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  const handleExport = async (format: ExportFormat) => {
    if (!chartData || !chartData.data) {
      setError('No data available for export');
      return;
    }

    setExportLoading(true);
    
    try {
      const filename = `${enhancedChart.name || 'chart'}_${new Date().toISOString().split('T')[0]}.${format}`;
      let content: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          const csvHeaders = chartData.columns?.map(col => col.name).join(',') || '';
          const csvRows = chartData.data.map(row => 
            chartData.columns?.map(col => row[col.name] || '').join(',')
          );
          content = [csvHeaders, ...csvRows].join('\n');
          mimeType = 'text/csv';
          break;
          
        case 'json':
          content = JSON.stringify({
            chart: {
              id: enhancedChart.id,
              name: enhancedChart.name,
              type: enhancedChart.chart_type
            },
            data: chartData.data,
            columns: chartData.columns,
            metadata: chartData.metadata,
            exportedAt: new Date().toISOString()
          }, null, 2);
          mimeType = 'application/json';
          break;
          
        case 'excel':
          const excelHeaders = chartData.columns?.map(col => col.name).join('\t') || '';
          const excelRows = chartData.data.map(row => 
            chartData.columns?.map(col => row[col.name] || '').join('\t')
          );
          content = [excelHeaders, ...excelRows].join('\n');
          mimeType = 'application/vnd.ms-excel';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`📥 Chart exported successfully:`, {
        chartId: enhancedChart.id,
        format,
        filename,
        rows: chartData.data.length,
        size: content.length
      });
      
    } catch (err) {
      console.error('Failed to export chart:', err);
      setError(`Failed to export chart as ${format.toUpperCase()}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
      setMenuAnchor(null);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleChartClick = () => {
    if (!loading && !error) {
      onChartClick?.(enhancedChart);
    }
  };

  const handleChartInteraction = (event: ChartInteractionEvent) => {
    // Add chart context and forward to parent
    const enhancedEvent: ChartInteractionEvent = {
      ...event,
      chartId: enhancedChart.id,
      timestamp: Date.now()
    };
    
    onChartInteraction?.(enhancedEvent);
    console.log(`🎯 Chart interaction for "${enhancedChart.name}":`, enhancedEvent);
  };

  const handleChartError = (errorInfo: ChartError | string) => {
    const chartError: ChartError = typeof errorInfo === 'string' 
      ? {
          code: 'CHART_RENDER_ERROR',
          message: errorInfo,
          timestamp: Date.now(),
          details: {
            chartId: enhancedChart.id,
            pluginKey: pluginInfo.primaryKey
          }
        }
      : errorInfo;

    console.error(`Chart render error for "${enhancedChart.name}":`, chartError);
    setError(chartError.message);
    onChartError?.(chartError);
  };

  // Menu handlers
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  return (
    <Paper 
      className={className}
      style={style}
      sx={{ 
        position: 'relative', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Chart Header */}
      {(showActions || showMetadata) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 48
          }}
        >
          {/* Chart Title and Metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="subtitle2" noWrap>
              {enhancedChart.display_name || enhancedChart.name}
            </Typography>
            
            {showMetadata && metadata && (
              <>
                <Chip 
                  label={`${formatLargeNumber(metadata.rowCount)} rows`}
                  size="small"
                  variant="outlined"
                />
                {metadata.queryTime && (
                  <Tooltip title={`Query executed in ${formatQueryTime(metadata.queryTime)}`}>
                    <Chip 
                      icon={<TimeIcon />}
                      label={formatQueryTime(metadata.queryTime)}
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
                {lastRefresh && (
                  <Tooltip title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}>
                    <Chip 
                      icon={<SuccessIcon />}
                      label="Updated"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Box>

          {/* Actions */}
          {showActions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Refresh Button */}
              <Tooltip title="Refresh chart data">
                <IconButton 
                  size="small" 
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {/* Export Menu */}
              {enableExport && (
                <>
                  <Tooltip title="Export chart data">
                    <IconButton 
                      size="small" 
                      onClick={handleMenuClick}
                      disabled={!chartData || exportLoading}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={() => handleExport('csv')}>
                      Export as CSV
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('json')}>
                      Export as JSON
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('excel')}>
                      Export as Excel
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* More Actions */}
              <Tooltip title="More actions">
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}

      {/* Chart Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Loading State */}
        {(loading || refreshing) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 10
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {refreshing ? 'Refreshing...' : 'Loading chart...'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert 
            severity="error" 
            sx={{ m: 2 }}
            action={
              <IconButton size="small" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            }
          >
            <Typography variant="subtitle2">Chart Error</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {/* Empty Data State */}
        {!loading && !error && (!chartData || isChartDataEmpty(chartData)) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No data available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This chart has no data to display
            </Typography>
            <IconButton onClick={handleRefresh} sx={{ mt: 2 }}>
              <RefreshIcon />
            </IconButton>
          </Box>
        )}

        {/* Chart Renderer - NO STATIC FALLBACKS */}
        {!loading && !error && chartData && !isChartDataEmpty(chartData) && isValidChart && (
          <ChartRenderer
            chart={enhancedChart}
            data={chartData.data}
            config={chartConfig}
            columns={chartData.columns}
            dimensions={chartDimensions}
            theme={theme}
            onInteraction={handleChartInteraction}
            onError={handleChartError}
            onClick={handleChartClick}
          />
        )}
      </Box>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontSize: '8px',
            opacity: 0.5,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(255,255,255,0.8)',
            px: 0.5,
            borderRadius: 0.5
          }}
        >
          {pluginInfo.primaryKey}
        </Box>
      )}
    </Paper>
  );
};

export default ChartContainer;

export { ChartContainer}