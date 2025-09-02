// web-application/src/components/dashboard/ChartContainer.tsx
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
// IMPORTS FROM EXTERNAL FILES
// ============================================================================

import { chartAPI } from '../../services/api';
import { ChartRenderer } from '../charts/ChartRenderer';

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
  createChartMetadata,
  isChartDataEmpty,
  DEFAULT_CHART_DIMENSIONS,
  validateChartForRendering
} from '@/types/chart.types';

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
  workspaceId,
  preview = false,
  filters = [],
  dimensions,
  theme,
  refreshInterval,
  onChartClick,
  onChartError,
  onChartLoad,
  onChartInteraction,
  className,
  style
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // VALIDATION & PLUGIN RESOLUTION
  // ============================================================================
  
  // Validate chart configuration
  const chartValidation = useMemo(() => {
    return validateChartForRendering(chart);
  }, [chart]);
  
  // Plugin key resolution using external utility
  const pluginInfo = useMemo(() => {
    const result = generatePluginKeyFromChart(chart);
    
    if (!chartValidation.valid) {
      console.warn(`⚠️ Chart validation failed for "${chart.name}":`, chartValidation.errors);
    }
    
    console.log(`🔑 Plugin resolution for chart "${chart.name}":`, {
      chartId: chart.id,
      pluginKey: result.primaryKey,
      fallbackKeys: result.fallbackKeys,
      validation: chartValidation
    });
    
    return result;
  }, [chart.chart_type, chart.config_json?.chartType, chart.config_json?.library, chart.type, chartValidation]);

  // ============================================================================
  // CHART CONFIGURATION
  // ============================================================================
  
  const enhancedChart = useMemo(() => {
    // Create base configuration
    const chartDimensions = dimensions || 
                           chart.config_json?.dimensions || 
                           createDefaultDimensions();
    
    const baseConfig: Partial<ChartConfiguration> = {
      chartType: pluginInfo.chartType as any,
      library: pluginInfo.library as any,
      dimensions: chartDimensions
    };
    
    // Merge with existing config using external utility
    let mergedConfig: ChartConfiguration;
    
    try {
      mergedConfig = mergeChartConfigurations(
        chart.config_json || { dimensions: chartDimensions, series: [] }, 
        baseConfig
      );
    } catch (configError) {
      console.warn(`Config merge failed for chart "${chart.name}":`, configError);
      mergedConfig = {
        ...baseConfig,
        dimensions: chartDimensions,
        series: []
      } as ChartConfiguration;
    }
    
    // Return enhanced chart object
    return {
      ...chart,
      config_json: {
        ...mergedConfig,
        // Ensure required fields
        columns: chart.columns || chartData?.columns || [],
        // Add metadata for debugging
        _pluginInfo: {
          key: pluginInfo.primaryKey,
          fallbacks: pluginInfo.fallbackKeys,
          resolvedAt: new Date().toISOString()
        }
      }
    };
  }, [chart, pluginInfo, dimensions, chartData]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const fetchChartData = async (options: ChartRefreshOptions = {}) => {
    const { showLoading = true, force = false, timeout = LOADING_TIMEOUT_MS } = options;
    
    // Clear any existing timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    if (showLoading) setLoading(true);
    setError(null);

    // Set loading timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        setError('Chart loading timeout - please try refreshing');
        setLoading(false);
        setRefreshing(false);
      }
    }, timeout);

    try {
      console.log(`📊 Fetching data for chart: ${chart.name} (${pluginInfo.primaryKey})`);
      
      const requestStart = Date.now();
      
      const response = await chartAPI.getChartData(chart.id, {
        workspace_id: workspaceId,
        filters: filters,
        force_refresh: force,
        timeout: timeout - 1000 // API timeout slightly less than loading timeout
      });

      const requestTime = Date.now() - requestStart;

      if (response && response.data !== undefined) {
        // Create metadata using external utility
        const metadata = createChartMetadata(
          Array.isArray(response.data) ? response.data.length : 0,
          response.execution_time || requestTime,
          {
            cacheHit: response.cache_hit || false,
            dataSource: response.data_source,
            refreshedAt: new Date().toISOString(),
            requestTime,
            apiVersion: response.version,
            queryHash: response.query_hash
          }
        );

        const chartDataResult: ChartData = {
          data: Array.isArray(response.data) ? response.data : [],
          columns: response.columns || chart.columns || [],
          execution_time: response.execution_time || requestTime,
          metadata,
          query: response.query,
          parameters: response.parameters,
          cacheInfo: {
            hit: response.cache_hit || false,
            key: response.cache_key,
            ttl: response.cache_ttl,
            createdAt: response.cache_created_at
          }
        };

        setChartData(chartDataResult);
        setLastRefresh(new Date());
        
        // Notify parent of successful load
        onChartLoad?.(chart.id, metadata);

        console.log(`✅ Chart data loaded successfully:`, {
          chartId: chart.id,
          chartName: chart.name,
          rows: metadata.totalRows,
          queryTime: metadata.queryTime,
          requestTime,
          pluginKey: pluginInfo.primaryKey,
          cacheHit: metadata.cacheHit
        });
      } else {
        throw new Error('No data received from API - empty response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
      const errorDetails = {
        chartId: chart.id,
        chartName: chart.name,
        pluginKey: pluginInfo.primaryKey,
        workspaceId,
        filtersCount: filters?.length || 0,
        error: err
      };
      
      console.error(`❌ Error fetching chart data:`, errorDetails);
      
      setError(errorMessage);
      onChartError?.(chart.id, errorMessage);
    } finally {
      // Clear loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================
  
  // Initial data load
  useEffect(() => {
    fetchChartData();
  }, [chart.id, workspaceId, JSON.stringify(filters)]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      console.log(`🔄 Auto-refreshing chart: ${chart.name}`);
      fetchChartData({ showLoading: false, force: false });
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, chart.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleRefresh = () => {
    // Debounce rapid refresh clicks
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(true);
      fetchChartData({ showLoading: false, force: true });
      setMenuAnchor(null);
    }, REFRESH_DEBOUNCE_MS);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!chartData || isChartDataEmpty(chartData)) {
      console.warn('No data available for export');
      setError('No data available for export');
      return;
    }

    if (chartData.data.length > MAX_EXPORT_ROWS) {
      setError(`Dataset too large for export (${chartData.data.length.toLocaleString()} rows). Maximum allowed: ${MAX_EXPORT_ROWS.toLocaleString()}`);
      return;
    }

    setExportLoading(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const safeChartName = chart.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeChartName}_${timestamp}.${format}`;
      
      let content: string;
      let mimeType: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify({
            chart: {
              id: chart.id,
              name: chart.name,
              type: chart.chart_type,
              library: pluginInfo.library,
              pluginKey: pluginInfo.primaryKey
            },
            data: chartData.data,
            columns: chartData.columns,
            metadata: {
              ...chartData.metadata,
              exportedAt: new Date().toISOString(),
              exportFormat: format
            },
            query: chartData.query,
            parameters: chartData.parameters
          }, null, 2);
          mimeType = 'application/json';
          break;
          
        case 'csv':
          const headers = chartData.columns?.map(col => col.name) || Object.keys(chartData.data[0] || {});
          const csvRows = [
            // Header row
            headers.join(','),
            // Data rows
            ...chartData.data.map(row => 
              headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
              }).join(',')
            )
          ];
          content = csvRows.join('\n');
          mimeType = 'text/csv;charset=utf-8';
          break;
          
        case 'excel':
          // For Excel, we'll export as CSV with .xlsx extension for now
          // In a full implementation, you'd use a library like xlsx
          const excelHeaders = chartData.columns?.map(col => col.name) || Object.keys(chartData.data[0] || {});
          const excelRows = [
            excelHeaders.join('\t'), // Tab-separated for Excel
            ...chartData.data.map(row => 
              excelHeaders.map(header => row[header] ?? '').join('\t')
            )
          ];
          content = excelRows.join('\n');
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
        chartId: chart.id,
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

  const handleChartClick = () => {
    if (!loading && !error) {
      onChartClick?.(enhancedChart);
    }
  };

  const handleChartInteraction = (event: ChartInteractionEvent) => {
    // Add chart context and forward to parent
    const enhancedEvent: ChartInteractionEvent = {
      ...event,
      chartId: chart.id,
      timestamp: Date.now()
    };
    
    onChartInteraction?.(enhancedEvent);
    console.log(`🎯 Chart interaction for "${chart.name}":`, enhancedEvent);
  };

  const handleChartError = (errorInfo: ChartError | string) => {
    const chartError: ChartError = typeof errorInfo === 'string' 
      ? {
          code: 'CHART_RENDER_ERROR',
          message: errorInfo,
          timestamp: Date.now(),
          details: {
            chartId: chart.id,
            pluginKey: pluginInfo.primaryKey
          }
        }
      : errorInfo;

    console.error(`Chart render error for "${chart.name}":`, chartError);
    setError(chartError.message);
    onChartError?.(chart.id, chartError.message);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderChartContent = () => {
    if (!chartData || isChartDataEmpty(chartData)) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary',
            flexDirection: 'column',
            gap: 1.5,
            p: 3
          }}
        >
          <ErrorIcon sx={{ fontSize: 48, opacity: 0.5 }} />
          <Typography variant="body2" align="center">
            No data available
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }} align="center">
            Plugin: {pluginInfo.primaryKey}
          </Typography>
          {!chartValidation.valid && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="error" align="center">
                Configuration issues detected
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return (
      <ChartRenderer
        chart={enhancedChart}
        data={chartData.data}
        dimensions={dimensions}
        theme={theme}
        loading={loading}
        onError={handleChartError}
        onInteraction={handleChartInteraction}
      />
    );
  };

  const renderLoadingState = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: 2,
        p: 3
      }}
    >
      <CircularProgress size={40} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Loading {pluginInfo.library} {pluginInfo.chartType} chart...
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
          Plugin: {pluginInfo.primaryKey}
        </Typography>
      </Box>
    </Box>
  );

  const renderErrorState = () => (
    <Alert 
      severity="error" 
      sx={{ 
        height: 'fit-content', 
        m: 2,
        '& .MuiAlert-message': { width: '100%' }
      }}
    >
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Chart Error
        </Typography>
        <Typography variant="body2" paragraph>
          {error}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Plugin: {pluginInfo.primaryKey}
          </Typography>
          <Box>
            <Tooltip title="Retry loading">
              <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Alert>
  );

  const renderMetadataFooter = () => {
    if (!chartData?.metadata || loading || error) return null;

    const { metadata } = chartData;
    
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
          pt: 1,
          borderTop: '1px solid',
          borderTopColor: 'divider',
          fontSize: '0.75rem',
          color: 'text.secondary',
          opacity: 0.8,
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption">
            {formatLargeNumber(metadata.totalRows)} rows
          </Typography>
          
          <Typography variant="caption" sx={{ opacity: 0.5 }}>•</Typography>
          
          <Typography variant="caption">
            {pluginInfo.library}
          </Typography>
          
          {metadata.cacheHit && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>•</Typography>
              <Chip 
                label="cached" 
                size="small" 
                color="success" 
                sx={{ 
                  height: 16, 
                  fontSize: '0.6rem',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            </>
          )}
          
          {lastRefresh && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>•</Typography>
              <Tooltip title={`Last refreshed: ${lastRefresh.toLocaleString()}`}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: 12 }} />
                  {formatQueryTime(Date.now() - lastRefresh.getTime())} ago
                </Typography>
              </Tooltip>
            </>
          )}
        </Box>
        
        <Typography variant="caption">
          {formatQueryTime(metadata.queryTime)}
        </Typography>
      </Box>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <Paper
      ref={containerRef}
      className={className}
      style={style}
      elevation={preview ? 1 : 2}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: preview ? 200 : 300,
        display: 'flex',
        flexDirection: 'column',
        cursor: (!loading && !error && onChartClick) ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          ...((!loading && !error && onChartClick) && {
            boxShadow: 4
          })
        }
      }}
      onClick={handleChartClick}
    >
      {/* Chart Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1.5,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          flexShrink: 0,
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
            title={chart.name}
          >
            {chart.name}
          </Typography>
          
          {/* Status indicators */}
          {!chartValidation.valid && (
            <Tooltip title={`Configuration issues: ${chartValidation.errors.join(', ')}`}>
              <ErrorIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            </Tooltip>
          )}
          
          {chartData && !error && (
            <Tooltip title="Chart loaded successfully">
              <SuccessIcon sx={{ fontSize: 16, color: 'success.main', opacity: 0.7 }} />
            </Tooltip>
          )}
        </Box>
        
        {!preview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {(refreshing || exportLoading) && (
              <CircularProgress size={16} sx={{ mr: 1 }} />
            )}
            
            <Tooltip title="Chart options">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
                aria-label="Chart options"
                disabled={exportLoading}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Chart Content */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
          backgroundColor: 'background.default'
        }}
      >
        {loading && !refreshing ? renderLoadingState() : 
         error ? renderErrorState() : 
         renderChartContent()}
      </Box>

      {/* Metadata Footer */}
      {!preview && renderMetadataFooter()}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { minWidth: 180 }
        }}
      >
        <MenuItem onClick={handleRefresh} disabled={refreshing || loading}>
          <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
          Refresh Data
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleExport('json')} 
          disabled={!chartData || isChartDataEmpty(chartData) || exportLoading}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleExport('csv')} 
          disabled={!chartData || isChartDataEmpty(chartData) || exportLoading}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as CSV
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleExport('excel')} 
          disabled={!chartData || isChartDataEmpty(chartData) || exportLoading}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as Excel
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ChartContainer;