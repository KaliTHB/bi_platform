'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { ChartProps, ChartInteractionEvent } from '@/types/chart.types';
import { calculateInnerDimensions } from '@/utils/chartUtils';

// Extend Window interface to include Plotly
declare global {
  interface Window {
    Plotly: typeof Plotly;
  }
}

const PlotlyRenderer: React.FC<ChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError,
  className,
  style
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInstanceRef = useRef<Plotly.PlotlyHTMLElement | null>(null);

  // Calculate inner dimensions
  const innerDimensions = useMemo(() => calculateInnerDimensions(dimensions), [dimensions]);

  // Generate Plotly data traces
  const plotlyData = useMemo(() => {
    try {
      if (!config.axes?.x?.field || !config.axes?.y?.field) {
        return [];
      }

      const xField = config.axes.x.field;
      const yField = config.axes.y.field;

      if (config.series && config.series.length > 0) {
        return config.series.map((series, index) => {
          const seriesData = data.filter(d => d[series.data_field] !== undefined);
          const xValues = seriesData.map(d => d[xField]);
          const yValues = seriesData.map(d => d[series.data_field]);

          return createPlotlyTrace(series, xValues, yValues, index);
        });
      } else {
        // Default single series
        const xValues = data.map(d => d[xField]);
        const yValues = data.map(d => d[yField]);
        
        return [{
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines+markers',
          name: yField,
          line: { color: config.colors?.[0] || theme?.colorPalette?.[0] || '#3b82f6' }
        } as Plotly.Data];
      }
    } catch (error) {
      console.error('Error generating Plotly data:', error);
      onError?.({
        code: 'PLOTLY_DATA_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate chart data',
        timestamp: Date.now()
      });
      return [];
    }
  }, [data, config, theme, onError]);

  // Generate Plotly layout
  const plotlyLayout = useMemo((): Partial<Plotly.Layout> => {
    const margin = dimensions.margin || { top: 20, right: 20, bottom: 20, left: 20 };
    
    return {
      width: dimensions.width,
      height: dimensions.height,
      margin: {
        l: margin.left,
        r: margin.right,
        t: margin.top,
        b: margin.bottom
      },
      title: config.title ? {
        text: config.title.text,
        font: {
          size: config.title.textStyle?.fontSize || 16,
          color: config.title.textStyle?.color || theme?.textColor || '#333',
          family: config.title.textStyle?.fontFamily || 'Arial, sans-serif'
        },
        xref: 'paper',
        x: getPlotlyTitlePosition(config.title.position)
      } : undefined,
      xaxis: config.axes?.x ? {
        title: {
          text: config.axes.x.title || '',
          font: {
            size: config.axes.x.labels?.fontSize || 12,
            color: config.axes.x.labels?.color || theme?.textColor || '#666'
          }
        },
        showgrid: config.axes.x.grid !== false && config.grid?.show_x_grid !== false,
        gridcolor: config.grid?.x_grid_color || theme?.gridColor || '#e0e0e0',
        gridwidth: config.grid?.x_grid_width || 1,
        showline: config.axes.x.line?.enabled !== false,
        linecolor: config.axes.x.line?.color || theme?.axisColor || '#666',
        linewidth: config.axes.x.line?.width || 1,
        tickangle: config.axes.x.labels?.rotation || 0,
        tickfont: {
          size: config.axes.x.labels?.fontSize || 12,
          color: config.axes.x.labels?.color || theme?.textColor || '#666'
        },
        type: getPlotlyAxisType(config.axes.x.type)
      } : undefined,
      yaxis: config.axes?.y ? {
        title: {
          text: config.axes.y.title || '',
          font: {
            size: config.axes.y.labels?.fontSize || 12,
            color: config.axes.y.labels?.color || theme?.textColor || '#666'
          }
        },
        showgrid: config.axes.y.grid !== false && config.grid?.show_y_grid !== false,
        gridcolor: config.grid?.y_grid_color || theme?.gridColor || '#e0e0e0',
        gridwidth: config.grid?.y_grid_width || 1,
        showline: config.axes.y.line?.enabled !== false,
        linecolor: config.axes.y.line?.color || theme?.axisColor || '#666',
        linewidth: config.axes.y.line?.width || 1,
        tickfont: {
          size: config.axes.y.labels?.fontSize || 12,
          color: config.axes.y.labels?.color || theme?.textColor || '#666'
        },
        type: config.axes.y.scale === 'log' ? 'log' : 'linear'
      } : undefined,
      showlegend: config.legend?.show !== false,
      legend: config.legend?.show !== false ? {
        orientation: config.legend.orientation === 'vertical' ? 'v' : 'h',
        x: getLegendXPosition(config.legend.position),
        y: getLegendYPosition(config.legend.position),
        xanchor: getLegendXAnchor(config.legend.position),
        yanchor: getLegendYAnchor(config.legend.position),
        font: {
          size: config.legend.textStyle?.fontSize || 12,
          color: config.legend.textStyle?.color || theme?.textColor || '#333'
        }
      } : undefined,
      plot_bgcolor: theme?.backgroundColor || 'rgba(0,0,0,0)',
      paper_bgcolor: theme?.backgroundColor || 'rgba(0,0,0,0)',
      font: {
        color: theme?.textColor || '#333',
        family: 'Arial, sans-serif'
      }
    };
  }, [dimensions, config, theme]);

  // Plotly configuration
  const plotlyConfig = useMemo((): Partial<Plotly.Config> => ({
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
    toImageButtonOptions: {
      format: 'png',
      filename: 'chart',
      height: dimensions.height,
      width: dimensions.width,
      scale: 1
    }
  }), [dimensions]);

  // Create Plotly trace from series configuration
  const createPlotlyTrace = useCallback((
    series: any,
    xValues: any[],
    yValues: any[],
    index: number
  ): Plotly.Data => {
    const baseTrace = {
      x: xValues,
      y: yValues,
      name: series.name,
      showlegend: true
    };

    const color = series.color || (config.colors && config.colors[index]) || 
                 (theme?.colorPalette && theme.colorPalette[index]) || '#3b82f6';

    switch (series.type) {
      case 'line':
        return {
          ...baseTrace,
          type: 'scatter',
          mode: series.markers?.enabled !== false ? 'lines+markers' : 'lines',
          line: {
            color,
            width: series.line?.width || 2,
            dash: series.line?.dash ? 'dash' : undefined,
            shape: series.line?.smooth ? 'spline' : 'linear'
          },
          marker: series.markers?.enabled !== false ? {
            color,
            size: series.markers?.size || 6,
            symbol: getPlotlyMarkerSymbol(series.markers?.shape)
          } : undefined
        } as Plotly.Data;

      case 'bar':
        return {
          ...baseTrace,
          type: 'bar',
          marker: {
            color,
            line: {
              color: series.bar?.borderColor || color,
              width: series.bar?.borderWidth || 0
            }
          }
        } as Plotly.Data;

      case 'scatter':
        return {
          ...baseTrace,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color,
            size: series.markers?.size || 8,
            symbol: getPlotlyMarkerSymbol(series.markers?.shape)
          }
        } as Plotly.Data;

      case 'area':
        return {
          ...baseTrace,
          type: 'scatter',
          mode: 'lines',
          fill: 'tonexty',
          fillcolor: `rgba(${hexToRgb(color)}, ${series.area?.opacity || 0.3})`,
          line: {
            color,
            width: series.line?.width || 2
          }
        } as Plotly.Data;

      case 'pie':
        return {
          values: yValues,
          labels: xValues,
          type: 'pie',
          name: series.name,
          marker: {
            colors: config.colors || theme?.colorPalette || ['#3b82f6', '#ef4444', '#10b981']
          },
          hole: series.pie?.innerRadius ? series.pie.innerRadius / 100 : undefined
        } as Plotly.Data;

      default:
        return {
          ...baseTrace,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color },
          marker: { color, size: 6 }
        } as Plotly.Data;
    }
  }, [config.colors, theme]);

  // Helper functions
  const getPlotlyAxisType = (axisType?: string): 'linear' | 'log' | 'date' | 'category' => {
    switch (axisType) {
      case 'time': return 'date';
      case 'log': return 'log';
      case 'category': return 'category';
      case 'value': 
      default: return 'linear';
    }
  };

  const getPlotlyTitlePosition = (position?: string): number => {
    switch (position) {
      case 'left': return 0;
      case 'right': return 1;
      case 'center':
      default: return 0.5;
    }
  };

  const getLegendXPosition = (position?: string): number => {
    if (position?.includes('left')) return 0;
    if (position?.includes('right')) return 1;
    return 0.5;
  };

  const getLegendYPosition = (position?: string): number => {
    if (position?.includes('top')) return 1;
    if (position?.includes('bottom')) return 0;
    return 0.5;
  };

  const getLegendXAnchor = (position?: string): 'left' | 'center' | 'right' => {
    if (position?.includes('left')) return 'left';
    if (position?.includes('right')) return 'right';
    return 'center';
  };

  const getLegendYAnchor = (position?: string): 'top' | 'middle' | 'bottom' => {
    if (position?.includes('top')) return 'top';
    if (position?.includes('bottom')) return 'bottom';
    return 'middle';
  };

  const getPlotlyMarkerSymbol = (shape?: string): string => {
    switch (shape) {
      case 'square': return 'square';
      case 'diamond': return 'diamond';
      case 'triangle': return 'triangle-up';
      case 'circle':
      default: return 'circle';
    }
  };

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '59, 130, 246'; // Default blue
  };

  // Handle chart events
  const handlePlotlyEvents = useCallback((plotlyDiv: Plotly.PlotlyHTMLElement) => {
    plotlyDiv.on('plotly_click', (eventData) => {
      if (eventData.points && eventData.points.length > 0) {
        const point = eventData.points[0];
        onInteraction?.({
          type: 'click',
          data: {
            x: point.x,
            y: point.y,
            pointIndex: point.pointIndex,
            curveNumber: point.curveNumber
          },
          originalEvent: eventData.event,
          chartId: 'plotly',
          seriesId: String(point.curveNumber),
          dataIndex: point.pointIndex
        });
      }
    });

    plotlyDiv.on('plotly_hover', (eventData) => {
      if (eventData.points && eventData.points.length > 0) {
        const point = eventData.points[0];
        onInteraction?.({
          type: 'hover',
          data: {
            x: point.x,
            y: point.y,
            pointIndex: point.pointIndex,
            curveNumber: point.curveNumber
          },
          originalEvent: eventData.event,
          chartId: 'plotly',
          seriesId: String(point.curveNumber),
          dataIndex: point.pointIndex
        });
      }
    });

    plotlyDiv.on('plotly_legendclick', (eventData) => {
      onInteraction?.({
        type: 'legend-click',
        data: eventData,
        originalEvent: eventData.event,
        chartId: 'plotly'
      });
      return false; // Prevent default legend toggle
    });

    plotlyDiv.on('plotly_relayout', (eventData) => {
      if (eventData['xaxis.range[0]'] !== undefined || eventData['yaxis.range[0]'] !== undefined) {
        onInteraction?.({
          type: 'zoom',
          data: {
            domain: {
              x: eventData['xaxis.range[0]'] !== undefined 
                ? [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
                : undefined,
              y: eventData['yaxis.range[0]'] !== undefined 
                ? [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']]
                : undefined
            }
          },
          originalEvent: eventData.event,
          chartId: 'plotly'
        });
      }
    });
  }, [onInteraction]);

  // Initialize and update Plotly chart
  useEffect(() => {
    if (!plotRef.current) return;

    const initChart = async () => {
      try {
        // Ensure Plotly is loaded
        if (typeof window !== 'undefined') {
          // Create or update the plot
          const plotlyDiv = await Plotly.newPlot(
            plotRef.current!,
            plotlyData,
            plotlyLayout,
            plotlyConfig
          );

          plotInstanceRef.current = plotlyDiv;
          
          // Attach event handlers
          handlePlotlyEvents(plotlyDiv);

        }
      } catch (error) {
        console.error('Error initializing Plotly chart:', error);
        onError?.({
          code: 'PLOTLY_INIT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to initialize Plotly chart',
          timestamp: Date.now()
        });
      }
    };

    initChart();

    // Cleanup
    return () => {
      if (plotInstanceRef.current) {
        Plotly.purge(plotInstanceRef.current);
        plotInstanceRef.current = null;
      }
    };
  }, [plotlyData, plotlyLayout, plotlyConfig, handlePlotlyEvents, onError]);

  // Handle resize
  useEffect(() => {
    if (plotInstanceRef.current) {
      Plotly.Plots.resize(plotInstanceRef.current);
    }
  }, [dimensions]);

  return (
    <div
      ref={plotRef}
      className={className}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style
      }}
    />
  );
};

export default PlotlyRenderer;