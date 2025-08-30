// ECharts Boxplot Chart Component
// File: web-application/src/plugins/charts/echarts/BoxplotChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

export interface BoxplotChartConfig {
  xField: string;
  yField: string;
  seriesField?: string;
}

export const BoxplotChart: React.FC<ChartProps> = ({
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
      
      const { xField, yField, seriesField } = config as BoxplotChartConfig;
      
      // Group data and calculate boxplot statistics
      const groupedData = new Map();
      
      data.forEach(item => {
        const category = item[xField];
        const value = parseFloat(item[yField]);
        const series = seriesField ? item[seriesField] : 'default';
        
        if (!groupedData.has(series)) {
          groupedData.set(series, new Map());
        }
        
        if (!groupedData.get(series).has(category)) {
          groupedData.get(series).set(category, []);
        }
        
        groupedData.get(series).get(category).push(value);
      });

      // Calculate boxplot statistics
      const calculateBoxplot = (values: number[]) => {
        values.sort((a, b) => a - b);
        const q1 = values[Math.floor(values.length * 0.25)];
        const median = values[Math.floor(values.length * 0.5)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const min = values[0];
        const max = values[values.length - 1];
        return [min, q1, median, q3, max];
      };

      const categories = Array.from(new Set(data.map(item => item[xField])));
      const series = [];

      groupedData.forEach((categoryData, seriesName) => {
        const boxplotData = categories.map(category => {
          const values = categoryData.get(category) || [];
          return values.length > 0 ? calculateBoxplot(values) : [0, 0, 0, 0, 0];
        });

        series.push({
          name: seriesName,
          type: 'boxplot',
          data: boxplotData
        });
      });

      const option = {
        title: {
          text: config.title || 'Boxplot Chart',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%'
        },
        xAxis: {
          type: 'category',
          data: categories,
          boundaryGap: true,
          nameGap: 30,
          splitArea: {
            show: false
          },
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          name: yField,
          splitArea: {
            show: true
          }
        },
        series: series
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
      console.error('Boxplot chart error:', error);
      onError?.(error as Error);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, config, width, height]);

  return <div ref={chartRef} style={{ width, height }} />;
};
