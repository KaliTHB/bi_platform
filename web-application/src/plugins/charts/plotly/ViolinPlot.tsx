// Plotly Violin Plot Component
// File: web-application/src/plugins/charts/plotly/ViolinPlot.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { ChartProps } from '@/types/chart.types';

export interface PlotlyViolinConfig {
  xField: string;
  yField: string;
  groupField?: string;
  box?: boolean;
  meanline?: boolean;
}

export const PlotlyViolinPlot: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current || !data?.length) return;

    try {
      const { xField, yField, groupField, box = true, meanline = true } = config as PlotlyViolinConfig;

      const traces = [];

      if (groupField) {
        const groups = Array.from(new Set(data.map(item => item[groupField])));
        
        groups.forEach((group, index) => {
          const groupData = data.filter(item => item[groupField] === group);
          
          traces.push({
            type: 'violin' as const,
            x: groupData.map(item => item[xField]),
            y: groupData.map(item => parseFloat(item[yField]) || 0),
            name: group,
            box: { visible: box },
            meanline: { visible: meanline },
            fillcolor: `hsl(${index * 360 / groups.length}, 70%, 60%)`,
            line: { color: `hsl(${index * 360 / groups.length}, 70%, 40%)` }
          });
        });
      } else {
        traces.push({
          type: 'violin' as const,
          x: data.map(item => item[xField]),
          y: data.map(item => parseFloat(item[yField]) || 0),
          name: 'Data',
          box: { visible: box },
          meanline: { visible: meanline },
          fillcolor: 'rgba(54, 162, 235, 0.6)',
          line: { color: 'rgba(54, 162, 235, 1)' }
        });
      }

      const layout = {
        title: config.title || 'Violin Plot',
        xaxis: { title: xField },
        yaxis: { title: yField },
        width,
        height,
        margin: { l: 60, r: 50, b: 50, t: 50 }
      };

      Plotly.newPlot(plotRef.current, traces, layout, { responsive: true });

      plotRef.current.on('plotly_click', (eventData: any) => {
        if (eventData.points?.length > 0) {
          const point = eventData.points[0];
          onInteraction?.({
            type: 'click',
            data: {
              x: point.x,
              y: point.y,
              group: point.data.name
            },
            event: eventData
          });
        }
      });

    } catch (error) {
      console.error('Plotly Violin plot error:', error);
      onError?.(error as Error);
    }

    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [data, config, width, height]);

  return <div ref={plotRef} style={{ width, height }} />;