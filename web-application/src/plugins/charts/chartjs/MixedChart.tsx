'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps, ChartData, ChartInteractionEvent } from '@/types/chart.types';

export interface ChartJSMixedConfig {
  xField: string;
  series: Array<{
    field: string;
    type: 'line' | 'bar';
    label: string;
    color?: string;
    yAxisID?: string;
  }>;
  yAxes?: Array<{
    id: string;
    position: 'left' | 'right';
    title?: string;
    min?: number;
    max?: number;
  }>;
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
  return Boolean(data.rows && data.rows.length > 0);
};

export const ChartJSMixedChart: React.FC<ChartProps> = ({
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

      const { xField, series, yAxes = [] } = config as ChartJSMixedConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data for mixed chart
      const labels = Array.from(new Set(dataArray.map(item => item[xField])));
      
      // Define dataset interface for Chart.js
      interface MixedDataset {
        type: 'line' | 'bar';
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
        fill?: boolean;
        tension?: number;
        yAxisID?: string;
        [key: string]: any; // Allow additional properties
      }

      const datasets: MixedDataset[] = series.map((s, index) => {
        const seriesData = labels.map(label => {
          const item = dataArray.find(d => d[xField] === label);
          return item ? parseFloat(item[s.field]) || 0 : 0;
        });

        const baseColor = s.color || `hsl(${index * 360 / series.length}, 70%, 50%)`;
        
        const dataset: MixedDataset = {
          type: s.type,
          label: s.label,
          data: seriesData,
          borderColor: baseColor,
          borderWidth: 2,
          yAxisID: s.yAxisID || 'y'
        };

        // Configure based on chart type
        if (s.type === 'line') {
          dataset.fill = false;
          dataset.tension = 0.1;
          dataset.backgroundColor = baseColor;
        } else if (s.type === 'bar') {
          dataset.backgroundColor = baseColor + '80'; // Add transparency
        }

        return dataset;
      });

      // Build scales configuration
      const scales: Record<string, any> = {
        x: {
          title: {
            display: true,
            text: xField
          }
        }
      };

      // Add Y axes
      if (yAxes.length > 0) {
        yAxes.forEach(axis => {
          scales[axis.id] = {
            type: 'linear' as const,
            display: true,
            position: axis.position,
            title: {
              display: !!axis.title,
              text: axis.title
            },
            min: axis.min,
            max: axis.max,
            grid: {
              drawOnChartArea: axis.id === 'y', // Only draw grid for primary axis
            },
          };
        });
      } else {
        // Default Y axis
        scales.y = {
          title: {
            display: true,
            text: 'Values'
          }
        };
      }

      const chartConfig: any = {
        type: 'line', // Mixed charts use 'line' as base type
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales,
          plugins: {
            title: {
              display: !!config.title,
              text: config.title
            },
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context: any) {
                  const datasetLabel = context.dataset.label || '';
                  const value = context.parsed.y;
                  const seriesConfig = series[context.datasetIndex];
                  return `${datasetLabel}: ${value} (${seriesConfig.type})`;
                }
              }
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
                dataset: datasets[datasetIndex].label,
                chartType: datasets[datasetIndex].type
              };

              onInteraction({
      type: 'click',
      data: clickedData,
      dataIndex: index,
      seriesIndex: datasetIndex
    } as ChartInteractionEvent);
            }
          }
        }
      };

      // Create new chart
      chartInstance.current = new Chart(canvasRef.current, chartConfig);

    } catch (error) {
      console.error('Error creating Chart.js mixed chart:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create mixed chart'));
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
export const ChartJSMixedConfig = {
  name: 'chartjs-mixed',
  displayName: 'Mixed Chart (Chart.js)',
  category: 'advanced' as const,
  library: 'chartjs' as const,
  version: '1.0.0',
  description: 'A combination chart that can display multiple series with different chart types (line, bar) on the same canvas',
  tags: ['mixed', 'combination', 'line', 'bar', 'multi-axis'],
  
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
      series: {
        type: 'array' as const,
        title: 'Data Series',
        description: 'Configuration for each data series',
        required: true,
        items: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              title: 'Data Field',
              required: true
            },
            type: {
              type: 'select',
              title: 'Chart Type',
              options: [
                { label: 'Line', value: 'line' },
                { label: 'Bar', value: 'bar' }
              ],
              default: 'line',
              required: true
            },
            label: {
              type: 'string',
              title: 'Series Label',
              required: true
            },
            color: {
              type: 'color',
              title: 'Color'
            },
            yAxisID: {
              type: 'string',
              title: 'Y-Axis ID',
              description: 'Which Y-axis to use (y, y1, y2, etc.)'
            }
          }
        }
      },
      yAxes: {
        type: 'array' as const,
        title: 'Y-Axes Configuration',
        description: 'Configuration for multiple Y-axes',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Axis ID',
              required: true
            },
            position: {
              type: 'select',
              title: 'Position',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' }
              ],
              default: 'left'
            },
            title: {
              type: 'string',
              title: 'Axis Title'
            },
            min: {
              type: 'number',
              title: 'Minimum Value'
            },
            max: {
              type: 'number',
              title: 'Maximum Value'
            }
          }
        }
      }
    },
    required: ['xField', 'series']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: undefined,
    requiredFields: ['xField'],
    optionalFields: [],
    supportedTypes: ['string', 'number', 'date'],
    aggregationSupport: true,
    pivotSupport: true
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
  
  component: ChartJSMixedChart
};

export default ChartJSMixedChart;