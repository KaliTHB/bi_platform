// File: src/plugins/charts/echarts/SunburstChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps,ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface SunburstChartConfig {
  nameField: string;
  valueField: string;
  parentField?: string;
  title?: string;
  radius?: [string, string] | string;
  center?: [string, string];
  showLabels?: boolean;
  labelRotate?: 'radial' | 'tangential' | number;
  sort?: 'desc' | 'asc' | null;
}

interface SunburstChartProps extends ChartProps {
  chartId?: string;
}

export const SunburstChart: React.FC<SunburstChartProps> = ({
  chartId,
  data,
  config,
  width = 400,
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
      const chartConfig = config as SunburstChartConfig;
      const dataArray = getDataArray(data);
      
      // Build hierarchical data structure
      const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => (chartConfig.parentField ? item[chartConfig.parentField] : null) === parentId)
          .map(item => ({
            name: item[chartConfig.nameField],
            value: parseFloat(item[chartConfig.valueField]) || 0,
            children: buildHierarchy(items, item[chartConfig.nameField])
          }))
          .filter(item => item.children.length > 0 || item.value > 0);
      };

      let sunburstData: any[];
      
      if (chartConfig.parentField) {
        // Hierarchical data with parent-child relationships
        sunburstData = buildHierarchy(dataArray);
      } else {
        // Flat data - treat all as siblings
        sunburstData = dataArray.map(item => ({
          name: item[chartConfig.nameField],
          value: parseFloat(item[chartConfig.valueField]) || 0
        }));
      }

      // Sort data if requested
      const sortData = (data: any[]) => {
        if (chartConfig.sort) {
          data.forEach(item => {
            if (item.children) {
              sortData(item.children);
            }
          });
          
          data.sort((a, b) => {
            if (chartConfig.sort === 'desc') {
              return b.value - a.value;
            } else {
              return a.value - b.value;
            }
          });
        }
        return data;
      };

      if (chartConfig.sort) {
        sunburstData = sortData(sunburstData);
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
            let result = `${params.name}`;
            if (params.value) {
              result += `<br/>Value: ${params.value}`;
            }
            if (params.percent) {
              result += `<br/>Percentage: ${params.percent}%`;
            }
            return result;
          }
        },
        series: [
          {
            type: 'sunburst',
            data: sunburstData,
            radius: chartConfig.radius || [0, '75%'],
            center: chartConfig.center || ['50%', '50%'],
            sort: chartConfig.sort,
            emphasis: {
              focus: 'ancestor'
            },
            label: {
              show: chartConfig.showLabels !== false,
              rotate: chartConfig.labelRotate || 'radial',
              minAngle: 4,
              fontSize: 11,
              fontWeight: 'bold'
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            levels: [
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
                  position: 'outside',
                  padding: 3,
                  silent: false
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
            ],
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: (idx: number) => Math.random() * 200
          }
        ],
        animation: true
      };
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
        chartId: chartId || 'echarts-sunburst-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-sunburst-chart',
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

export const EChartsSunburstChartConfig: ChartPluginConfig = {
  name: 'echarts-sunburst',
  displayName: 'ECharts Sunburst Chart',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Hierarchical data visualization with sunburst chart',
  tags: ['sunburst', 'hierarchy', 'nested', 'circular'],
  
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
        required: true
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        required: true
      },
      parentField: {
        type: 'string',
        title: 'Parent Field',
        description: 'Field indicating parent relationship'
      },
      radius: {
        type: 'array',
        title: 'Radius Range',
        items: {
          type: 'string'
        },
        default: ['20%', '90%']
      },
      highlightPolicy: {
        type: 'string',
        title: 'Highlight Policy',
        enum: ['descendant', 'ancestor', 'self'],
        default: 'descendant'
      }
    },
    required: ['nameField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 50,
    requiredFields: ['name', 'value'],
    optionalFields: ['parent', 'level'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: SunburstChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: false
  }
};
