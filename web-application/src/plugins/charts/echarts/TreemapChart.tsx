// File: /web-application/src/plugins/charts/echarts/TreemapChart.tsx

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  createChartConfig 
} from '../utils/chartDataUtils';

export interface TreemapChartConfig {
  title?: string;
  nameField: string;
  valueField: string;
  parentField?: string;
  colorField?: string;
  showLabels?: boolean;
  leafDepth?: number;
  roam?: boolean;
  breadcrumb?: boolean;
}

export const TreemapChart: React.FC<ChartProps> = ({
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
      nameField: 'name',
      valueField: 'value',
      title: 'Treemap',
      showLabels: true,
      leafDepth: null,
      roam: false,
      breadcrumb: true
    }) as TreemapChartConfig;

    try {
      // Build hierarchical data structure
      const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => (chartConfig.parentField ? item[chartConfig.parentField] : null) === parentId)
          .map(item => ({
            name: item[chartConfig.nameField],
            value: item[chartConfig.valueField],
            children: buildHierarchy(items, item[chartConfig.nameField])
          }))
          .filter(item => item.children.length > 0 || item.value > 0);
      };

      let treemapData: any[];
      
      if (chartConfig.parentField) {
        // Hierarchical data with parent-child relationships
        treemapData = buildHierarchy(chartData);
      } else {
        // Flat data - convert to treemap format
        treemapData = chartData.map(item => ({
          name: item[chartConfig.nameField],
          value: item[chartConfig.valueField] || 0
        }));
      }

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
            return `${params.name}<br/>Value: ${params.value}`;
          }
        },
        breadcrumb: chartConfig.breadcrumb ? {
          show: true,
          emptyItemWidth: 25,
          height: 22,
          top: 'bottom',
          left: 'center',
          itemStyle: {
            color: 'rgba(0,0,0,0.7)',
            borderColor: 'rgba(255,255,255,0.7)',
            borderWidth: 1,
            shadowColor: 'rgba(150,150,150,1)',
            shadowBlur: 3,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            textStyle: {
              color: '#fff'
            }
          },
          emphasis: {
            itemStyle: {
              color: 'rgba(0,0,0,0.9)'
            }
          }
        } : undefined,
        series: [
          {
            type: 'treemap',
            data: treemapData,
            roam: chartConfig.roam,
            nodeClick: 'zoomToNode',
            breadcrumb: chartConfig.breadcrumb ? {
              show: true
            } : {
              show: false
            },
            label: {
              show: chartConfig.showLabels,
              formatter: '{b}',
              position: 'insideTopLeft',
              fontSize: 12,
              color: '#000'
            },
            upperLabel: {
              show: true,
              height: 30,
              formatter: '{b}',
              textStyle: {
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2,
              gapWidth: 2
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0,0,0,0.5)',
                borderColor: '#333',
                borderWidth: 3
              },
              label: {
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            levels: [
              {
                itemStyle: {
                  borderColor: '#777',
                  borderWidth: 0,
                  gapWidth: 1
                },
                upperLabel: {
                  show: false
                }
              },
              {
                itemStyle: {
                  borderColor: '#555',
                  borderWidth: 5,
                  gapWidth: 1
                },
                emphasis: {
                  itemStyle: {
                    borderColor: '#ddd'
                  }
                }
              },
              {
                colorSaturation: [0.35, 0.5],
                itemStyle: {
                  borderWidth: 5,
                  gapWidth: 1,
                  borderColorSaturation: 0.6
                }
              }
            ],
            leafDepth: chartConfig.leafDepth,
            animationDuration: 1000,
            animationEasing: 'cubicOut'
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing treemap chart data:', error);
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
export const EChartsTreemapChartConfig = {
  name: 'echarts-treemap',
  displayName: 'ECharts Treemap',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive treemap for hierarchical data visualization with zoom and drill-down',
  tags: ['treemap', 'hierarchical', 'space-filling', 'advanced'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Treemap'
      },
      nameField: {
        type: 'string',
        title: 'Name Field',
        description: 'Field name for item names',
        default: 'name'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for item sizes',
        default: 'value'
      },
      parentField: {
        type: 'string',
        title: 'Parent Field',
        description: 'Optional field for hierarchical relationships'
      },
      showLabels: {
        type: 'boolean',
        title: 'Show Labels',
        default: true
      },
      roam: {
        type: 'boolean',
        title: 'Enable Zoom/Pan',
        description: 'Allow users to zoom and pan the treemap',
        default: false
      },
      breadcrumb: {
        type: 'boolean',
        title: 'Show Breadcrumb',
        description: 'Display navigation breadcrumb',
        default: true
      },
      leafDepth: {
        type: 'number',
        title: 'Leaf Depth',
        description: 'Maximum depth to show (null for all levels)',
        minimum: 1,
        maximum: 10
      }
    },
    required: ['nameField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['name', 'value'],
    optionalFields: ['parent', 'color'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: TreemapChart
};

export default TreemapChart;