// File: src/plugins/charts/echarts/ScatterChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

export interface ScatterChartConfig {
  xField: string;
  yField: string;
  sizeField?: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesName?: string;
  symbolSize?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

interface ScatterChartProps extends ChartProps {
  chartId?: string;
}

export const ScatterChart: React.FC<ScatterChartProps> = ({
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
      const chartConfig = config as ScatterChartConfig;
      const dataArray = getDataArray(data);
      
      const scatterData = dataArray.map(item => {
        const x = parseFloat(item[chartConfig.xField]) || 0;
        const y = parseFloat(item[chartConfig.yField]) || 0;
        const size = chartConfig.sizeField ? (parseFloat(item[chartConfig.sizeField]) || chartConfig.symbolSize || 8) : chartConfig.symbolSize || 8;
        return [x, y, size];
      });

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
          axisPointer: {
            type: 'cross'
          },
          formatter: (params: any) => {
            const [x, y, size] = params.data;
            let tooltip = `${chartConfig.xAxisLabel || 'X'}: ${x}<br/>`;
            tooltip += `${chartConfig.yAxisLabel || 'Y'}: ${y}<br/>`;
            if (chartConfig.sizeField) {
              tooltip += `${chartConfig.sizeField}: ${size}`;
            }
            return tooltip;
          }
        },
        legend: {
          show: chartConfig.showLegend !== false,
          data: [chartConfig.seriesName || 'Data']
        },
        grid: {
          show: chartConfig.showGrid !== false,
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: chartConfig.xAxisLabel,
          nameLocation: 'middle',
          nameGap: 30,
          splitLine: {
            show: chartConfig.showGrid !== false
          }
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yAxisLabel,
          nameLocation: 'middle',
          nameGap: 50,
          splitLine: {
            show: chartConfig.showGrid !== false
          }
        },
        series: [
          {
            name: chartConfig.seriesName || 'Data',
            type: 'scatter',
            data: scatterData,
            symbolSize: (data: number[]) => chartConfig.sizeField ? data[2] : chartConfig.symbolSize || 8,
            itemStyle: {
              color: '#5470c6'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing scatter chart data:', error);
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    chartInstance.current.setOption(options, true);

    const handleClick = (params: any) => {
      onInteraction?.({
        type: 'click',
        chartId: chartId || 'echarts-scatter-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-scatter-chart',
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
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('mouseover', handleMouseover);
    };
  }, [chartId, options, onInteraction]);

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

export const EChartsScatterChartConfig: ChartPluginConfig = {
  name: 'echarts-scatter',
  displayName: 'ECharts Scatter Plot',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive scatter plot for correlation analysis',
  tags: ['scatter', 'correlation', 'bubble', 'analysis'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Scatter Plot'
      },
      xField: {
        type: 'string',
        title: 'X-Axis Field',
        required: true
      },
      yField: {
        type: 'string',
        title: 'Y-Axis Field',
        required: true
      },
      sizeField: {
        type: 'string',
        title: 'Size Field',
        description: 'Field for bubble size (optional)'
      },
      colorField: {
        type: 'string',
        title: 'Color Field',
        description: 'Field for color grouping (optional)'
      },
      symbolSize: {
        type: 'number',
        title: 'Symbol Size',
        default: 10,
        minimum: 1,
        maximum: 50
      },
      showRegressionLine: {
        type: 'boolean',
        title: 'Show Regression Line',
        default: false
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['x', 'y'],
    optionalFields: ['size', 'color', 'category'],
    supportedTypes: ['number'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: ScatterChart, // Replace with actual component import
  
  interactionSupport: {
    zoom: true,
    pan: true,
    selection: true,
    brush: true,
    drilldown: false,
    tooltip: true,
    crossFilter: true
  }
};