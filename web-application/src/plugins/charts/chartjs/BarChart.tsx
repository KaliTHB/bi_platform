'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps } from '@/types/chart.types';

export interface ChartJSBarConfig {
  xField: string;
  yField: string;
  seriesField?: string;
  indexAxis?: 'x' | 'y';
  stacked?: boolean;
}

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
    if (!canvasRef.current || !data?.length) return;

    try {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const { xField, yField, seriesField, indexAxis = 'x', stacked = false } = config as ChartJSBarConfig;

      // Process data
      const labels = Array.from(new Set(data.map(item => item[xField])));
      
      let datasets;
      if (seriesField) {
        const series = Array.from(new Set(data.map(item => item[seriesField])));
        datasets = series.map((s, index) => {
          const seriesData = labels.map(label => {
            const item = data.find(d => d[xField] === label && d[seriesField] === s);
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
          data: data.map(item => parseFloat(item[yField]) || 0),
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
      console.error('Chart.js Bar chart error:', error);
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