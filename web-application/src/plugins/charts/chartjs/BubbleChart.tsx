'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartProps } from '@/types/chart.types';

export interface ChartJSBubbleConfig {
  xField: string;
  yField: string;
  sizeField: string;
  colorField?: string;
}

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
    if (!canvasRef.current || !data?.length) return;

    try {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const { xField, yField, sizeField, colorField } = config as ChartJSBubbleConfig;

      // Process data for bubble chart
      const processedData = data.map((item, index) => ({
        x: parseFloat(item[xField]) || 0,
        y: parseFloat(item[yField]) || 0,
        r: Math.sqrt((parseFloat(item[sizeField]) || 1) / Math.PI) * 5, // Scale radius
        backgroundColor: colorField 
          ? `hsl(${(item[colorField].toString().length * 50) % 360}, 70%, 60%)`
          : `hsl(${index * 360 / data.length}, 70%, 60%)`
      }));

      const chartConfig = {
        type: 'bubble' as const,
        data: {
          datasets: [{
            label: 'Bubble Data',
            data: processedData,
            backgroundColor: processedData.map(d => d.backgroundColor)
          }]
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
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const dataIndex = context.dataIndex;
                  const originalData = data[dataIndex];
                  return [
                    `${xField}: ${context.parsed.x}`,
                    `${yField}: ${context.parsed.y}`,
                    `${sizeField}: ${originalData[sizeField]}`
                  ];
                }
              }
            }
          },
          onClick: (event: any, elements: any[]) => {
            if (elements.length > 0) {
              const element = elements[0];
              const index = element.index;
              
              onInteraction?.({
                type: 'click',
                data: data[index],
                event
              });
            }
          }
        }
      };

      chartInstance.current = new Chart(canvasRef.current, chartConfig);

    } catch (error) {
      console.error('Chart.js Bubble chart error:', error);
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
