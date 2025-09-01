import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export interface RadarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    fill?: boolean;
    pointBackgroundColor?: string;
    pointBorderColor?: string;
    pointRadius?: number;
  }[];
}

export interface RadarChartProps {
  data: RadarChartData;
  options?: ChartOptions<'radar'>;
  width?: number;
  height?: number;
  className?: string;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  options = {},
  width = 400,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'radar'> | null>(null);

  // Default options
  const defaultOptions: ChartOptions<'radar'> = {
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
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        radius: 3,
      }
    }
  };

  // Validate data
  const validateData = (chartData: RadarChartData): boolean => {
    if (!chartData || !chartData.labels || !chartData.datasets) {
      console.error('Invalid chart data: missing labels or datasets');
      return false;
    }

    if (chartData.labels.length < 3) {
      console.error('Invalid chart data: radar charts require at least 3 data points');
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
        type: 'radar',
        data: {
          ...data,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: dataset.borderColor || colors[index % colors.length],
            backgroundColor: dataset.backgroundColor || colors[index % colors.length] + '30',
            borderWidth: dataset.borderWidth || 2,
            fill: dataset.fill !== undefined ? dataset.fill : true,
            pointBackgroundColor: dataset.pointBackgroundColor || colors[index % colors.length],
            pointBorderColor: dataset.pointBorderColor || '#ffffff',
            pointRadius: dataset.pointRadius !== undefined ? dataset.pointRadius : 3,
          }))
        } as ChartData<'radar'>,
        options: { ...defaultOptions, ...options },
      });
    } catch (error) {
      console.error('Error creating radar chart:', error);
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
          <p className="text-xs mt-1">Note: Radar charts require at least 3 data points</p>
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

export default RadarChart;