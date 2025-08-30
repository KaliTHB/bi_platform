'use client';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '../interfaces/ChartPlugin';

export const ScatterChart: React.FC<ChartProps> = ({
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
    
    const scatterData = data.map(item => [
      item[config.xField || Object.keys(item)[0]],
      item[config.yField || Object.keys(item)[1]],
      item[config.sizeField] || 10,
      item[config.categoryField] || 'default'
    ]);

    // Group data by category if categoryField is specified
    const series = config.categoryField ? 
      this.groupDataByCategory(scatterData, data, config) :
      [{
        name: config.seriesName || 'Scatter',
        type: 'scatter',
        data: scatterData,
        symbolSize: (value: any) => config.dynamicSize ? Math.sqrt(value[2]) * 5 : config.symbolSize || 10,
        itemStyle: {
          color: config.colors?.[0] || '#5470c6',
          opacity: config.opacity || 0.8
        }
      }];

    const option = {
      title: {
        text: config.title,
        subtext: config.subtitle,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const [x, y, size, category] = params.value;
          return `${params.seriesName}<br/>
                  ${config.xField || 'X'}: ${x}<br/>
                  ${config.yField || 'Y'}: ${y}
                  ${config.sizeField ? `<br/>${config.sizeField}: ${size}` : ''}
                  ${config.categoryField ? `<br/>Category: ${category}` : ''}`;
        }
      },
      legend: {
        show: config.legend?.show !== false && config.categoryField,
        top: '10%'
      },
      grid: {
        left: '8%',
        top: config.categoryField ? '20%' : '15%',
        right: '8%',
        bottom: '8%'
      },
      xAxis: {
        type: 'value',
        name: config.xAxis?.label || config.xField,
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        min: config.xAxis?.min,
        max: config.xAxis?.max
      },
      yAxis: {
        type: 'value',
        name: config.yAxis?.label || config.yField,
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        min: config.yAxis?.min,
        max: config.yAxis?.max
      },
      series,
      animation: config.animation?.enabled !== false
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

  groupDataByCategory = (scatterData: any[], originalData: any[], config: any) => {
    const categories = [...new Set(originalData.map(item => item[config.categoryField]))];
    
    return categories.map((category, index) => ({
      name: category,
      type: 'scatter',
      data: scatterData.filter(point => point[3] === category),
      symbolSize: (value: any) => config.dynamicSize ? Math.sqrt(value[2]) * 5 : config.symbolSize || 10,
      itemStyle: {
        color: config.colors?.[index % (config.colors?.length || 10)] || echarts.color.generate()[index % 10],
        opacity: config.opacity || 0.8
      }
    }));
  };

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <div ref={chartRef} style={{ width, height }} className="echarts-container" />;
};

export const scatterChartConfig: ChartPluginConfig = {
  name: 'echarts-scatter',
  displayName: 'Scatter Plot',
  category: 'statistical',
  library: 'echarts',
  version: '1.0.0',
  description: 'A scatter plot for showing relationships between two variables',
  icon: '⚬',
  configSchema: {
    xField: { type: 'string', required: true, label: 'X-Axis Field' },
    yField: { type: 'string', required: true, label: 'Y-Axis Field' },
    sizeField: { type: 'string', label: 'Size Field (Optional)' },
    categoryField: { type: 'string', label: 'Category Field (Optional)' },
    title: { type: 'string', label: 'Chart Title' },
    dynamicSize: { type: 'boolean', label: 'Dynamic Point Size', default: false },
    symbolSize: { type: 'number', label: 'Point Size', default: 10 }
  },
  dataRequirements: {
    minColumns: 2,
    maxColumns: 4,
    requiredColumnTypes: ['number'],
    supportsFiltering: true
  },
  exportFormats: ['png', 'svg', 'pdf'],
  component: ScatterChart,
  tags: ['correlation', 'statistical', 'relationship'],
  difficulty: 'intermediate'
};