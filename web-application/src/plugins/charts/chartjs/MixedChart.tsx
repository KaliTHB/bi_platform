// Chart.js Mixed Chart Component  
// File: web-application/src/plugins/charts/chartjs/MixedChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps } from '@/types/chart.types';

export interface ChartJSMixedConfig {
  xField: string;
  series: Array<{
    yField: string;
    type: 'bar' | 'line';
    label: string;
    yAxisID?: string;
  }>;
  dualAxis?: boolean;
}

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
    if (!canvasRef.current || !data?.length) return;

    try {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const { xField, series, dualAxis = false } = config as ChartJSMixedConfig;

      const labels = data.map(item => item[xField]);
      
      const datasets = series.map((s, index) => {
        const baseConfig = {
          label: s.label,
          data: data.map(item => parseFloat(item[s.yField]) || 0),
          borderColor: `hsl(${index * 360 / series.length}, 70%, 50%)`,
          backgroundColor: `hsla(${index * 360 / series.length}, 70%, 60%, 0.6)`,
          yAxisID: dualAxis && index > 0 ? 'y1' : 'y'
        };

        if (s.type === 'line') {
          return {
            ...baseConfig,
            type: 'line' as const,
            borderWidth: 2,
            fill: false,
            tension: 0.4
          };
        } else {
          return {
            ...baseConfig,
            type: 'bar' as const,
            borderWidth: 1
          };
        }
      });

      const scales: any = {
        x: {
          title: {
            display: true,
            text: xField
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: series[0]?.label || 'Value'
          }
        }
      };

      if (dualAxis && series.length > 1) {
        scales.y1 = {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: series[1]?.label || 'Value 2'
          },
          grid: {
            drawOnChartArea: false,
          },
        };
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
          scales,
          plugins: {
            title: {
              display: !!config.title,
              text: config.title
            },
            legend: {
              display: true
            }
          },
          onClick: (event: any, elements: any[]) => {
            if (elements.length > 0) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              
              onInteraction?.({
                type: 'click',
                data: {
                  label: labels[index],
                  value: datasets[datasetIndex].data[index],
                  series: datasets[datasetIndex].label
                },
                event
              });
            }
          }
        }
      };

      chartInstance.current = new Chart(canvasRef.current, chartConfig);

    } catch (error) {
      console.error('Chart.js Mixed chart error:', error);
      onError?.(error as Error);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, config, width, height]);

  return (
    <div style={{ width, height }}>
      <canvas ref={canvasRef} />
    </div>
  );
};