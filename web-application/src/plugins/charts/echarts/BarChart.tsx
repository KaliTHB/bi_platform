// File: /web-application/src/plugins/charts/echarts/BarChart.tsx

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  extractFieldValues, 
  extractNumericValues, 
  createChartConfig 
} from '../utils/chartDataUtils';

export interface BarChartConfig {
  title?: string;
  xAxisField: string;
  yAxisField: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesName?: string;
  color?: string;
  showValues?: boolean;
  rotateLabels?: number;
  horizontal?: boolean;
}

export const BarChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  const options = useMemo(() => {
    // Check if data is empty using utility function
    if (isChartDataEmpty(data)) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      };
    }

    // Normalize data to array format
    const chartData = normalizeChartData(data);
    
    // Create safe configuration with defaults
    const chartConfig = createChartConfig(config, {
      xAxisField: 'name',
      yAxisField: 'value',
      title: 'Bar Chart',
      color: '#5470c6',
      showValues: false,
      rotateLabels: 0,
      horizontal: false
    }) as BarChartConfig;

    try {
      // Extract data using utility functions
      const categories = extractFieldValues(chartData, chartConfig.xAxisField, 'Unknown');
      const values = extractNumericValues(chartData, chartConfig.yAxisField, 0);

      // Determine chart orientation
      const isHorizontal = chartConfig.horizontal;

      return {
        title: {
          text: chartConfig.title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params: any) => {
            const param = Array.isArray(params) ? params[0] : params;
            return `${param.axisValueLabel}<br/>${param.seriesName}: ${param.value}`;
          }
        },
        xAxis: {
          type: isHorizontal ? 'value' : 'category',
          data: isHorizontal ? undefined : categories,
          name: isHorizontal ? chartConfig.yAxisLabel : chartConfig.xAxisLabel,
          axisLabel: {
            rotate: isHorizontal ? 0 : chartConfig.rotateLabels,
            interval: 0 // Show all labels
          }
        },
        yAxis: {
          type: isHorizontal ? 'category' : 'value',
          data: isHorizontal ? categories : undefined,
          name: isHorizontal ? chartConfig.xAxisLabel : chartConfig.yAxisLabel,
          axisLabel: {
            formatter: (value: any) => {
              // Format large numbers
              if (typeof value === 'number' && value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            }
          }
        },
        series: [
          {
            name: chartConfig.seriesName || chartConfig.yAxisField,
            type: 'bar',
            data: values,
            itemStyle: {
              color: chartConfig.color,
              borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
            },
            label: {
              show: chartConfig.showValues,
              position: isHorizontal ? 'right' : 'top',
              formatter: '{c}'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.3)'
              }
            }
          }
        ],
        grid: {
          left: '15%',
          right: '10%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        animation: true,
        animationDuration: 1000
      };
    } catch (error) {
      console.error('Error processing bar chart data:', error);
      onError?.(error as Error);
      return {
        title: {
          text: 'Error Loading Chart',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#ff4444',
            fontSize: 16
          }
        }
      };
    }
  }, [data, config, onError]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Set options
    chartInstance.current.setOption(options, true);

    // Add click handler
    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        event: params.event
      });
    };

    chartInstance.current.on('click', handleClick);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      chartInstance.current?.off('click', handleClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [options, onInteraction]);

  useEffect(() => {
    // Resize chart when dimensions change
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  }, [width, height]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }} 
    />
  );
};

// Chart Plugin Configuration Export
export const EChartsBarChartConfig = {
  name: 'echarts-bar',
  displayName: 'ECharts Bar Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive bar chart with customizable styling and animations',
  tags: ['bar', 'categorical', 'comparison', 'basic'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Bar Chart'
      },
      xAxisField: {
        type: 'string',
        title: 'X-Axis Field',
        description: 'Field name for categories (x-axis)',
        default: 'name'
      },
      yAxisField: {
        type: 'string',
        title: 'Y-Axis Field',
        description: 'Field name for values (y-axis)',
        default: 'value'
      },
      xAxisLabel: {
        type: 'string',
        title: 'X-Axis Label',
        description: 'Label for the x-axis'
      },
      yAxisLabel: {
        type: 'string',
        title: 'Y-Axis Label',
        description: 'Label for the y-axis'
      },
      color: {
        type: 'color',
        title: 'Bar Color',
        default: '#5470c6'
      },
      showValues: {
        type: 'boolean',
        title: 'Show Values on Bars',
        default: false
      },
      rotateLabels: {
        type: 'number',
        title: 'Rotate X-Axis Labels (degrees)',
        default: 0,
        minimum: -90,
        maximum: 90
      },
      horizontal: {
        type: 'boolean',
        title: 'Horizontal Orientation',
        description: 'Display bars horizontally instead of vertically',
        default: false
      }
    },
    required: ['xAxisField', 'yAxisField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['name', 'value'],
    optionalFields: [],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: BarChart
};

export default BarChart;