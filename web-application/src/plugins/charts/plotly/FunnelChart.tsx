'use client';

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { ChartProps } from '@/types/chart.types';

export interface PlotlyFunnelConfig {
  nameField: string;
  valueField: string;
  textposition?: 'inside' | 'outside' | 'auto';
  textinfo?: string;
}

export const PlotlyFunnelChart: React.FC<ChartProps> = ({
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
      const { nameField, valueField, textposition = 'inside', textinfo = 'label+percent' } = config as PlotlyFunnelConfig;

      const trace = {
        type: 'funnel' as const,
        y: data.map(item => item[nameField]),
        x: data.map(item => parseFloat(item[valueField]) || 0),
        textposition,
        textinfo,
        hovertemplate: `%{y}<br>Value: %{x}<extra></extra>`,
        marker: {
          colorscale: 'Blues',
          showscale: false
        }
      };

      const layout = {
        title: config.title || 'Funnel Chart',
        width,
        height,
        margin: { l: 100, r: 50, b: 50, t: 50 },
        funnelmode: 'stack'
      };

      Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });

      plotRef.current.on('plotly_click', (eventData: any) => {
        if (eventData.points?.length > 0) {
          const point = eventData.points[0];
          onInteraction?.({
            type: 'click',
            data: {
              name: point.y,
              value: point.x,
              pointIndex: point.pointIndex
            },
            event: eventData
          });
        }
      });

    } catch (error) {
      console.error('Plotly Funnel chart error:', error);
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
