'use client';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '../interfaces/ChartPlugin';

export const BarChart: React.FC<ChartProps> = ({ 
  data, 
  config, 
  width = '100%', 
  height = 400,
  onDataPointClick,
  onChartReady,
  loading = false,
  error 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  useEffect(() => {
    if (!chartRef.current || loading || error) return;

    // Initialize ECharts instance
    chartInstance.current = echarts.init(chartRef.current, config.theme || 'light');
    
    const option = {
      title: {
        text: config.title,
        subtext: config.subtitle,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        show: config.tooltip?.show !== false
      },
      legend: {
        show: config.legend?.show !== false,
        orient: config.legend?.orientation || 'horizontal',
        top: config.legend?.position === 'top' ? '10%' : 'bottom'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: config.xAxis?.type || 'category',
        name: config.xAxis?.label,
        data: data.map(item => item[config.xField || Object.keys(item)[0]]),
        axisLabel: {
          rotate: config.xAxis?.rotation || 0
        }
      },
      yAxis: {
        type: config.yAxis?.type || 'value',
        name: config.yAxis?.label,
        min: config.yAxis?.min,
        max: config.yAxis?.max
      },
      series: [{
        type: 'bar',
        data: data.map(item => item[config.yField || Object.keys(item)[1]]),
        itemStyle: {
          color: config.colors?.[0] || '#5470c6'
        },
        animationDelay: config.animation?.enabled !== false ? (idx: number) => idx * 10 : 0
      }],
      animation: config.animation?.enabled !== false,
      animationDuration: config.animation?.duration || 1000,
      animationEasing: config.animation?.easing || 'cubicOut'
    };

    chartInstance.current.setOption(option);

    // Handle click events
    if (onDataPointClick) {
      chartInstance.current.on('click', (params: any) => {
        const dataPoint = data[params.dataIndex];
        onDataPointClick(dataPoint, params.event?.event);
      });
    }

    if (onChartReady) {
      onChartReady(chartInstance.current);
    }

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, config, loading, error]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      style={{ width, height }}
      className="echarts-container"
    />
  );
};

export const barChartConfig: ChartPluginConfig = {
  name: 'echarts-bar',
  displayName: 'Bar Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'A basic bar chart for comparing values across categories',
  icon: '📊',
  configSchema: {
    xField: { type: 'string', required: true, label: 'X-Axis Field' },
    yField: { type: 'string', required: true, label: 'Y-Axis Field' },
    title: { type: 'string', label: 'Chart Title' },
    colors: { type: 'array', label: 'Color Palette' },
    stacked: { type: 'boolean', label: 'Stack Bars', default: false }
  },
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredColumnTypes: ['string', 'number'],
    supportedAggregations: ['sum', 'avg', 'count'],
    supportsDrilldown: true,
    supportsFiltering: true
  },
  exportFormats: ['png', 'svg', 'pdf'],
  component: BarChart,
  tags: ['comparison', 'categorical'],
  difficulty: 'basic'
};
