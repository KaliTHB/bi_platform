// File: web-application/src/components/charts/echarts/BarChart.tsx

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '../interfaces/ChartPlugin';

export interface EChartsBarChartProps extends ChartProps {
  type?: 'bar' | 'column';
  stacked?: boolean;
  gradient?: boolean;
}

const EChartsBarChart = forwardRef<any, EChartsBarChartProps>((props, ref) => {
  const {
    data,
    config,
    width = '100%',
    height = 400,
    onDataPointClick,
    onChartReady,
    loading = false,
    error,
    type = 'column',
    stacked = false,
    gradient = false
  } = props;

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useImperativeHandle(ref, () => ({
    getInstance: () => chartInstance.current,
    exportChart: (format: 'png' | 'svg') => {
      return chartInstance.current?.getDataURL({
        type: format,
        pixelRatio: 2,
        backgroundColor: config.theme === 'dark' ? '#1f1f1f' : '#ffffff'
      });
    },
    resize: () => chartInstance.current?.resize()
  }));

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(
        chartRef.current,
        config.theme === 'dark' ? 'dark' : undefined,
        { renderer: 'canvas' }
      );

      // Handle click events
      chartInstance.current.on('click', (params: any) => {
        if (onDataPointClick) {
          const dataPoint = data[params.dataIndex];
          onDataPointClick(dataPoint, params.event.event);
        }
      });

      onChartReady?.(chartInstance.current);
    }

    // Prepare data
    const categories = [...new Set(data.map(d => d.category || d.name || d.x))];
    const series = prepareSeries(data, categories, stacked, gradient);

    // Chart configuration
    const option: echarts.EChartsOption = {
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
        formatter: config.tooltip?.format || undefined
      },
      legend: {
        show: config.legend?.show !== false,
        orient: config.legend?.orientation || 'horizontal',
        left: config.legend?.position === 'left' ? 'left' : 
              config.legend?.position === 'right' ? 'right' : 'center',
        top: config.legend?.position === 'top' ? 'top' : 
             config.legend?.position === 'bottom' ? 'bottom' : 'auto'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: type === 'bar' ? 'value' : 'category',
        data: type === 'column' ? categories : undefined,
        name: config.xAxis?.label,
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          rotate: config.xAxis?.rotation || 0
        }
      },
      yAxis: {
        type: type === 'bar' ? 'category' : 'value',
        data: type === 'bar' ? categories : undefined,
        name: config.yAxis?.label,
        nameLocation: 'middle',
        nameGap: 50
      },
      series: series,
      color: config.colors || [
        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
      ],
      animation: config.animation?.enabled !== false,
      animationDuration: config.animation?.duration || 1000
    };

    chartInstance.current.setOption(option, true);

    // Handle resize
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, config, type, stacked, gradient, onDataPointClick, onChartReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  const prepareSeries = (data: any[], categories: string[], stacked: boolean, gradient: boolean) => {
    // Group data by series
    const seriesMap = new Map<string, any[]>();
    
    data.forEach(item => {
      const seriesKey = item.series || 'Series 1';
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, []);
      }
      seriesMap.get(seriesKey)!.push(item);
    });

    const series: any[] = [];
    let seriesIndex = 0;

    seriesMap.forEach((seriesData, seriesName) => {
      const values = categories.map(category => {
        const item = seriesData.find(d => 
          (d.category || d.name || d.x) === category
        );
        return item ? (item.value || item.y || 0) : 0;
      });

      const seriesConfig: any = {
        name: seriesName,
        type: 'bar',
        data: values,
        stack: stacked ? 'stack' : undefined,
        emphasis: {
          focus: 'series'
        }
      };

      if (gradient) {
        seriesConfig.itemStyle = {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: config.colors?.[seriesIndex] || '#5470c6' },
            { offset: 1, color: adjustColorBrightness(config.colors?.[seriesIndex] || '#5470c6', -30) }
          ])
        };
      }

      series.push(seriesConfig);
      seriesIndex++;
    });

    return series;
  };

  const adjustColorBrightness = (color: string, amount: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded">
        <div className="text-red-600 text-center">
          <p className="font-medium">Chart Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      className="chart-container"
    />
  );
});

EChartsBarChart.displayName = 'EChartsBarChart';

export default EChartsBarChart;