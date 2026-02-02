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
        console.warn('EChartsRenderer: No data provided');
        return createEmptyChartOptions();
      }

      const innerDims = calculateInnerDimensions(dimensions);
      
      // Extract axis configurations with proper fallbacks
      const xAxisConfig = extractAxisConfig(config, 'x', data);
      const yAxisConfig = extractAxisConfig(config, 'y', data);
      
      console.log('ECharts Axis Debug:', {
        xAxisConfig,
        yAxisConfig,
        dataPreview: data.slice(0, 3),
        config: config
      });

      // Base configuration
      const baseOptions: EChartsOption = {
        title: config.title ? {
          text: config.title.text || config.title,
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
          left: dimensions.margin?.left || 60,
          top: dimensions.margin?.top || 40,
          right: dimensions.margin?.right || 40,
          bottom: dimensions.margin?.bottom || 60,
          containLabel: true,
          show: config.grid?.show_x_grid || config.grid?.show_y_grid,
          backgroundColor: theme?.backgroundColor || 'transparent'
        },
        
        // FIXED X-AXIS CONFIGURATION
        xAxis: {
          type: xAxisConfig.type,
          name: xAxisConfig.title,
          nameLocation: 'middle',
          nameGap: 30,
          data: xAxisConfig.data,
          axisLabel: {
            rotate: xAxisConfig.labelRotation || 0,
            fontSize: 12,
            color: theme?.textColor || '#666',
            show: true
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: theme?.axisColor || '#666',
              width: 1
            }
          },
          axisTick: {
            show: true
          },
          splitLine: {
            show: config.grid?.show_x_grid !== false,
            lineStyle: {
              color: config.grid?.x_grid_color || theme?.gridColor || '#e0e0e0',
              width: 1,
              type: 'solid'
            }
          }
        },
        
        // FIXED Y-AXIS CONFIGURATION
        yAxis: {
          type: yAxisConfig.type,
          name: yAxisConfig.title,
          nameLocation: 'middle',
          nameGap: 50,
          scale: yAxisConfig.scale === 'log',
          axisLabel: {
            fontSize: 12,
            color: theme?.textColor || '#666',
            show: true,
            formatter: yAxisConfig.formatter
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: theme?.axisColor || '#666',
              width: 1
            }
          },
          axisTick: {
            show: true
          },
          splitLine: {
            show: config.grid?.show_y_grid !== false,
            lineStyle: {
              color: config.grid?.y_grid_color || theme?.gridColor || '#e0e0e0',
              width: 1,
              type: 'solid'
            }
          }
        },
        
        series: generateSeriesData(data, config, xAxisConfig, yAxisConfig),
        
        animation: config.animation?.enabled !== false,
        animationDuration: config.animation?.duration || 1000,
        animationEasing: config.animation?.easing || 'cubicOut',
        
        backgroundColor: theme?.backgroundColor || 'transparent',
        
        color: config.colors || theme?.colorPalette || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
      };

      return baseOptions;
    } catch (error) {
      console.error('Error generating ECharts options:', error);
      onError?.({
        code: 'ECHARTS_CONFIG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown configuration error',
        timestamp: Date.now()
      });
      return createEmptyChartOptions();
    }
  }, [data, config, dimensions, theme, onError]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !chartOptions || Object.keys(chartOptions).length === 0) {
      return;
    }

    try {
      // Dispose existing chart instance
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }

      // Create new chart instance
      chartInstanceRef.current = echarts.init(chartRef.current, theme?.echartsTheme || 'light');
      
      // Set options
      chartInstanceRef.current.setOption(chartOptions, true);

      // Add interaction handlers
      if (onInteraction) {
        chartInstanceRef.current.on('click', (params: any) => {
          const event: ChartInteractionEvent = {
            type: 'click',
            data: params.data,
            seriesName: params.seriesName,
            dataIndex: params.dataIndex,
            originalEvent: params
          };
          onInteraction(event);
        });
      }

      // Handle resize
      const handleResize = () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing ECharts:', error);
      onError?.({
        code: 'ECHARTS_INIT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initialize chart',
        timestamp: Date.now()
      });
    }
  }, [chartOptions, theme, onInteraction, onError]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        width: dimensions?.width || '100%',
        height: dimensions?.height || '400px',
        ...style
      }}
    />
  );
};

// HELPER FUNCTIONS

/**
 * Extract axis configuration from config with proper field mapping
 */
