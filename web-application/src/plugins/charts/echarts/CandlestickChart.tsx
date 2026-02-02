// File: /web-application/src/plugins/charts/echarts/CandlestickChart.tsx

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

export interface CandlestickChartConfig {
  title?: string;
  dateField: string;
  openField: string;
  highField: string;
  lowField: string;
  closeField: string;
  volumeField?: string;
  showVolume?: boolean;
  showMA?: boolean;
  maPeriods?: number[];
  upColor?: string;
  downColor?: string;
  borderUpColor?: string;
  borderDownColor?: string;
}

interface CandlestickChartProps extends ChartProps {
  chartId?: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  chartId, // Add this parameter
  data,
  config,
  width = 800,
  height = 500,
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
      dateField: 'date',
      openField: 'open',
      highField: 'high',
      lowField: 'low',
      closeField: 'close',
      title: 'Candlestick Chart',
      showVolume: false,
      showMA: false,
      maPeriods: [5, 10, 20],
      upColor: '#00da3c',
      downColor: '#ec0000',
      borderUpColor: '#008F28',
      borderDownColor: '#8A0000'
    }) as CandlestickChartConfig;

    try {
      // Extract data fields
      const dates = extractFieldValues(chartData, chartConfig.dateField, '');
      const opens = extractNumericValues(chartData, chartConfig.openField, 0);
      const highs = extractNumericValues(chartData, chartConfig.highField, 0);
      const lows = extractNumericValues(chartData, chartConfig.lowField, 0);
      const closes = extractNumericValues(chartData, chartConfig.closeField, 0);
      const volumes = chartConfig.volumeField 
        ? extractNumericValues(chartData, chartConfig.volumeField, 0)
        : [];

      // Prepare candlestick data
      const candlestickData = chartData.map((item, index) => [
        opens[index],
        closes[index],
        lows[index],
        highs[index]
      ]);

      // Calculate moving averages if enabled
      const calculateMA = (dayCount: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < closes.length; i++) {
          if (i < dayCount - 1) {
            result.push(NaN);
          } else {
            let sum = 0;
            for (let j = 0; j < dayCount; j++) {
              sum += closes[i - j];
            }
            result.push(sum / dayCount);
          }
        }
        return result;
      };

      const series: any[] = [
        {
          name: 'Candlestick',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: chartConfig.upColor,
            color0: chartConfig.downColor,
            borderColor: chartConfig.borderUpColor,
            borderColor0: chartConfig.borderDownColor,
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2
            }
          }
        }
      ];

      // Add moving averages if enabled
      if (chartConfig.showMA && chartConfig.maPeriods) {
        const maColors = ['#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];
        chartConfig.maPeriods.forEach((period, index) => {
          const maData = calculateMA(period);
          series.push({
            name: `MA${period}`,
            type: 'line',
            data: maData,
            smooth: true,
            lineStyle: {
              color: maColors[index % maColors.length],
              width: 2
            },
            symbol: 'none'
          });
        });
      }

      // Add volume series if enabled
      if (chartConfig.showVolume && volumes.length > 0) {
        series.push({
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: (params: any) => {
              const index = params.dataIndex;
              return closes[index] >= opens[index] ? chartConfig.upColor : chartConfig.downColor;
            },
            opacity: 0.7
          }
        });
      }

      const grid = chartConfig.showVolume ? [
        {
          left: '10%',
          right: '10%',
          height: '60%'
        },
        {
          left: '10%',
          right: '10%',
          top: '70%',
          height: '15%'
        }
      ] : {
        left: '10%',
        right: '10%',
        bottom: '15%'
      };

      const xAxis = chartConfig.showVolume ? [
        {
          type: 'category',
          data: dates,
          axisLine: { onZero: false },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: {
            z: 100
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          axisLabel: { show: false }
        }
      ] : {
        type: 'category',
        data: dates,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisPointer: {
          z: 100
        }
      };

      const yAxis = chartConfig.showVolume ? [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ] : {
        scale: true,
        splitArea: {
          show: true
        }
      };

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
            type: 'cross'
          },
          backgroundColor: 'rgba(245, 245, 245, 0.8)',
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          textStyle: {
            color: '#000'
          },
          formatter: (params: any) => {
            let result = `${params[0].axisValueLabel}<br/>`;
            params.forEach((param: any) => {
              if (param.seriesName === 'Candlestick') {
                const data = param.data;
                result += `Open: ${data[0]}<br/>`;
                result += `High: ${data[3]}<br/>`;
                result += `Low: ${data[2]}<br/>`;
                result += `Close: ${data[1]}<br/>`;
              } else {
                result += `${param.seriesName}: ${param.value.toFixed(2)}<br/>`;
              }
            });
            return result;
          }
        },
        legend: {
          data: series.map(s => s.name),
          top: 30
        },
        grid: grid,
        xAxis: xAxis,
        yAxis: yAxis,
        series: series,
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 50,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            top: '85%',
            start: 50,
            end: 100
          }
        ],
        animation: true,
        animationDuration: 1000
      };
    } catch (error) {
      console.error('Error processing candlestick chart data:', error);
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
    chartId: chartId || 'echarts-candlestick-chart', // Add required chartId
    data: params.data,
    dataIndex: params.dataIndex,
    timestamp: Date.now() // Add timestamp, remove event property
  });
};

   const handleMouseover = (params: any) => {
  onInteraction?.({
    type: 'hover',
    chartId: chartId || 'echarts-candlestick-chart',
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
export const EChartsCandlestickChartConfig = {
  name: 'echarts-candlestick',
  displayName: 'ECharts Candlestick Chart',
  category: 'financial',
  library: 'echarts',
  version: '1.0.0',
  description: 'Financial candlestick chart with volume and moving averages for stock market data',
  tags: ['candlestick', 'financial', 'stock', 'ohlc'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Candlestick Chart'
      },
      dateField: {
        type: 'string',
        title: 'Date Field',
        description: 'Field name for dates',
        default: 'date'
      },
      openField: {
        type: 'string',
        title: 'Open Price Field',
        default: 'open'
      },
      highField: {
        type: 'string',
        title: 'High Price Field',
        default: 'high'
      },
      lowField: {
        type: 'string',
        title: 'Low Price Field',
        default: 'low'
      },
      closeField: {
        type: 'string',
        title: 'Close Price Field',
        default: 'close'
      },
      volumeField: {
        type: 'string',
        title: 'Volume Field',
        description: 'Optional field for trading volume'
      },
      showVolume: {
        type: 'boolean',
        title: 'Show Volume',
        default: false
      },
      showMA: {
        type: 'boolean',
        title: 'Show Moving Averages',
        default: false
      },
      upColor: {
        type: 'color',
        title: 'Up Candle Color',
        default: '#00da3c'
      },
      downColor: {
        type: 'color',
        title: 'Down Candle Color',
        default: '#ec0000'
      }
    },
    required: ['dateField', 'openField', 'highField', 'lowField', 'closeField']
  },
  
  dataRequirements: {
    minColumns: 5,
    maxColumns: 20,
    requiredFields: ['date', 'open', 'high', 'low', 'close'],
    optionalFields: ['volume'],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: CandlestickChart
};

export default CandlestickChart;