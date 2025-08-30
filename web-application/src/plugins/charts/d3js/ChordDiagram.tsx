'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

export interface ChordDiagramConfig {
  sourceField: string;
  targetField: string;
  valueField: string;
  innerRadius?: number;
  outerRadius?: number;
  padAngle?: number;
}

export const ChordDiagram: React.FC<ChartProps> = ({
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
      const { sourceField, targetField, valueField, innerRadius = 80, outerRadius = 100 } = config as ChordDiagramConfig;
      
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      // Get unique nodes
      const nodes = Array.from(new Set([
        ...data.map(d => d[sourceField]),
        ...data.map(d => d[targetField])
      ]));

      // Create matrix
      const matrix: number[][] = Array(nodes.length).fill(0).map(() => Array(nodes.length).fill(0));
      
      data.forEach(d => {
        const sourceIndex = nodes.indexOf(d[sourceField]);
        const targetIndex = nodes.indexOf(d[targetField]);
        const value = parseFloat(d[valueField]) || 0;
        matrix[sourceIndex][targetIndex] = value;
      });

      const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      const ribbon = d3.ribbon()
        .radius(innerRadius);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const chords = chord(matrix);

      // Add groups (arcs)
      const group = g.append('g')
        .attr('class', 'groups')
        .selectAll('g')
        .data(chords.groups)
        .enter().append('g');

      group.append('path')
        .style('fill', (d: any) => color(d.index))
        .style('stroke', (d: any) => d3.rgb(color(d.index)).darker())
        .attr('d', arc as any)
        .on('mouseover', fade(0.1))
        .on('mouseout', fade(1))
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: { node: nodes[d.index], value: d.value },
            event
          });
        });

      // Add labels
      group.append('text')
        .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('dy', '.35em')
        .attr('transform', (d: any) => `
          rotate(${(d.angle * 180 / Math.PI - 90)})
          translate(${outerRadius + 10})
          ${d.angle > Math.PI ? 'rotate(180)' : ''}
        `)
        .style('text-anchor', (d: any) => d.angle > Math.PI ? 'end' : null)
        .text((d: any) => nodes[d.index]);

      // Add ribbons
      g.append('g')
        .attr('class', 'ribbons')
        .selectAll('path')
        .data(chords)
        .enter().append('path')
        .attr('d', ribbon as any)
        .style('fill', (d: any) => color(d.target.index))
        .style('stroke', (d: any) => d3.rgb(color(d.target.index)).darker())
        .style('opacity', 0.7)
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget).style('opacity', 1);
        })
        .on('mouseout', (event, d) => {
          d3.select(event.currentTarget).style('opacity', 0.7);
        })
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: {
              source: nodes[d.source.index],
              target: nodes[d.target.index],
              value: d.source.value
            },
            event
          });
        });

      function fade(opacity: number) {
        return function(event: any, g: any) {
          svg.selectAll('.ribbons path')
            .filter((d: any) => d.source.index !== g.index && d.target.index !== g.index)
            .transition()
            .style('opacity', opacity);
        };
      }

    } catch (error) {
      console.error('Chord diagram error:', error);
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

export default ChordDiagram;