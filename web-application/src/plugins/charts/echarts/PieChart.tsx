// File: src/plugins/charts/echarts/PieChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface PieChartConfig {
  labelField: string;
  valueField: string;
  title?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  isDonut?: boolean;
  radius?: string | [string, string];
  showLabels?: boolean;
  showPercentage?: boolean;
}

interface PieChartProps extends ChartProps {
  chartId?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
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
      const chartConfig = config as PieChartConfig;
      const dataArray = getDataArray(data);
      
      const pieData = dataArray.map(item => ({
        name: item[chartConfig.labelField],
        value: parseFloat(item[chartConfig.valueField]) || 0
      }));

      const radius = chartConfig.isDonut ? ['40%', '70%'] : (chartConfig.radius || '55%');

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
          formatter: chartConfig.showPercentage 
            ? '{a} <br/>{b} : {c} ({d}%)'
            : '{a} <br/>{b} : {c}'
        },
        legend: {
          show: chartConfig.showLegend !== false,
          orient: chartConfig.legendPosition === 'left' || chartConfig.legendPosition === 'right' 
            ? 'vertical' 
            : 'horizontal',
          [chartConfig.legendPosition || 'bottom']: chartConfig.legendPosition === 'left' || chartConfig.legendPosition === 'right' ? 'left' : 10,
          data: pieData.map(item => item.name)
        },
        series: [
          {
            name: chartConfig.title || 'Data',
            type: 'pie',
            radius,
            center: ['50%', '50%'],
            data: pieData,
            label: {
              show: chartConfig.showLabels !== false,
              formatter: chartConfig.showPercentage 
                ? '{b}: {d}%'
                : '{b}: {c}'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: (idx: number) => Math.random() * 200
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing pie chart data:', error);
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
        chartId: chartId || 'echarts-pie-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-pie-chart',
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

export const EChartsPieChartConfig: ChartPluginConfig = {
  name: 'echarts-pie',
  displayName: 'ECharts Pie Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive pie chart with customizable segments and labels',
  tags: ['pie', 'donut', 'categorical', 'proportional'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Pie Chart'
      },
      labelField: {
        type: 'select',
        title: 'Label Field',
        description: 'Field name for segment labels',
        required: true
      },
      valueField: {
        type: 'select',
        title: 'Value Field',
        description: 'Field name for segment values',
        required: true
      },
      isDonut: {
        type: 'boolean',
        title: 'Donut Chart',
        description: 'Display as donut chart instead of pie',
        default: false
      },
      innerRadius: {
        type: 'string',
        title: 'Inner Radius',
        default: '0%'
      },
      outerRadius: {
        type: 'string',
        title: 'Outer Radius',
        default: '70%'
      },
      showLabels: {
        type: 'boolean',
        title: 'Show Labels',
        default: true
      },
      showPercentages: {
        type: 'boolean',
        title: 'Show Percentages',
        default: true
      }
    },
    required: ['labelField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 50,
    requiredFields: ['name', 'value'],
    optionalFields: ['category'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: PieChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  }
};