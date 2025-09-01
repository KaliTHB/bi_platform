// File: src/plugins/charts/echarts/RadarChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps,ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface RadarChartConfig {
  dimensions: Array<{
    name: string;
    field: string;
    max?: number;
    min?: number;
  }>;
  seriesField?: string;
  title?: string;
  showLegend?: boolean;
  shape?: 'polygon' | 'circle';
  radius?: string | number;
}

interface RadarChartProps extends ChartProps {
  chartId?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
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
      const chartConfig = config as RadarChartConfig;
      const dataArray = getDataArray(data);
      
      if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
        throw new Error('Radar chart requires dimensions configuration');
      }

      // Prepare radar indicator
      const indicator = chartConfig.dimensions.map(dim => {
        const values = dataArray.map(item => parseFloat(item[dim.field]) || 0);
        const maxValue = dim.max !== undefined ? dim.max : Math.max(...values);
        const minValue = dim.min !== undefined ? dim.min : Math.min(...values);
        
        return {
          name: dim.name,
          max: maxValue,
          min: minValue
        };
      });

      // Group data by series field if provided
      const series: any[] = [];
      
      if (chartConfig.seriesField) {
        const groupedData = new Map<string, any[]>();
        
        dataArray.forEach(item => {
          const seriesValue = item[chartConfig.seriesField!];
          if (!groupedData.has(seriesValue)) {
            groupedData.set(seriesValue, []);
          }
          groupedData.get(seriesValue)!.push(item);
        });

        groupedData.forEach((items, seriesName) => {
          // For multiple items in a series, we could average them or use the first one
          const representativeItem = items[0]; // Using first item for simplicity
          
          const values = chartConfig.dimensions.map(dim => 
            parseFloat(representativeItem[dim.field]) || 0
          );

          series.push({
            name: seriesName,
            type: 'radar',
            data: [{
              value: values,
              name: seriesName
            }]
          });
        });
      } else {
        // Single series - use all data points or first item
        const values = chartConfig.dimensions.map(dim => {
          // Average all values for this dimension
          const dimValues = dataArray.map(item => parseFloat(item[dim.field]) || 0);
          return dimValues.reduce((sum, val) => sum + val, 0) / dimValues.length;
        });

        series.push({
          name: chartConfig.title || 'Data',
          type: 'radar',
          data: [{
            value: values,
            name: chartConfig.title || 'Data'
          }]
        });
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
          trigger: 'item'
        },
        legend: {
          show: chartConfig.showLegend !== false && series.length > 1,
          orient: 'vertical',
          left: 'left',
          data: series.map(s => s.name)
        },
        radar: {
          indicator,
          shape: chartConfig.shape || 'polygon',
          radius: chartConfig.radius || '75%',
          splitNumber: 5,
          nameGap: 15,
          name: {
            textStyle: {
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          splitLine: {
            lineStyle: {
              color: [
                'rgba(238, 197, 102, 0.1)',
                'rgba(238, 197, 102, 0.2)',
                'rgba(238, 197, 102, 0.4)',
                'rgba(238, 197, 102, 0.6)',
                'rgba(238, 197, 102, 0.8)',
                'rgba(238, 197, 102, 1)'
              ].reverse()
            }
          },
          splitArea: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: 'rgba(238, 197, 102, 0.5)'
            }
          }
        },
        series: series.map((s, index) => ({
          ...s,
          areaStyle: {
            opacity: 0.1
          },
          lineStyle: {
            width: 2
          },
          symbol: 'none',
          itemStyle: {
            color: `hsl(${index * 360 / series.length}, 70%, 50%)`
          }
        })),
        animation: true
      };
    } catch (error) {
      console.error('Error processing radar chart data:', error);
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
        chartId: chartId || 'echarts-radar-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-radar-chart',
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

export const EChartsRadarChartConfig: ChartPluginConfig = {
  name: 'echarts-radar',
  displayName: 'ECharts Radar Chart',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Multi-dimensional data visualization with radar/spider chart',
  tags: ['radar', 'spider', 'multidimensional', 'comparison'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Radar Chart'
      },
      dimensions: {
        type: 'array',
        title: 'Dimensions',
        description: 'List of dimension fields',
        items: {
          type: 'string',
          title: 'Dimension Field'
        },
        minItems: 3
      },
      seriesField: {
        type: 'string',
        title: 'Series Field',
        description: 'Field for multiple radar series'
      },
      shape: {
        type: 'string',
        title: 'Radar Shape',
        enum: ['polygon', 'circle'],
        default: 'polygon'
      },
      splitNumber: {
        type: 'number',
        title: 'Grid Split Number',
        default: 5,
        minimum: 3,
        maximum: 10
      }
    },
    required: ['dimensions']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: 20,
    requiredFields: ['dimension1', 'dimension2', 'dimension3'],
    optionalFields: ['series', 'category'],
    supportedTypes: ['number'],
    aggregationSupport: true,
    pivotSupport: true
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: RadarChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: false,
    drilldown: false,
    tooltip: true,
    crossFilter: true
  }
};