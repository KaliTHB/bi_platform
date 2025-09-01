// File: /web-application/src/plugins/charts/echarts/PieChart.tsx

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

export interface PieChartConfig {
  title?: string;
  labelField: string;
  valueField: string;
  showLabels?: boolean;
  showLegend?: boolean;
  isDonut?: boolean;
  radius?: string[];
  roseType?: 'radius' | 'area' | false;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const PieChart: React.FC<ChartProps> = ({
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
      labelField: 'name',
      valueField: 'value',
      title: 'Pie Chart',
      showLabels: true,
      showLegend: true,
      isDonut: false,
      radius: ['0%', '70%'],
      roseType: false,
      legendPosition: 'right'
    }) as PieChartConfig;

    try {
      // Extract data using utility functions
      const labels = extractFieldValues(chartData, chartConfig.labelField, 'Unknown');
      const values = extractNumericValues(chartData, chartConfig.valueField, 0);

      // Prepare pie data
      const pieData = labels.map((label, index) => ({
        name: label,
        value: values[index]
      }));

      // Calculate radius based on donut setting
      const radius = chartConfig.isDonut 
        ? ['40%', '70%'] 
        : chartConfig.radius || ['0%', '70%'];

      // Get safe legend position with fallback
      const legendPosition = chartConfig.legendPosition || 'right';

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
          formatter: '{a} <br/>{b} : {c} ({d}%)'
        },
        legend: {
          show: chartConfig.showLegend,
          orient: ['top', 'bottom'].includes(legendPosition) ? 'horizontal' : 'vertical',
          [legendPosition]: legendPosition === 'top' ? '10%' : 
                                       legendPosition === 'bottom' ? '10%' : '10%',
          data: labels,
          type: 'scroll',
          pageButtonItemGap: 5,
          pageButtonGap: 20,
          pageIconSize: 12
        },
        series: [
          {
            name: chartConfig.title || 'Data',
            type: 'pie',
            radius: radius,
            center: ['50%', '50%'],
            data: pieData,
            roseType: chartConfig.roseType || false,
            label: {
              show: chartConfig.showLabels,
              formatter: '{b}: {c} ({d}%)',
              position: chartConfig.isDonut ? 'outside' : 'inside'
            },
            labelLine: {
              show: chartConfig.showLabels && !chartConfig.isDonut,
              smooth: 0.2,
              length: 10,
              length2: 20
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              },
              scale: true,
              scaleSize: 10
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: (idx: number) => Math.random() * 200
          }
        ],
        animation: true,
        animationDuration: 1000
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
export const EChartsPieChartConfig = {
  name: 'echarts-pie',
  displayName: 'ECharts Pie Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive pie chart with donut and rose type options',
  tags: ['pie', 'proportion', 'parts-to-whole', 'basic'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Pie Chart'
      },
      labelField: {
        type: 'string',
        title: 'Label Field',
        description: 'Field name for labels',
        default: 'name'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for values',
        default: 'value'
      },
      showLabels: {
        type: 'boolean',
        title: 'Show Labels',
        default: true
      },
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      },
      isDonut: {
        type: 'boolean',
        title: 'Donut Chart',
        description: 'Display as donut chart with hollow center',
        default: false
      },
      roseType: {
        type: 'select',
        title: 'Rose Type',
        options: [
          { label: 'None', value: false },
          { label: 'Radius', value: 'radius' },
          { label: 'Area', value: 'area' }
        ],
        default: false
      },
      legendPosition: {
        type: 'select',
        title: 'Legend Position',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' }
        ],
        default: 'right'
      }
    },
    required: ['labelField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['name', 'value'],
    optionalFields: [],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: PieChart
};

export default PieChart;