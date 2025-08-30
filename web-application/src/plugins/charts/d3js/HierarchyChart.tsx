'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface HierarchyData {
  name: string;
  value?: number;
  children?: HierarchyData[];
}

export const HierarchyChart: React.FC<ChartProps> = ({
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

    const margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const treemap = d3.tree<HierarchyData>()
      .size([chartHeight, chartWidth]);

    // Create hierarchy from data
    const root = d3.hierarchy(data as HierarchyData);
    const treeData = treemap(root);

    // Add links
    const link = g.selectAll('.link')
      .data(treeData.descendants().slice(1))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        return `M${d.y},${d.x}C${(d.y + d.parent.y) / 2},${d.x} ${(d.y + d.parent.y) / 2},${d.parent.x} ${d.parent.y},${d.parent.x}`;
      })
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', '2px');

    // Add nodes
    const node = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', d => 'node' + (d.children ? ' node--internal' : ' node--leaf'))
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => {
        onDataPointClick?.(d.data, event);
      })
      .on('mouseover', (event, d) => {
        onDataPointHover?.(d.data, event);
      });

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.data.value ? Math.sqrt(d.data.value) * 2 : 8)
      .style('fill', d => d.children ? '#555' : '#999')
      .style('stroke', '#fff')
      .style('stroke-width', '2px');

    // Add labels
    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -13 : 13)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text(d => d.data.name);

    // Add value labels if available
    node.filter(d => d.data.value)
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', d => d.children ? -13 : 13)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(d => d.data.value);

  }, [data, width, height, config]);

  return (
    <div className="hierarchy-chart-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default HierarchyChart;