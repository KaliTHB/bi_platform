'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { ChartPluginConfig } from '../interfaces';

// Extended ChartProps with additional event handlers
interface ExtendedChartProps extends ChartProps {
  onDataPointClick?: (data: any, event?: any) => void;
  onDataPointHover?: (data: any, event?: any) => void;
  onChartReady?: (chartInstance: echarts.ECharts) => void;
}

// Valid easing options according to ECharts
const VALID_EASING_OPTIONS = [
  'cubicOut', 'cubicIn', 'cubicInOut', 'quadraticIn', 'quadraticOut', 
  'quadraticInOut', 'linear', 'bounceOut', 'elasticOut', 'sinusoidalOut',
  'exponentialOut', 'circularOut', 'elasticIn', 'backOut'
] as const;

type ValidEasing = typeof VALID_EASING_OPTIONS[number];

interface LineChartConfig {
  title?: string;
  xAxisField: string;
  yAxisFields: string[];
  colors?: string[];
  smooth?: boolean;
  showPoints?: boolean;
  fillArea?: boolean;
  animation?: {
    enabled?: boolean;
    easing?: string;
    duration?: number;
  };
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  grid?: {
    show?: boolean;
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
  };
  theme?: {
    titleColor?: string;
    backgroundColor?: string;
  };
  tooltip?: {
    show?: boolean;
    trigger?: 'axis' | 'item';
  };
}

interface LineChartData {
  [key: string]: string | number;
}

export const LineChart: React.FC<ExtendedChartProps> = ({
  data,
  config,
  dimensions,
  width = 800,
  height = 400,
  onInteraction,
  onError,
  isLoading,
  error: externalError,
  onDataPointClick,
  onDataPointHover,
  onChartReady,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Use dimensions if available, otherwise fallback to individual width/height
  const chartWidth = dimensions?.width || width;
  const chartHeight = dimensions?.height || height;
  
  // Combine external error with internal error
  const currentError = externalError || internalError;

  // Type-safe config with proper defaults (memoized to avoid re-processing)
  const safeConfig = React.useMemo(() => {
    const chartConfig = (config as LineChartConfig) || {};
    
    return {
      xAxisField: chartConfig.xAxisField || '',
      yAxisFields: chartConfig.yAxisFields || [],
      colors: chartConfig.colors || [],
      smooth: chartConfig.smooth ?? false,
      showPoints: chartConfig.showPoints ?? true,
      fillArea: chartConfig.fillArea ?? false,
      title: chartConfig.title,
      animation: {
        enabled: chartConfig.animation?.enabled ?? true,
        duration: chartConfig.animation?.duration ?? 1000,
        easing: chartConfig.animation?.easing ?? 'cubicOut',
      },
      legend: {
        show: chartConfig.legend?.show ?? true,
        position: chartConfig.legend?.position ?? 'top',
      },
      grid: {
        show: chartConfig.grid?.show ?? true,
        left: chartConfig.grid?.left ?? '10%',
        right: chartConfig.grid?.right ?? '10%',
        top: chartConfig.grid?.top ?? '15%',
        bottom: chartConfig.grid?.bottom ?? '15%',
      },
      tooltip: {
        show: chartConfig.tooltip?.show ?? true,
        trigger: chartConfig.tooltip?.trigger ?? 'axis',
      },
      theme: {
        titleColor: chartConfig.theme?.titleColor ?? '#333',
        backgroundColor: chartConfig.theme?.backgroundColor,
      },
    };
  }, [config]);

  // Generate default color palette
  const generateColorPalette = (count: number): string[] => {
    const defaultColors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', 
      '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#d87a80'
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(defaultColors[i % defaultColors.length]);
    }
    return colors;
  };

  // Get valid easing value
  const getValidEasing = (easing?: string): string => {
    if (easing && VALID_EASING_OPTIONS.includes(easing as ValidEasing)) {
      return easing;
    }
    return 'cubicOut'; // Default fallback
  };

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) {
      return; // Early return with no cleanup needed
    }

    setInternalError(null);

    try {
      // Initialize chart instance
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      chartInstance.current = echarts.init(chartRef.current);

      // Prepare data
      const processedData = data as LineChartData[];
      
      // Validate required fields
      if (!safeConfig.xAxisField || !safeConfig.yAxisFields?.length) {
        throw new Error('xAxisField and yAxisFields are required');
      }

      // Extract x-axis data
      const xAxisData = processedData.map(item => item[safeConfig.xAxisField]);

      // Fix for colors being possibly undefined
      const seriesColors = safeConfig.colors.length > 0
        ? safeConfig.colors 
        : generateColorPalette(safeConfig.yAxisFields.length);

      // Create series data
      const series = safeConfig.yAxisFields.map((field, index) => ({
        name: field,
        type: 'line' as const,
        data: processedData.map(item => item[field]),
        smooth: safeConfig.smooth,
        showSymbol: safeConfig.showPoints,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          color: seriesColors[index % seriesColors.length],
          width: 2,
        },
        itemStyle: {
          color: seriesColors[index % seriesColors.length],
        },
        areaStyle: safeConfig.fillArea ? {
          opacity: 0.3,
          color: seriesColors[index % seriesColors.length],
        } : undefined,
      }));

      // Chart configuration
      const options: EChartsOption = {
        title: safeConfig.title ? {
          text: safeConfig.title,
          left: 'center',
          top: '20px',
          textStyle: {
            color: safeConfig.theme.titleColor,
            fontSize: 16,
            fontWeight: 'bold',
          },
        } : undefined,
        tooltip: {
          trigger: safeConfig.tooltip.trigger,
          axisPointer: {
            type: 'cross',
          },
          backgroundColor: 'rgba(50, 50, 50, 0.8)',
          borderColor: '#777',
          textStyle: {
            color: '#fff',
          },
        },
        legend: safeConfig.legend.show ? {
          data: safeConfig.yAxisFields,
          top: safeConfig.legend.position === 'top' ? '10%' : 'auto',
          bottom: safeConfig.legend.position === 'bottom' ? '10%' : 'auto',
          left: safeConfig.legend.position === 'left' ? '10%' : 'center',
          right: safeConfig.legend.position === 'right' ? '10%' : 'auto',
        } : undefined,
        grid: {
          show: safeConfig.grid.show,
          left: safeConfig.grid.left,
          right: safeConfig.grid.right,
          top: safeConfig.grid.top,
          bottom: safeConfig.grid.bottom,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          boundaryGap: false,
          axisLine: {
            lineStyle: {
              color: '#ccc',
            },
          },
          axisLabel: {
            color: '#666',
          },
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: '#ccc',
            },
          },
          axisLabel: {
            color: '#666',
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0',
              type: 'dashed',
            },
          },
        },
        series,
        animation: safeConfig.animation.enabled,
        animationDuration: safeConfig.animation.duration,
        animationEasing: getValidEasing(safeConfig.animation.easing),
      };

      // Set options
      chartInstance.current.setOption(options, true);

      // Add event listeners - support both specific and generic handlers
      chartInstance.current.on('click', (params: any) => {
        const dataPoint = processedData[params.dataIndex];
        
        // Call specific handler if provided
        if (onDataPointClick) {
          onDataPointClick(dataPoint, params.event?.event);
        }
        
        // Also call generic interaction handler for backward compatibility
        if (onInteraction) {
          onInteraction({
            type: 'click',
            data: dataPoint,
            dataIndex: params.dataIndex,
            seriesIndex: params.seriesIndex,
          });
        }
      });

      chartInstance.current.on('mouseover', (params: any) => {
        const dataPoint = processedData[params.dataIndex];
        
        // Call specific handler if provided
        if (onDataPointHover) {
          onDataPointHover(dataPoint, params.event?.event);
        }
        
        // Also call generic interaction handler for backward compatibility
        if (onInteraction) {
          onInteraction({
            type: 'hover',
            data: dataPoint,
            dataIndex: params.dataIndex,
            seriesIndex: params.seriesIndex,
          });
        }
      });

      // Call onChartReady if provided
      if (onChartReady) {
        onChartReady(chartInstance.current);
      }

      // Handle resize
      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
      };

    } catch (err) {
      console.error('LineChart render error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to render chart';
      setInternalError(errorMessage);
      
      // Call onError if provided
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      
      // Return empty cleanup function for consistency
      return () => {
        // No cleanup needed in error case
      };
    }
  }, [data, safeConfig, chartWidth, chartHeight, onInteraction, onError, onDataPointClick, onDataPointHover, onChartReady]);

  // Handle resize when dimensions change
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  }, [chartWidth, chartHeight]);

  if (currentError) {
    return (
      <div 
        className="flex items-center justify-center h-full text-red-500 bg-red-50 border border-red-200 rounded"
        style={{ width: chartWidth, height: chartHeight }}
      >
        <div className="text-center">
          <div className="text-lg font-semibold">Chart Error</div>
          <div className="text-sm mt-1">{currentError}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded"
        style={{ width: chartWidth, height: chartHeight }}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Loading chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={chartRef} 
      className="echarts-container"
      style={{ width: chartWidth, height: chartHeight }}
    />
  );
};

