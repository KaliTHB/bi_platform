import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { 
  EChartsOption, 
  ECharts as EChartsInstance,
  LineSeriesOption,
  SeriesOption
} from 'echarts';

// Simple, compatible data types
export interface LineChartDataItem {
  name?: string;
  value: number | number[];
  [key: string]: any; // Allow any additional properties for flexibility
}

export interface LineChartSeries {
  name: string;
  data: (number | LineChartDataItem)[];
  // Optional properties that will be passed through to ECharts
  [key: string]: any;
}

export interface LineChartData {
  xAxisData?: string[];
  series: LineChartSeries[];
}

export interface LineChartProps {
  data: LineChartData;
  options?: EChartsOption;
  width?: number | string;
  height?: number | string;
  className?: string;
  theme?: string | object;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  onChartReady?: (chart: EChartsInstance) => void;
  onEvents?: Record<string, (params: any) => void>;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  options = {},
  width = '100%',
  height = 400,
  className = '',
  theme,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  onChartReady,
  onEvents = {}
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsInstance | null>(null);

  // Validate data function
  const validateData = (chartData: LineChartData): { isValid: boolean; error?: string } => {
    if (!chartData) {
      return { isValid: false, error: 'Chart data is required' };
    }

    if (!chartData.series || !Array.isArray(chartData.series)) {
      return { isValid: false, error: 'Series array is required' };
    }

    if (chartData.series.length === 0) {
      return { isValid: false, error: 'At least one series is required' };
    }

    // Validate each series
    for (let i = 0; i < chartData.series.length; i++) {
      const series = chartData.series[i];
      
      if (!series.name || typeof series.name !== 'string') {
        return { isValid: false, error: `Series at index ${i} must have a valid string name` };
      }

      if (!series.data || !Array.isArray(series.data)) {
        return { isValid: false, error: `Series "${series.name}" must have a data array` };
      }

      if (series.data.length === 0) {
        return { isValid: false, error: `Series "${series.name}" data array cannot be empty` };
      }

      // Validate data values - allow more flexibility
      for (let j = 0; j < series.data.length; j++) {
        const dataPoint = series.data[j];
        if (typeof dataPoint === 'object' && dataPoint !== null) {
          // Data item object validation - just check for value property
          const item = dataPoint as LineChartDataItem;
          if (item.value === undefined && item.value !== 0) {
            return { 
              isValid: false, 
              error: `Data object in series "${series.name}" at index ${j} must have a 'value' property.` 
            };
          }
        } else if (typeof dataPoint !== 'number') {
          return { 
            isValid: false, 
            error: `Invalid data value in series "${series.name}" at index ${j}. Expected number or object with value property.` 
          };
        }
      }
    }

    // Validate xAxisData if provided
    if (chartData.xAxisData && !Array.isArray(chartData.xAxisData)) {
      return { isValid: false, error: 'xAxisData must be an array if provided' };
    }

    return { isValid: true };
  };

  // Generate default xAxis data if not provided
  const generateXAxisData = (data: LineChartData): string[] => {
    if (data.xAxisData && data.xAxisData.length > 0) {
      return data.xAxisData;
    }

    // Find the series with the most data points
    let maxLength = 0;
    data.series.forEach(series => {
      if (series.data.length > maxLength) {
        maxLength = series.data.length;
      }
    });

    // Generate default labels
    return Array.from({ length: maxLength }, (_, i) => `Point ${i + 1}`);
  };

  // Default chart options
  const getDefaultOptions = (): EChartsOption => {
    const xAxisData = generateXAxisData(data);

    return {
      title: {
        text: 'Line Chart',
        left: 'center',
        top: 10
      },
      tooltip: showTooltip ? {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      } : undefined,
      legend: showLegend ? {
        data: data.series.map(series => series.name),
        top: 40
      } : undefined,
      grid: showGrid ? {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: showLegend ? '80px' : '60px',
        containLabel: true
      } : undefined,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
        axisLabel: {
          rotate: xAxisData.length > 10 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value'
      },
      series: data.series.map(series => {
        // Create a basic line series that ECharts will accept
        const echartsSeriesOption: any = {
          name: series.name,
          type: 'line',
          data: series.data,
          // Default properties
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: true,
          connectNulls: false,
          lineStyle: {
            width: 2
          },
          itemStyle: {
            borderWidth: 1
          },
          emphasis: {
            focus: 'series'
          }
        };

        // Add any additional properties from the original series
        // This allows for custom styling while avoiding type conflicts
        Object.keys(series).forEach(key => {
          if (key !== 'name' && key !== 'data') {
            echartsSeriesOption[key] = series[key];
          }
        });

        return echartsSeriesOption as SeriesOption;
      })
    };
  };

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    // Validate data
    const validation = validateData(data);
    if (!validation.isValid) {
      console.error('LineChart validation error:', validation.error);
      return undefined;
    }

    // Dispose existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    try {
      // Initialize chart with theme support
      chartInstanceRef.current = echarts.init(chartRef.current, theme);

      // Merge default options with provided options
      const chartOptions: EChartsOption = {
        ...getDefaultOptions(),
        ...options
      };

      // Set chart options
      chartInstanceRef.current.setOption(chartOptions, true);

      // Register event handlers
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.on(eventName, handler);
        }
      });

      // Call onChartReady callback
      if (onChartReady && chartInstanceRef.current) {
        onChartReady(chartInstanceRef.current);
      }

      // Handle resize
      const handleResize = () => {
        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
          chartInstanceRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
          // Remove event handlers
          Object.keys(onEvents).forEach(eventName => {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
              chartInstanceRef.current.off(eventName);
            }
          });
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating line chart:', error);
      return undefined;
    }
  }, [data, options, theme, showGrid, showLegend, showTooltip, onChartReady, onEvents]);

  // Handle validation errors
  const validation = validateData(data);
  if (!validation.isValid) {
    return (
      <div 
        className={`flex items-center justify-center border border-red-300 bg-red-50 ${className}`}
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height
        }}
      >
        <div className="text-red-500 text-center p-4">
          <p className="font-medium">Invalid Line Chart Data</p>
          <p className="text-sm mt-1">{validation.error}</p>
          <p className="text-xs mt-2 text-gray-500">Check console for more details</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

export default LineChart;