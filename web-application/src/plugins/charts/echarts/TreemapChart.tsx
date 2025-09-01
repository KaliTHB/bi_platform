// File: src/plugins/charts/echarts/TreemapChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface TreemapChartConfig {
  nameField: string;
  valueField: string;
  parentField?: string;
  colorField?: string;
  title?: string;
  showLabels?: boolean;
  leafDepth?: number;
  roam?: boolean;
  breadcrumb?: boolean;
}

interface TreemapChartProps extends ChartProps {
  chartId?: string;
}

export const TreemapChart: React.FC<TreemapChartProps> = ({
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
      const chartConfig = config as TreemapChartConfig;
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

      let treemapData: any[];
      
      if (chartConfig.parentField) {
        // Hierarchical data with parent-child relationships
        treemapData = buildHierarchy(dataArray);
      } else {
        // Flat data - convert to treemap format
        treemapData = dataArray.map(item => ({
          name: item[chartConfig.nameField],
          value: parseFloat(item[chartConfig.valueField]) || 0
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
            roam: chartConfig.roam || false,
            nodeClick: 'zoomToNode',
            breadcrumb: chartConfig.breadcrumb ? {
              show: true
            } : {
              show: false
            },
            label: {
              show: chartConfig.showLabels !== false,
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(options, true);

    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        chartId: chartId || 'echarts-treemap-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-treemap-chart',
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