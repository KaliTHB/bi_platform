/ File: web-application/src/components/charts/echarts/LineChart.tsx
'use client';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '../interfaces/ChartPlugin';

export const LineChart: React.FC<ChartProps> = ({
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
    
    const option = {
      title: {
        text: config.title,
        subtext: config.subtitle,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        show: config.tooltip?.show !== false
      },
      legend: {
        show: config.legend?.show !== false,
        top: '10%'
      },
      toolbox: {
        show: true,
        feature: {
          saveAsImage: {},
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {}
        }
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
        boundaryGap: false,
        data: data.map(item => item[config.xField || Object.keys(item)[0]])
      },
      yAxis: {
        type: config.yAxis?.type || 'value',
        name: config.yAxis?.label,
        min: config.yAxis?.min,
        max: config.yAxis?.max
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ],
      series: [{
        name: config.seriesName || 'Series',
        type: 'line',
        smooth: config.smooth !== false,
        symbol: config.showSymbols !== false ? 'circle' : 'none',
        symbolSize: 6,
        lineStyle: {
          width: config.lineWidth || 2,
          color: config.colors?.[0] || '#5470c6'
        },
        areaStyle: config.area ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: config.colors?.[0] || '#5470c6' },
            { offset: 1, color: 'transparent' }
          ])
        } : undefined,
        data: data.map(item => item[config.yField || Object.keys(item)[1]]),
        animationDelay: (idx: number) => idx * 5
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

export const lineChartConfig: ChartPluginConfig = {
  name: 'echarts-line',
  displayName: 'Line Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'A line chart for showing trends over time',
  icon: '📈',
  configSchema: {
    xField: { type: 'string', required: true, label: 'X-Axis Field' },
    yField: { type: 'string', required: true, label: 'Y-Axis Field' },
    title: { type: 'string', label: 'Chart Title' },
    smooth: { type: 'boolean', label: 'Smooth Line', default: true },
    area: { type: 'boolean', label: 'Area Chart', default: false },
    showSymbols: { type: 'boolean', label: 'Show Data Points', default: true }
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
  component: LineChart,
  tags: ['trend', 'time-series', 'continuous'],
  difficulty: 'basic'
};
