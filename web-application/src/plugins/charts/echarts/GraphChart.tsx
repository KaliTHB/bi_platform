// File: ./src/plugins/charts/echarts/GraphChart.tsx

import React from 'react';
import { ECharts, init, ECBasicOption } from 'echarts';
import { ChartProps, ChartConfiguration, AnimationConfiguration } from '../../../types/chart.types';

// Define ChartData type (import from proper location if available)
// import { ChartData } from '../../../types/chart.types'; // Use this if ChartData is defined there
interface ChartData {
  rows?: any[];
  data?: any[];
  columns?: any[];
  metadata?: any;
  [key: string]: any;
}

// Option 1: Use proper AnimationConfiguration type
interface GraphChartConfig extends ChartConfiguration {
  // Remove animation override if you want to use the parent type
  // OR properly define it as AnimationConfiguration
  animation?: AnimationConfiguration; // ✅ Matches parent interface
  
  // Graph-specific properties
  layout?: 'force' | 'circular' | 'none';
  roam?: boolean;
  draggable?: boolean;
  focusNodeAdjacency?: boolean;
  edgeSymbol?: [string, string];
  edgeSymbolSize?: [number, number];
  force?: {
    repulsion?: number;
    gravity?: number;
    edgeLength?: number;
    layoutAnimation?: boolean;
  };
  nodes?: Array<{
    id: string;
    name: string;
    value?: number;
    category?: number;
    x?: number;
    y?: number;
    fixed?: boolean;
  }>;
  links?: Array<{
    source: string;
    target: string;
    value?: number;
    lineStyle?: any;
  }>;
  categories?: Array<{
    name: string;
    itemStyle?: any;
  }>;
}

interface GraphChartProps extends ChartProps {
  config: GraphChartConfig; // or GraphChartConfigAlt
}

const GraphChart: React.FC<GraphChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<ECharts | null>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;

    let handleResize: (() => void) | null = null;

    try {
      // Initialize chart
      chartInstance.current = init(chartRef.current, theme?.name || 'default');

      // Prepare graph data
      const graphData = prepareGraphData(data, config);

      // Chart options (using type assertion to avoid ECharts type conflicts)
      const option = {
        title: {
          text: config.title || 'Network Graph',
          left: 'center',
          textStyle: {
            color: theme?.textColor || '#333'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `${params.name}: ${params.value || 'N/A'}`;
            } else {
              return `${params.data.source} → ${params.data.target}`;
            }
          }
        },
        legend: config.showLegend ? {
          data: config.categories?.map(cat => cat.name) || [],
          bottom: 0
        } : undefined,
        animation: config.animation !== false,
        animationDurationUpdate: config.animation !== false ? 1500 : 0,
        animationEasingUpdate: config.animation !== false ? 'cubicOut' : undefined,
        series: [{
          type: 'graph',
          layout: config.layout || 'force',
          data: graphData.nodes,
          links: graphData.links,
          categories: config.categories,
          roam: config.roam !== false, // Default to true
          draggable: config.draggable !== false,
          focusNodeAdjacency: config.focusNodeAdjacency !== false,
          edgeSymbol: config.edgeSymbol || ['circle', 'arrow'],
          edgeSymbolSize: config.edgeSymbolSize || [4, 10],
          force: {
            repulsion: config.force?.repulsion || 200,
            gravity: config.force?.gravity || 0.1,
            edgeLength: config.force?.edgeLength || 50,
            layoutAnimation: config.force?.layoutAnimation !== false,
            ...config.force
          },
          label: {
            show: config.showLabels !== false,
            position: 'right'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
            opacity: 0.6
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          }
        }]
      } as ECBasicOption;

      chartInstance.current.setOption(option);

      // Handle interactions
      if (onInteraction) {
        chartInstance.current.on('click', (params) => {
          onInteraction({
            type: 'click',
            data: params.data,
            seriesIndex: params.seriesIndex,
            dataIndex: params.dataIndex
          });
        });
      }

      // Handle resize
      handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);

    } catch (error) {
      console.error('Error initializing graph chart:', error);
      if (onError) {
        onError({
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'initialization_error'
        });
      }
    }

    // Cleanup function - always returned regardless of success or error
    return () => {
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [data, config, dimensions, theme]);

  // Resize chart when dimensions change
  React.useEffect(() => {
    chartInstance.current?.resize();
  }, [dimensions.width, dimensions.height]);

  return (
    <div
      ref={chartRef}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        minHeight: '300px'
      }}
    />
  );
};

// Helper function to prepare graph data
function prepareGraphData(data: any[] | ChartData | any, config: GraphChartConfig) {
  try {
    // Type guard to check if data is array-like
    const isArrayLike = (value: any): value is any[] => {
      return Array.isArray(value);
    };

    // Type guard to check if data is ChartData object
    const isChartData = (value: any): value is ChartData => {
      return value && typeof value === 'object' && !Array.isArray(value) && (value.rows || value.data);
    };

    // Convert to array based on data type
    let dataArray: any[] = [];
    
    if (isArrayLike(data)) {
      dataArray = data;
    } else if (isChartData(data)) {
      dataArray = data.rows || data.data || [];
    } else if (data && typeof data === 'object') {
      // Handle other object formats
      dataArray = Object.values(data);
    } else {
      // Fallback to empty array
      console.warn('GraphChart: Invalid data format, using empty array');
      dataArray = [];
    }
    
    // If nodes and links are provided in config, use them directly
    if (config.nodes && config.links) {
      return {
        nodes: config.nodes,
        links: config.links
      };
    }

    // Otherwise, transform the data array into nodes and links
    const nodes = dataArray.map((item: any, index: number) => {
      if (!item) return { id: `node_${index}`, name: `Node ${index}`, value: 1, category: 0 };
      
      return {
        id: item.id || `node_${index}`,
        name: item.name || item.label || `Node ${index}`,
        value: typeof item.value === 'number' ? item.value : 1,
        category: typeof item.category === 'number' ? item.category : 0,
        x: typeof item.x === 'number' ? item.x : undefined,
        y: typeof item.y === 'number' ? item.y : undefined,
        fixed: Boolean(item.fixed)
      };
    });

    const links = dataArray.reduce((acc: any[], item: any, index: number) => {
      if (item?.connections && Array.isArray(item.connections)) {
        item.connections.forEach((targetId: string) => {
          if (typeof targetId === 'string') {
            acc.push({
              source: item.id || `node_${index}`,
              target: targetId,
              value: typeof item.connectionValue === 'number' ? item.connectionValue : 1
            });
          }
        });
      }
      return acc;
    }, []);

    return { nodes, links };
    
  } catch (error) {
    console.error('Error preparing graph data:', error);
    // Return minimal fallback data
    return {
      nodes: [{ id: 'node_0', name: 'Default Node', value: 1, category: 0 }],
      links: []
    };
  }
}

export default GraphChart;

// Export the config type for use in other components
export type { GraphChartConfig };