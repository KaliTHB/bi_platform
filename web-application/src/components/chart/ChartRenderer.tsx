// ============================================================================
// FILE: /src/components/chart/ChartRenderer.tsx
// PURPOSE: Main chart renderer - NO DIRECT STATIC IMPORTS
// ============================================================================

'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, IconButton } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

// ONLY import plugin system components - NO direct renderer imports
import { ChartFactory } from '@/plugins/charts/factory/ChartFactory';
import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';
import ChartErrorBoundary from './ChartErrorBoundary';

// REMOVED: All direct renderer imports
// import EChartsRenderer from '@/plugins/charts/renderer/EChartsRenderer';
// import D3ChartRenderer from '@/plugins/charts/renderer/D3ChartRenderer';

// Types only
import {
  ChartProps,
  ChartDimensions,
  ChartConfiguration,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { ChartRendererProps } from '@/types/index';

// ============================================================================
// MAIN CHART RENDERER COMPONENT
// ============================================================================

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  data,
  config,
  columns,
  dimensions,
  theme,
  loading = false,
  error = null,
  onInteraction,
  onError,
  onDataPointClick,
  onDataPointHover,
  onLegendClick,
  onZoom,
  className,
  style
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // State for dynamic chart loading ONLY - no static component state
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [chartElement, setChartElement] = useState<React.ReactElement | null>(null);
  const [pluginLoading, setPluginLoading] = useState(true);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ============================================================================
  // CHART CONFIGURATION
  // ============================================================================

  // Extract chart configuration
  const chartLibrary = chart.chart_library || 'echarts';
  const chartType = chart.chart_type;
  const chartId = chart.id;
  const chartName = chart.name || chart.display_name || 'Untitled Chart';

  // Chart dimensions with proper defaults
  const chartDimensions: ChartDimensions = useMemo(() => ({
    width: dimensions?.width || chart.config_json?.dimensions?.width || 400,
    height: dimensions?.height || chart.config_json?.dimensions?.height || 300,
    margin: {
      top: dimensions?.margin?.top || chart.config_json?.dimensions?.margin?.top || 20,
      right: dimensions?.margin?.right || chart.config_json?.dimensions?.margin?.right || 20,
      bottom: dimensions?.margin?.bottom || chart.config_json?.dimensions?.margin?.bottom || 20,
      left: dimensions?.margin?.left || chart.config_json?.dimensions?.margin?.left || 20
    },
    padding: dimensions?.padding || chart.config_json?.dimensions?.padding || {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    }
  }), [dimensions, chart.config_json?.dimensions]);

  // Merge chart configuration with runtime overrides
  const chartConfig: ChartConfiguration = useMemo(() => ({
    ...chart.config_json,
    ...config,
    // Ensure dimensions are always available
    dimensions: chartDimensions
  }), [chart.config_json, config, chartDimensions]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Enhanced interaction handler
  const handleInteraction = useCallback((event: ChartInteractionEvent) => {
    const enhancedEvent: ChartInteractionEvent = {
      ...event,
      chartId: chartId,
      timestamp: Date.now(),
      metadata: {
        chartType,
        chartLibrary,
        chartName,
        ...event.metadata
      }
    };

    // Call parent interaction handler
    onInteraction?.(enhancedEvent);

    // Handle specific interaction types
    switch (event.type) {
      case 'click':
        onDataPointClick?.(event.data, event.data?.series);
        break;
      case 'hover':
        onDataPointHover?.(event.data, event.data?.series);
        break;
      case 'select':
        onLegendClick?.(event.data?.series);
        break;
      case 'zoom':
        onZoom?.(event.data?.domain);
        break;
      default:
        break;
    }
  }, [chartId, chartType, chartLibrary, chartName, onInteraction, onDataPointClick, onDataPointHover, onLegendClick, onZoom]);

  // Enhanced error handler
  const handleChartError = useCallback((errorInfo: ChartError | string) => {
    const chartError: ChartError = typeof errorInfo === 'string' 
      ? {
          code: 'CHART_RENDER_ERROR',
          message: errorInfo,
          timestamp: Date.now(),
          details: { 
            chartId,
            chartType,
            chartLibrary,
            chartName,
            retryCount 
          }
        }
      : {
          ...errorInfo,
          details: {
            chartId,
            chartType,
            chartLibrary,
            chartName,
            retryCount,
            ...errorInfo.details
          }
        };

    console.error(`Chart render error for "${chartName}" (${chartType}):`, chartError);
    setPluginError(chartError.message);
    onError?.(chartError);
  }, [chartId, chartType, chartLibrary, chartName, retryCount, onError]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setPluginError(null);
    setPluginLoading(true);
    setChartComponent(null);
    setChartElement(null);
  }, []);

  // ============================================================================
  // PLUGIN LOADING - REGISTRY AND FACTORY ONLY
  // ============================================================================

  useEffect(() => {
    const loadChartPlugin = async () => {
      setPluginLoading(true);
      setPluginError(null);
      setChartComponent(null);
      setChartElement(null);

      try {
        // Validate required data
        if (!chart || !chartType) {
          throw new Error('Invalid chart configuration: missing chart or chartType');
        }

        if (!data || data.length === 0) {
          console.warn(`Chart "${chartName}" has no data`);
          // Don't throw error, let chart component handle empty data
        }

        // Ensure both plugin systems are initialized
        console.log(`🔍 Loading chart: ${chartLibrary}-${chartType} (attempt ${retryCount + 1})`);
        
        await Promise.all([
          ChartRegistry.initialize(),
          ChartFactory.initialize()
        ]);

        // Strategy 1: Try ChartRegistry first (preferred)
        const pluginKey = `${chartLibrary}-${chartType}`;
        const plugin = ChartRegistry.getPlugin(pluginKey);
        console.log('plugins',plugin)

        if (plugin?.component) {
          console.log(`✅ Using Registry component: ${plugin.displayName}`);
          setChartComponent(() => plugin.component);
          return;
        }

        // Strategy 2: Use ChartFactory as fallback
        console.log(`🏭 Using ChartFactory for: ${chartLibrary}-${chartType}`);
        
        const isSupported = await ChartFactory.isChartSupported(chartType, chartLibrary);
        if (!isSupported) {
          throw new Error(`Chart type '${chartType}' is not supported for library '${chartLibrary}'`);
        }

        // Create chart element using ChartFactory
        const element = ChartFactory.createChart(chartType, chartLibrary, {
          chart,
          data: data || [],
          config: chartConfig,
          dimensions: chartDimensions,
          theme,
          onError: handleChartError,
          onInteraction: handleInteraction
        });

        if (element) {
          console.log(`✅ Created chart element via ChartFactory`);
          setChartElement(element);
        } else {
          throw new Error(`ChartFactory failed to create chart element for ${pluginKey}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown chart loading error';
        console.error(`❌ Failed to load chart ${chartLibrary}-${chartType}:`, errorMessage);
        
        // NO static fallbacks - only show error
        handleChartError({
          code: 'PLUGIN_LOAD_ERROR',
          message: errorMessage,
          timestamp: Date.now(),
          details: {
            chartId,
            chartType,
            chartLibrary,
            pluginKey: `${chartLibrary}-${chartType}`,
            retryCount
          }
        });
      } finally {
        setPluginLoading(false);
      }
    };

    // Only attempt to load if we have a valid chart configuration
    if (chart && chartType) {
      loadChartPlugin();
    } else {
      setPluginLoading(false);
      setPluginError('Invalid chart configuration');
    }
  }, [
    chart, 
    chartType, 
    chartLibrary, 
    data, 
    chartConfig, 
    chartDimensions, 
    theme,
    chartId,
    chartName,
    retryCount,
    handleChartError, 
    handleInteraction
  ]);

  // ============================================================================
  // RENDER LOGIC - NO STATIC FALLBACKS
  // ============================================================================

  // Show external loading state
  if (loading) {
    return <ChartLoadingFallback message="Loading chart data..." />;
  }

  // Show external error
  if (error) {
    return (
      <ChartErrorFallback 
        error={typeof error === 'string' ? error : error.message} 
        chartType={chartType}
        chartName={chartName}
      />
    );
  }

  // Show plugin loading state
  if (pluginLoading) {
    return <ChartLoadingFallback message="Loading chart renderer..." />;
  }

  // Show plugin error with retry option - NO static fallbacks
  if (pluginError) {
    return (
      <ChartErrorFallback 
        error={pluginError} 
        chartType={chartType}
        chartName={chartName}
        showRetry={true}
        onRetry={handleRetry}
        retryCount={retryCount}
      />
    );
  }

  // Render the chart
  return (
    <ChartErrorBoundary>
      <Box 
        position="relative" 
        width="100%" 
        height="100%"
        className={className}
        style={style}
      >
        {/* Registry Component Render */}
        {ChartComponent && (
          <ChartComponent
            chart={chart}
            data={data}
            config={chartConfig}
            columns={columns}
            dimensions={chartDimensions}
            theme={theme}
            onInteraction={handleInteraction}
            onError={handleChartError}
          />
        )}

        {/* Factory Element Render */}
        {chartElement && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              '& > *': {
                width: '100%',
                height: '100%'
              }
            }}
          >
            {chartElement}
          </Box>
        )}

        {/* Chart Metadata Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 1,
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <Typography
            variant="caption"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 0.5,
              fontSize: '10px'
            }}
          >
            {chartType}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              backgroundColor: getLibraryColor(chartLibrary),
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 0.5,
              fontSize: '10px'
            }}
          >
            {chartLibrary}
          </Typography>
        </Box>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: '8px',
              opacity: 0.5,
              pointerEvents: 'none',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255,255,255,0.8)',
              px: 0.5,
              borderRadius: 0.5
            }}
          >
            {ChartComponent ? 'Registry' : chartElement ? 'Factory' : 'None'} | ID: {chartId}
          </Box>
        )}
      </Box>
    </ChartErrorBoundary>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const ChartLoadingFallback: React.FC<{ message?: string }> = ({ 
  message = "Loading chart..." 
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    minHeight={200}
    sx={{
      backgroundColor: 'background.default',
      borderRadius: 1,
      border: '1px dashed',
      borderColor: 'divider'
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      {message}
    </Typography>
  </Box>
);

const ChartErrorFallback: React.FC<{ 
  error: string; 
  chartType: string;
  chartName?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  retryCount?: number;
}> = ({ 
  error, 
  chartType, 
  chartName, 
  showRetry = false, 
  onRetry,
  retryCount = 0 
}) => (
  <Alert 
    severity="error" 
    sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center',
      '& .MuiAlert-message': {
        flex: 1
      }
    }}
    action={
      showRetry && onRetry ? (
        <IconButton 
          color="inherit" 
          size="small" 
          onClick={onRetry}
          disabled={retryCount >= 3}
          title={retryCount >= 3 ? 'Maximum retries reached' : 'Retry loading chart'}
        >
          <RefreshIcon />
        </IconButton>
      ) : undefined
    }
  >
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Failed to load chart: <strong>{chartName || chartType}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {error}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Chart type: {chartType}
        {retryCount > 0 && ` | Retries: ${retryCount}`}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Please ensure the chart plugin is registered in ChartRegistry.
      </Typography>
    </Box>
  </Alert>
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getLibraryColor(library: string): string {
  switch (library) {
    case 'echarts': return '#1976d2';
    case 'chartjs': return '#2e7d32';
    case 'plotly': return '#7b1fa2';
    case 'd3js': return '#f57c00';
    default: return '#757575';
  }
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

// Debug function to inspect chart loading (development only)
export const debugChartRenderer = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔍 ChartRenderer Debug Info');
    
    console.log('📦 Registry Status:');
    ChartRegistry.debugRegistry?.();
    
    console.log('🏭 Factory Status:');
    ChartFactory.getAllCharts().then(charts => {
      console.log('Available charts via Factory:', charts.length);
      charts.slice(0, 5).forEach(chart => {
        console.log(`  - ${chart.name}: ${chart.displayName}`);
      });
    });
    
    console.groupEnd();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ChartRenderer;