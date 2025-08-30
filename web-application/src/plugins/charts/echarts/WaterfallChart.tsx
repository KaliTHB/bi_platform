// ECharts Waterfall Chart Component
// File: web-application/src/plugins/charts/echarts/WaterfallChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

export interface WaterfallChartConfig {
  xField: string;
  yField: string;
  seriesField?: string;
  colorField?: string;
  showConnect?: boolean;
  connectStyle?: {
    stroke?: string;
    strokeDasharray?: string;
  };
}

export const WaterfallChart: React.FC<ChartProps> = ({
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
      // Initialize chart
      chartInstance.current = echarts.init(chartRef.current);
      
      const { xField, yField, showConnect = true } = config as WaterfallChartConfig;
      
      // Process data for waterfall
      let cumulativeValue = 0;
      const processedData = data.map((item, index) => {
        const value = item[yField];
        const start = cumulativeValue;
        cumulativeValue += value;
        
        return {
          name: item[xField],
          value: [index, start, cumulativeValue, value],
          itemStyle: {
            color: value >= 0 ? '#5470c6' : '#ee6666'
          }
        };
      });

      const option = {
        title: {
          text: config.title || 'Waterfall Chart',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params: any) => {
            const data = params[0];
            const change = data.value[3];
            const total = data.value[2];
            return `${data.name}<br/>Change: ${change}<br/>Total: ${total}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item[xField])
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: 'Waterfall',
            type: 'custom',
            renderItem: (params: any, api: any) => {
              const yValue = api.value(2);
              const start = api.value(1);
              const size = api.size([0, yValue - start]);
              const style = api.style();
              
              return {
                type: 'rect',
                shape: {
                  x: params.coordSys.x,
                  y: api.coord([0, Math.max(start, yValue)])[1],
                  width: size[0] * 0.6,
                  height: Math.abs(size[1])
                },
                style: style
              };
            },
            data: processedData
          }
        ]
      };

      chartInstance.current.setOption(option);

      // Handle interactions
      chartInstance.current.on('click', (params) => {
        onInteraction?.({
          type: 'click',
          data: params.data,
          event: params
        });
      });

    } catch (error) {
      console.error('Waterfall chart error:', error);
      onError?.(error as Error);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, config, width, height]);

  return <div ref={chartRef} style={{ width, height }} />;
};