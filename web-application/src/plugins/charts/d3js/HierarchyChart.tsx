'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

export interface HierarchyChartConfig {
  nameField: string;
  valueField?: string;
  parentField?: string;
  type: 'tree' | 'cluster' | 'pack' | 'partition';
  orientation?: 'horizontal' | 'vertical';
}

export const HierarchyChart: React.FC<ChartProps> = ({
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
      const { nameField, valueField, parentField, type = 'tree', orientation = 'vertical' } = config as HierarchyChartConfig;
      
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const margin = { top: 20, right: 90, bottom: 30, left: 90 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Build hierarchy from data
      const buildHierarchy = (items: any[], parentId: string | null = null): any => {
        const children = items
          .filter(item => (parentField ? item[parentField] : null) === parentId)
          .map(item => ({
            name: item[nameField],
            value: valueField ? parseFloat(item[valueField]) || 0 : 1,
            data: item,
            children: buildHierarchy(items, item[nameField])
          }));
        
        return children.length > 0 ? children : undefined;
      };

      const hierarchyData = {
        name: 'root',
        children: buildHierarchy(data)
      };

      const root = d3.hierarchy(hierarchyData)
        .sum((d: any) => d.value || 0)
        .sort((a: any, b: any) => b.value - a.value);

      let layout: any;
      
      switch (type) {
        case 'tree':
          layout = d3.tree().size([innerHeight, innerWidth]);
          break;
        case 'cluster':
          layout = d3.cluster().size([innerHeight, innerWidth]);
          break;
        case 'pack':
          layout = d3.pack().size([innerWidth, innerHeight]).padding(3);
          break;
        case 'partition':
          layout = d3.partition().size([innerWidth, innerHeight]).padding(2);
          break;
        default:
          layout = d3.tree().size([innerHeight, innerWidth]);
      }

      const treeData = layout(root);

      if (type === 'pack') {
        // Circle packing layout
        const node = g.selectAll('.node')
          .data(treeData.descendants())
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

        node.append('circle')
          .attr('r', (d: any) => d.r)
          .style('fill', (d: any, i: number) => d.children ? '#fff' : d3.schemeCategory10[i % 10])
          .style('stroke', '#666')
          .style('stroke-width', 1);

        node.append('text')
          .attr('dy', '0.3em')
          .style('text-anchor', 'middle')
          .style('font-size', (d: any) => Math.min(d.r / 3, 12) + 'px')
          .text((d: any) => d.data.name);

      } else {
        // Tree/Cluster layout
        const links = g.selectAll('.link')
          .data(treeData.descendants().slice(1))
          .enter().append('path')
          .attr('class', 'link')
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', 1.5)
          .attr('d', (d: any) => {
            return 'M' + d.y + ',' + d.x
              + 'C' + (d.y + d.parent.y) / 2 + ',' + d.x
              + ' ' + (d.y + d.parent.y) / 2 + ',' + d.parent.x
              + ' ' + d.parent.y + ',' + d.parent.x;
          });

        const nodes = g.selectAll('.node')
          .data(treeData.descendants())
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', (d: any) => `translate(${d.y}, ${d.x})`);

        nodes.append('circle')
          .attr('r', 5)
          .style('fill', (d: any) => d.children ? '#fff' : '#999')
          .style('stroke', '#666')
          .style('stroke-width', 2);

        nodes.append('text')
          .attr('dy', '0.35em')
          .attr('x', (d: any) => d.children ? -13 : 13)
          .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
          .style('font-size', '12px')
          .text((d: any) => d.data.name);
      }

      // Add click handlers
      g.selectAll('.node')
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: d.data,
            event
          });
        });

    } catch (error) {
      console.error('Hierarchy chart error:', error);
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
export default HierarchyChart;