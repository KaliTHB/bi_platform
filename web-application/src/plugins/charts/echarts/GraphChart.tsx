import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as echarts from 'echarts';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';

interface GraphChartConfig extends ChartConfiguration {
  title?: string;
  subtitle?: string;
  nodes?: {
    field: string;
    nameField?: string;
    categoryField?: string;
    valueField?: string;
    symbolSizeField?: string;
  };
  edges?: {
    sourceField: string;
    targetField: string;
    valueField?: string;
    labelField?: string;
  };
  categories?: Array<{
    name: string;
    itemStyle?: {
      color?: string;
    };
  }>;
  layout?: 'force' | 'circular' | 'none';
  force?: {
    repulsion?: number;
    gravity?: number;
    edgeLength?: number;
    layoutAnimation?: boolean;
  };
  symbolSize?: number | [number, number];
  roam?: boolean;
  draggable?: boolean;
  focusNodeAdjacency?: boolean;
  edgeSymbol?: [string, string];
  edgeSymbolSize?: [number, number];
  lineStyle?: {
    color?: string;
    width?: number;
    type?: 'solid' | 'dashed' | 'dotted';
  };
  label?: {
    show?: boolean;
    position?: string;
    formatter?: string;
  };
  animation?: boolean;
}

interface GraphChartProps extends ChartProps {
  config: GraphChartConfig;
}

export const GraphChart: React.FC<GraphChartProps> = ({
  data,
  config,
  dimensions = { width: 800, height: 600 },
  theme,
  onInteraction,
  onError,
  isLoading = false,
  error
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [processedData, setProcessedData] = useState<{ nodes: any[], links: any[], categories?: any[] }>({
    nodes: [],
    links: [],
    categories: []
  });

  // Process data for graph chart
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessedData({ nodes: [], links: [], categories: [] });
      return;
    }

    try {
      // Extract nodes and edges from data
      const nodesMap = new Map();
      const links: any[] = [];
      const categoriesSet = new Set();

      // Process each data row
      data.forEach((item, index) => {
        if (config.edges) {
          // Handle edge data
          const source = item[config.edges.sourceField];
          const target = item[config.edges.targetField];
          const value = config.edges.valueField ? item[config.edges.valueField] : 1;
          const label = config.edges.labelField ? item[config.edges.labelField] : undefined;

          if (source && target) {
            // Add nodes to map
            if (!nodesMap.has(source)) {
              nodesMap.set(source, {
                id: source,
                name: source,
                symbolSize: config.symbolSize || 30,
                category: 0
              });
            }
            if (!nodesMap.has(target)) {
              nodesMap.set(target, {
                id: target,
                name: target,
                symbolSize: config.symbolSize || 30,
                category: 0
              });
            }

            // Add link
            links.push({
              source,
              target,
              value,
              label: label ? { show: true, formatter: label } : undefined
            });
          }
        } else if (config.nodes) {
          // Handle node data
          const nodeId = item[config.nodes.field];
          const nodeName = config.nodes.nameField ? item[config.nodes.nameField] : nodeId;
          const nodeCategory = config.nodes.categoryField ? item[config.nodes.categoryField] : 0;
          const nodeValue = config.nodes.valueField ? item[config.nodes.valueField] : 1;
          const nodeSize = config.nodes.symbolSizeField ? item[config.nodes.symbolSizeField] : config.symbolSize || 30;

          if (nodeId) {
            nodesMap.set(nodeId, {
              id: nodeId,
              name: nodeName,
              value: nodeValue,
              symbolSize: nodeSize,
              category: nodeCategory
            });

            if (nodeCategory) {
              categoriesSet.add(nodeCategory);
            }
          }
        }
      });

      const nodes = Array.from(nodesMap.values());
      const categories = config.categories || Array.from(categoriesSet).map((cat, index) => ({
        name: String(cat),
        itemStyle: { color: theme?.colors?.[index % (theme.colors.length || 1)] || '#5470c6' }
      }));

      setProcessedData({ nodes, links, categories });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process graph data';
      onError?.(new Error(errorMessage));
      setProcessedData({ nodes: [], links: [], categories: [] });
    }
  }, [data, config, theme]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || processedData.nodes.length === 0) return;

    try {
      // Initialize ECharts instance
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const option: echarts.EChartsOption = {
        title: config.title ? {
          text: config.title,
          subtext: config.subtitle,
          left: 'center',
          textStyle: {
            color: theme?.textColor || '#333'
          }
        } : undefined,
        backgroundColor: theme?.backgroundColor || 'transparent',
        tooltip: {
          show: true,
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `${params.name}<br/>Value: ${params.value || 'N/A'}`;
            } else if (params.dataType === 'edge') {
              return `${params.source} → ${params.target}<br/>Value: ${params.value || 'N/A'}`;
            }
            return params.name;
          }
        },
        legend: processedData.categories && processedData.categories.length > 0 ? {
          data: processedData.categories.map(cat => cat.name),
          bottom: 10,
          textStyle: {
            color: theme?.textColor || '#333'
          }
        } : undefined,
        series: [{
          type: 'graph',
          layout: config.layout || 'force',
          data: processedData.nodes,
          links: processedData.links,
          categories: processedData.categories,
          roam: config.roam !== false,
          draggable: config.draggable !== false,
          focusNodeAdjacency: config.focusNodeAdjacency !== false,
          symbolSize: config.symbolSize || 30,
          edgeSymbol: config.edgeSymbol || ['none', 'arrow'],
          edgeSymbolSize: config.edgeSymbolSize || [4, 10],
          lineStyle: {
            color: config.lineStyle?.color || 'source',
            width: config.lineStyle?.width || 2,
            type: config.lineStyle?.type || 'solid',
            ...config.lineStyle
          },
          label: {
            show: config.label?.show !== false,
            position: config.label?.position || 'right',
            formatter: config.label?.formatter || '{b}',
            color: theme?.textColor || '#333',
            ...config.label
          },
          force: config.layout === 'force' ? {
            repulsion: config.force?.repulsion || 1000,
            gravity: config.force?.gravity || 0.2,
            edgeLength: config.force?.edgeLength || 150,
            layoutAnimation: config.force?.layoutAnimation !== false,
            ...config.force
          } : undefined,
          animation: config.animation !== false,
          animationDuration: 1500,
          animationEasingUpdate: 'quinticInOut'
        }]
      };

      chartInstance.current.setOption(option, true);

      // Handle interactions
      if (onInteraction) {
        const handleClick = (params: any) => {
          onInteraction({
            type: 'click',
            data: params.data,
            dataIndex: params.dataIndex,
            seriesIndex: params.seriesIndex
          });
        };

        chartInstance.current.off('click');
        chartInstance.current.on('click', handleClick);
      }

      // Handle resize
      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);
      chartInstance.current.resize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render graph chart';
      onError?.(new Error(errorMessage));
    }
  }, [processedData, config, dimensions, theme, onInteraction]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = undefined;
      }
    };
  }, []);

  if (error) {
    return (
      <Alert severity="error" sx={{ width: dimensions.width, height: dimensions.height }}>
        Chart Error: {error}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data available for graph chart
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={chartRef}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        '& canvas': {
          borderRadius: 1
        }
      }}
    />
  );
};

export default GraphChart;