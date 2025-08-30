'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface ChordData {
  source: string;
  target: string;
  value: number;
}

export const ChordDiagram: React.FC<ChartProps> = ({
  data,
  config,
  width = 600,
  height = 600,
  onDataPointClick,
  onDataPointHover,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Process data
    const processedData = data as ChordData[];
    
    // Create matrix
    const nodes = Array.from(new Set([
      ...processedData.map(d => d.source),
      ...processedData.map(d => d.target)
    ]));

    const matrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));

    processedData.forEach(d => {
      const sourceIndex = nodes.indexOf(d.source);
      const targetIndex = nodes.indexOf(d.target);
      matrix[sourceIndex][targetIndex] = d.value;
    });

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);

    const chords = chord(matrix);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(radius - 80)
      .outerRadius(radius - 60);

    const ribbon = d3.ribbon()
      .radius(radius - 80);

    // Draw groups (outer arcs)
    const group = g.selectAll('.group')
      .data(chords.groups)
      .enter()
      .append('g')
      .attr('class', 'group');

    group.append('path')
      .style('fill', (d, i) => colorScale(i.toString()))
      .style('stroke', '#000')
      .style('stroke-width', '1px')
      .attr('d', arc as any)
      .on('click', (event, d) => {
        const nodeData = {
          node: nodes[d.index],
          value: d.value,
          startAngle: d.startAngle,
          endAngle: d.endAngle
        };
        onDataPointClick?.(nodeData, event);
      })
      .on('mouseover', (event, d) => {
        const nodeData = {
          node: nodes[d.index],
          value: d.value,
          startAngle: d.startAngle,
          endAngle: d.endAngle
        };
        onDataPointHover?.(nodeData, event);
      });

    // Add labels
    group.append('text')
      .each(function(d) { 
        const angle = (d.startAngle + d.endAngle) / 2;
        (d as any).angle = angle + (Math.cos(angle - Math.PI / 2) < 0 ? Math.PI : 0);
      })
      .attr('dy', '.35em')
      .attr('transform', function(d) {
        return `rotate(${((d as any).angle * 180 / Math.PI - 90)}) translate(${radius - 45}) ${(d as any).angle > Math.PI ? 'rotate(180)' : ''}`;
      })
      .style('text-anchor', function(d) { return (d as any).angle > Math.PI ? 'end' : null; })
      .style('font-size', '12px')
      .style('fill', '#333')
      .text((d, i) => nodes[i]);

    // Draw ribbons (connections)
    g.selectAll('.ribbon')
      .data(chords)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .attr('d', ribbon as any)
      .style('fill', d => colorScale(d.source.index.toString()))
      .style('stroke', '#000')
      .style('stroke-width', '0.5px')
      .style('opacity', 0.7)
      .on('click', (event, d) => {
        const ribbonData = {
          source: nodes[d.source.index],
          target: nodes[d.target.index],
          value: d.source.value
        };
        onDataPointClick?.(ribbonData, event);
      })
      .on('mouseover', (event, d) => {
        const ribbonData = {
          source: nodes[d.source.index],
          target: nodes[d.target.index],
          value: d.source.value
        };
        onDataPointHover?.(ribbonData, event);
      });

  }, [data, width, height, config]);

  return (
    <div className="chord-diagram-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ChordDiagram;