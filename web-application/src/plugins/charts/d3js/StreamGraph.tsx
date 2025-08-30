// D3.js Stream Graph Component
// File: web-application/src/plugins/charts/d3js/StreamGraph.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

export interface StreamGraphConfig {
  xField: string;
  yField: string;
  seriesField: string;
  offset?: 'expand' | 'diverging' | 'silhouette' | 'wiggle';
  curve?: 'basis' | 'cardinal' | 'linear' | 'monotone';
}

export const StreamGraph: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data?.length) return;

    try {
      const { xField, yField, seriesField, offset = 'wiggle', curve = 'basis' } = config as StreamGraphConfig;
      
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const margin = { top: 20, right: 30, bottom: 30, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Group data by x and series
      const grouped = d3.group(data, (d: any) => d[xField]);
      const series = Array.from(new Set(data.map((d: any) => d[seriesField])));
      
      // Create stacked data
      const stackedData: any[] = [];
      grouped.forEach((values, key) => {
        const point: any = { [xField]: key };
        series.forEach(s => {
          const item = values.find((d: any) => d[seriesField] === s);
          point[s] = item ? parseFloat(item[yField]) || 0 : 0;
        });
        stackedData.push(point);
      });

      // Sort by x field
      stackedData.sort((a, b) => d3.ascending(a[xField], b[xField]));

      // Create stack layout
      const stack = d3.stack()
        .keys(series)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

      const layers = stack(stackedData);

      // Scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(stackedData, (d: any) => new Date(d[xField])) as [Date, Date])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain(d3.extent(layers.flat(2)) as [number, number])
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(series);

      // Area generator
      const area = d3.area<any>()
        .x((d: any) => xScale(new Date(d.data[xField])))
        .y0((d: any) => yScale(d[0]))
        .y1((d: any) => yScale(d[1]))
        .curve(d3.curveBasis);

      // Add layers
      g.selectAll('.layer')
        .data(layers)
        .enter().append('path')
        .attr('class', 'layer')
        .attr('d', area)
        .attr('fill', (d: any) => color(d.key))
        .style('opacity', 0.8)
        .on('mouseover', function(event, d) {
          d3.select(this).style('opacity', 1);
        })
        .on('mouseout', function(event, d) {
          d3.select(this).style('opacity', 0.8);
        })
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: { series: d.key, values: d },
            event
          });
        });

      // Add x axis
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

      // Add legend
      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth - 100}, 20)`);

      const legendItems = legend.selectAll('.legend-item')
        .data(series)
        .enter().append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

      legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', color);

      legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text((d: any) => d)
        .style('font-size', '12px');

    } catch (error) {
      console.error('Stream graph error:', error);
      onError?.(error as Error);
    }
  }, [data, config, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    />
  );
};

export default StreamGraph;