// File: src/plugins/charts/echarts/LineChart.tsx
'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps,ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';
export interface LineChartConfig {
  xField: string;
  yField: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesName?: string;
  smooth?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

interface LineChartProps extends ChartProps {
  chartId?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
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
      const chartConfig = config as LineChartConfig;
      const dataArray = getDataArray(data);
      
      const categories = dataArray.map(item => item[chartConfig.xField]);
      const values = dataArray.map(item => parseFloat(item[chartConfig.yField]) || 0);

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
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        legend: {
          show: chartConfig.showLegend !== false,
          data: [chartConfig.seriesName || chartConfig.yField]
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
          type: 'category',
          boundaryGap: false,
          data: categories,
          name: chartConfig.xAxisLabel,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: chartConfig.yAxisLabel,
          nameLocation: 'middle',
          nameGap: 50
        },
        series: [
          {
            name: chartConfig.seriesName || chartConfig.yField,
            type: 'line',
            smooth: chartConfig.smooth || false,
            showSymbol: chartConfig.showPoints !== false,
            areaStyle: chartConfig.showArea ? {} : undefined,
            data: values,
            lineStyle: {
              color: chartConfig.color || '#5470c6',
              width: 2
            },
            itemStyle: {
              color: chartConfig.color || '#5470c6'
            }
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing line chart data:', error);
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
        chartId: chartId || 'echarts-line-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex,
        timestamp: Date.now()
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-line-chart',
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

export const EChartsLineChartConfig: ChartPluginConfig = {
  name: 'echarts-line',
  displayName: 'Line Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Display data as a series of points connected by line segments',
  tags: ['line', 'trend', 'time-series', 'continuous'],
  
  configSchema: {
    title: {
      type: 'string',
      default: 'Line Chart',
      label: 'Chart Title',
      group: 'general'
    },
    subtitle: {
      type: 'string',
      label: 'Chart Subtitle',
      group: 'general'
    },
    'xAxis.field': {
      type: 'field-selector',
      required: true,
      label: 'X-Axis Field',
      group: 'data'
    },
    'xAxis.label': {
      type: 'string',
      label: 'X-Axis Label',
      group: 'axes'
    },
    'xAxis.rotation': {
      type: 'number',
      default: 0,
      min: -90,
      max: 90,
      label: 'Label Rotation',
      group: 'axes'
    },
    'yAxis.field': {
      type: 'field-selector',
      required: true,
      label: 'Y-Axis Field',
      group: 'data'
    },
    'yAxis.label': {
      type: 'string',
      label: 'Y-Axis Label',
      group: 'axes'
    },
    'yAxis.format': {
      type: 'select',
      options: ['number', 'currency', 'percentage', 'decimal2'],
      default: 'number',
      label: 'Value Format',
      group: 'axes'
    },
    seriesField: {
      type: 'field-selector',
      label: 'Series Field',
      description: 'Optional field for multiple lines',
      group: 'data'
    },
    colors: {
      type: 'color-palette',
      default: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
      label: 'Color Palette',
      group: 'styling'
    },
    smooth: {
      type: 'boolean',
      default: false,
      label: 'Smooth Lines',
      group: 'styling'
    },
    showPoints: {
      type: 'boolean',
      default: true,
      label: 'Show Data Points',
      group: 'styling'
    },
    pointSize: {
      type: 'number',
      default: 6,
      min: 2,
      max: 20,
      label: 'Point Size',
      group: 'styling',
      conditional: {
        field: 'showPoints',
        value: true
      }
    },
    lineWidth: {
      type: 'number',
      default: 2,
      min: 1,
      max: 10,
      label: 'Line Width',
      group: 'styling'
    },
    showArea: {
      type: 'boolean',
      default: false,
      label: 'Fill Area Under Line',
      group: 'styling'
    },
    areaOpacity: {
      type: 'number',
      default: 0.3,
      min: 0,
      max: 1,
      step: 0.1,
      label: 'Area Opacity',
      group: 'styling',
      conditional: {
        field: 'showArea',
        value: true
      }
    },
    showLegend: {
      type: 'boolean',
      default: true,
      label: 'Show Legend',
      group: 'legend'
    },
    'legend.position': {
      type: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'top',
      label: 'Legend Position',
      group: 'legend',
      conditional: {
        field: 'showLegend',
        value: true
      }
    },
    'legend.orientation': {
      type: 'select',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
      label: 'Legend Orientation',
      group: 'legend',
      conditional: {
        field: 'showLegend',
        value: true
      }
    },
    showTooltip: {
      type: 'boolean',
      default: true,
      label: 'Show Tooltip',
      group: 'interaction'
    },
    enableZoom: {
      type: 'boolean',
      default: false,
      label: 'Enable Zoom',
      group: 'interaction'
    },
    enableDataBrush: {
      type: 'boolean',
      default: false,
      label: 'Enable Data Brush',
      group: 'interaction'
    },
    animation: {
      type: 'boolean',
      default: true,
      label: 'Enable Animation',
      group: 'animation'
    },
    'animation.duration': {
      type: 'number',
      default: 1000,
      min: 0,
      max: 5000,
      label: 'Animation Duration (ms)',
      group: 'animation',
      conditional: {
        field: 'animation',
        value: true
      }
    }
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['x-axis', 'y-axis'],
    optionalFields: ['series', 'tooltip'],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf', 'jpg'],
  
  interactionSupport: {
    zoom: true,
    pan: true,
    selection: true,
    brush: true,
    drilldown: false,
    tooltip: true,
    crossFilter: true
  },
  
  component: LineChart
};

export default LineChart;