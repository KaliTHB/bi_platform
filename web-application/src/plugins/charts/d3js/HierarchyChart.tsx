// D3.js Hierarchy Chart Component
// File: web-application/src/plugins/charts/d3js/HierarchyChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';
import { ChartProps, ChartData, ChartInteractionEvent } from '@/types/chart.types';

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
    // Use utility function to check data availability
    if (!svgRef.current || !hasDataContent(data)) return;

    try {
      const { nameField, valueField, parentField, type = 'tree', orientation = 'vertical' } = config as HierarchyChartConfig;
      
      // Get the actual data array
      const dataArray = getDataArray(data);
      
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
        children: buildHierarchy(dataArray)
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
          .style('fill', (d: any, i: number) => d.children ? '#69b3a2' : '#404080')
          .style('opacity', 0.8)
          .on('click', function(event, d: any) {
            onInteraction?.({
              type: 'click',
              data: d.data,
              dataIndex: d.index
            } as ChartInteractionEvent);
          });

        node.append('text')
          .attr('dy', '0.3em')
          .style('text-anchor', 'middle')
          .style('font-size', (d: any) => Math.min(2 * d.r, (2 * d.r - 8) / d.data.name.length * 24) + 'px')
          .style('fill', 'white')
          .text((d: any) => d.data.name);

      } else if (type === 'partition') {
        // Partition layout
        const node = g.selectAll('.node')
          .data(treeData.descendants())
          .enter().append('g')
          .attr('class', 'node');

        node.append('rect')
          .attr('x', (d: any) => d.x0)
          .attr('y', (d: any) => d.y0)
          .attr('width', (d: any) => d.x1 - d.x0)
          .attr('height', (d: any) => d.y1 - d.y0)
          .style('fill', (d: any) => d.children ? '#69b3a2' : '#404080')
          .style('stroke', 'white')
          .on('click', function(event, d: any) {
            onInteraction?.({
              type: 'click',
              data: d.data,
              dataIndex: d.index
            } as ChartInteractionEvent);
          });

      } else {
        // Tree and cluster layouts
        const link = g.selectAll('.link')
          .data(treeData.descendants().slice(1))
          .enter().append('path')
          .attr('class', 'link')
          .attr('d', (d: any) => {
            if (orientation === 'horizontal') {
              return `M${d.y},${d.x}C${(d.y + d.parent.y) / 2},${d.x} ${(d.y + d.parent.y) / 2},${d.parent.x} ${d.parent.y},${d.parent.x}`;
            } else {
              return `M${d.x},${d.y}C${d.x},${(d.y + d.parent.y) / 2} ${d.parent.x},${(d.y + d.parent.y) / 2} ${d.parent.x},${d.parent.y}`;
            }
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', '2px');

        const node = g.selectAll('.node')
          .data(treeData.descendants())
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', (d: any) => 
            orientation === 'horizontal' ? `translate(${d.y}, ${d.x})` : `translate(${d.x}, ${d.y})`
          );

        node.append('circle')
          .attr('r', 6)
          .style('fill', (d: any) => d.children ? '#69b3a2' : '#404080')
          .on('click', function(event, d: any) {
            onInteraction?.({
              type: 'click',
              data: d.data,
              dataIndex: d.index
            } as ChartInteractionEvent);
          });

        node.append('text')
          .attr('dy', '0.35em')
          .attr('x', (d: any) => d.children ? -13 : 13)
          .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
          .style('font-size', '12px')
          .text((d: any) => d.data.name);
      }

    } catch (error) {
      console.error('Error rendering hierarchy chart:', error);
      onError?.(error as Error);
    }
  }, [data, config, width, height, onInteraction, onError]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc' }}
    />
  );
};

export default HierarchyChart;