// Chart plugin configuration
export const EChartsLineChartConfig: ChartPluginConfig = {
  name: 'echarts-line',
  displayName: 'Line Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'A line chart for visualizing trends and changes over time',
  icon: '📈',
  configSchema: {
    type: 'object',
    properties: {
      xAxisField: { 
        type: 'string', 
        required: true, 
        title: 'X-Axis Field',
        description: 'Field to use for X-axis data'
      },
      yAxisFields: { 
        type: 'string', // Note: this should be array but keeping string for compatibility
        required: true, 
        title: 'Y-Axis Fields',
        description: 'Fields to use for Y-axis data (multiple series supported)'
      },
      title: { 
        type: 'string', 
        title: 'Chart Title',
        description: 'Title to display at the top of the chart'
      },
      smooth: { 
        type: 'boolean', 
        title: 'Smooth Lines', 
        default: false,
        description: 'Use smooth curves instead of straight lines'
      },
      showPoints: { 
        type: 'boolean', 
        title: 'Show Data Points', 
        default: true,
        description: 'Display data points on the line'
      },
      fillArea: { 
        type: 'boolean', 
        title: 'Fill Area', 
        default: false,
        description: 'Fill the area under the line'
      },
      colors: {
        type: 'string', // Note: this should be array but keeping string for compatibility
        title: 'Custom Colors',
        description: 'Custom color palette for the series'
      }
    },
    required: ['xAxisField', 'yAxisFields']
  },
  dataRequirements: {
    minColumns: 2,
    maxColumns: 20,
    requiredColumnTypes: ['string', 'number'],
    supportsFiltering: true,
  },
  exportFormats: ['png', 'svg', 'pdf'],
  component: LineChart as React.ComponentType<ChartProps>, // Type assertion for compatibility
  tags: ['basic', 'trend', 'time-series', 'continuous'],
  difficulty: 'beginner',
};

export default LineChart;