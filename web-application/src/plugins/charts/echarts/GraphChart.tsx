import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts as EChartsInstance } from 'echarts';

// Define the correct types for ECharts Graph
export interface GraphNodeItemStyle {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderType?: 'solid' | 'dashed' | 'dotted';
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface GraphNodeLabel {
  show?: boolean;
  position?: 'top' | 'left' | 'right' | 'bottom' | 'inside' | 'insideLeft' | 'insideRight' | 'insideTop' | 'insideBottom';
  formatter?: string | ((params: any) => string);
  color?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  value?: number;
  category?: number;
  symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none' | string;
  symbolSize?: number | number[];
  x?: number;
  y?: number;
  fixed?: boolean;
  itemStyle?: GraphNodeItemStyle;
  label?: GraphNodeLabel;
}

export interface GraphLinkLineStyle {
  color?: string;
  width?: number;
  type?: 'solid' | 'dashed' | 'dotted';
  curveness?: number;
  opacity?: number;
}

export interface GraphLinkLabel {
  show?: boolean;
  position?: 'start' | 'middle' | 'end';
  formatter?: string | ((params: any) => string);
  color?: string;
  fontSize?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
  lineStyle?: GraphLinkLineStyle;
  label?: GraphLinkLabel;
}

export interface GraphCategoryItemStyle {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface GraphCategory {
  name: string;
  itemStyle?: GraphCategoryItemStyle;
  symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none' | string;
  symbolSize?: number | number[];
}

export interface ForceConfig {
  initLayout?: 'circular' | 'none';
  repulsion?: number | number[];
  gravity?: number;
  edgeLength?: number | number[];
  layoutAnimation?: boolean;
  friction?: number;
}

export interface GraphChartData {
  nodes: GraphNode[];
  links: GraphLink[];
  categories?: GraphCategory[];
}

export interface GraphChartProps {
  data: GraphChartData;
  options?: EChartsOption;
  width?: number | string;
  height?: number | string;
  className?: string;
  layout?: 'none' | 'circular' | 'force';
  roam?: boolean | 'scale' | 'move';
  focusNodeAdjacency?: boolean | 'allEdges';
  draggable?: boolean;
  theme?: string | object;
  onChartReady?: (chart: EChartsInstance) => void;
  onEvents?: Record<string, (params: any) => void>;
}

const GraphChart: React.FC<GraphChartProps> = ({
  data,
  options = {},
  width = '100%',
  height = 400,
  className = '',
  layout = 'force',
  roam = true,
  focusNodeAdjacency = true,
  draggable = true,
  theme,
  onChartReady,
  onEvents = {}
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsInstance | null>(null);

  // Validate data function
  const validateData = (chartData: GraphChartData): { isValid: boolean; error?: string } => {
    if (!chartData) {
      return { isValid: false, error: 'Chart data is required' };
    }

    if (!chartData.nodes || !Array.isArray(chartData.nodes)) {
      return { isValid: false, error: 'Nodes array is required' };
    }

    if (!chartData.links || !Array.isArray(chartData.links)) {
      return { isValid: false, error: 'Links array is required' };
    }

    if (chartData.nodes.length === 0) {
      return { isValid: false, error: 'At least one node is required' };
    }

    // Validate nodes
    for (let i = 0; i < chartData.nodes.length; i++) {
      const node = chartData.nodes[i];
      if (!node.id || typeof node.id !== 'string') {
        return { isValid: false, error: `Node at index ${i} must have a valid string id` };
      }
      if (!node.name || typeof node.name !== 'string') {
        return { isValid: false, error: `Node at index ${i} must have a valid string name` };
      }
    }

    // Create a set of valid node IDs for link validation
    const nodeIds = new Set(chartData.nodes.map(node => node.id));

    // Validate links
    for (let i = 0; i < chartData.links.length; i++) {
      const link = chartData.links[i];
      if (!link.source || typeof link.source !== 'string') {
        return { isValid: false, error: `Link at index ${i} must have a valid string source` };
      }
      if (!link.target || typeof link.target !== 'string') {
        return { isValid: false, error: `Link at index ${i} must have a valid string target` };
      }
      if (!nodeIds.has(link.source)) {
        return { isValid: false, error: `Link at index ${i} references non-existent source node: ${link.source}` };
      }
      if (!nodeIds.has(link.target)) {
        return { isValid: false, error: `Link at index ${i} references non-existent target node: ${link.target}` };
      }
    }

    return { isValid: true };
  };

  // Default chart options
  const getDefaultOptions = (): EChartsOption => ({
    title: {
      text: 'Graph Chart',
      top: 'top',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          return `${params.data.name}<br/>Value: ${params.data.value || 'N/A'}`;
        } else if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>Value: ${params.data.value || 'N/A'}`;
        }
        return params.name;
      }
    },
    legend: {
      show: !!data.categories && data.categories.length > 0,
      data: data.categories?.map(cat => cat.name) || [],
      top: 'bottom'
    },
    series: [
      {
        type: 'graph',
        layout: layout,
        data: data.nodes,
        links: data.links,
        categories: data.categories,
        roam: roam,
        focusNodeAdjacency: focusNodeAdjacency,
        draggable: draggable,
        symbol: 'circle',
        symbolSize: 20,
        itemStyle: {
          color: '#4A90E2'
        },
        lineStyle: {
          color: '#999',
          width: 2,
          curveness: 0.1
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        emphasis: {
          focus: 'adjacency',
          label: {
            show: true
          }
        },
        force: layout === 'force' ? {
          repulsion: 100,
          gravity: 0.05,
          edgeLength: 80,
          layoutAnimation: true
        } : undefined
      } as any
    ]
  });

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    // Validate data
    const validation = validateData(data);
    if (!validation.isValid) {
      console.error('GraphChart validation error:', validation.error);
      return undefined;
    }

    // Dispose existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    try {
      // Initialize chart with theme support
      chartInstanceRef.current = echarts.init(chartRef.current, theme);

      // Merge default options with provided options
      const chartOptions: EChartsOption = {
        ...getDefaultOptions(),
        ...options
      };

      // Set chart options
      chartInstanceRef.current.setOption(chartOptions, true);

      // Register event handlers
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.on(eventName, handler);
        }
      });

      // Call onChartReady callback
      if (onChartReady && chartInstanceRef.current) {
        onChartReady(chartInstanceRef.current);
      }

      // Handle resize
      const handleResize = () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstanceRef.current) {
          // Remove event handlers
          Object.keys(onEvents).forEach(eventName => {
            if (chartInstanceRef.current) {
              chartInstanceRef.current.off(eventName);
            }
          });
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating graph chart:', error);
      return undefined;
    }
  }, [data, options, layout, roam, focusNodeAdjacency, draggable, theme, onChartReady, onEvents]);

  // Handle validation errors
  const validation = validateData(data);
  if (!validation.isValid) {
    return (
      <div 
        className={`flex items-center justify-center border border-red-300 bg-red-50 ${className}`}
        style={{ width, height }}
      >
        <div className="text-red-500 text-center p-4">
          <p className="font-medium">Invalid Graph Data</p>
          <p className="text-sm mt-1">{validation.error}</p>
          <p className="text-xs mt-2 text-gray-500">Check console for more details</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

export default GraphChart;