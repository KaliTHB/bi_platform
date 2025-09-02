import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

export interface PolarChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface PolarChartProps {
  data: PolarChartData;
  options?: ChartOptions<'polarArea'>;
  width?: number;
  height?: number;
  className?: string;
}

const PolarChart: React.FC<PolarChartProps> = ({
  data,
  options = {},
  width = 400,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'polarArea'> | null>(null);

  // Default options
  const defaultOptions: ChartOptions<'polarArea'> = {
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
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 12,
          }
        },
        ticks: {
          backdropColor: 'rgba(255, 255, 255, 0.8)',
        }
      }
    },
  };

  // Validate data
  const validateData = (chartData: PolarChartData): boolean => {
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

      // Check for non-numeric data and negative values
      for (let i = 0; i < dataset.data.length; i++) {
        const value = dataset.data[i];
        if (typeof value !== 'number' || isNaN(value)) {
          console.error('Invalid chart data: non-numeric value found', value);
          return false;
        }
        if (value < 0) {
          console.error('Invalid chart data: negative value found in polar chart', value);
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
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 205, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(199, 199, 199, 0.6)',
      'rgba(83, 102, 255, 0.6)',
    ];

    const borderColors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 205, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(199, 199, 199, 1)',
      'rgba(83, 102, 255, 1)',
    ];

    try {
      chartRef.current = new ChartJS(ctx, {
        type: 'polarArea',
        data: {
          ...data,
          datasets: data.datasets.map(dataset => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || colors.slice(0, data.labels.length),
            borderColor: dataset.borderColor || borderColors.slice(0, data.labels.length),
            borderWidth: dataset.borderWidth || 1,
          }))
        } as ChartData<'polarArea'>,
        options: { ...defaultOptions, ...options },
      });
    } catch (error) {
      console.error('Error creating polar chart:', error);
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
          <p className="text-xs mt-1">Note: Polar charts require non-negative values</p>
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

export default PolarChart;


export const ChartJSPolarConfig: ChartPluginConfig = {
  name: 'chartjs-polar',
  displayName: 'Chart.js Polar Area Chart',
  category: 'specialized',
  library: 'chartjs',
  version: '1.0.0',
  description: 'Polar area chart for radial data visualization',
  tags: ['polar', 'radial', 'area', 'specialized'],
  
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
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      },
      startAngle: {
        type: 'number',
        title: 'Start Angle',
        default: 0
      }
    },
    required: ['labelField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['label', 'value'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true
  },
  
  exportFormats: ['png', 'svg'],
  component: PolarChart,
  
  interactionSupport: {
    tooltip: true,
    selection: true
  }
};
