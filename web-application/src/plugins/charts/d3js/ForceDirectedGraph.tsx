// D3.js Force Directed Graph Component
// File: web-application/src/plugins/charts/d3js/ForceDirectedGraph.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

interface NetworkData {
  nodes: Array<{
    id: string;
    group?: number;
    size?: number;
    label?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value?: number;
  }>;
}

export interface ForceDirectedGraphConfig {
  nodeIdField?: string;
  nodeGroupField?: string;
  nodeSizeField?: string;
  nodeLabelField?: string;
  linkSourceField?: string;
  linkTargetField?: string;
  linkValueField?: string;
  strength?: number;
  linkDistance?: number;
}

export const ForceDirectedGraph: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 600,
  onInteraction,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Use utility function to check data availability
    if (!hasDataContent(data) || !svgRef.current) return;

    try {
      const {
        nodeIdField = 'id',
        nodeGroupField = 'group',
        nodeSizeField = 'size',
        nodeLabelField = 'label',
        linkSourceField = 'source',
        linkTargetField = 'target',
        linkValueField = 'value',
        strength = -300,
        linkDistance = 100
      } = config as ForceDirectedGraphConfig;

      // Get the actual data array
      const dataArray = getDataArray(data);

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Process data to network format
      let networkData: NetworkData;
      
      // Check if data is already in network format
      if (dataArray.length > 0 && 'nodes' in dataArray[0] && 'links' in dataArray[0]) {
        networkData = dataArray[0] as NetworkData;
      } else {
        // Transform flat data to network format
        const nodes = dataArray.map((d: any) => ({
          id: d[nodeIdField] || d.id || `node_${dataArray.indexOf(d)}`,
          group: d[nodeGroupField] || d.group || 0,
          size: d[nodeSizeField] || d.size || 8,
          label: d[nodeLabelField] || d.label || d[nodeIdField] || d.id
        }));

        const links = dataArray
          .filter((d: any) => d[linkSourceField] && d[linkTargetField])
          .map((d: any) => ({
            source: d[linkSourceField],
            target: d[linkTargetField],
            value: d[linkValueField] || d.value || 1
          }));

        networkData = { nodes, links };
      }

      const { nodes, links } = networkData;

      if (!nodes || nodes.length === 0) {
        throw new Error('No nodes found in data');
      }

      const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(strength))
        .force('center', d3.forceCenter(width / 2, height / 2));

      svg
        .attr('width', width)
        .attr('height', height);

      // Color scale
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

      // Add links
      const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value || 1));

      // Add nodes
      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', (d: any) => d.size || 8)
        .attr('fill', (d: any) => colorScale((d.group || 0).toString()))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .call(d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
        )
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: d,
            dataIndex: nodes.indexOf(d)
          } as ChartInteractionEvent);
        })
        .on('mouseover', (event, d) => {
          onInteraction?.({
            type: 'hover',
            data: d,
            dataIndex: nodes.indexOf(d)
          });
        });

      // Add labels
      const label = svg.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text((d: any) => d.label || d.id)
        .style('font-size', '12px')
        .style('fill', '#333')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none');

      // Update positions on tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        label
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y + 4);
      });

      // Zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
          svg.selectAll('g').attr('transform', event.transform);
        });

      svg.call(zoom);

    } catch (error) {
      console.error('Error rendering force directed graph:', error);
      onError?.(error as Error);
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="force-directed-graph-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ForceDirectedGraph;