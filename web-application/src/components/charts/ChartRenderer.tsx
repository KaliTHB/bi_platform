// File: web-application/src/components/charts/ChartRenderer.tsx
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  ChartProps,
  ChartDimensions,
  ChartConfiguration,
  Chart,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';

interface ChartRendererProps extends Omit<ChartProps, 'config'> {
  chart: Chart;
  data: any[];
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onDataPointClick?: (data: any, series?: any) => void;
  onDataPointHover?: (data: any, series?: any) => void;
  onLegendClick?: (series?: any) => void;
  onZoom?: (domain?: any) => void;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  data,
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
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [pluginLoading, setPluginLoading] = useState(true);
  const [pluginError, setPluginError] = useState<string | null>(null);

  // Ensure dimensions have proper defaults with margin support
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

  // ✅ DYNAMIC PLUGIN LOADING FROM REGISTRY
  useEffect(() => {
    const loadChartPlugin = async () => {
      setPluginLoading(true);
      setPluginError(null);

      try {
        // Initialize registry if not already done
        await ChartRegistry.initialize();

        // Get chart type from config
        const chartType = chart.chart_type || chart.config_json?.chartType;
        const chartLibrary = chart.config_json?.library || 'echarts';
        
        // Try specific chart first, then fallback to library renderer
        const pluginKey = `${chartLibrary}-${chartType}` || `${chartLibrary}-renderer`;
        
        console.log(`Loading chart plugin: ${pluginKey}`);
        
        // Get plugin from registry
        let plugin = ChartRegistry.getPlugin(pluginKey);
        
        // Fallback to main renderer if specific chart not found
        if (!plugin) {
          const fallbackKey = `${chartLibrary}-renderer`;
          plugin = ChartRegistry.getPlugin(fallbackKey);
          console.log(`Using fallback renderer: ${fallbackKey}`);
        }

       if (plugin?.component) {
  const validPlugin = plugin; // TypeScript now knows this is not undefined
  setChartComponent(() => validPlugin.component);
  console.log(`✅ Loaded chart component: ${validPlugin.displayName}`);
} else {
  throw new Error(`Chart plugin not found: ${pluginKey}`);
}

      } catch (error) {
        console.error('Failed to load chart plugin:', error);
        setPluginError(error instanceof Error ? error.message : 'Failed to load chart plugin');
      } finally {
        setPluginLoading(false);
      }
    };

    loadChartPlugin();
  }, [chart.chart_type, chart.config_json?.chartType, chart.config_json?.library]);

  // Handle chart errors
  const handleChartError = useCallback((errorInfo: ChartError | string) => {
    const chartError: ChartError = typeof errorInfo === 'string' 
      ? {
          code: 'CHART_RENDER_ERROR',
          message: errorInfo,
          timestamp: Date.now()
        }
      : errorInfo;

    console.error('Chart render error:', chartError);
    onError?.(chartError);
  }, [onError]);

  // Handle chart interactions
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

  // Calculate the inner dimensions (subtracting margins and padding)
  const innerDimensions = useMemo(() => {
    const margin = chartDimensions.margin!;
    const padding = chartDimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
    
    return {
      width: chartDimensions.width - (margin.left ?? 0) - (margin.right ?? 0) - (padding.left || 0) - (padding.right || 0),
      height : chartDimensions.height - (margin.top ?? 0) - (margin.bottom ?? 0) - (padding.top || 0) - (padding.bottom || 0)
    };
  }, [chartDimensions]);

  // Render plugin loading state
  if (pluginLoading) {
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
          <CircularProgress size={30} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading chart plugin...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render plugin error state
  if (pluginError) {
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
              Failed to load chart plugin
            </Typography>
            <Typography variant="body2">
              {pluginError}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Chart Type: {chart.chart_type || 'unknown'} | Library: {chart.config_json?.library || 'unknown'}
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Render data loading state
  if (loading) {
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
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading chart data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render data error state
  if (error) {
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
              Failed to render chart
            </Typography>
            <Typography variant="body2">
              {error as any}
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Render empty state
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
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  // Common props for all chart renderers
  const commonProps: ChartProps = {
    chart,
    data,
    columns: (chart as any).columns || [],
    config: chartConfig,
    dimensions: chartDimensions,
    theme,
    onInteraction: handleInteraction,
    onError: handleChartError,
    className,
    style
  };

  // ✅ RENDER DYNAMICALLY LOADED COMPONENT
  if (ChartComponent) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          position: 'relative',
          ...chartDimensions.margin && {
            '& > *': {
              margin: `${chartDimensions.margin.top}px ${chartDimensions.margin.right}px ${chartDimensions.margin.bottom}px ${chartDimensions.margin.left}px`
            }
          }
        }}
      >
        <ChartComponent {...commonProps} />
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '10px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              p: 0.5,
              borderRadius: '0 0 0 4px',
              zIndex: 1000,
              display: 'none',
              '&:hover': { display: 'block' }
            }}
          >
            <div>Chart: {chart.id}</div>
            <div>Type: {chart.chart_type}</div>
            <div>Library: {chart.config_json?.library}</div>
            <div>Dimensions: {chartDimensions.width}×{chartDimensions.height}</div>
            <div>Inner: {innerDimensions.width}×{innerDimensions.height}</div>
            <div>Data Points: {data.length}</div>
          </Box>
        )}
      </Box>
    );
  }

  // Fallback if no component loaded
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
      <Typography variant="body2" color="text.secondary">
        Chart component not available
      </Typography>
    </Box>
  );
};

export default ChartRenderer;