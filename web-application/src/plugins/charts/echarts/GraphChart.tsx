// File: src/plugins/charts/echarts/GraphChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface GraphChartConfig {
  // Node configuration
  nodeIdField: string;
  nodeLabelField?: string;
  nodeSizeField?: string;
  nodeCategoryField?: string;
  
  // Link configuration (if separate from nodes)
  sourceField?: string;
  targetField?: string;
  linkValueField?: string;
  
  title?: string;
  layout?: 'none' | 'circular' | 'force';
  roam?: boolean;
  draggable?: boolean;
  focusNodeAdjacency?: boolean;
  symbolSize?: number | [number, number];
  repulsion?: number;
  gravity?: number;
  edgeLength?: number;
  categories?: Array<{
    name: string;
    itemStyle?: any;
  }>;
}

interface GraphChartProps extends ChartProps {
  chartId?: string;
}

export const GraphChart: React.FC<GraphChartProps> = ({
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
      const chartConfig = config as GraphChartConfig;
      const dataArray = getDataArray(data);
      
      // Prepare nodes
      const nodeMap = new Map();
      const nodes: any[] = [];
      const links: any[] = [];

      // If we have sourceField and targetField, this is link data
      if (chartConfig.sourceField && chartConfig.targetField) {
        // Extract nodes from links
        dataArray.forEach(item => {
          const source = item[chartConfig.sourceField!];
          const target = item[chartConfig.targetField!];
          
          if (!nodeMap.has(source)) {
            nodeMap.set(source, {
              id: source,
              name: source,
              symbolSize: chartConfig.symbolSize || 30
            });
            nodes.push(nodeMap.get(source));
          }
          
          if (!nodeMap.has(target)) {
            nodeMap.set(target, {
              id: target,
              name: target,
              symbolSize: chartConfig.symbolSize || 30
            });
            nodes.push(nodeMap.get(target));
          }
          
          links.push({
            source: source,
            target: target,
            value: chartConfig.linkValueField ? (parseFloat(item[chartConfig.linkValueField]) || 1) : 1
          });
        });
      } else {
        // This is node data, create nodes directly
        dataArray.forEach(item => {
          const nodeId = item[chartConfig.nodeIdField];
          const nodeLabel = chartConfig.nodeLabelField ? item[chartConfig.nodeLabelField] : nodeId;
          const nodeSize = chartConfig.nodeSizeField 
            ? (parseFloat(item[chartConfig.nodeSizeField]) || 30)
            : (Array.isArray(chartConfig.symbolSize) ? chartConfig.symbolSize[0] : chartConfig.symbolSize || 30);
          const category = chartConfig.nodeCategoryField ? item[chartConfig.nodeCategoryField] : 0;
          
          nodes.push({
            id: nodeId,
            name: nodeLabel,
            symbolSize: nodeSize,
            category: category
          });
        });
      }

      // Force layout configuration
      const force = chartConfig.layout === 'force' ? {
        repulsion: chartConfig.repulsion || 100,
        gravity: chartConfig.gravity || 0.1,
        edgeLength: chartConfig.edgeLength || 150,
        layoutAnimation: true
      } : undefined;

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
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `${params.data.name}${params.data.symbolSize ? `<br/>Size: ${params.data.symbolSize}` : ''}`;
            } else if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}${params.data.value ? `<br/>Value: ${params.data.value}` : ''}`;
            }
            return '';
          }
        },
        legend: chartConfig.categories ? {
          show: true,
          data: chartConfig.categories.map(cat => cat.name)
        } : undefined,
        series: [
          {
            name: chartConfig.title || 'Graph',
            type: 'graph',
            data: nodes,
            links: links,
            categories: chartConfig.categories,
            layout: chartConfig.layout || 'force',
            force,
            roam: chartConfig.roam !== false,
            draggable: chartConfig.draggable !== false,
            focusNodeAdjacency: chartConfig.focusNodeAdjacency !== false,
            label: {
              show: true,
              position: 'inside',
              formatter: '{b}',
              fontSize: 12,
              fontWeight: 'bold'
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3,
              width: 2
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 10
              }
            },
            animationType: 'expansion',
            animationDelay: (idx: number) => idx * 10
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing graph chart data:', error);
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
        chartId: chartId || 'echarts-graph-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-graph-chart',
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