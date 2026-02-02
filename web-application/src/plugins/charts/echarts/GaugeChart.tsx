// File: /web-application/src/plugins/charts/echarts/GaugeChart.tsx

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  extractFieldValues, 
  extractNumericValues, 
  createChartConfig 
} from '../utils/chartDataUtils';


interface GaugeChartProps extends ChartProps {
  chartId?: string;
}

export interface GaugeChartConfig {
  title?: string;
  nameField?: string;
  valueField: string;
  min?: number;
  max?: number;
  startAngle?: number;
  endAngle?: number;
  showPointer?: boolean;
  showTitle?: boolean;
  showDetail?: boolean;
  colorStops?: Array<{ offset: number; color: string }>;
  unit?: string;
  precision?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  chartId, // Add this parameter
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
      valueField: 'value',
      nameField: 'name',
      title: 'Gauge Chart',
      min: 0,
      max: 100,
      startAngle: 225,
      endAngle: -45,
      showPointer: true,
      showTitle: true,
      showDetail: true,
      colorStops: [
        { offset: 0.2, color: '#91c7ae' },
        { offset: 0.8, color: '#63869e' },
        { offset: 1, color: '#c23531' }
      ],
      unit: '',
      precision: 1
    }) as GaugeChartConfig;

    try {
      // Extract data
      const values = extractNumericValues(chartData, chartConfig.valueField, 0);
      const names = chartConfig.nameField 
        ? extractFieldValues(chartData, chartConfig.nameField, 'Value')
        : ['Value'];

      // Take first value for single gauge or create multiple gauges
      const gaugeData = values.slice(0, Math.min(values.length, 5)).map((value, index) => ({
        value: value,
        name: names[index] || `Value ${index + 1}`,
        title: {
          show: chartConfig.showTitle,
          offsetCenter: [0, '80%'],
          fontSize: 14,
          color: '#333'
        },
        detail: {
          show: chartConfig.showDetail,
          valueAnimation: true,
          formatter: (value: number) => `{value|${value.toFixed(chartConfig.precision)}}${chartConfig.unit}`,
          rich: {
            value: {
              fontSize: 40,
              fontWeight: 'bold',
              color: '#333'
            }
          }
        }
      }));

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
            return `${params.name}: ${params.value}${chartConfig.unit}`;
          }
        },
        series: [
          {
            type: 'gauge',
            startAngle: chartConfig.startAngle,
            endAngle: chartConfig.endAngle,
            min: chartConfig.min,
            max: chartConfig.max,
            pointer: {
              show: chartConfig.showPointer,
              length: '60%',
              width: 6,
              itemStyle: {
                color: 'auto',
                shadowColor: 'rgba(0, 0, 0, 0.5)',
                shadowBlur: 10
              }
            },
            progress: {
              show: true,
              overlap: false,
              roundCap: true,
              clip: false,
              itemStyle: {
                borderWidth: 2,
                borderColor: '#464646'
              }
            },
            axisLine: {
              lineStyle: {
                width: 15,
                color: chartConfig.colorStops
              }
            },
            splitLine: {
              show: true,
              distance: -15,
              length: 14,
              lineStyle: {
                width: 2,
                color: '#999'
              }
            },
            axisTick: {
              show: true,
              splitNumber: 5,
              distance: -12,
              length: 8,
              lineStyle: {
                width: 1,
                color: '#999'
              }
            },
            axisLabel: {
              show: true,
              distance: -40,
              color: '#464646',
              fontSize: 12,
              formatter: (value: number) => {
                return value.toString() + chartConfig.unit;
              }
            },
            anchor: {
              show: true,
              showAbove: true,
              size: 18,
              itemStyle: {
                borderWidth: 2,
                borderColor: '#5470c6',
                color: '#fff',
                shadowColor: 'rgba(0, 0, 0, 0.5)',
                shadowBlur: 5
              }
            },
            data: gaugeData,
            animationDuration: 2000,
            animationEasing: 'cubicOut'
          }
        ],
        animation: true
      };
    } catch (error) {
      console.error('Error processing gauge chart data:', error);
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
        chartId: chartId || 'echarts-gauge-chart', // Add required chartId
        data: params.data,
        dataIndex: params.dataIndex,
        timestamp: Date.now() // Add timestamp, remove event property
      });
    };

    const handleMouseover = (params: any) => {
      onInteraction?.({
        type: 'hover',
        chartId: chartId || 'echarts-gauge-chart',
        data: params.data,
        dataIndex: params.dataIndex,
        timestamp: Date.now()
      });
    };

    chartInstance.current.on('click', handleClick);
    chartInstance.current.on('mouseover', handleMouseover); 

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('mouseover', handleMouseover);
      window.removeEventListener('resize', handleResize);
    };
  }, [chartId, options, onInteraction]);

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
export const EChartsGaugeChartConfig = {
  name: 'echarts-gauge',
  displayName: 'ECharts Gauge Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Interactive gauge chart for displaying single values with thresholds',
  tags: ['gauge', 'speedometer', 'kpi', 'single-value'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Gauge Chart'
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        description: 'Field name for the gauge value',
        default: 'value'
      },
      nameField: {
        type: 'string',
        title: 'Name Field',
        description: 'Optional field for gauge labels'
      },
      min: {
        type: 'number',
        title: 'Minimum Value',
        default: 0
      },
      max: {
        type: 'number',
        title: 'Maximum Value',
        default: 100
      },
      unit: {
        type: 'string',
        title: 'Unit',
        description: 'Unit to display with values (e.g., %, $, etc.)'
      },
      precision: {
        type: 'number',
        title: 'Decimal Places',
        default: 1,
        minimum: 0,
        maximum: 5
      },
      showPointer: {
        type: 'boolean',
        title: 'Show Pointer',
        default: true
      },
      showTitle: {
        type: 'boolean',
        title: 'Show Title',
        default: true
      },
      showDetail: {
        type: 'boolean',
        title: 'Show Detail Value',
        default: true
      },
      startAngle: {
        type: 'number',
        title: 'Start Angle',
        default: 225,
        minimum: 0,
        maximum: 360
      },
      endAngle: {
        type: 'number',
        title: 'End Angle',
        default: -45,
        minimum: -360,
        maximum: 360
      }
    },
    required: ['valueField']
  },
  
  dataRequirements: {
    minColumns: 1,
    maxColumns: 10,
    requiredFields: ['value'],
    optionalFields: ['name'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: GaugeChart
};

export default GaugeChart;