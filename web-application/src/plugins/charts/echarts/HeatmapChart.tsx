// File: /web-application/src/plugins/charts/echarts/HeatmapChart.tsx

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

export interface HeatmapChartConfig {
  title?: string;
  xAxisField: string;
  yAxisField: string;
  valueField: string;
  colorScale?: 'blues' | 'reds' | 'greens' | 'viridis' | 'plasma';
  showValues?: boolean;
  cellBorderRadius?: number;
}

export const HeatmapChart: React.FC<ChartProps> = ({
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
      xAxisField: 'x',
      yAxisField: 'y',
      valueField: 'value',
      title: 'Heatmap',
      colorScale: 'blues',
      showValues: false,
      cellBorderRadius: 0
    }) as HeatmapChartConfig;

    try {
      // Extract unique values for axes
      const xValues = extractFieldValues(chartData, chartConfig.xAxisField, '');
      const yValues = extractFieldValues(chartData, chartConfig.yAxisField, '');
      const values = extractNumericValues(chartData, chartConfig.valueField, 0);

      // Get unique categories
      const xCategories = [...new Set(xValues)].sort();
      const yCategories = [...new Set(yValues)].sort();

      // Prepare heatmap data
      const heatmapData = chartData.map((item, index) => [
        xCategories.indexOf(xValues[index]),
        yCategories.indexOf(yValues[index]),
        values[index] || 0
      ]);

      // Define color schemes
      const colorSchemes = {
        blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
        reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
        greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
        viridis: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
        plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921']
      };

      const selectedColors = colorSchemes[chartConfig.colorScale ?? 'blues'] ?? colorSchemes.blues;

      // Calculate min and max values for color mapping
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

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
          position: 'top',
          formatter: (params: any) => {
            const data = params.data;
            return `${chartConfig.xAxisField}: ${xCategories[data[0]]}<br/>` +
                   `${chartConfig.yAxisField}: ${yCategories[data[1]]}<br/>` +
                   `${chartConfig.valueField}: ${data[2]}`;
          }
        },
        grid: {
          height: '50%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: xCategories,
          splitArea: {
            show: true
          },
          axisLabel: {
            rotate: xCategories.some(cat => String(cat).length > 8) ? 45 : 0
          }
        },
        yAxis: {
          type: 'category',
          data: yCategories,
          splitArea: {
            show: true
          }
        },
        visualMap: {
          min: minValue,
          max: maxValue,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '15%',
          inRange: {
            color: selectedColors
          },
          text: ['High', 'Low'],
          textStyle: {
            color: '#333'
          }
        },
        series: [{
          name: chartConfig.valueField,
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: chartConfig.showValues,
            formatter: '{c}',
            color: '#000',
            fontSize: 12
          },
          itemStyle: {
            borderRadius: chartConfig.cellBorderRadius,
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#333',
              borderWidth: 2
            }
          }
        }],
        animation: true,
        animationDuration: 1000
      };
    } catch (error) {
      console.error('Error processing heatmap chart data:', error);
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
export const EChartsHeatmapChartConfig = {
  name: 'echarts-heatmap',
  displayName: 'ECharts Heatmap',
  category: 'statistical',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive heatmap visualization for correlation and density analysis',
  tags: ['heatmap', 'correlation', 'density', 'statistical'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Heatmap'
      },
      xAxisField: {
        type: 'string',
        title: 'X-Axis Field',
        description: 'Field name for x-axis categories',
        default: 'x'
      },
      yAxisField: {
        type: 'string',
        title: 'Y-Axis Field',
        description: 'Field name for y-axis categories',
        default: 'y'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for heatmap values',
        default: 'value'
      },
      colorScale: {
        type: 'select',
        title: 'Color Scale',
        options: [
          { label: 'Blues', value: 'blues' },
          { label: 'Reds', value: 'reds' },
          { label: 'Greens', value: 'greens' },
          { label: 'Viridis', value: 'viridis' },
          { label: 'Plasma', value: 'plasma' }
        ],
        default: 'blues'
      },
      showValues: {
        type: 'boolean',
        title: 'Show Cell Values',
        description: 'Display values inside heatmap cells',
        default: false
      },
      cellBorderRadius: {
        type: 'number',
        title: 'Cell Border Radius',
        default: 0,
        minimum: 0,
        maximum: 10
      }
    },
    required: ['xAxisField', 'yAxisField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: 10,
    requiredFields: ['x', 'y', 'value'],
    optionalFields: [],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: true
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: HeatmapChart
};

export default HeatmapChart;