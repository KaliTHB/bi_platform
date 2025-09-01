// File: web-application/src/components/charts/EChartsRenderer.tsx
'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import { EChartsOption, ECharts } from 'echarts';
import { ChartProps, ChartInteractionEvent } from '@/types/chart.types';
import { calculateInnerDimensions } from '@/utils/chartUtils';

const EChartsRenderer: React.FC<ChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError,
  className,
  style
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);

  // Calculate chart options based on configuration
  const chartOptions: EChartsOption = useMemo(() => {
    try {
      if (!data || data.length === 0) {
        return {};
      }

      const innerDims = calculateInnerDimensions(dimensions);
      
      // Base configuration
      const baseOptions: EChartsOption = {
        title: config.title ? {
          text: config.title.text,
          subtext: config.title.subtitle,
          left: config.title.position || 'center',
          textStyle: {
            fontSize: config.title.textStyle?.fontSize || 16,
            fontWeight: config.title.textStyle?.fontWeight || 'bold',
            color: config.title.textStyle?.color || theme?.textColor || '#333'
          },
          subtextStyle: {
            fontSize: config.title.subtitleStyle?.fontSize || 12,
            color: config.title.subtitleStyle?.color || theme?.textColor || '#666'
          }
        } : undefined,
        
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        
        legend: config.legend?.show ? {
          show: true,
          orient: config.legend.orientation || 'horizontal',
          left: getLegendPosition(config.legend.position),
          top: config.legend.position?.includes('top') ? 10 : undefined,
          bottom: config.legend.position?.includes('bottom') ? 10 : undefined,
          textStyle: {
            fontSize: config.legend.textStyle?.fontSize || 12,
            color: config.legend.textStyle?.color || theme?.textColor || '#333'
          }
        } : { show: false },
        
        grid: {
          left: dimensions.margin?.left || 20,
          top: dimensions.margin?.top || 20,
          right: dimensions.margin?.right || 20,
          bottom: dimensions.margin?.bottom || 20,
          containLabel: true,
          show: config.grid?.show_x_grid || config.grid?.show_y_grid,
          backgroundColor: theme?.backgroundColor || 'transparent'
        },
        
        xAxis: config.axes?.x ? {
          type: getEChartsAxisType(config.axes.x.type),
          name: config.axes.x.title,
          nameLocation: 'middle',
          nameGap: 30,
          data: getAxisData(data, config.axes.x.field, config.axes.x.type),
          axisLabel: {
            rotate: config.axes.x.labels?.rotation || 0,
            fontSize: config.axes.x.labels?.fontSize || 12,
            color: theme?.textColor || '#666'
          },
          axisLine: {
            show: config.axes.x.line?.enabled !== false,
            lineStyle: {
              color: config.axes.x.line?.color || theme?.axisColor || '#666',
              width: config.axes.x.line?.width || 1
            }
          },
          axisTick: {
            show: config.axes.x.ticks?.enabled !== false
          },
          splitLine: {
            show: config.axes.x.grid !== false && (config.grid?.show_x_grid !== false),
            lineStyle: {
              color: config.grid?.x_grid_color || theme?.gridColor || '#e0e0e0',
              width: config.grid?.x_grid_width || 1,
              type: config.grid?.x_grid_dash ? 'dashed' : 'solid'
            }
          }
        } : undefined,
        
        yAxis: config.axes?.y ? {
          type: getEChartsAxisType(config.axes.y.type),
          name: config.axes.y.title,
          nameLocation: 'middle',
          nameGap: 50,
          scale: config.axes.y.scale === 'log',
          axisLabel: {
            fontSize: config.axes.y.labels?.fontSize || 12,
            color: theme?.textColor || '#666'
          },
          axisLine: {
            show: config.axes.y.line?.enabled !== false,
            lineStyle: {
              color: config.axes.y.line?.color || theme?.axisColor || '#666',
              width: config.axes.y.line?.width || 1
            }
          },
          axisTick: {
            show: config.axes.y.ticks?.enabled !== false
          },
          splitLine: {
            show: config.axes.y.grid !== false && (config.grid?.show_y_grid !== false),
            lineStyle: {
              color: config.grid?.y_grid_color || theme?.gridColor || '#e0e0e0',
              width: config.grid?.y_grid_width || 1,
              type: config.grid?.y_grid_dash ? 'dashed' : 'solid'
            }
          }
        } : undefined,
        
        series: generateSeriesData(),
        
        animation: config.animation?.enabled !== false,
        animationDuration: config.animation?.duration || 1000,
        animationEasing: config.animation?.easing || 'cubicOut',
        
        backgroundColor: theme?.backgroundColor || 'transparent',
        
        color: config.colors || theme?.colorPalette || ['#3b82f6', '#ef4444', '#10b981']
      };

      return baseOptions;
    } catch (error) {
      console.error('Error generating ECharts options:', error);
      onError?.({
        code: 'ECHARTS_CONFIG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown configuration error',
        timestamp: Date.now()
      });
      return {};
    }
  }, [data, config, dimensions, theme, onError]);

  // Generate series data based on chart configuration
  const generateSeriesData = useCallback(() => {
    if (!data || data.length === 0) {
      return [];
    }

    if (!config.series || config.series.length === 0) {
      // Auto-generate series if none specified
      return generateAutoSeries();
    }

    return config.series.map((seriesConfig, index) => {
      const seriesData = data.map(item => item[seriesConfig.data_field]);
      
      return {
        name: seriesConfig.name,
        type: getEChartsSeriesType(seriesConfig.type),
        data: seriesData,
        itemStyle: {
          color: seriesConfig.color || (config.colors && config.colors[index]) || undefined
        },
        lineStyle: seriesConfig.line ? {
          width: seriesConfig.line.width || 2,
          type: seriesConfig.line.dash ? 'dashed' : 'solid'
        } : undefined,
        areaStyle: seriesConfig.area ? {
          opacity: seriesConfig.area.opacity || 0.3
        } : undefined,
        symbol: seriesConfig.markers?.enabled ? 'circle' : 'none',
        symbolSize: seriesConfig.markers?.size || 6,
        smooth: seriesConfig.line?.smooth || false
      };
    });
  }, [data, config]);

  // Auto-generate series when none specified
  const generateAutoSeries = useCallback(() => {
    if (!config.axes?.x?.field || !config.axes?.y?.field || !data || data.length === 0) {
      return [];
    }

    const yField = config.axes.y.field;
    const seriesData = data.map(item => item[yField]);

    return [{
      name: yField,
      type: 'line', // Default to line chart
      data: seriesData,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6
    }];
  }, [data, config.axes]);

  // Helper functions
  const getEChartsAxisType = (axisType?: string): 'category' | 'value' | 'time' | 'log' => {
    switch (axisType) {
      case 'category': return 'category';
      case 'value': return 'value';
      case 'time': return 'time';
      case 'log': return 'log';
      default: return 'category';
    }
  };

  const getEChartsSeriesType = (seriesType: string): string => {
    switch (seriesType) {
      case 'line': return 'line';
      case 'bar': return 'bar';
      case 'area': return 'line';
      case 'pie': return 'pie';
      case 'donut': return 'pie';
      case 'scatter': return 'scatter';
      case 'bubble': return 'scatter';
      default: return 'line';
    }
  };

  const getAxisData = (data: any[], field: string, axisType?: string) => {
    if (axisType === 'category') {
      return data.map(item => item[field]);
    }
    return undefined; // For value axes, data is handled in series
  };

  const getLegendPosition = (position?: string) => {
    switch (position) {
      case 'top':
      case 'top-left': return 'left';
      case 'top-right': return 'right';
      case 'bottom':
      case 'bottom-left': return 'left';
      case 'bottom-right': return 'right';
      case 'left': return 'left';
      case 'right': return 'right';
      default: return 'center';
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Dispose previous chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    try {
      // Create new chart instance
      const chart = echarts.init(chartRef.current, theme?.darkMode ? 'dark' : undefined);
      chartInstanceRef.current = chart;

      // Set chart options
      chart.setOption(chartOptions);

      // Add event listeners
      chart.on('click', (params: any) => {
        onInteraction?.({
          type: 'click',
          data: params,
          originalEvent: params.event?.event,
          chartId: 'echarts',
          seriesId: params.seriesName,
          dataIndex: params.dataIndex
        });
      });

      chart.on('mouseover', (params: any) => {
        onInteraction?.({
          type: 'hover',
          data: params,
          originalEvent: params.event?.event,
          chartId: 'echarts',
          seriesId: params.seriesName,
          dataIndex: params.dataIndex
        });
      });

      chart.on('legendselectchanged', (params: any) => {
        onInteraction?.({
          type: 'legend-click',
          data: params,
          chartId: 'echarts'
        });
      });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    } catch (error) {
      console.error('Error initializing ECharts:', error);
      onError?.({
        code: 'ECHARTS_INIT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initialize chart',
        timestamp: Date.now()
      });
    }
  }, [chartOptions, theme, onInteraction, onError, data]);

  // Update chart when options change
  useEffect(() => {
    if (chartInstanceRef.current && data && data.length > 0) {
      try {
        chartInstanceRef.current.setOption(chartOptions, true);
      } catch (error) {
        console.error('Error updating ECharts options:', error);
        onError?.({
          code: 'ECHARTS_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update chart',
          timestamp: Date.now()
        });
      }
    }
  }, [chartOptions, onError, data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style
      }}
    />
  );
};

export default EChartsRenderer;