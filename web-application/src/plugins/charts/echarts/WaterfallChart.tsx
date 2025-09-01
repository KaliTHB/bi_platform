// ECharts Waterfall Chart Component
// File: web-application/src/plugins/charts/echarts/WaterfallChart.tsx
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

export const WaterfallChart: React.FC<ChartProps> = ({
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
      xField: 'category',
      yField: 'value',
      title: 'Waterfall Chart',
      showConnect: true,
      colors: {
        positive: '#00cc96',
        negative: '#ff6692',
        total: '#ab63fa'
      },
      showValues: true,
      valueFormat: 'number'
    }) as WaterfallChartConfig;

    try {
      // Extract data fields
      const categories = extractFieldValues(chartData, chartConfig.xField, 'Unknown');
      const values = extractNumericValues(chartData, chartConfig.yField, 0);

      // Define proper type for processed data items
      interface ProcessedDataItem {
        name: string;
        value: number | [number, number, number]; // [start, end, change]
        itemStyle: {
          color: string;
        };
        label: {
          show: boolean;
          position: 'top' | 'bottom';
          formatter: (params: any) => string;
        };
        isTotal: boolean;
        rawValue: number; // Store the raw value for easy access
        startValue?: number; // For non-total items
        endValue?: number; // For non-total items
      }

      // Process data for waterfall
      let cumulativeValue = 0;
      const processedData: ProcessedDataItem[] = chartData.map((item, index) => {
        const value = values[index];
        const category = categories[index];
        const start = cumulativeValue;
        cumulativeValue += value;
        
        // Determine if this is a total item (typically the last item)
        const isTotal = index === chartData.length - 1 || 
                       category.toLowerCase().includes('total') ||
                       category.toLowerCase().includes('sum');
        
        return {
          name: category,
          value: isTotal ? cumulativeValue : [start, cumulativeValue, value],
          itemStyle: {
            color: isTotal ? 
              (chartConfig.colors?.total || '#ab63fa') : 
              (value >= 0 ? (chartConfig.colors?.positive || '#00cc96') : (chartConfig.colors?.negative || '#ff6692'))
          },
          label: {
            show: chartConfig.showValues || false,
            position: (value >= 0 ? 'top' : 'bottom') as 'top' | 'bottom',
            formatter: (params: any) => {
              const val = isTotal ? cumulativeValue : value;
              return formatValue(val, chartConfig.valueFormat || 'number');
            }
          },
          isTotal: isTotal,
          rawValue: value,
          startValue: isTotal ? undefined : start,
          endValue: isTotal ? undefined : cumulativeValue
        };
      });

      // Format value helper function (moved inside useMemo to avoid dependency issues)
      const formatValue = (value: number, format: string): string => {
        switch (format) {
          case 'currency':
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value);
          case 'percentage':
            return `${(value * 100).toFixed(1)}%`;
          case 'decimal2':
            return value.toFixed(2);
          default:
            return value.toString();
        }
      };

      // Create connector data if enabled - Fixed typing
      const connectorData: number[][][] = chartConfig.showConnect ? 
        processedData.slice(0, -1).map((currentItem, index) => {
          const nextItem = processedData[index + 1];
          
          // Get end value of current item
          const currentEndValue = currentItem.isTotal ? 
            (typeof currentItem.value === 'number' ? currentItem.value : 0) :
            (Array.isArray(currentItem.value) ? currentItem.value[1] : 0);
          
          // Get start value of next item
          const nextStartValue = nextItem.isTotal ? 
            (typeof nextItem.value === 'number' ? nextItem.value : 0) :
            (Array.isArray(nextItem.value) ? nextItem.value[0] : 0);
          
          return [
            [index + 0.4, currentEndValue],
            [index + 0.6, nextStartValue]
          ];
        }) : [];

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
            const dataIndex = params.dataIndex;
            if (dataIndex >= 0 && dataIndex < processedData.length) {
              const data = processedData[dataIndex];
              if (data.isTotal) {
                return `${data.name}<br/>Total: ${formatValue(data.rawValue, chartConfig.valueFormat || 'number')}`;
              } else {
                const startVal = data.startValue || 0;
                const endVal = data.endValue || 0;
                return `${data.name}<br/>Change: ${formatValue(data.rawValue, chartConfig.valueFormat || 'number')}<br/>Running Total: ${formatValue(endVal, chartConfig.valueFormat || 'number')}`;
              }
            }
            return '';
          }
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 6 ? 45 : 0
          }
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yField,
          nameLocation: 'middle',
          nameGap: 50
        },
        series: [
          {
            name: 'Waterfall',
            type: 'custom',
            renderItem: (params: any, api: any) => {
              const dataIndex = params.dataIndex;
              if (dataIndex >= 0 && dataIndex < processedData.length) {
                const dataItem = processedData[dataIndex];
                
                if (dataItem.isTotal) {
                  // Render total bar from 0 to total value
                  const totalValue = typeof dataItem.value === 'number' ? dataItem.value : 0;
                  const startCoord = api.coord([dataIndex, 0]);
                  const endCoord = api.coord([dataIndex, totalValue]);
                  
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
                    style: api.style({
                      fill: dataItem.itemStyle.color
                    })
                  };
                } else {
                  // Render change bar
                  const start = dataItem.startValue || 0;
                  const end = dataItem.endValue || 0;
                  const startCoord = api.coord([dataIndex, start]);
                  const endCoord = api.coord([dataIndex, end]);
                  
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
                    style: api.style({
                      fill: dataItem.itemStyle.color
                    })
                  };
                }
              }
              return null;
            },
            data: processedData.map(item => ({
              value: typeof item.value === 'number' ? item.value : item.value[1],
              itemStyle: item.itemStyle
            })),
            z: 100
          } as echarts.CustomSeriesOption,
          // Connector lines - Fixed typing with individual line series for each connector
          ...(chartConfig.showConnect && connectorData.length > 0 ? 
            connectorData.map((connector, index) => ({
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
            } as echarts.LineSeriesOption))
          : [])
        ] as echarts.SeriesOption[],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut' as any
      };

      return option;
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to render waterfall chart';
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

