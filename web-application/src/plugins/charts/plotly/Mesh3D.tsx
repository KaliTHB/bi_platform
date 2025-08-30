// File: web-application/src/plugins/charts/plotly/Mesh3D.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { ChartProps } from '@/types/chart.types';

export interface PlotlyMesh3DConfig {
  xField: string;
  yField: string;
  zField: string;
  colorField?: string;
  opacity?: number;
  showscale?: boolean;
}

export const PlotlyMesh3D: React.FC<ChartProps> = ({
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
      const { xField, yField, zField, colorField, opacity = 0.8, showscale = true } = config as PlotlyMesh3DConfig;

      const x = data.map(item => parseFloat(item[xField]) || 0);
      const y = data.map(item => parseFloat(item[yField]) || 0);
      const z = data.map(item => parseFloat(item[zField]) || 0);
      const intensity = colorField ? data.map(item => parseFloat(item[colorField]) || 0) : z;

      const trace = {
        type: 'mesh3d' as const,
        x,
        y,
        z,
        intensity,
        opacity,
        showscale,
        colorscale: 'Viridis',
        hovertemplate: `${xField}: %{x}<br>${yField}: %{y}<br>${zField}: %{z}<extra></extra>`
      };

      const layout = {
        title: config.title || 'Mesh 3D',
        scene: {
          xaxis: { title: xField },
          yaxis: { title: yField },
          zaxis: { title: zField }
        },
        width,
        height,
        margin: { l: 0, r: 0, b: 0, t: 30 }
      };

      Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });

      // Handle click events
      plotRef.current.on('plotly_click', (eventData: any) => {
        if (eventData.points?.length > 0) {
          const point = eventData.points[0];
          onInteraction?.({
            type: 'click',
            data: {
              x: point.x,
              y: point.y,
              z: point.z,
              pointIndex: point.pointIndex
            },
            event: eventData
          });
        }
      });

    } catch (error) {
      console.error('Plotly Mesh3D error:', error);
      onError?.(error as Error);
    }

    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [data, config, width, height]);

  return <div ref={plotRef} style={{ width, height }} />;
};