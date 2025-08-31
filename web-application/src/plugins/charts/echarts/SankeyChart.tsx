// File: /web-application/src/plugins/charts/echarts/SankeyChart.tsx

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  extractFieldValues, 
  extractNumericValues, 
  createChartConfig 
} from '../utils/chartDataUtils';

export interface SankeyChartConfig {
  title?: string;
  sourceField: string;
  targetField: string;
  valueField: string;
  nodeAlign?: 'left' | 'right' | 'justify';
  orient?: 'horizontal' | 'vertical';
  draggable?: boolean;
  focusNodeAdjacency?: boolean | 'inEdges' | 'outEdges' | 'allEdges';
  levels?: number;
  nodeGap?: number;
}

export const SankeyChart: React.FC<ChartProps> = ({
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
    // Check if data is empty using utility function
    if (isChartDataEmpty(data)) {
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

    // Normalize data to array format
    const chartData = normalizeChartData(data);
    
    // Create safe configuration with defaults
    const chartConfig = createChartConfig(config, {
      sourceField: 'source',
      targetField: 'target',
      valueField: 'value',
      title: 'Sankey Diagram',
      nodeAlign: 'justify',
      orient: 'horizontal',
      draggable: true,
      focusNodeAdjacency: 'allEdges',
      levels: 3,
      nodeGap: 8
    }) as SankeyChartConfig;

    try {
      // Extract data fields
      const sources = extractFieldValues(chartData, chartConfig.sourceField, '');
      const targets = extractFieldValues(chartData, chartConfig.targetField, '');
      const values = extractNumericValues(chartData, chartConfig.valueField, 0);

      // Build nodes and links
      const nodeSet = new Set([...sources, ...targets]);
      const nodes = Array.from(nodeSet).map(name => ({ name }));

      const links = chartData.map((item, index) => ({
        source: sources[index],
        target: targets[index],
        value: values[index]
      })).filter(link => link.value > 0);

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
            if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}<br/>Value: ${params.data.value}`;
            } else {
              return `${params.data.name}<br/>Total: ${params.value}`;
            }
          }
        },
        animation: true,
        animationDuration: 1000,
        series: [
          {
            type: 'sankey',
            data: nodes,
            links: links,
            emphasis: {
              focus: 'adjacency'
            },
            blur: {
              label: {
                opacity: 0.1
              },
              itemStyle: {
                opacity: 0.1
              },
              lineStyle: {
                opacity: 0.1
              }
            },
            select: {
              itemStyle: {
                borderColor: '#212121'
              }
            },
            lineStyle: {
              color: 'gradient',
              curveness: 0.5,
              opacity: 0.6
            },
            itemStyle: {
              color: '#5470c6',
              borderColor: '#aaa',
              borderWidth: 1
            },
            label: {
              position: chartConfig.orient === 'vertical' ? 'top' : 'right',
              margin: 8,
              fontSize: 12,
              fontWeight: 'bold'
            },
            nodeAlign: chartConfig.nodeAlign,
            orient: chartConfig.orient,
            draggable: chartConfig.draggable,
            focusNodeAdjacency: chartConfig.focusNodeAdjacency,
            levels: chartConfig.levels,
            nodeGap: chartConfig.nodeGap,
            nodeWidth: 20,
            layoutIterations: 32,
            left: '5%',
            top: '5%',
            right: '20%',
            bottom: '5%'
          }
        ]
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

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Set options
    chartInstance.current.setOption(options, true);

    // Add click handler
    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        data: params.data,
        dataIndex: params.dataIndex,
        event: params.event
      });
    };

    chartInstance.current.on('click', handleClick);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      chartInstance.current?.off('click', handleClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [options, onInteraction]);

  useEffect(() => {
    // Resize chart when dimensions change
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  }, [width, height]);

  useEffect(() => {
    // Cleanup on unmount
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

// Chart Plugin Configuration Export
export const EChartsSankeyChartConfig = {
  name: 'echarts-sankey',
  displayName: 'ECharts Sankey Diagram',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive flow diagram for visualizing data flows and relationships',
  tags: ['sankey', 'flow', 'network', 'advanced'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Sankey Diagram'
      },
      sourceField: {
        type: 'string',
        title: 'Source Field',
        description: 'Field name for flow sources',
        default: 'source'
      },
      targetField: {
        type: 'string',
        title: 'Target Field',
        description: 'Field name for flow targets',
        default: 'target'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for flow values',
        default: 'value'
      },
      nodeAlign: {
        type: 'select',
        title: 'Node Alignment',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
          { label: 'Justify', value: 'justify' }
        ],
        default: 'justify'
      },
      orient: {
        type: 'select',
        title: 'Orientation',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' }
        ],
        default: 'horizontal'
      },
      draggable: {
        type: 'boolean',
        title: 'Draggable Nodes',
        description: 'Allow users to drag nodes',
        default: true
      },
      focusNodeAdjacency: {
        type: 'select',
        title: 'Focus Adjacent',
        options: [
          { label: 'None', value: false },
          { label: 'All Edges', value: 'allEdges' },
          { label: 'In Edges', value: 'inEdges' },
          { label: 'Out Edges', value: 'outEdges' }
        ],
        default: 'allEdges'
      },
      levels: {
        type: 'number',
        title: 'Layout Levels',
        default: 3,
        minimum: 1,
        maximum: 10
      },
      nodeGap: {
        type: 'number',
        title: 'Node Gap',
        default: 8,
        minimum: 0,
        maximum: 50
      }
    },
    required: ['sourceField', 'targetField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: 10,
    requiredFields: ['source', 'target', 'value'],
    optionalFields: [],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: SankeyChart
};

export default SankeyChart;