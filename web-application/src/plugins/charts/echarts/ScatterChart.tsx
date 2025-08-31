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
      };
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

      if (categories) {
        // Group by category
        const categoryGroups: { [key: string]: any[] } = {};
        
        chartData.forEach((item, index) => {
          const category = categories[index];
          if (!categoryGroups[category]) {
            categoryGroups[category] = [];
          }
          
          const point = [xValues[index], yValues[index]];
          if (sizeValues) {
            point.push(sizeValues[index]);
          }
          categoryGroups[category].push(point);
        });

        // Generate colors for categories
        const categoryColors = chartConfig.colors.length > 0 
          ? chartConfig.colors 
          : generateColorPalette(Object.keys(categoryGroups).length);

        // Create series for each category
        series = Object.keys(categoryGroups).map((category, index) => ({
          name: category,
          type: 'scatter',
          data: categoryGroups[category],
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
        legend: categories ? {
          data: Object.keys(categories.reduce((acc: any, cat: any) => {
            acc[cat] = true;
            return acc;
          }, {})),
          top: '10%',
          type: 'scroll'
        } : undefined,
        xAxis: {
          type: 'value',
          name: chartConfig.xAxisLabel || chartConfig.xAxisField,
          nameLocation: 'middle',
          nameGap: 30,
          splitLine: {
            show: chartConfig.showGrid,
            lineStyle: {
              type: 'dashed',
              opacity: 0.3
            }
          },
          axisLabel: {
            formatter: (value: number) => {
              if (Math.abs(value) >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (Math.abs(value) >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
          }
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yAxisLabel || chartConfig.yAxisField,
          nameLocation: 'middle',
          nameGap: 50,
          splitLine: {
            show: chartConfig.showGrid,
            lineStyle: {
              type: 'dashed',
              opacity: 0.3
            }
          },
          axisLabel: {
            formatter: (value: number) => {
              if (Math.abs(value) >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (Math.abs(value) >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
          }
        },
        series,
        grid: {
          left: '15%',
          right: '10%',
          bottom: '15%',
          top: categories ? '25%' : '15%',
          containLabel: true
        },
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      };
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
export const EChartsScatterChartConfig = {
  name: 'echarts-scatter',
  displayName: 'ECharts Scatter Plot',
  category: 'statistical',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive scatter plot with support for multiple categories and bubble sizes',
  tags: ['scatter', 'correlation', 'bubble', 'statistical'],
  
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
        description: 'Optional field for bubble sizes'
      },
      categoryField: {
        type: 'string',
        title: 'Category Field',
        description: 'Optional field for grouping data by category'
      },
      xAxisLabel: {
        type: 'string',
        title: 'X-Axis Label'
      },
      yAxisLabel: {
        type: 'string',
        title: 'Y-Axis Label'
      },
      symbolSize: {
        type: 'number',
        title: 'Point Size',
        default: 20,
        minimum: 5,
        maximum: 100
      },
      showGrid: {
        type: 'boolean',
        title: 'Show Grid Lines',
        default: true
      },
      symbol: {
        type: 'select',
        title: 'Point Symbol',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Rectangle', value: 'rect' },
          { label: 'Diamond', value: 'diamond' },
          { label: 'Triangle', value: 'triangle' }
        ],
        default: 'circle'
      }
    },
    required: ['xAxisField', 'yAxisField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['x', 'y'],
    optionalFields: ['size', 'category'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: ScatterChart
};

export default ScatterChart;