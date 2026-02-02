// File: src/plugins/charts/echarts/ParallelChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface ParallelChartConfig {
  dimensions: Array<{
    name: string;
    field: string;
    type?: 'value' | 'category';
    min?: number;
    max?: number;
    categories?: string[];
  }>;
  colorField?: string;
  title?: string;
  smooth?: boolean;
  opacity?: number;
}

interface ParallelChartProps extends ChartProps {
  chartId?: string;
}

export const ParallelChart: React.FC<ParallelChartProps> = ({
  chartId,
  data,
  config,
  width = 600,
  height = 400,
  onInteraction,
  onError
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  const options = useMemo(() => {
    if (!hasDataContent(data)) {
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

    try {
      const chartConfig = config as ParallelChartConfig;
      const dataArray = getDataArray(data);
      
      if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
        throw new Error('Parallel chart requires dimensions configuration');
      }

      // Prepare parallel axis configuration
      const parallelAxis = chartConfig.dimensions.map((dim, index) => {
        const axisConfig: any = {
          dim: index,
          name: dim.name,
          type: dim.type || 'value',
          nameLocation: 'top'
        };

        if (dim.type === 'category') {
          if (dim.categories) {
            axisConfig.data = dim.categories;
          } else {
            // Extract unique categories from data
            const categories = Array.from(new Set(dataArray.map(item => item[dim.field])));
            axisConfig.data = categories;
          }
        } else {
          // For value type, calculate min/max
          const values = dataArray.map(item => parseFloat(item[dim.field]) || 0);
          axisConfig.min = dim.min !== undefined ? dim.min : Math.min(...values);
          axisConfig.max = dim.max !== undefined ? dim.max : Math.max(...values);
        }

        return axisConfig;
      });

      // Prepare data for parallel coordinates
      const parallelData = dataArray.map(item => {
        return chartConfig.dimensions.map(dim => {
          if (dim.type === 'category') {
            return item[dim.field];
          } else {
            return parseFloat(item[dim.field]) || 0;
          }
        });
      });

      // Color mapping if colorField is specified
      let visualMap;
      if (chartConfig.colorField) {
        const colorValues = dataArray.map(item => parseFloat(item[chartConfig.colorField!]) || 0);
        const minColorValue = Math.min(...colorValues);
        const maxColorValue = Math.max(...colorValues);
        
        visualMap = {
          show: true,
          min: minColorValue,
          max: maxColorValue,
          dimension: chartConfig.dimensions.findIndex(d => d.field === chartConfig.colorField),
          inRange: {
            color: ['#50a3ba', '#eac736', '#d94e5d']
          }
        };
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
          formatter: (params: any) => {
            const values = params.data;
            let result = '';
            chartConfig.dimensions.forEach((dim, index) => {
              result += `${dim.name}: ${values[index]}<br/>`;
            });
            return result;
          }
        },
        parallelAxis,
        visualMap,
        parallel: {
          left: '5%',
          right: '13%',
          bottom: '10%',
          top: '20%',
          parallelAxisDefault: {
            type: 'value',
            nameLocation: 'top',
            nameGap: 20,
            nameTextStyle: {
              fontSize: 12,
              fontWeight: 'bold'
            },
            axisLine: {
              lineStyle: {
                color: '#aaa'
              }
            },
            axisTick: {
              lineStyle: {
                color: '#777'
              }
            },
            splitLine: {
              show: false
            },
            axisLabel: {
              color: '#333'
            }
          }
        },
        series: [
          {
            name: chartConfig.title || 'Parallel',
            type: 'parallel',
            data: parallelData,
            lineStyle: {
              width: 2,
              opacity: chartConfig.opacity || 0.45
            },
            smooth: chartConfig.smooth || false,
            emphasis: {
              lineStyle: {
                width: 4,
                opacity: 0.9
              }
            },
            progressive: 500,
            animation: false
          }
        ]
      };
    } catch (error) {
      console.error('Error processing parallel chart data:', error);
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(options, true);

    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        chartId: chartId || 'echarts-parallel-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-parallel-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    chartInstance.current.on('click', handleClick);
    chartInstance.current.on('mouseover', handleMouseover);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('mouseover', handleMouseover);
      window.removeEventListener('resize', handleResize);
    };
  }, [chartId, options, onInteraction]);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  }, [width, height]);

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


export const EChartsParallelChartConfig: ChartPluginConfig = {
  name: 'echarts-parallel',
  displayName: 'ECharts Parallel Coordinates',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Multi-dimensional data analysis with parallel coordinates',
  tags: ['parallel', 'coordinates', 'multidimensional', 'analysis'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Parallel Coordinates'
      },
      dimensions: {
        type: 'array',
        title: 'Dimensions',
        description: 'List of dimension fields',
        items: {
          type: 'string',
          title: 'Dimension Field'
        },
        minItems: 2
      },
      colorField: {
        type: 'string',
        title: 'Color Field',
        description: 'Field for line coloring'
      },
      brushing: {
        type: 'boolean',
        title: 'Enable Brushing',
        description: 'Allow filtering by brushing axes',
        default: true
      }
    },
    required: ['dimensions']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 20,
    requiredFields: ['dim1', 'dim2'],
    optionalFields: ['color', 'category'],
    supportedTypes: ['number', 'string'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: ParallelChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: true,
    drilldown: false,
    tooltip: true,
    crossFilter: true
  }
};