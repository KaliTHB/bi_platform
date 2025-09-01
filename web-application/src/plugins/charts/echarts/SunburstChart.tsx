'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartData } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  extractFieldValues, 
  extractNumericValues, 
  createChartConfig 
} from '../utils/chartDataUtils';

export interface SunburstChartConfig {
  title?: string;
  nameField: string;
  valueField: string;
  parentField?: string;
  colorField?: string;
  radius?: [string, string];
  sort?: string | null;
  levels?: any[];
  colors?: string[];
}

// Utility function to normalize data to array format
const normalizeData = (data: any[] | ChartData): any[] => {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && 'rows' in data) {
    return (data as ChartData).rows || [];
  }
  
  return [];
};

// Utility function to check if data is empty
const isDataEmpty = (data: any[] | ChartData): boolean => {
  const normalizedData = normalizeData(data);
  return normalizedData.length === 0;
};

export const SunburstChart: React.FC<ChartProps> = ({
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
    if (isDataEmpty(data)) {
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
      } as echarts.EChartsOption;
    }

    // Normalize data to array format
    const chartData = normalizeData(data);
    
    // Create safe configuration with defaults
    const chartConfig = createChartConfig(config, {
      nameField: 'name',
      valueField: 'value',
      title: 'Sunburst Chart',
      radius: ['0%', '90%'],
      sort: null,
      colors: []
    }) as SunburstChartConfig;

    try {
      // Build hierarchy helper function
      const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
        if (!chartConfig.parentField) {
          // If no parent field, treat as flat structure
          return items.map(item => ({
            name: item[chartConfig.nameField] || 'Unknown',
            value: Number(item[chartConfig.valueField]) || 0,
            itemStyle: chartConfig.colorField ? {
              color: item[chartConfig.colorField]
            } : undefined
          }));
        }

        // Recursive hierarchy building with parent field
        return items
          .filter(item => {
            const parentValue = item[chartConfig.parentField!];
            return parentValue === parentId || 
                   (parentId === null && (!parentValue || parentValue === ''));
          })
          .map(item => {
            const children = buildHierarchy(items, item[chartConfig.nameField]);
            return {
              name: item[chartConfig.nameField] || 'Unknown',
              value: Number(item[chartConfig.valueField]) || 0,
              children: children.length > 0 ? children : undefined,
              itemStyle: chartConfig.colorField ? {
                color: item[chartConfig.colorField]
              } : undefined
            };
          });
      };

      // Generate hierarchical data
      const hierarchicalData = buildHierarchy(chartData);

      // Default level configuration
      const defaultLevels = [
        {},
        {
          r0: '15%',
          r: '35%',
          itemStyle: {
            borderWidth: 2
          },
          label: {
            rotate: 'tangential'
          }
        },
        {
          r0: '35%',
          r: '70%',
          label: {
            align: 'right'
          }
        },
        {
          r0: '70%',
          r: '72%',
          label: {
            position: 'outside',
            padding: 3,
            silent: false
          },
          itemStyle: {
            borderWidth: 3
          }
        }
      ];

      const option: echarts.EChartsOption = {
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
            if (params.data) {
              return `${params.data.name}<br/>${chartConfig.valueField}: ${params.data.value}`;
            }
            return params.name;
          }
        },
        series: {
          type: 'sunburst',
          data: hierarchicalData,
          radius: chartConfig.radius || ['0%', '90%'],
          sort: chartConfig.sort || undefined,
          emphasis: {
            focus: 'ancestor'
          },
          levels: chartConfig.levels || defaultLevels,
          animationType: 'scale',
          animationEasing: 'elasticOut' as any,
          animationDelay: (idx: number) => idx * 50
        } as any,
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut' as any
      };

      return option;
    } catch (error) {
      console.error('Error processing sunburst chart data:', error);
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
      } as echarts.EChartsOption;
    }
  }, [data, config, onError]);

  useEffect(() => {
    if (!chartRef.current) return;

    let resizeListener: (() => void) | null = null;

    try {
      // Initialize chart
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      // Set options
      chartInstance.current.setOption(options, true);

      // Add event handlers
      const handleClick = (params: any) => {
        onInteraction?.({
          type: 'click',
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex
        });
      };

      const handleMouseOver = (params: any) => {
        onInteraction?.({
          type: 'hover',
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex
        });
      };

      chartInstance.current.on('click', handleClick);
      chartInstance.current.on('mouseover', handleMouseOver);

      // Handle resize
      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);
      resizeListener = handleResize;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to render sunburst chart';
      onError?.(new Error(errorMessage));
    }

    // Always return cleanup function
    return () => {
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (chartInstance.current) {
        chartInstance.current.off('click');
        chartInstance.current.off('mouseover');
      }
    };
  }, [options, onInteraction, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
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
export const EChartsSunburstChartConfig = {
  name: 'echarts-sunburst',
  displayName: 'ECharts Sunburst Chart',
  category: 'hierarchical',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive hierarchical sunburst chart for multi-level data visualization',
  tags: ['sunburst', 'hierarchical', 'nested', 'radial'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Sunburst Chart'
      },
      nameField: {
        type: 'string',
        title: 'Name Field',
        description: 'Field name for segment names',
        default: 'name'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for segment values',
        default: 'value'
      },
      parentField: {
        type: 'string',
        title: 'Parent Field',
        description: 'Optional field for hierarchical relationships'
      },
      colorField: {
        type: 'string',
        title: 'Color Field',
        description: 'Optional field for custom colors'
      },
      radius: {
        type: 'array',
        title: 'Radius Range',
        description: 'Inner and outer radius percentages',
        items: { type: 'string' },
        default: ['0%', '90%']
      },
      sort: {
        type: 'select',
        title: 'Sort Order',
        options: [
          { label: 'None', value: null },
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' }
        ],
        default: null
      }
    },
    required: ['nameField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['name', 'value'],
    optionalFields: ['parent', 'color'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: SunburstChart
};

export default SunburstChart;