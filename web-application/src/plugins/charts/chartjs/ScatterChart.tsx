import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  ScatterDataPoint
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export interface ScatterChartData {
  datasets: {
    label: string;
    data: ScatterDataPoint[];
    backgroundColor?: string;
    borderColor?: string;
    pointRadius?: number;
    pointHoverRadius?: number;
    showLine?: boolean;
    borderWidth?: number;
  }[];
}

export interface ScatterChartProps {
  data: ScatterChartData;
  options?: ChartOptions<'scatter'>;
  width?: number;
  height?: number;
  className?: string;
}

const ScatterChart: React.FC<ScatterChartProps> = ({
  data,
  options = {},
  width = 600,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'scatter'> | null>(null);

  // Default options
  const defaultOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const point = context.raw as ScatterDataPoint;
            return `${context.dataset.label}: (${point.x}, ${point.y})`;
          }
        }
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'X Axis'
        }
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Y Axis'
        }
      }
    },
    interaction: {
      intersect: false,
    }
  };

  // Validate data
  const validateData = (chartData: ScatterChartData): boolean => {
    if (!chartData || !chartData.datasets) {
      console.error('Invalid chart data: missing datasets');
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

      // Check each data point
      for (let j = 0; j < dataset.data.length; j++) {
        const point = dataset.data[j];
        
        // Handle both object format {x, y} and array format [x, y]
        let x: number, y: number;
        
        if (typeof point === 'object' && point !== null && !Array.isArray(point)) {
          x = (point as ScatterDataPoint).x;
          y = (point as ScatterDataPoint).y;
        } else if (Array.isArray(point) && point.length >= 2) {
          x = point[0];
          y = point[1];
        } else {
          console.error(`Invalid chart data: invalid point format in dataset ${i} at index ${j}:`, point);
          return false;
        }

        if (typeof x !== 'number' || isNaN(x) || typeof y !== 'number' || isNaN(y)) {
          console.error(`Invalid chart data: non-numeric values found in dataset ${i} at index ${j}:`, { x, y });
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
        type: 'scatter',
        data: {
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || colors[index % colors.length],
            borderColor: dataset.borderColor || colors[index % colors.length],
            pointRadius: dataset.pointRadius !== undefined ? dataset.pointRadius : 5,
            pointHoverRadius: dataset.pointHoverRadius !== undefined ? dataset.pointHoverRadius : 7,
            showLine: dataset.showLine !== undefined ? dataset.showLine : false,
            borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 1,
          }))
        } as ChartData<'scatter'>,
        options: { ...defaultOptions, ...options },
      });
    } catch (error) {
      console.error('Error creating scatter chart:', error);
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
          <p className="text-xs mt-1">Note: Scatter chart data points must have x and y values</p>
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

export default ScatterChart;