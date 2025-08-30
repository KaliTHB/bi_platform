'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

interface PieChartData {
  name: string;
  value: number;
}

export const PieChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 600,
  height = 400,
  onDataPointClick,
  onDataPointHover,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const processedData = data as PieChartData[];

    const option: echarts.EChartsOption = {
      title: {
        text: config?.title || 'Pie Chart',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}: ${params.value} (${params.percent}%)`;
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: processedData.map(item => item.name),
      },
      series: [
        {
          type: 'pie',
          radius: config?.donut ? ['40%', '70%'] : '70%',
          center: ['50%', '50%'],
          data: processedData.map((item, index) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: config?.colors?.[index] || echarts.graphic.generateColors(processedData.length)[index],
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            show: config?.showLabels !== false,
            formatter: '{b}: {c}',
          },
          labelLine: {
            show: config?.showLabels !== false,
          },
        },
      ],
      animation: true,
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => Math.random() * 200,
    };

    chartInstance.current.setOption(option);

    // Event handlers
    chartInstance.current.on('click', (params: any) => {
      const dataItem = processedData.find(item => item.name === params.name);
      onDataPointClick?.(dataItem, params.event?.event);
    });

    chartInstance.current.on('mouseover', (params: any) => {
      const dataItem = processedData.find(item => item.name === params.name);
      onDataPointHover?.(dataItem, params.event?.event);
    });

  }, [data, config, width, height]);

  useEffect(() => {
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

export default PieChart;