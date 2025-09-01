// File: /web-application/src/plugins/charts/echarts/ScatterChart.tsx

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  extractFieldValues, 
  extractNumericValues, 
  createChartConfig,
  generateColorPalette 
} from '../utils/chartDataUtils';

export interface ScatterChartConfig {
  title?: string;
  xAxisField: string;
  yAxisField: string;
  sizeField?: string;
  categoryField?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  symbolSize?: number | [number, number];
  showGrid?: boolean;
  colors?: string[];
  symbol?: 'circle' | 'rect' | 'diamond' | 'triangle';
}

export const ScatterChart: React.FC<ChartProps> = ({
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
      } as echarts.EChartsOption;
    }

    // Normalize data to array format
    const chartData = normalizeChartData(data);
    
    // Create safe configuration with defaults
    const chartConfig = createChartConfig(config, {
      xAxisField: 'x',
      yAxisField: 'y',
      title: 'Scatter Plot',
      symbolSize: 20,
      showGrid: true,
      colors: [],
      symbol: 'circle'
    }) as ScatterChartConfig;

    // Ensure colors is always an array
    if (!chartConfig.colors) {
      chartConfig.colors = [];
    }

    try {
      // Extract data fields
      const xValues = extractNumericValues(chartData, chartConfig.xAxisField, 0);
      const yValues = extractNumericValues(chartData, chartConfig.yAxisField, 0);
      const sizeValues = chartConfig.sizeField 
        ? extractNumericValues(chartData, chartConfig.sizeField, chartConfig.symbolSize as number)
        : null;
      const categories = chartConfig.categoryField 
        ? extractFieldValues(chartData, chartConfig.categoryField, 'Default')
        : null;

      // Prepare scatter data
      let scatterData: any[];
      let series: any[];
      let categoryGroups: { [key: string]: any[] } | null = null;

      if (categories) {
        // Group by category
        categoryGroups = {};
        
        chartData.forEach((item, index) => {
          const category = categories[index];
          if (!categoryGroups![category]) {
            categoryGroups![category] = [];
          }
          
          const point = [xValues[index], yValues[index]];
          if (sizeValues) {
            point.push(sizeValues[index]);
          }
          categoryGroups![category].push(point);
        });

        // Generate colors for categories - Fixed type safety
        const categoryColors = chartConfig.colors.length > 0 
          ? chartConfig.colors 
          : generateColorPalette(Object.keys(categoryGroups).length);

        // Create series for each category
        series = Object.keys(categoryGroups).map((category, index) => ({
          name: category,
          type: 'scatter',
          data: categoryGroups![category],
          symbolSize: (data: any[]) => {
            if (sizeValues && data.length > 2) {
              return Math.sqrt(data[2]) * 2; // Scale size values
            }
            return chartConfig.symbolSize as number;
          },
          itemStyle: {
            color: categoryColors[index % categoryColors.length],
            opacity: 0.8
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)'
            }
          }
        }));
      } else {
        // Single series
        scatterData = chartData.map((item, index) => {
          const point = [xValues[index], yValues[index]];
          if (sizeValues) {
            point.push(sizeValues[index]);
          }
          return point;
        });

        // Fixed type safety for single series color
        const seriesColor = chartConfig.colors.length > 0 ? chartConfig.colors[0] : '#5470c6';

        series = [{
          name: chartConfig.title || 'Data',
          type: 'scatter',
          data: scatterData,
          symbolSize: (data: any[]) => {
            if (sizeValues && data.length > 2) {
              return Math.sqrt(data[2]) * 2;
            }
            return chartConfig.symbolSize as number;
          },
          itemStyle: {
            color: seriesColor,
            opacity: 0.8
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)'
            }
          }
        }];
      }

      const option: echarts.EChartsOption = {
        title: {
          text: chartConfig.title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
          axisPointer: {
            type: 'cross'
          },
          formatter: (params: any) => {
            const data = params.data;
            let result = `${params.seriesName}<br/>`;
            result += `${chartConfig.xAxisField}: ${data[0]}<br/>`;
            result += `${chartConfig.yAxisField}: ${data[1]}`;
            if (data.length > 2 && chartConfig.sizeField) {
              result += `<br/>${chartConfig.sizeField}: ${data[2]}`;
            }
            return result;
          }
        },
        legend: categoryGroups ? {
          show: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          data: Object.keys(categoryGroups)
        } : undefined,
        xAxis: {
          type: 'value',
          name: chartConfig.xAxisLabel || chartConfig.xAxisField,
          nameLocation: 'middle',
          nameGap: 30,
          splitLine: {
            show: chartConfig.showGrid
          }
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yAxisLabel || chartConfig.yAxisField,
          nameLocation: 'middle',
          nameGap: 40,
          splitLine: {
            show: chartConfig.showGrid
          }
        },
        series: series,
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut' as any // Type assertion to fix the animation easing type error
      };

      return option;
    } catch (error) {
      console.error('Error processing scatter chart data:', error);
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
      } as echarts.EChartsOption;
    }
  }, [data, config, onError]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Set options - Fixed type assertion for the entire options object
    chartInstance.current.setOption(options, true);

    // Add click handler
    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex
      });
    };

    chartInstance.current.on('click', handleClick);
    chartInstance.current.on('mouseover', handleMouseover);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('mouseover', handleMouseover);
    };
  }, [options, onInteraction]);

  // Cleanup on unmount
  useEffect(() => {
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


export default ScatterChart;

// Chart Plugin Configuration Export
export const EChartsScatterChartConfig = {
  name: 'echarts-scatter',
  displayName: 'ECharts Scatter Plot',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive scatter plot for exploring relationships between variables',
  tags: ['scatter', 'bubble', 'correlation', 'relationship', 'basic'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Scatter Plot'
      },
      xAxisField: {
        type: 'string',
        title: 'X-Axis Field',
        description: 'Field name for x-axis values',
        default: 'x'
      },
      yAxisField: {
        type: 'string',
        title: 'Y-Axis Field',
        description: 'Field name for y-axis values',
        default: 'y'
      },
      sizeField: {
        type: 'string',
        title: 'Size Field',
        description: 'Field name for bubble sizes (optional)'
      },
      categoryField: {
        type: 'string',
        title: 'Category Field',
        description: 'Field for grouping data points into series'
      },
      xAxisLabel: {
        type: 'string',
        title: 'X-Axis Label'
      },
      yAxisLabel: {
        type: 'string',
        title: 'Y-Axis Label'
      },
      pointSize: {
        type: 'number',
        title: 'Default Point Size',
        default: 8,
        minimum: 2,
        maximum: 50
      },
      minPointSize: {
        type: 'number',
        title: 'Minimum Point Size',
        description: 'Minimum size when using size field',
        default: 4,
        minimum: 1,
        maximum: 20
      },
      maxPointSize: {
        type: 'number',
        title: 'Maximum Point Size',
        description: 'Maximum size when using size field',
        default: 30,
        minimum: 10,
        maximum: 100
      },
      pointSymbol: {
        type: 'select',
        title: 'Point Symbol',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Rectangle', value: 'rect' },
          { label: 'Round Rectangle', value: 'roundRect' },
          { label: 'Triangle', value: 'triangle' },
          { label: 'Diamond', value: 'diamond' },
          { label: 'Pin', value: 'pin' },
          { label: 'Arrow', value: 'arrow' }
        ],
        default: 'circle'
      },
      showTrendLine: {
        type: 'boolean',
        title: 'Show Trend Line',
        default: false
      },
      trendLineType: {
        type: 'select',
        title: 'Trend Line Type',
        options: [
          { label: 'Linear', value: 'linear' },
          { label: 'Polynomial', value: 'polynomial' },
          { label: 'Logarithmic', value: 'logarithmic' },
          { label: 'Exponential', value: 'exponential' }
        ],
        default: 'linear'
      },
      showGrid: {
        type: 'boolean',
        title: 'Show Grid',
        default: true
      },
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      },
      enableBrush: {
        type: 'boolean',
        title: 'Enable Brush Selection',
        description: 'Allow selecting data points by brushing',
        default: false
      },
      enableZoom: {
        type: 'boolean',
        title: 'Enable Zoom',
        default: true
      },
      colors: {
        type: 'array',
        title: 'Color Scheme',
        items: {
          type: 'color',
          title: 'Color'
        },
        default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
      },
      animation: {
        type: 'boolean',
        title: 'Enable Animation',
        default: true
      }
    },
    required: ['xAxisField', 'yAxisField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['x', 'y'],
    optionalFields: ['size', 'category'],
    supportedTypes: ['number', 'string', 'date'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: ScatterChart
};