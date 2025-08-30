'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface GeoData {
  id: string;
  coordinates: [number, number];
  value: number;
  label?: string;
}

export const GeographicMap: React.FC<ChartProps> = ({
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

    const processedData = data as GeoData[];

    // Set up projection
    const projection = d3.geoMercator()
      .scale(150)
      .center([0, 20])
      .translate([width / 2, height / 2]);

    const path = d3.geoPath()
      .projection(projection);

    // Create color scale based on values
    const maxValue = d3.max(processedData, d => d.value) || 0;
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, maxValue]);

    // Size scale for circles
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([2, 20]);

    // Load world map data (simplified world-110m.json)
    // For demo purposes, we'll create a simple world outline
    const worldData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
            ]]
          },
          properties: {}
        }
      ]
    };

    // Draw world map
    svg.append('g')
      .selectAll('path')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);

    // Add data points
    const points = svg.append('g')
      .attr('class', 'data-points')
      .selectAll('circle')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('cx', d => projection(d.coordinates)?.[0] || 0)
      .attr('cy', d => projection(d.coordinates)?.[1] || 0)
      .attr('r', d => sizeScale(d.value))
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

    // Add labels for significant points
    svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(processedData.filter(d => d.value > maxValue * 0.5))
      .enter()
      .append('text')
      .attr('x', d => (projection(d.coordinates)?.[0] || 0) + sizeScale(d.value) + 5)
      .attr('y', d => (projection(d.coordinates)?.[1] || 0) + 4)
      .text(d => d.label || d.id)
      .style('font-size', '12px')
      .style('fill', '#333')
      .style('pointer-events', 'none');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        svg.selectAll('g').attr('transform', event.transform);
      });

    svg.call(zoom);

  }, [data, width, height, config]);

  return (
    <div className="geographic-map-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default GeographicMap;