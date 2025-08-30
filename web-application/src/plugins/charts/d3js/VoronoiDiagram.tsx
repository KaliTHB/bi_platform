// D3.js Voronoi Diagram Component  
// File: web-application/src/plugins/charts/d3js/VoronoiDiagram.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

export interface VoronoiDiagramConfig {
  xField: string;
  yField: string;
  colorField?: string;
  strokeWidth?: number;
  showPoints?: boolean;
}

export const VoronoiDiagram: React.FC<ChartProps> = ({
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
      const { xField, yField, colorField, strokeWidth = 1, showPoints = true } = config as VoronoiDiagramConfig;
      
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const margin = { top: 20, right: 20, bottom: 30, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Scales
      const xScale = d3.scaleLinear()
        .domain(d3.extent(data, (d: any) => parseFloat(d[xField])) as [number, number])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain(d3.extent(data, (d: any) => parseFloat(d[yField])) as [number, number])
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // Prepare points
      const points = data.map((d: any) => [
        xScale(parseFloat(d[xField])),
        yScale(parseFloat(d[yField]))
      ]);

      // Create Voronoi diagram
      const voronoi = d3.Delaunay
        .from(points)
        .voronoi([0, 0, innerWidth, innerHeight]);

      // Add Voronoi cells
      g.append('g')
        .attr('class', 'voronoi')
        .selectAll('path')
        .data(data)
        .enter().append('path')
        .attr('d', (d: any, i: number) => voronoi.renderCell(i))
        .attr('fill', (d: any) => colorField ? color(d[colorField]) : 'none')
        .attr('stroke', '#666')
        .attr('stroke-width', strokeWidth)
        .attr('fill-opacity', 0.3)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill-opacity', 0.6);
        })
        .on('mouseout', function(event, d) {
          d3.select(this).attr('fill-opacity', 0.3);
        })
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: d,
            event
          });
        });

      // Add points if requested
      if (showPoints) {
        g.append('g')
          .attr('class', 'points')
          .selectAll('circle')
          .data(data)
          .enter().append('circle')
          .attr('cx', (d: any) => xScale(parseFloat(d[xField])))
          .attr('cy', (d: any) => yScale(parseFloat(d[yField])))
          .attr('r', 3)
          .attr('fill', (d: any) => colorField ? color(d[colorField]) : '#333')
          .attr('stroke', 'white')
          .attr('stroke-width', 1);
      }

      // Add axes
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

      g.append('g')
        .call(d3.axisLeft(yScale));

    } catch (error) {
      console.error('Voronoi diagram error:', error);
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

export default VoronoiDiagramConfig;