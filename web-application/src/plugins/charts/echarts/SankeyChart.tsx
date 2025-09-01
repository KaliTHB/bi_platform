// File: src/plugins/charts/echarts/SankeyChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface SankeyChartConfig {
  sourceField: string;
  targetField: string;
  valueField: string;
  title?: string;
  nodeWidth?: number;
  nodeGap?: number;
  layoutIterations?: number;
  orient?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  draggable?: boolean;
}

interface SankeyChartProps extends ChartProps {
  chartId?: string;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  chartId,
  data,
  config,
  width = 600,
  height = 400,
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
      const chartConfig = config as SankeyChartConfig;
      const dataArray = getDataArray(data);
      
      // Extract unique nodes
      const nodeSet = new Set<string>();
      dataArray.forEach(item => {
        nodeSet.add(item[chartConfig.sourceField]);
        nodeSet.add(item[chartConfig.targetField]);
      });
      
      const nodes = Array.from(nodeSet).map(name => ({ name }));
      
      // Create links from data
      const links = dataArray.map(item => ({
        source: item[chartConfig.sourceField],
        target: item[chartConfig.targetField],
        value: parseFloat(item[chartConfig.valueField]) || 0
      }));

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
          trigger: 'item',
          triggerOn: 'mousemove',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `${params.data.name}`;
            } else if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}<br/>Value: ${params.data.value}`;
            }
            return '';
          }
        },
        series: [
          {
            type: 'sankey',
            data: nodes,
            links: links,
            nodeWidth: chartConfig.nodeWidth || 20,
            nodeGap: chartConfig.nodeGap || 8,
            layoutIterations: chartConfig.layoutIterations || 32,
            orient: chartConfig.orient || 'horizontal',
            draggable: chartConfig.draggable !== false,
            label: {
              show: chartConfig.showLabels !== false,
              position: 'right',
              fontSize: 12,
              fontWeight: 'bold'
            },
            lineStyle: {
              color: 'gradient',
              curveness: 0.5
            },
            itemStyle: {
              borderWidth: 1,
              borderColor: '#aaa'
            },
            emphasis: {
              focus: 'adjacency'
            },
            animationDuration: 1000,
            animationEasing: 'cubicInOut'
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing sankey chart data:', error);
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
        chartId: chartId || 'echarts-sankey-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-sankey-chart',
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