export default WaterfallChart;

// Chart Plugin Configuration Export
export const EChartsWaterfallChartConfig = {
  name: 'echarts-waterfall',
  displayName: 'ECharts Waterfall Chart',
  category: 'financial',
  library: 'echarts',
  version: '1.0.0',
  description: 'Waterfall chart showing cumulative effects of sequential positive and negative values',
  tags: ['waterfall', 'financial', 'cumulative', 'bridge', 'variance'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Waterfall Chart'
      },
      categoryField: {
        type: 'string',
        title: 'Category Field',
        description: 'Field name for x-axis categories',
        default: 'category'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for values',
        default: 'value'
      },
      typeField: {
        type: 'string',
        title: 'Type Field',
        description: 'Field indicating value type (positive/negative/total)',
        default: 'type'
      },
      startingValue: {
        type: 'number',
        title: 'Starting Value',
        description: 'Initial value for the waterfall',
        default: 0
      },
      showConnectorLines: {
        type: 'boolean',
        title: 'Show Connector Lines',
        description: 'Show lines connecting the bars',
        default: true
      },
      connectorLineStyle: {
        type: 'select',
        title: 'Connector Line Style',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' }
        ],
        default: 'dashed'
      },
      connectorLineColor: {
        type: 'color',
        title: 'Connector Line Color',
        default: '#999999'
      },
      positiveColor: {
        type: 'color',
        title: 'Positive Value Color',
        default: '#00da3c'
      },
      negativeColor: {
        type: 'color',
        title: 'Negative Value Color',
        default: '#ec0000'
      },
      totalColor: {
        type: 'color',
        title: 'Total Value Color',
        default: '#5470c6'
      },
      neutralColor: {
        type: 'color',
        title: 'Neutral Value Color',
        default: '#91cc75'
      },
      showValues: {
        type: 'boolean',
        title: 'Show Values on Bars',
        default: true
      },
      valuePosition: {
        type: 'select',
        title: 'Value Label Position',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Inside', value: 'inside' },
          { label: 'Bottom', value: 'bottom' }
        ],
        default: 'top'
      },
      showCumulative: {
        type: 'boolean',
        title: 'Show Cumulative Values',
        description: 'Display running totals',
        default: false
      },
      cumulativePosition: {
        type: 'select',
        title: 'Cumulative Label Position',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Inside', value: 'inside' },
          { label: 'Bottom', value: 'bottom' }
        ],
        default: 'inside'
      },
      barWidth: {
        type: 'string',
        title: 'Bar Width',
        description: 'Width as percentage of category width',
        default: '60%'
      },
      barGap: {
        type: 'string',
        title: 'Bar Gap',
        description: 'Gap between bars as percentage',
        default: '20%'
      },
      showGrid: {
        type: 'boolean',
        title: 'Show Grid',
        default: true
      },
      gridLineStyle: {
        type: 'select',
        title: 'Grid Line Style',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' }
        ],
        default: 'solid'
      },
      xAxisLabel: {
        type: 'string',
        title: 'X-Axis Label'
      },
      yAxisLabel: {
        type: 'string',
        title: 'Y-Axis Label'
      },
      rotateLabels: {
        type: 'number',
        title: 'Rotate X-Axis Labels (degrees)',
        default: 0,
        minimum: -90,
        maximum: 90
      },
      enableDataZoom: {
        type: 'boolean',
        title: 'Enable Data Zoom',
        default: false
      },
      animation: {
        type: 'boolean',
        title: 'Enable Animation',
        default: true
      },
      animationDelay: {
        type: 'number',
        title: 'Animation Delay (ms)',
        default: 0,
        minimum: 0,
        maximum: 2000
      }
    },
    required: ['categoryField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 20,
    requiredFields: ['category', 'value'],
    optionalFields: ['type'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false,
    specialRequirements: [
      'Values should represent changes, not absolute amounts',
      'Optional type field to specify positive/negative/total/neutral'
    ]
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: WaterfallChart
};