// File: web-application/src/components/charts/ChartRenderer.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  ChartProps,
  ChartDimensions,
  ChartConfiguration,
  Chart,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';

// Import specific chart renderers
import EChartsRenderer from './EChartsRenderer';
import D3ChartRenderer from './D3ChartRenderer';
import PlotlyRenderer from './PlotlyRenderer';
import ChartJSRenderer from './ChartJSRenderer';
import TableRenderer from './TableRenderer';
import MetricCardRenderer from './MetricCardRenderer';

interface ChartRendererProps extends Omit<ChartProps, 'config'> {
  chart: Chart;
  data: any[];
  loading?: boolean;
  error?: string | null;
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
      case 'legend-click':
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
      width: chartDimensions.width - margin.left - margin.right - (padding.left || 0) - (padding.right || 0),
      height: chartDimensions.height - margin.top - margin.bottom - (padding.top || 0) - (padding.bottom || 0)
    };
  }, [chartDimensions]);

  // Render loading state
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

  // Render error state
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
              {error}
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
    data,
    config: chartConfig,
    dimensions: chartDimensions,
    theme,
    onInteraction: handleInteraction,
    onError: handleChartError,
    className,
    style
  };

  // Render the appropriate chart component based on chart type and library
  const getChartLibrary = () => {
    // Extract library from chart type or config
    return chart.config_json?.library || 'echarts';
  };

  const renderChart = () => {
    const library = getChartLibrary();
    
    try {
      switch (library) {
        case 'echarts':
          return <EChartsRenderer {...commonProps} />;
        
        case 'd3js':
          return <D3ChartRenderer {...commonProps} />;
        
        case 'plotly':
          return <PlotlyRenderer {...commonProps} />;
        
        case 'chartjs':
          return <ChartJSRenderer {...commonProps} />;
        
        case 'table':
          return (
            <TableRenderer
              data={data}
              columns={chart.config_json?.columns || []}
              dimensions={chartDimensions}
              maxRows={chart.config_json?.maxRows || 100}
            />
          );
        
        case 'metric':
          return (
            <MetricCardRenderer
              data={data}
              config={chartConfig}
              dimensions={chartDimensions}
            />
          );
        
        default:
          throw new Error(`Unsupported chart library: ${library}`);
      }
    } catch (renderError) {
      handleChartError(renderError instanceof Error ? renderError.message : 'Unknown render error');
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          Failed to render chart: {renderError instanceof Error ? renderError.message : 'Unknown error'}
        </Alert>
      );
    }
  };

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
      {renderChart()}
      
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
          <div>Dimensions: {chartDimensions.width}×{chartDimensions.height}</div>
          <div>Inner: {innerDimensions.width}×{innerDimensions.height}</div>
          <div>Data Points: {data.length}</div>
        </Box>
      )}
    </Box>
  );
};

export default ChartRenderer;