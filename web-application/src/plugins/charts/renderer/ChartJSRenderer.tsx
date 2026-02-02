// File: web-application/src/plugins/charts/renderer/ChartJSRenderer.tsx
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import Chart from 'chart.js/auto';
import {
  ChartProps,
  ChartInteractionEvent,
  ChartError,
  ChartData,
  ChartPluginConfig
} from '@/types/chart.types';
import {
  normalizeChartData,
  isChartDataEmpty,
  getChartDataLength
} from '../utils/chartDataUtils';

interface ChartJSConfig {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter';
  title?: string;
  xField?: string;
  yField?: string;
  seriesField?: string;
  indexAxis?: 'x' | 'y';
  stacked?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  responsive?: boolean;
  maintainAspectRatio?: boolean;
}

export const ChartJSRenderer: React.FC<ChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart>();

  // Handle chart errors
  const handleError = useCallback((error: Error | string) => {
    const chartError: ChartError = typeof error === 'string' 
      ? {
          code: 'CHART_JS_RENDER_ERROR',
          message: error,
          timestamp: Date.now()
        }
      : {
          code: 'CHART_JS_RENDER_ERROR',
          message: error.message,
          timestamp: Date.now(),
          details: error.stack
        };

    console.error('Chart.js render error:', chartError);
    onError?.(chartError);
  }, [onError]);

  // Default colors for Chart.js
  const defaultColors = [
    'rgba(54, 162, 235, 0.6)',   // Blue
    'rgba(255, 99, 132, 0.6)',   // Red
    'rgba(75, 192, 192, 0.6)',   // Teal
    'rgba(255, 206, 86, 0.6)',   // Yellow
    'rgba(153, 102, 255, 0.6)',  // Purple
    'rgba(255, 159, 64, 0.6)',   // Orange
    'rgba(199, 199, 199, 0.6)',  // Grey
    'rgba(83, 102, 255, 0.6)'    // Indigo
  ];

  const borderColors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(199, 199, 199, 1)',
    'rgba(83, 102, 255, 1)'
  ];

  useEffect(() => {
    if (!canvasRef.current || !data || isChartDataEmpty(data)) {
      return;
    }

    try {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const chartConfig = config as ChartJSConfig;
      const {
        chartType = 'bar',
        title,
        xField = 'x',
        yField = 'y',
        seriesField,
        indexAxis = 'x',
        stacked = false,
        showLegend = true,
        showTooltip = true,
        colors = defaultColors,
        responsive = true,
        maintainAspectRatio = false
      } = chartConfig;

      // Get data array using utility function
      const dataArray = normalizeChartData(data);

      // Process data based on chart type
      let labels: string[] = [];
      let datasets: any[] = [];

      if (chartType === 'pie' || chartType === 'doughnut') {
        // For pie/doughnut charts
        labels = dataArray.map(item => String(item[xField]));
        datasets = [{
          data: dataArray.map(item => Number(item[yField]) || 0),
          backgroundColor: colors.slice(0, dataArray.length),
          borderColor: borderColors.slice(0, dataArray.length),
          borderWidth: 1
        }];
      } else {
        // For other chart types
        labels = Array.from(new Set(dataArray.map(item => String(item[xField]))));

        if (seriesField) {
          // Multiple series
          const series = Array.from(new Set(dataArray.map(item => String(item[seriesField]))));
          datasets = series.map((s, index) => {
            const seriesData = labels.map(label => {
              const item = dataArray.find(d => String(d[xField]) === label && String(d[seriesField]) === s);
              return item ? Number(item[yField]) || 0 : 0;
            });

            return {
              label: s,
              data: seriesData,
              backgroundColor: colors[index % colors.length],
              borderColor: borderColors[index % borderColors.length],
              borderWidth: 2,
              pointRadius: chartType === 'line' ? 4 : undefined,
              pointHoverRadius: chartType === 'line' ? 6 : undefined,
              tension: chartType === 'line' ? 0.4 : undefined
            };
          });
        } else {
          // Single series
          datasets = [{
            label: yField,
            data: labels.map(label => {
              const item = dataArray.find(d => String(d[xField]) === label);
              return item ? Number(item[yField]) || 0 : 0;
            }),
            backgroundColor: colors[0],
            borderColor: borderColors[0],
            borderWidth: 2,
            pointRadius: chartType === 'line' ? 4 : undefined,
            pointHoverRadius: chartType === 'line' ? 6 : undefined,
            tension: chartType === 'line' ? 0.4 : undefined
          }];
        }
      }
      // Chart.js configuration
      const chartJSConfig = {
        type: chartType,
        data: {
          labels,
          datasets
        },
        options: {
          responsive,
          maintainAspectRatio,
          indexAxis,
          interaction: {
            mode: 'index' as const,
            intersect: false
          },
          plugins: {
            title: {
              display: !!title,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: showLegend,
              position: 'top' as const
            },
            tooltip: {
              enabled: showTooltip,
              mode: 'index' as const,
              intersect: false,
              callbacks: {
                label: function(context: any) {
                  const datasetLabel = context.dataset.label || '';
                  const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                  return `${datasetLabel}: ${value}`;
                }
              }
            }
          },
          scales: (chartType === 'pie' || chartType === 'doughnut') ? {} : {
            x: {
              stacked,
              title: {
                display: !!xField,
                text: xField
              }
            },
            y: {
              stacked,
              title: {
                display: !!yField,
                text: yField
              }
            }
          },
          // SOLUTION 2: Access data via dataset index instead of element.parsed
          onClick: (event: any, elements: any[]) => {
            if (elements.length > 0 && onInteraction) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              
              // Access data via dataset instead of element.parsed
              const dataset = chartInstance.current?.data.datasets[datasetIndex];
              const value = dataset?.data[index];
              const label = chartInstance.current?.data.labels?.[index];
              
              const clickedData = {
                datasetIndex,
                index,
                label: label || index,
                value,
                dataset: dataset?.label,
                chartType
              };

              onInteraction({
                type: 'click',
                data: clickedData,
                dataIndex: index,
                seriesIndex: datasetIndex,
                chartId: 'chartjs-renderer',
                timestamp: Date.now()
              } as ChartInteractionEvent);
            }
          },
          onHover: (event: any, elements: any[]) => {
            if (elements.length > 0 && onInteraction) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              
              // Access data via dataset instead of element.parsed
              const dataset = chartInstance.current?.data.datasets[datasetIndex];
              const value = dataset?.data[index];
              const label = chartInstance.current?.data.labels?.[index];
              
              const hoverData = {
                datasetIndex,
                index,
                label: label || index,
                value,
                dataset: dataset?.label,
                chartType
              };

              onInteraction({
                type: 'hover',
                data: hoverData,
                dataIndex: index,
                seriesIndex: datasetIndex,
                chartId: 'chartjs-renderer',
                timestamp: Date.now()
              } as ChartInteractionEvent);
            }
          }
        }
      };

      // Create new chart
      chartInstance.current = new Chart(canvasRef.current, chartJSConfig);

    } catch (error) {
      console.error('Error creating Chart.js chart:', error);
      handleError(error instanceof Error ? error : 'Unknown Chart.js error');
    }
  }, [data, config, dimensions, theme, onInteraction, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  // Handle case where data is not valid
  if (!data || isChartDataEmpty(data)) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: dimensions?.width || 400,
          height: dimensions?.height || 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data available for Chart.js renderer
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      style={style}
      sx={{
        width: dimensions?.width || 400,
        height: dimensions?.height || 300,
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </Box>
  );
};

// ✅ EXPORT PLUGIN CONFIGURATION
export const ChartJSPluginConfig: ChartPluginConfig = {
  name: 'chartjs-renderer',
  displayName: 'Chart.js Universal Renderer',
  category: 'basic',
  library: 'chartjs',
  version: '1.0.0',
  description: 'Universal Chart.js renderer supporting multiple chart types',
  tags: ['universal', 'basic', 'interactive'],
  configSchema: {
    type: 'object',
    properties: {
      chartType: {
        type: 'select',
        title: 'Chart Type',
        enum: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter'],
        default: 'bar'
      },
      title: {
        type: 'string',
        title: 'Chart Title'
      },
      xField: {
        type: 'string',
        title: 'X-Axis Field',
        default: 'x'
      },
      yField: {
        type: 'string',
        title: 'Y-Axis Field', 
        default: 'y'
      },
      seriesField: {
        type: 'string',
        title: 'Series Field (Optional)'
      },
      stacked: {
        type: 'boolean',
        title: 'Stacked',
        default: false
      },
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      }
    }
  },
  dataRequirements: {
    minColumns: 2,
    requiredFields: ['x', 'y'],
    supportedTypes: ['string', 'number', 'date']
  },
  exportFormats: ['png', 'jpg', 'pdf'],
  component: ChartJSRenderer
};

export default ChartJSRenderer;