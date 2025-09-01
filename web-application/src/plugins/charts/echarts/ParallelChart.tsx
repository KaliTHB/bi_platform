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