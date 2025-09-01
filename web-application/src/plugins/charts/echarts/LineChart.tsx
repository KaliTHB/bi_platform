// File: src/plugins/charts/echarts/LineChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface LineChartConfig {
  xField: string;
  yField: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesName?: string;
  smooth?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

interface LineChartProps extends ChartProps {
  chartId?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
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
      const chartConfig = config as LineChartConfig;
      const dataArray = getDataArray(data);
      
      const categories = dataArray.map(item => item[chartConfig.xField]);
      const values = dataArray.map(item => parseFloat(item[chartConfig.yField]) || 0);

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
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        legend: {
          show: chartConfig.showLegend !== false,
          data: [chartConfig.seriesName || chartConfig.yField]
        },
        grid: {
          show: chartConfig.showGrid !== false,
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: categories,
          name: chartConfig.xAxisLabel,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yAxisLabel,
          nameLocation: 'middle',
          nameGap: 50
        },
        series: [
          {
            name: chartConfig.seriesName || chartConfig.yField,
            type: 'line',
            smooth: chartConfig.smooth || false,
            showSymbol: chartConfig.showPoints !== false,
            areaStyle: chartConfig.showArea ? {} : undefined,
            data: values,
            lineStyle: {
              color: chartConfig.color || '#5470c6',
              width: 2
            },
            itemStyle: {
              color: chartConfig.color || '#5470c6'
            }
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing line chart data:', error);
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
        chartId: chartId || 'echarts-line-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-line-chart',
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