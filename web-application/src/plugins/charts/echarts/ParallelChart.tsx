// ECharts Parallel Coordinates Chart Component
// File: web-application/src/plugins/charts/echarts/ParallelChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

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
    if (!chartRef.current || !data?.length) return;

    try {
      chartInstance.current = echarts.init(chartRef.current);
      
      const { dimensions, colorField, brushMode = 'rect' } = config as ParallelChartConfig;
      
      // Prepare parallel coordinates data
      const parallelData = data.map(item => 
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
            name: data[index][colorField] || index
          }))
        }
      };

      chartInstance.current.setOption(option);

      // Handle brush events
      chartInstance.current.on('brushSelected', (params) => {
        onInteraction?.({
          type: 'brush',
          data: params,
          event: params
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