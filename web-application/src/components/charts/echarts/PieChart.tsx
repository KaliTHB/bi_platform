'use client';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '../interfaces/ChartPlugin';

export const PieChart: React.FC<ChartProps> = ({
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

    chartInstance.current = echarts.init(chartRef.current, config.theme || 'light');
    
    const seriesData = data.map((item, index) => ({
      name: item[config.labelField || Object.keys(item)[0]],
      value: item[config.valueField || Object.keys(item)[1]],
      itemStyle: {
        color: config.colors?.[index % (config.colors?.length || 10)] || echarts.color.generate()[index % 10]
      }
    }));

    const option = {
      title: {
        text: config.title,
        subtext: config.subtitle,
        left: 'center',
        top: '5%'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
        show: config.tooltip?.show !== false
      },
      legend: {
        show: config.legend?.show !== false,
        orient: config.legend?.orientation || 'horizontal',
        left: 'center',
        bottom: '5%'
      },
      series: [{
        name: config.seriesName || 'Data',
        type: 'pie',
        radius: config.donut ? ['40%', '70%'] : '70%',
        center: ['50%', '55%'],
        data: seriesData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: config.showLabels !== false,
          formatter: config.labelFormat || '{b}: {d}%'
        },
        labelLine: {
          show: config.showLabelLines !== false
        },
        animationType: 'scale',
        animationEasing: 'elasticOut'
      }],
      animation: config.animation?.enabled !== false,
      animationDuration: config.animation?.duration || 1000
    };

    chartInstance.current.setOption(option);

    if (onDataPointClick) {
      chartInstance.current.on('click', (params: any) => {
        const dataPoint = data[params.dataIndex];
        onDataPointClick(dataPoint, params.event?.event);
      });
    }

    if (onChartReady) {
      onChartReady(chartInstance.current);
    }

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

export const pieChartConfig: ChartPluginConfig = {
  name: 'echarts-pie',
  displayName: 'Pie Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'A pie chart for showing proportions and percentages',
  icon: '🥧',
  configSchema: {
    labelField: { type: 'string', required: true, label: 'Label Field' },
    valueField: { type: 'string', required: true, label: 'Value Field' },
    title: { type: 'string', label: 'Chart Title' },
    donut: { type: 'boolean', label: 'Donut Style', default: false },
    showLabels: { type: 'boolean', label: 'Show Labels', default: true }
  },
  dataRequirements: {
    minColumns: 2,
    maxColumns: 2,
    requiredColumnTypes: ['string', 'number'],
    supportedAggregations: ['sum', 'count'],
    supportsDrilldown: true,
    supportsFiltering: true
  },
  exportFormats: ['png', 'svg', 'pdf'],
  component: PieChart,
  tags: ['proportion', 'percentage', 'categorical'],
  difficulty: 'basic'
};