function extractAxisConfig(config: any, axis: 'x' | 'y', data: any[]) {
  const axisConfig = config.axes?.[axis] || {};
  const fieldAssignments = config.fieldAssignments || {};
  const customConfig = config.customConfig || {};
  
  // Try multiple sources for field name
  let fieldName = 
    axisConfig.field || 
    config[`${axis}Field`] || 
    customConfig[`${axis}Field`] ||
    fieldAssignments[`${axis}-axis`]?.name ||
    (Array.isArray(fieldAssignments[`${axis}-axis`]) 
      ? fieldAssignments[`${axis}-axis`][0]?.name 
      : null);

  console.log(`${axis.toUpperCase()}-Axis Field Detection:`, {
    fromAxes: axisConfig.field,
    fromConfig: config[`${axis}Field`],
    fromCustom: customConfig[`${axis}Field`],
    fromAssignments: fieldAssignments[`${axis}-axis`],
    finalField: fieldName
  });

  // If still no field, try to infer from data
  if (!fieldName && data && data.length > 0) {
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    if (axis === 'x') {
      // For X-axis, prefer string/category fields or first field
      fieldName = keys.find(key => typeof firstRow[key] === 'string') || keys[0];
    } else {
      // For Y-axis, prefer number fields or last field
      fieldName = keys.find(key => typeof firstRow[key] === 'number') || keys[keys.length - 1];
    }
    
    console.warn(`Inferred ${axis}-axis field: ${fieldName}`);
  }

  // Determine axis type
  let axisType: 'category' | 'value' | 'time' | 'log' = 'category';
  if (axis === 'y') {
    axisType = 'value'; // Y-axis is usually value type
  } else if (fieldName && data && data.length > 0) {
    const sampleValue = data[0][fieldName];
    if (typeof sampleValue === 'number') {
      axisType = 'value';
    } else if (sampleValue instanceof Date || /\d{4}-\d{2}-\d{2}/.test(String(sampleValue))) {
      axisType = 'time';
    }
  }

  // Extract axis data for category axes
  let axisData: any[] | undefined;
  if (axisType === 'category' && fieldName && data) {
    axisData = data.map(item => item[fieldName]);
    // Remove duplicates for category axis
    axisData = [...new Set(axisData)];
  }

  return {
    field: fieldName,
    type: axisType,
    title: axisConfig.title || 
           axisConfig.label || 
           customConfig[`${axis}AxisLabel`] || 
           fieldName ||
           `${axis.toUpperCase()}-Axis`,
    data: axisData,
    labelRotation: axisConfig.labels?.rotation || 0,
    scale: axisConfig.scale || 'linear',
    formatter: axisConfig.format ? (value: any) => {
      if (axisConfig.format === 'currency') return `$${value}`;
      if (axisConfig.format === 'percentage') return `${value}%`;
      return value;
    } : undefined
  };
}

/**
 * Generate series data with proper field mapping
 */
function generateSeriesData(data: any[], config: any, xAxisConfig: any, yAxisConfig: any) {
  if (!data || data.length === 0 || !xAxisConfig.field || !yAxisConfig.field) {
    console.warn('Cannot generate series data: missing data or field configurations');
    return [];
  }

  const chartType = config.chartType || config.type || 'line';
  const seriesName = config.seriesName || yAxisConfig.field || 'Series';

  // For category X-axis, map data points correctly
  let seriesData: any[];
  
  if (xAxisConfig.type === 'category') {
    // Map data to match category order
    seriesData = data.map(item => item[yAxisConfig.field]);
  } else {
    // For value-based axes, use [x, y] format
    seriesData = data.map(item => [
      item[xAxisConfig.field],
      item[yAxisConfig.field]
    ]);
  }

  const series = [{
    name: seriesName,
    type: getEChartsSeriesType(chartType),
    data: seriesData,
    smooth: config.smooth || false,
    symbol: config.showPoints !== false ? 'circle' : 'none',
    symbolSize: config.pointSize || 6,
    lineStyle: config.lineWidth ? { width: config.lineWidth } : undefined,
    itemStyle: {
      color: config.colors?.[0] || config.color || undefined
    }
  }];

  console.log('Generated Series Data:', {
    seriesData: seriesData.slice(0, 5),
    xField: xAxisConfig.field,
    yField: yAxisConfig.field,
    chartType
  });

  return series;
}

/**
 * Convert chart type to ECharts series type
 */
function getEChartsSeriesType(chartType: string): string {
  switch (chartType.toLowerCase()) {
    case 'bar':
    case 'column':
      return 'bar';
    case 'line':
    case 'spline':
      return 'line';
    case 'area':
      return 'line';
    case 'pie':
      return 'pie';
    case 'donut':
      return 'pie';
    case 'scatter':
    case 'bubble':
      return 'scatter';
    default:
      return 'line';
  }
}

/**
 * Get legend position for ECharts
 */
function getLegendPosition(position?: string): string {
  switch (position) {
    case 'top': return 'center';
    case 'bottom': return 'center';
    case 'left': return 'left';
    case 'right': return 'right';
    default: return 'center';
  }
}

/**
 * Create empty chart options for error cases
 */
function createEmptyChartOptions(): EChartsOption {
  return {
    title: {
      text: 'No Data Available',
      left: 'center',
      top: 'middle',
      textStyle: {
        color: '#999',
        fontSize: 14
      }
    },
    xAxis: {
      type: 'category',
      data: []
    },
    yAxis: {
      type: 'value'
    },
    series: []
  };
}

export default EChartsRenderer;