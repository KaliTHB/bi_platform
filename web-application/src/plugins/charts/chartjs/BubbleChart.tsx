'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps, ChartData } from '@/types/chart.types';

export interface ChartJSBubbleConfig {
  xField: string;
  yField: string;
  sizeField: string;
  colorField?: string;
}

// Type guard to check if data is an array
const isDataArray = (data: any[] | ChartData): data is any[] => {
  return Array.isArray(data);
};

// Helper function to extract array data from either format
const getDataArray = (data: any[] | ChartData): any[] => {
  if (isDataArray(data)) {
    return data;
  }
  // If data is ChartData object, return the rows array
  return data.rows || [];
};

// Helper function to check if we have valid data
const hasValidData = (data: any[] | ChartData): boolean => {
  if (isDataArray(data)) {
    return data.length > 0;
  }
  // For ChartData object, check if rows exist and have length
  return data.rows && data.rows.length > 0;
};

export const ChartJSBubbleChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart>();

  useEffect(() => {
    if (!canvasRef.current || !data || !hasValidData(data)) {
      return;
    }

    try {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const { xField, yField, sizeField, colorField } = config as ChartJSBubbleConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data for bubble chart
      const processedData = dataArray.map((item, index) => ({
        x: parseFloat(item[xField]) || 0,
        y: parseFloat(item[yField]) || 0,
        r: Math.sqrt((parseFloat(item[sizeField]) || 1) / Math.PI) * 5, // Scale radius
        backgroundColor: colorField 
          ? `hsl(${(item[colorField].toString().length * 50) % 360}, 70%, 60%)`
          : `hsl(${index * 360 / dataArray.length}, 70%, 60%)`,
        originalData: item // Keep reference to original data for interactions
      }));

      // Define dataset interface for Chart.js
      interface BubbleDataset {
        label: string;
        data: Array<{
          x: number;
          y: number;
          r: number;
          backgroundColor: string;
          originalData: any;
        }>;
        backgroundColor: string[];
      }

      const datasets: BubbleDataset[] = [{
        label: 'Bubble Data',
        data: processedData,
        backgroundColor: processedData.map(d => d.backgroundColor)
      }];

      const chartConfig = {
        type: 'bubble' as const,
        data: {
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: xField
              }
            },
            y: {
              title: {
                display: true,
                text: yField
              }
            }
          },
          plugins: {
            title: {
              display: !!config.title,
              text: config.title
            },
            legend: {
              display: false // Usually not needed for bubble charts
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const dataPoint = context.raw;
                  const originalData = dataPoint.originalData;
                  return [
                    `${xField}: ${dataPoint.x}`,
                    `${yField}: ${dataPoint.y}`,
                    `${sizeField}: ${originalData[sizeField]}`,
                    ...(colorField ? [`${colorField}: ${originalData[colorField]}`] : [])
                  ];
                }
              }
            }
          },
          onClick: (event: any, elements: any[]) => {
            if (elements.length > 0 && onInteraction) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              const dataPoint = datasets[datasetIndex].data[index];
              
              const clickedData = {
                datasetIndex,
                index,
                x: dataPoint.x,
                y: dataPoint.y,
                size: dataPoint.r,
                originalData: dataPoint.originalData
              };

              onInteraction({
                type: 'click',
                data: clickedData,
                dataIndex: index,
                seriesIndex: datasetIndex
              });
            }
          }
        }
      };

      // Create new chart
      chartInstance.current = new Chart(canvasRef.current, chartConfig);

    } catch (error) {
      console.error('Error creating Chart.js bubble chart:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create bubble chart'));
    }
  }, [data, config, width, height, onInteraction, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};

// Chart plugin configuration
export const ChartJSBubbleConfig = {
  name: 'chartjs-bubble',
  displayName: 'Bubble Chart (Chart.js)',
  category: 'advanced' as const,
  library: 'chartjs' as const,
  version: '1.0.0',
  description: 'A bubble chart showing three dimensions of data using position and size',
  tags: ['bubble', 'scatter', 'three-dimensional', 'correlation'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The main title for the chart'
      },
      xField: {
        type: 'string' as const,
        title: 'X-Axis Field',
        description: 'Field to use for x-axis values',
        required: true
      },
      yField: {
        type: 'string' as const,
        title: 'Y-Axis Field',
        description: 'Field to use for y-axis values',
        required: true
      },
      sizeField: {
        type: 'string' as const,
        title: 'Size Field',
        description: 'Field to use for bubble size',
        required: true
      },
      colorField: {
        type: 'string' as const,
        title: 'Color Field',
        description: 'Field to use for bubble color differentiation'
      }
    },
    required: ['xField', 'yField', 'sizeField']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: undefined,
    requiredFields: ['xField', 'yField', 'sizeField'],
    optionalFields: ['colorField'],
    supportedTypes: ['number', 'string', 'date'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'jpg', 'svg'],
  
  interactionSupport: {
    zoom: true,
    pan: true,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  },
  
  component: ChartJSBubbleChart
};

export default ChartJSBubbleChart;