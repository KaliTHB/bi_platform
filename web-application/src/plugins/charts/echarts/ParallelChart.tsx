// ECharts Parallel Coordinates Chart Component
// File: web-application/src/plugins/charts/echarts/ParallelChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { hasDataContent, getDataArray } from '@/plugins/charts/utils/chartDataUtils';

export interface ParallelChartConfig {
  dimensions: string[];
  colorField?: string;
  brushMode?: 'rect' | 'polygon' | 'lineX' | 'lineY';
}

export const ParallelChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  useEffect(() => {
    if (!chartRef.current || !hasDataContent(data)) return;

    try {
      chartInstance.current = echarts.init(chartRef.current);
      
      const { dimensions, colorField, brushMode = 'rect' } = config as ParallelChartConfig;
      
      // Get the actual data array regardless of format
      const dataArray = getDataArray(data);
      
      // Prepare parallel coordinates data
      const parallelData = dataArray.map(item => 
        dimensions.map(dim => parseFloat(item[dim]) || 0)
      );

      // Create dimension configuration
      const parallelAxis = dimensions.map(dim => ({
        dim: dim,
        name: dim,
        type: 'value',
        nameLocation: 'end',
        nameGap: 20
      }));

      const option = {
        title: {
          text: config.title || 'Parallel Coordinates',
          left: 'center'
        },
        brush: {
          toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
          xAxisIndex: 'all'
        },
        parallelAxis: parallelAxis,
        series: {
          type: 'parallel',
          lineStyle: {
            width: 1,
            opacity: 0.8
          },
          data: parallelData.map((item, index) => ({
            value: item,
            name: colorField ? dataArray[index][colorField] || index : index
          }))
        }
      };

      chartInstance.current.setOption(option);

      chartInstance.current.on('brushSelected', (params : any) => {
        onInteraction?.({
          type: 'select', // Use 'select' instead of 'brush' as it's in the ChartInteractionEvent type
          data: params,
          dataIndex: params.batch?.[0]?.selected?.[0]?.dataIndex?.[0], // Extract dataIndex if available
          seriesIndex: 0 // For parallel charts, typically single series
        });
      });

    } catch (error) {
      console.error('Parallel chart error:', error);
      onError?.(error as Error);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, config, width, height]);

  return <div ref={chartRef} style={{ width, height }} />;
};

export default ParallelChart;

// Chart Plugin Configuration Export
export const EChartsParallelChartConfig = {
  name: 'echarts-parallel',
  displayName: 'ECharts Parallel Coordinates',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Parallel coordinates chart for visualizing multi-dimensional data relationships',
  tags: ['parallel', 'coordinates', 'multidimensional', 'correlation', 'advanced'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Parallel Coordinates'
      },
      nameField: {
        type: 'string',
        title: 'Name Field',
        description: 'Field for line/series identification'
      },
      colorField: {
        type: 'string',
        title: 'Color Field',
        description: 'Field to determine line colors'
      },
      layout: {
        type: 'select',
        title: 'Layout Orientation',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' }
        ],
        default: 'horizontal'
      },
      axisExpandable: {
        type: 'boolean',
        title: 'Expandable Axes',
        description: 'Allow expanding axes on hover',
        default: true
      },
      axisExpandCenter: {
        type: 'number',
        title: 'Expand Center',
        description: 'Center axis for expansion',
        minimum: 0
      },
      axisExpandCount: {
        type: 'number',
        title: 'Expand Count',
        description: 'Number of axes to expand',
        default: 0,
        minimum: 0
      },
      axisExpandWidth: {
        type: 'number',
        title: 'Expand Width',
        description: 'Width when axes are expanded',
        default: 50,
        minimum: 10
      },
      axisExpandTriggerOn: {
        type: 'select',
        title: 'Expand Trigger',
        options: [
          { label: 'Click', value: 'click' },
          { label: 'Mouse Over', value: 'mouseover' }
        ],
        default: 'click'
      },
      lineWidth: {
        type: 'number',
        title: 'Line Width',
        default: 1,
        minimum: 1,
        maximum: 10
      },
      progressive: {
        type: 'number',
        title: 'Progressive Rendering',
        description: 'Render lines progressively for large datasets',
        default: 500,
        minimum: 0
      },
      progressiveThreshold: {
        type: 'number',
        title: 'Progressive Threshold',
        description: 'Threshold to enable progressive rendering',
        default: 3000,
        minimum: 100
      },
      enableBrush: {
        type: 'boolean',
        title: 'Enable Brush Selection',
        description: 'Allow brushing to filter data',
        default: true
      },
      brushMode: {
        type: 'select',
        title: 'Brush Mode',
        options: [
          { label: 'Single', value: 'single' },
          { label: 'Multiple', value: 'multiple' }
        ],
        default: 'multiple'
      },
      smooth: {
        type: 'boolean',
        title: 'Smooth Lines',
        default: false
      },
      showTooltip: {
        type: 'boolean',
        title: 'Show Tooltip',
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
      colorBy: {
        type: 'select',
        title: 'Color Strategy',
        options: [
          { label: 'Series', value: 'series' },
          { label: 'Data', value: 'data' }
        ],
        default: 'series'
      },
      animation: {
        type: 'boolean',
        title: 'Enable Animation',
        default: true
      },
      animationThreshold: {
        type: 'number',
        title: 'Animation Threshold',
        description: 'Disable animation above this many data points',
        default: 2000,
        minimum: 100
      }
    },
    required: []
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: 50,
    requiredFields: [],
    optionalFields: ['name', 'category'],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: false,
    pivotSupport: false,
    specialRequirements: [
      'At least 3 numeric dimensions recommended',
      'Best suited for datasets with 4-20 dimensions',
      'Large datasets may require progressive rendering'
    ]
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: ParallelChart
};