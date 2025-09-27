// File: src/plugins/charts/echarts/BarChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps,ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface BarChartConfig {
  xAxisField: string;
  yAxisField: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesName?: string;
  color?: string;
  isHorizontal?: boolean;
  showValues?: boolean;
  rotateLabels?: number;
}

interface BarChartProps extends ChartProps {
  chartId?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  chartId,
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
      const chartConfig = config as BarChartConfig;
      const dataArray = getDataArray(data);
      
      const categories = dataArray.map(item => item[chartConfig.xAxisField]);
      const values = dataArray.map(item => parseFloat(item[chartConfig.yAxisField]) || 0);
      const isHorizontal = chartConfig.isHorizontal || false;

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
          }
        },
        xAxis: {
          type: isHorizontal ? 'value' : 'category',
          data: isHorizontal ? undefined : categories,
          name: isHorizontal ? chartConfig.yAxisLabel : chartConfig.xAxisLabel,
          axisLabel: {
            rotate: isHorizontal ? 0 : chartConfig.rotateLabels || 0,
            interval: 0
          }
        },
        yAxis: {
          type: isHorizontal ? 'category' : 'value',
          data: isHorizontal ? categories : undefined,
          name: isHorizontal ? chartConfig.xAxisLabel : chartConfig.yAxisLabel,
          axisLabel: {
            formatter: (value: any) => {
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
              color: chartConfig.color || '#5470c6',
              borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
            },
            label: {
              show: chartConfig.showValues || false,
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(options, true);

    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        chartId: chartId || 'echarts-bar-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-bar-chart',
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

export const EChartsBarChartConfig: ChartPluginConfig = {
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
      xField: {
        type: 'select',
        title: 'X-Axis Field',
        description: 'Field name for categories (x-axis)',
        required: true
      },
      yField: {
        type: 'select', 
        title: 'Y-Axis Field',
        description: 'Field name for values (y-axis)',
        required: true
      },
      orientation: {
        type: 'string',
        title: 'Orientation',
        enum: ['vertical', 'horizontal'],
        default: 'vertical'
      },
      color: {
        type: 'string',
        title: 'Bar Color',
        default: '#5470c6'
      },
      showValues: {
        type: 'boolean',
        title: 'Show Values on Bars',
        default: false
      },
      stacked: {
        type: 'boolean',
        title: 'Stacked Bars',
        default: false
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['x-axis', 'y-axis'],
    optionalFields: ['category', 'series'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: true
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: BarChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: true,
    pan: false,
    selection: true,
    brush: true,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  }
};
