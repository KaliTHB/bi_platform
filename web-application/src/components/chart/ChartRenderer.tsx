// web-application/src/components/chart/ChartRenderer.tsx
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

// Import ChartFactory and Registry
import { ChartFactory } from '@/plugins/charts/factory/ChartFactory';
import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';
import ChartErrorBoundary from './ChartErrorBoundary';

// Types
import {
  ChartProps,
  ChartDimensions,
  ChartConfiguration,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { ChartRendererProps } from '@/types/index';

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
  // State for dynamic chart loading
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [chartElement, setChartElement] = useState<React.ReactElement | null>(null);
  const [pluginLoading, setPluginLoading] = useState(true);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Ensure dimensions have proper defaults
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

  // Merge chart config with any runtime overrides
  const chartConfig: ChartConfiguration = useMemo(() => ({
    ...chart.config_json,
    dimensions: chartDimensions,
    theme: theme || chart.config_json?.theme
  }), [chart.config_json, chartDimensions, theme]);

  // Get chart library and type
  const chartLibrary = chart.config_json?.library || 'echarts';
  const chartType = chart.chart_type || chart.config_json?.chartType || 'bar';

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  const handleChartError = useCallback((errorInfo: ChartError | string | Error) => {
    let chartError: ChartError;
    
    if (typeof errorInfo === 'string') {
      chartError = {
        code: 'CHART_RENDER_ERROR',
        message: errorInfo,
        timestamp: Date.now()
      };
    } else if (errorInfo instanceof Error) {
      chartError = {
        code: 'CHART_RENDER_ERROR',
        message: errorInfo.message,
        timestamp: Date.now(),
        details: errorInfo.stack
      };
    } else {
      chartError = errorInfo;
    }

    console.error('Chart render error:', chartError);
    setPluginError(chartError.message);
    onError?.(chartError);
  }, [onError]);

  const handleInteraction = useCallback((event: ChartInteractionEvent) => {
    // Add chart context to the event
    const enhancedEvent: ChartInteractionEvent = {
      ...event,
      chartId: chart.id
    };
    
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
  }, [chart.id, onInteraction, onDataPointClick, onDataPointHover, onLegendClick, onZoom]);

  // ============================================================================
  // PLUGIN LOADING WITH FACTORY AND REGISTRY
  // ============================================================================

  useEffect(() => {
    const loadChartPlugin = async () => {
      setPluginLoading(true);
      setPluginError(null);
      setChartComponent(null);
      setChartElement(null);

      try {
        // Ensure both systems are initialized
        await Promise.all([
          ChartRegistry.initialize(),
          ChartFactory.initialize()
        ]);

        console.log(`🔍 Loading chart: ${chartLibrary}-${chartType}`);

        // Strategy 1: Try to get component directly from ChartRegistry
        const pluginKey = `${chartLibrary}-${chartType}`;
        const plugin = ChartRegistry.getPlugin(pluginKey);

        if (plugin?.component) {
          // Use plugin component directly from registry
          console.log(`✅ Using Registry component: ${plugin.displayName}`);
          setChartComponent(() => plugin.component);
        } else {
          // Strategy 2: Use ChartFactory to create chart element (for chart builder & dashboard template)
          console.log(`🏭 Using ChartFactory for: ${chartLibrary}-${chartType}`);
          
          const isSupported = await ChartFactory.isChartSupported(chartType, chartLibrary);
          if (!isSupported) {
            throw new Error(`Chart type '${chartType}' is not supported for library '${chartLibrary}'`);
          }

          // Create chart element using ChartFactory
          const element = ChartFactory.createChart(chartType, chartLibrary, {
            data: data || [],
            config: chartConfig,
            dimensions: chartDimensions,
            onError: handleChartError,
            onInteraction: handleInteraction
          });

          if (element) {
            console.log(`✅ Created chart element via ChartFactory`);
            setChartElement(element);
          } else {
            throw new Error(`ChartFactory failed to create chart element for ${pluginKey}`);
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error loading chart';
        console.error(`❌ Failed to load chart plugin ${pluginKey}:`, error);
        
        // Enhanced error reporting
        const registryStats = ChartRegistry.getRegistrationStats();
        console.log('📊 Registry stats:', registryStats);
        
        handleChartError({
          code: 'PLUGIN_LOAD_ERROR',
          message: `Failed to load ${pluginKey}: ${errorMessage}`,
          timestamp: Date.now(),
          details: {
            pluginKey,
            chartType,
            chartLibrary,
            availablePlugins: registryStats.plugins,
            registryInitialized: ChartRegistry.hasPlugin('echarts-bar') // Basic check
          }
        });
      } finally {
        setPluginLoading(false);
      }
    };

    // Only load if we have the required data
    if (chartType && chartLibrary && data) {
      loadChartPlugin();
    } else {
      setPluginLoading(false);
      setPluginError('Missing required chart configuration');
    }
  }, [chartType, chartLibrary, data, chartConfig, chartDimensions, handleChartError, handleInteraction]);

  // ============================================================================
  // CHART RENDERING EFFECT
  // ============================================================================

  useEffect(() => {
    if (ChartComponent || chartElement) {
      setIsRendering(true);
      // Simulate rendering delay
      const timer = setTimeout(() => {
        setIsRendering(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ChartComponent, chartElement]);

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // Loading state
  if (loading || pluginLoading || isRendering) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1,
          position: 'relative'
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {pluginLoading 
              ? `Loading ${chartLibrary} plugin...` 
              : isRendering 
                ? `Rendering ${chartType} chart...` 
                : 'Loading chart data...'
            }
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.7, display: 'block' }}>
            {chartLibrary}-{chartType}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error || pluginError) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          p: 2
        }}
      >
        <Alert severity="error" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Chart Rendering Failed
            </Typography>
            <Typography variant="body2" gutterBottom>
              {pluginError || error}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
              Chart: {chartType} | Library: {chartLibrary}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
              Available plugins: {ChartRegistry.getAvailableCharts().slice(0, 3).join(', ')}
              {ChartRegistry.getAvailableCharts().length > 3 && '...'}
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Empty data state
  if (!data || data.length === 0) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1
        }}
      >
        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No data available
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {chartLibrary}-{chartType}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // MAIN CHART RENDER
  // ============================================================================

  const commonProps: ChartProps = {
    chart,
    data,
    columns: columns || [],
    config: chartConfig,
    dimensions: chartDimensions,
    theme,
    onInteraction: handleInteraction,
    onError: handleChartError,
    className,
    style
  };

  return (
    <ChartErrorBoundary onError={handleChartError}>
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Render via Registry Component */}
        {ChartComponent && (
          <ChartComponent {...commonProps} />
        )}

        {/* Render via Factory Element */}
        {chartElement && !ChartComponent && (
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
            pointerEvents: 'none'
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

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: '8px',
              opacity: 0.5,
              pointerEvents: 'none',
              fontFamily: 'monospace'
            }}
          >
            {ChartComponent ? 'Registry' : chartElement ? 'Factory' : 'None'}
          </Box>
        )}
      </Box>
    </ChartErrorBoundary>
  );
};

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
// ENHANCED DEBUG UTILITIES
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

export default ChartRenderer;