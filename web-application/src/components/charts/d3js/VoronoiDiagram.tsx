'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface VoronoiData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

export const VoronoiDiagram: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 600,
  onDataPointClick,
  onDataPointHover,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr('width', width)
      .attr('height', height);

    const processedData = data as VoronoiData[];

    // Create Voronoi generator
    const voronoi = d3.Delaunay
      .from(processedData, d => d.x, d => d.y)
      .voronoi([0, 0, width, height]);

    // Color scale
    const maxValue = d3.max(processedData, d => d.value) || 0;
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, maxValue]);

    // Draw Voronoi cells
    const cells = svg.append('g')
      .attr('class', 'voronoi-cells')
      .selectAll('path')
      .data(processedData)
      .enter()
      .append('path')
      .attr('d', (d, i) => voronoi.renderCell(i))
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', 0.7)
      .on('click', (event, d) => {
        onDataPointClick?.(d, event);
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .attr('opacity', 1)
          .attr('stroke-width', 2);
        onDataPointHover?.(d, event);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .attr('opacity', 0.7)
          .attr('stroke-width', 1);
      });

    // Draw points
    svg.append('g')
      .attr('class', 'voronoi-points')
      .selectAll('circle')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 3)
      .attr('fill', '#333')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Add labels for points with high values
    svg.append('g')
      .attr('class', 'voronoi-labels')
      .selectAll('text')
      .data(processedData.filter(d => d.value > maxValue * 0.7))
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y - 10)
      .text(d => d.label || d.value.toFixed(1))
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none');

  }, [data, width, height, config]);

  return (
    <div className="voronoi-diagram-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default VoronoiDiagram;