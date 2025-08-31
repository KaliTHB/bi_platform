'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps, ChartData } from '@/types/chart.types';

export interface ChartJSBarConfig {
  xField: string;
  yField: string;
  seriesField?: string;
  indexAxis?: 'x' | 'y';
  stacked?: boolean;
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

export const ChartJSBarChart: React.FC<ChartProps> = ({
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

      const { xField, yField, seriesField, indexAxis = 'x', stacked = false } = config as ChartJSBarConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data
      const labels = Array.from(new Set(dataArray.map(item => item[xField])));
      
      // Define dataset interface for Chart.js
      interface ChartDataset {
        label: string;
        data: number[];
        backgroundColor: string | string[];
        borderColor: string | string[];
        borderWidth: number;
      }
      
      let datasets: ChartDataset[];
      if (seriesField) {
        const series = Array.from(new Set(dataArray.map(item => item[seriesField])));
        datasets = series.map((s, index) => {
          const seriesData = labels.map(label => {
            const item = dataArray.find(d => d[xField] === label && d[seriesField] === s);
            return item ? parseFloat(item[yField]) || 0 : 0;
          });

          return {
            label: s,
            data: seriesData,
            backgroundColor: `hsl(${index * 360 / series.length}, 70%, 60%)`,
            borderColor: `hsl(${index * 360 / series.length}, 70%, 50%)`,
            borderWidth: 1
          };
        });
      } else {
        datasets = [{
          label: yField,
          data: dataArray.map(item => parseFloat(item[yField]) || 0),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }];
      }

      const chartConfig = {
        type: 'bar' as const,
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis,
          scales: {
            x: {
              stacked,
              title: {
                display: true,
                text: xField
              }
            },
            y: {
              stacked,
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
              display: !!seriesField
            }
          },
          onClick: (event: any, elements: any[]) => {
            if (elements.length > 0 && onInteraction) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              
              const clickedData = {
                datasetIndex,
                index,
                label: labels[index],
                value: datasets[datasetIndex].data[index],
                dataset: datasets[datasetIndex].label
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
      console.error('Error creating Chart.js bar chart:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create chart'));
    }
  }, [data, config, onInteraction, onError]);

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
export const ChartJSBarConfig = {
  name: 'chartjs-bar',
  displayName: 'Bar Chart (Chart.js)',
  category: 'basic' as const,
  library: 'chartjs' as const,
  version: '1.0.0',
  description: 'A customizable bar chart using Chart.js library',
  tags: ['bar', 'column', 'comparison'],
  
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
        description: 'Field to use for x-axis categories',
        required: true
      },
      yField: {
        type: 'string' as const,
        title: 'Y-Axis Field', 
        description: 'Field to use for y-axis values',
        required: true
      },
      seriesField: {
        type: 'string' as const,
        title: 'Series Field',
        description: 'Field to group data into different series'
      },
      indexAxis: {
        type: 'select' as const,
        title: 'Chart Orientation',
        description: 'Direction of the bars',
        default: 'x',
        options: [
          { label: 'Vertical', value: 'x' },
          { label: 'Horizontal', value: 'y' }
        ]
      },
      stacked: {
        type: 'boolean' as const,
        title: 'Stacked',
        description: 'Stack bars on top of each other',
        default: false
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: undefined,
    requiredFields: ['xField', 'yField'],
    optionalFields: ['seriesField'],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'jpg', 'svg'],
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  },
  
  component: ChartJSBarChart
};

export default ChartJSBarChart;