// File: src/plugins/charts/echarts/HeatmapChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface HeatmapChartConfig {
  xField: string;
  yField: string;
  valueField: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorRange?: [string, string];
  showLabels?: boolean;
  showGrid?: boolean;
}

interface HeatmapChartProps extends ChartProps {
  chartId?: string;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  chartId,
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  const options = useMemo(() => {
    if (!hasDataContent(data)) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      };
    }

    try {
      const chartConfig = config as HeatmapChartConfig;
      const dataArray = getDataArray(data);
      
      // Get unique values for x and y axes
      const xCategories = Array.from(new Set(dataArray.map(item => item[chartConfig.xField]))).sort();
      const yCategories = Array.from(new Set(dataArray.map(item => item[chartConfig.yField]))).sort();
      
      // Prepare heatmap data
      const heatmapData = dataArray.map(item => [
        xCategories.indexOf(item[chartConfig.xField]),
        yCategories.indexOf(item[chartConfig.yField]),
        parseFloat(item[chartConfig.valueField]) || 0
      ]);

      // Calculate min/max for color scaling
      const values = heatmapData.map(item => item[2]);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      return {
        title: {
          text: chartConfig.title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          position: 'top',
          formatter: (params: any) => {
            const [x, y, value] = params.data;
            return `${xCategories[x]} - ${yCategories[y]}<br/>${chartConfig.valueField}: ${value}`;
          }
        },
        grid: {
          height: '50%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xCategories,
          name: chartConfig.xAxisLabel,
          nameLocation: 'middle',
          nameGap: 30,
          splitArea: {
            show: chartConfig.showGrid !== false
          }
        },
        yAxis: {
          type: 'category',
          data: yCategories,
          name: chartConfig.yAxisLabel,
          nameLocation: 'middle',
          nameGap: 50,
          splitArea: {
            show: chartConfig.showGrid !== false
          }
        },
        visualMap: {
          min: minValue,
          max: maxValue,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '15%',
          inRange: {
            color: chartConfig.colorRange || ['#50a3ba', '#eac736', '#d94e5d']
          }
        },
        series: [
          {
            name: chartConfig.title || 'Heatmap',
            type: 'heatmap',
            data: heatmapData,
            label: {
              show: chartConfig.showLabels || false
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing heatmap chart data:', error);
      onError?.(error as Error);
      return {
        title: {
          text: 'Error Loading Chart',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#ff4444',
            fontSize: 16
          }
        }
      };
    }
  }, [data, config, onError]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(options, true);

    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        chartId: chartId || 'echarts-heatmap-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-heatmap-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    chartInstance.current.on('click', handleClick);
    chartInstance.current.on('mouseover', handleMouseover);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('mouseover', handleMouseover);
      window.removeEventListener('resize', handleResize);
    };
  }, [chartId, options, onInteraction]);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.resize();
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
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }} 
    />
  );
};