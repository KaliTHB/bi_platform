// File: src/plugins/charts/echarts/WaterfallChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartData, ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface WaterfallChartConfig {
  title?: string;
  xField: string;
  yField: string;
  seriesField?: string;
  colorField?: string;
  showConnect?: boolean;
  connectStyle?: {
    stroke?: string;
    strokeDasharray?: string;
  };
  colors?: {
    positive?: string;
    negative?: string;
    total?: string;
  };
  showValues?: boolean;
  valueFormat?: string;
  showGrid?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

interface WaterfallChartProps extends ChartProps {
  chartId?: string;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
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
      const chartConfig = config as WaterfallChartConfig;
      const dataArray = getDataArray(data);
      
      // Process data for waterfall chart
      let runningTotal = 0;
      const processedData = dataArray.map((item, index) => {
        const value = parseFloat(item[chartConfig.yField]) || 0;
        const isLast = index === dataArray.length - 1;
        const name = item[chartConfig.xField];
        
        if (isLast) {
          // Last item is usually the total
          return {
            name,
            value: runningTotal + value,
            itemStyle: { 
              color: chartConfig.colors?.total || '#5470c6' 
            },
            isTotal: true,
            originalValue: value
          };
        } else {
          const startValue = runningTotal;
          runningTotal += value;
          
          return {
            name,
            value,
            startValue,
            endValue: runningTotal,
            itemStyle: { 
              color: value >= 0 
                ? (chartConfig.colors?.positive || '#73c0de')
                : (chartConfig.colors?.negative || '#fc8452')
            },
            isTotal: false,
            originalValue: value
          };
        }
      });

      // Create categories for x-axis
      const categories = processedData.map(item => item.name);
      
      // Prepare series data for ECharts
      const seriesData = processedData.map(item => {
        if (item.isTotal) {
          return {
            value: item.value,
            itemStyle: item.itemStyle,
            label: {
              show: chartConfig.showValues || false,
              position: 'top',
              formatter: chartConfig.valueFormat 
                ? `{c}${chartConfig.valueFormat}`
                : '{c}'
            }
          };
        } else {
          return {
            value: [item.startValue, item.endValue],
            itemStyle: item.itemStyle,
            label: {
              show: chartConfig.showValues || false,
              position: item.originalValue >= 0 ? 'top' : 'bottom',
              formatter: chartConfig.valueFormat 
                ? `{c}${chartConfig.valueFormat}`
                : '{c}'
            }
          };
        }
      });

