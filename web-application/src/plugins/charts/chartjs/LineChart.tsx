import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { ChartPluginConfig } from '@/types/chart.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointBackgroundColor?: string;
    pointBorderColor?: string;
    pointRadius?: number;
  }[];
}

export interface LineChartProps {
  data: LineChartData;
  options?: ChartOptions<'line'>;
  width?: number;
  height?: number;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  options = {},
  width = 600,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  // Default options
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
        }
      },
      y: {
        display: true,
        title: {
          display: true,
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.1
      }
    }
  };

  // Validate data
  const validateData = (chartData: LineChartData): boolean => {
    if (!chartData || !chartData.labels || !chartData.datasets) {
      console.error('Invalid chart data: missing labels or datasets');
      return false;
    }

    if (chartData.labels.length === 0) {
      console.error('Invalid chart data: labels array is empty');
      return false;
    }

    if (chartData.datasets.length === 0) {
      console.error('Invalid chart data: datasets array is empty');
      return false;
    }

    for (let i = 0; i < chartData.datasets.length; i++) {
      const dataset = chartData.datasets[i];
      
      if (!dataset.label) {
        console.error(`Invalid chart data: dataset ${i} missing label`);
        return false;
      }

      if (!dataset.data || dataset.data.length === 0) {
        console.error(`Invalid chart data: dataset ${i} data is empty`);
        return false;
      }

      if (dataset.data.length !== chartData.labels.length) {
        console.error(`Invalid chart data: dataset ${i} data length does not match labels length`);
        return false;
      }

      // Check for non-numeric data
      for (let j = 0; j < dataset.data.length; j++) {
        const value = dataset.data[j];
        if (typeof value !== 'number' || isNaN(value)) {
          console.error(`Invalid chart data: non-numeric value found in dataset ${i} at index ${j}:`, value);
          return false;
        }
      }
    }

    return true;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Validate data before creating chart
    if (!validateData(data)) {
      return;
    }

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    const colors = [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)',
      'rgb(75, 192, 192)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)',
      'rgb(199, 199, 199)',
      'rgb(83, 102, 255)',
    ];

    try {
      chartRef.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          ...data,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: dataset.borderColor || colors[index % colors.length],
            backgroundColor: dataset.backgroundColor || colors[index % colors.length] + '20',
            borderWidth: dataset.borderWidth || 2,
            fill: dataset.fill !== undefined ? dataset.fill : false,
            tension: dataset.tension !== undefined ? dataset.tension : 0.1,
            pointBackgroundColor: dataset.pointBackgroundColor || colors[index % colors.length],
            pointBorderColor: dataset.pointBorderColor || colors[index % colors.length],
            pointRadius: dataset.pointRadius !== undefined ? dataset.pointRadius : 3,
          }))
        } as ChartData<'line'>,
        options: { ...defaultOptions, ...options },
      });
    } catch (error) {
      console.error('Error creating line chart:', error);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, options]);

  if (!validateData(data)) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-red-500 text-center">
          <p>Invalid chart data</p>
          <p className="text-sm">Please check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default LineChart;


export const ChartJSLineConfig: ChartPluginConfig = {
  name: 'chartjs-line',
  displayName: 'Chart.js Line Chart',
  category: 'basic',
  library: 'chartjs',
  version: '1.0.0',
  description: 'Interactive line chart with Chart.js',
  tags: ['line', 'trend', 'time-series', 'basic'],
  
  configSchema: {
    type: 'object',
    properties: {
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
      showPoints: {
        type: 'boolean',
        title: 'Show Data Points',
        default: true
      },
      tension: {
        type: 'number',
        title: 'Line Tension',
        minimum: 0,
        maximum: 1,
        default: 0.1
      },
      fill: {
        type: 'boolean',
        title: 'Fill Area Under Line',
        default: false
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['x', 'y'],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: true
  },
  
  exportFormats: ['png', 'svg'],
  component: LineChart, // This should be your actual LineChart component
  
  interactionSupport: {
    zoom: true,
    pan: true,
    tooltip: true,
    crossFilter: true
  }
};