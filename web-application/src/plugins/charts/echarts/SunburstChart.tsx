'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

export interface SunburstChartConfig {
  nameField: string;
  valueField: string;
  parentField?: string;
  colorField?: string;
  radius?: [string, string];
}

export const SunburstChart: React.FC<ChartProps> = ({
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
      
      const { nameField, valueField, parentField } = config as SunburstChartConfig;
      
      // Convert flat data to hierarchical structure
      const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => (parentField ? item[parentField] : null) === parentId)
          .map(item => ({
            name: item[nameField],
            value: item[valueField],
            children: buildHierarchy(items, item[nameField])
          }));
      };

      const hierarchicalData = parentField ? 
        buildHierarchy(data) : 
        data.map(item => ({
          name: item[nameField],
          value: item[valueField]
        }));

      const option = {
        title: {
          text: config.title || 'Sunburst Chart',
          left: 'center'
        },
        series: {
          type: 'sunburst',
          data: hierarchicalData,
          radius: config.radius || [0, '90%'],
          sort: undefined,
          emphasis: {
            focus: 'ancestor'
          },
          levels: [
            {},
            {
              r0: '15%',
              r: '35%',
              itemStyle: {
                borderWidth: 2
              },
              label: {
                rotate: 'tangential'
              }
            },
            {
              r0: '35%',
              r: '70%',
              label: {
                align: 'right'
              }
            },
            {
              r0: '70%',
              r: '72%',
              label: {
                position: 'outside',
                padding: 3,
                silent: false
              },
              itemStyle: {
                borderWidth: 3
              }
            }
          ]
        }
      };

      chartInstance.current.setOption(option);

      chartInstance.current.on('click', (params) => {
        onInteraction?.({
          type: 'click',
          data: params.data,
          event: params
        });
      });

    } catch (error) {
      console.error('Sunburst chart error:', error);
      onError?.(error as Error);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, config, width, height]);

  return <div ref={chartRef} style={{ width, height }} />;
};