      // Create connector data for lines between bars (if enabled)
      const connectorData: any[] = [];
      if (chartConfig.showConnect) {
        for (let i = 0; i < processedData.length - 1; i++) {
          const current = processedData[i];
          const next = processedData[i + 1];
          
          if (!current.isTotal && !next.isTotal) {
            connectorData.push([
              [i, current.endValue],
              [i + 1, next.startValue]
            ]);
          }
        }
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
            const dataIndex = params.dataIndex;
            const item = processedData[dataIndex];
            let tooltip = `${item.name}<br/>`;
            
            if (item.isTotal) {
              tooltip += `Total: ${item.value}`;
            } else {
              tooltip += `Change: ${item.originalValue}<br/>`;
              tooltip += `Running Total: ${item.endValue}`;
            }
            
            if (chartConfig.valueFormat) {
              tooltip = tooltip.replace(/(\d+)/g, `$1${chartConfig.valueFormat}`);
            }
            
            return tooltip;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true,
          show: chartConfig.showGrid !== false
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisPointer: {
            type: 'shadow'
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          // Main waterfall bars
          {
            name: chartConfig.title || 'Waterfall',
            type: 'custom',
            renderItem: (params: any, api: any) => {
              const dataIndex = params.dataIndex;
              const item = processedData[dataIndex];
              
              if (item.isTotal) {
                // Render total bar from 0
                const startCoord = api.coord([dataIndex, 0]);
                const endCoord = api.coord([dataIndex, item.value]);
                const rectHeight = Math.abs(endCoord[1] - startCoord[1]);
                const rectWidth = api.size([1, 0])[0] * 0.6;
                
                return {
                  type: 'rect',
                  shape: {
                    x: startCoord[0] - rectWidth / 2,
                    y: Math.min(startCoord[1], endCoord[1]),
                    width: rectWidth,
                    height: rectHeight
                  },
                  style: {
                    fill: item.itemStyle.color,
                    stroke: '#fff',
                    lineWidth: 1
                  }
                };
              } else {
                // Render change bar
                const startCoord = api.coord([dataIndex, item.startValue]);
                const endCoord = api.coord([dataIndex, item.endValue]);
                const rectHeight = Math.abs(endCoord[1] - startCoord[1]);
                const rectWidth = api.size([1, 0])[0] * 0.6;
                
                return {
                  type: 'rect',
                  shape: {
                    x: startCoord[0] - rectWidth / 2,
                    y: Math.min(startCoord[1], endCoord[1]),
                    width: rectWidth,
                    height: rectHeight
                  },
                  style: {
                    fill: item.itemStyle.color,
                    stroke: '#fff',
                    lineWidth: 1
                  }
                };
              }
            },
            data: processedData.map(item => ({
              value: item.isTotal ? item.value : item.originalValue,
              itemStyle: item.itemStyle
            })),
            z: 100
          },
          // Connector lines
          ...(chartConfig.showConnect && connectorData.length > 0 
            ? connectorData.map((connector, index) => ({
                name: `Connector-${index}`,
                type: 'line' as const,
                data: connector,
                lineStyle: {
                  color: chartConfig.connectStyle?.stroke || '#8c8c8c',
                  type: 'dashed' as const,
                  width: 1
                },
                symbol: 'none' as const,
                silent: true,
                showInLegend: false
              }))
            : [])
        ],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      } as echarts.EChartsOption;

    } catch (error) {
      console.error('Error processing waterfall chart data:', error);
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

      // Add event handlers with fixed TypeScript interface
      const handleClick = (params: any) => {
        onInteraction?.({
          type: 'click',
          chartId: chartId || 'echarts-waterfall-chart', // ✅ Add required chartId
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex,
          timestamp: Date.now() // ✅ Add timestamp, remove event property
        });
      };

      const handleMouseOver = (params: any) => {
        onInteraction?.({
          type: 'hover',
          chartId: chartId || 'echarts-waterfall-chart', // ✅ Add required chartId
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex,
          timestamp: Date.now() // ✅ Add timestamp
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to render waterfall chart';
      onError?.(new Error(errorMessage));
    }

    // Cleanup function
    return () => {
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (chartInstance.current) {
        chartInstance.current.off('click');
        chartInstance.current.off('mouseover');
      }
    };
  }, [chartId, options, onInteraction, onError]); // ✅ Add chartId to dependencies

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

export const EChartsWaterfallChartConfig: ChartPluginConfig = {
  name: 'echarts-waterfall',
  displayName: 'ECharts Waterfall Chart',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Financial waterfall chart showing incremental changes',
  tags: ['waterfall', 'financial', 'incremental', 'cumulative'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Waterfall Chart'
      },
      xField: {
        type: 'string',
        title: 'Category Field',
        required: true
      },
      yField: {
        type: 'string',
        title: 'Value Field',
        required: true
      },
      showConnectors: {
        type: 'boolean',
        title: 'Show Connectors',
        default: true
      },
      colors: {
        type: 'object',
        title: 'Colors',
        properties: {
          positive: {
            type: 'string',
            title: 'Positive Color',
            default: '#2E8B57'
          },
          negative: {
            type: 'string',
            title: 'Negative Color',
            default: '#DC143C'
          },
          total: {
            type: 'string',
            title: 'Total Color',
            default: '#4682B4'
          }
        }
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 50,
    requiredFields: ['category', 'value'],
    optionalFields: ['type'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: WaterfallChart, // Replace with actual component import
  
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