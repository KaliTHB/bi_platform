'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';

interface LineChartData {
  x: string | number;
  y: number;
  series?: string;
}

export const LineChart: React.FC<ChartProps> = ({
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const processedData = data as LineChartData[];

    // Group data by series if present
    const seriesMap = new Map<string, LineChartData[]>();
    processedData.forEach(item => {
      const seriesName = item.series || 'Default';
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)!.push(item);
    });

    // Get all unique x values
    const xValues = Array.from(new Set(processedData.map(item => item.x))).sort();

    const series = Array.from(seriesMap.entries()).map(([seriesName, seriesData], index) => ({
      name: seriesName,
      type: 'line',
      data: xValues.map(x => {
        const dataPoint = seriesData.find(item => item.x === x);
        return dataPoint ? dataPoint.y : null;
      }),
      smooth: config?.smooth || false,
      symbol: config?.showPoints !== false ? 'circle' : 'none',
      symbolSize: 6,
      lineStyle: {
        width: config?.lineWidth || 2,
      },
      itemStyle: {
        color: config?.colors?.[index] || echarts.graphic.generateColors(seriesMap.size)[index],
      },
      emphasis: {
        focus: 'series',
      },
    }));

    const option: echarts.EChartsOption = {
      title: {
        text: config?.title || 'Line Chart',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
      },
      legend: {
        data: Array.from(seriesMap.keys()),
        top: '10%',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xValues,
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
      series: series,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };

    chartInstance.current.setOption(option);

    // Event handlers
    chartInstance.current.on('click', (params: any) => {
      const dataItem = {
        x: xValues[params.dataIndex],
        y: params.value,
        series: params.seriesName,
      };
      onDataPointClick?.(dataItem, params.event?.event);
    });

    chartInstance.current.on('mouseover', (params: any) => {
      const dataItem = {
        x: xValues[params.dataIndex],
        y: params.value,
        series: params.seriesName,
      };
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

export default LineChart;