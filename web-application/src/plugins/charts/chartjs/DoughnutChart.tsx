import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface DoughnutChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface DoughnutChartProps {
  data: DoughnutChartData;
  options?: ChartOptions<'doughnut'>;
  width?: number;
  height?: number;
  className?: string;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  options = {},
  width = 400,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'doughnut'> | null>(null);

  // Default options
  const defaultOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  // Validate data
  const validateData = (chartData: DoughnutChartData): boolean => {
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

    for (const dataset of chartData.datasets) {
      if (!dataset.data || dataset.data.length === 0) {
        console.error('Invalid chart data: dataset data is empty');
        return false;
      }

      if (dataset.data.length !== chartData.labels.length) {
        console.error('Invalid chart data: data length does not match labels length');
        return false;
      }

      // Check for non-numeric data
      for (const value of dataset.data) {
        if (typeof value !== 'number' || isNaN(value)) {
          console.error('Invalid chart data: non-numeric value found', value);
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

    try {
      chartRef.current = new ChartJS(ctx, {
        type: 'doughnut',
        data: {
          ...data,
          datasets: data.datasets.map(dataset => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 205, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
            ],
            borderColor: dataset.borderColor || [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
            ],
            borderWidth: dataset.borderWidth || 1,
          }))
        } as ChartData<'doughnut'>,
        options: { ...defaultOptions, ...options },
      });
    } catch (error) {
      console.error('Error creating doughnut chart:', error);
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

export default DoughnutChart;

export const ChartJSDoughnutConfig: ChartPluginConfig = {
  name: 'chartjs-doughnut',
  displayName: 'Chart.js Doughnut Chart',
  category: 'basic',
  library: 'chartjs',
  version: '1.0.0',
  description: 'Interactive doughnut chart with Chart.js',
  tags: ['doughnut', 'pie', 'composition', 'percentage'],
  
  configSchema: {
    type: 'object',
    properties: {
      labelField: {
        type: 'string',
        title: 'Label Field',
        required: true
      },
      valueField: {
        type: 'string',
        title: 'Value Field',
        required: true
      },
      cutout: {
        type: 'string',
        title: 'Cutout Percentage',
        default: '50%'
      },
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      }
    },
    required: ['labelField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 2,
    requiredFields: ['label', 'value'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true
  },
  
  exportFormats: ['png', 'svg'],
  component: DoughnutChart,
  
  interactionSupport: {
    tooltip: true,
    selection: true
  }
};