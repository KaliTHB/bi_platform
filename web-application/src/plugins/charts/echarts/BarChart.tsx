'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

interface BarChartData {
  name: string;
  value: number;
  category?: string;
}

export const BarChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 400,
  onDataPointClick,
  onDataPointHover,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const processedData = data as BarChartData[];

    const option: echarts.EChartsOption = {
      title: {
        text: config?.title || 'Bar Chart',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0];
          return `${data.name}: ${data.value}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: processedData.map(item => item.name),
        axisLabel: {
          rotate: 45,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toString();
          },
        },
      },
      series: [
        {
          type: 'bar',
          data: processedData.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: config?.color || '#5470c6',
            },
          })),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
    };

    chartInstance.current.setOption(option);

    // Event handlers
    chartInstance.current.on('click', (params: any) => {
      const dataItem = processedData[params.dataIndex];
      onDataPointClick?.(dataItem, params.event?.event);
    });

    chartInstance.current.on('mouseover', (params: any) => {
      const dataItem = processedData[params.dataIndex];
      onDataPointHover?.(dataItem, params.event?.event);
    });

    // Resize handler
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, config, width, height]);

  useEffect(() => {
    // Resize chart when dimensions change
    if (chartInstance.current) {
      chartInstance.current.resize({
        width: width,
        height: height,
      });
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
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};

export default BarChart;