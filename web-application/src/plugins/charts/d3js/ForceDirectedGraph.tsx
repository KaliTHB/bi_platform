'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';

interface NetworkNode {
  id: string;
  group?: number;
  size?: number;
  label?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value?: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface ForceDirectedGraphConfig {
  nodeIdField?: string;
  nodeGroupField?: string;
  nodeSizeField?: string;
  nodeLabelField?: string;
  linkSourceField?: string;
  linkTargetField?: string;
  linkValueField?: string;
  forceStrength?: number;
  linkDistance?: number;
  nodeSize?: [number, number];
  showLabels?: boolean;
  enableDrag?: boolean;
  colorScheme?: 'category10' | 'category20' | 'blues' | 'greens';
}

// Type guard to check if data is an array
const isDataArray = (data: any[] | ChartData): data is any[] => {
  return Array.isArray(data);
};

// Helper function to extract array data from either format
const getDataArray = (data: any[] | ChartData): any[] => {
  if (isDataArray(data)) {
    return data;
  }
  return data.rows || [];
};

// Helper function to check if we have valid data
const hasValidData = (data: any[] | ChartData): boolean => {
  if (isDataArray(data)) {
    return data.length > 0;
  }
  return data.rows && data.rows.length > 0;
};

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
    if (!data || !svgRef.current || !hasValidData(data)) {
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const graphConfig = config as ForceDirectedGraphConfig;
      const {
        nodeIdField = 'id',
        nodeGroupField = 'group',
        nodeSizeField = 'size',
        nodeLabelField = 'label',
        linkSourceField = 'source',
        linkTargetField = 'target',
        linkValueField = 'value',
        forceStrength = -300,
        linkDistance = 100,
        nodeSize = [5, 20],
        showLabels = true,
        enableDrag = true,
        colorScheme = 'category10'
      } = graphConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      let networkData: NetworkData;

      // Check if data is already in network format or needs to be processed
      if (dataArray.length > 0 && typeof dataArray[0] === 'object' && dataArray[0] !== null) {
        const firstItem = dataArray[0];
        
        // If data contains nodes and links arrays (pre-formatted network data)
        if ('nodes' in firstItem && 'links' in firstItem) {
          networkData = firstItem as NetworkData;
        } else {
          // Process tabular data to create network
          const nodes: NetworkNode[] = [];
          const links: NetworkLink[] = [];
          const nodeSet = new Set<string>();

          dataArray.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const sourceId = item[linkSourceField];
              const targetId = item[linkTargetField];
              const value = parseFloat(item[linkValueField]) || 1;

              if (sourceId && targetId) {
                // Add nodes if not already added
                if (!nodeSet.has(sourceId)) {
                  nodes.push({
                    id: sourceId,
                    group: item[nodeGroupField] || 1,
                    size: parseFloat(item[nodeSizeField]) || 10,
                    label: item[nodeLabelField] || sourceId
                  });
                  nodeSet.add(sourceId);
                }

                if (!nodeSet.has(targetId)) {
                  nodes.push({
                    id: targetId,
                    group: item[nodeGroupField] || 1,
                    size: parseFloat(item[nodeSizeField]) || 10,
                    label: item[nodeLabelField] || targetId
                  });
                  nodeSet.add(targetId);
                }

                // Add link
                links.push({
                  source: sourceId,
                  target: targetId,
                  value
                });
              }
            }
          });

          networkData = { nodes, links };
        }
      } else {
        throw new Error('Invalid data format for Force Directed Graph');
      }

      const { nodes, links } = networkData;

      if (!nodes || nodes.length === 0) {
        throw new Error('No nodes found in data');
      }

      // Set up color scale
      let colorScale: d3.ScaleOrdinal<string, string>;
      switch (colorScheme) {
        case 'category20':
          colorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeCategory10));
          break;
        case 'blues':
          colorScale = d3.scaleOrdinal(d3.schemeBlues[9] || d3.schemeBlues[d3.schemeBlues.length - 1]);
          break;
        case 'greens':
          colorScale = d3.scaleOrdinal(d3.schemeGreens[9] || d3.schemeGreens[d3.schemeGreens.length - 1]);
          break;
        default:
          colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      }

      // Set up size scale for nodes
      const nodeSizes = nodes.map(d => d.size || 10);
      const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(nodeSizes) as [number, number])
        .range(nodeSize);

      // Create force simulation
      const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(forceStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.size || 10) + 2));

      svg
        .attr('width', width)
        .attr('height', height);

      // Add container group for zoom if needed
      const container = svg.append('g')
        .attr('class', 'graph-container');

      // Add links
      const link = container.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => Math.sqrt((d.value || 1) * 2));

      // Add nodes
      const node = container.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', (d: any) => sizeScale(d.size || 10))
        .attr('fill', (d: any) => colorScale((d.group || 0).toString()))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', enableDrag ? 'grab' : 'pointer')
        .on('click', (event, d) => {
          onInteraction?.({
            type: 'click',
            data: {
              id: d.id,
              group: d.group,
              size: d.size,
              label: d.label,
              connections: links.filter(l => l.source === d.id || l.target === d.id).length
            },
            dataIndex: nodes.indexOf(d),
            event
          });
        })
        .on('mouseover', (event, d) => {
          // Highlight node and connected links
          const connectedLinks = links.filter(l => 
            (l.source as any).id === d.id || (l.target as any).id === d.id
          );
          
          // Highlight connected links
          link.style('stroke-opacity', (linkData: any) => 
            connectedLinks.includes(linkData) ? 1 : 0.1
          );
          
          // Highlight node
          d3.select(event.currentTarget)
            .attr('stroke-width', 4)
            .attr('stroke', '#333');
          
          onInteraction?.({
            type: 'hover',
            data: {
              id: d.id,
              group: d.group,
              size: d.size,
              label: d.label,
              connections: connectedLinks.length
            },
            dataIndex: nodes.indexOf(d),
            event
          });
        })
        .on('mouseout', (event) => {
          // Reset link opacity
          link.style('stroke-opacity', 0.6);
          
          // Reset node highlight
          d3.select(event.currentTarget)
            .attr('stroke-width', 2)
            .attr('stroke', '#fff');
        });

      // Add drag behavior
      if (enableDrag) {
        const dragHandler = d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            d3.select(event.sourceEvent.target).style('cursor', 'grab');
          });

        node.call(dragHandler);
      }

      // Add labels if enabled
      let labels: any;
      if (showLabels) {
        labels = container.append('g')
          .attr('class', 'labels')
          .selectAll('text')
          .data(nodes)
          .enter()
          .append('text')
          .text((d: any) => d.label || d.id)
          .style('font-size', '10px')
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .style('text-anchor', 'middle')
          .style('dominant-baseline', 'central');
      }

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        if (labels) {
          labels
            .attr('x', (d: any) => d.x)
            .attr('y', (d: any) => d.y);
        }
      });

      // Add title if provided
      if (config.title) {
        svg.append('text')
          .attr('class', 'chart-title')
          .attr('x', width / 2)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-weight', 'bold')
          .attr('fill', '#333')
          .text(config.title);
      }

      // Add legend for groups
      const groups = Array.from(new Set(nodes.map(d => d.group || 0))).sort();
      if (groups.length > 1 && groups.length <= 10) {
        const legend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', `translate(20, 50)`);

        const legendItems = legend.selectAll('.legend-item')
          .data(groups)
          .enter()
          .append('g')
          .attr('class', 'legend-item')
          .attr('transform', (d, i) => `translate(0, ${i * 20})`);

        legendItems.append('circle')
          .attr('r', 6)
          .attr('fill', d => colorScale(d.toString()));

        legendItems.append('text')
          .attr('x', 15)
          .attr('y', 4)
          .style('font-size', '12px')
          .style('font-family', 'Arial, sans-serif')
          .text(d => `Group ${d}`);
      }

      // Add control buttons
      const controls = svg.append('g')
        .attr('class', 'controls')
        .attr('transform', `translate(${width - 100}, 20)`);

      // Restart simulation button
      const restartButton = controls.append('g')
        .attr('class', 'restart-button')
        .style('cursor', 'pointer')
        .on('click', () => {
          simulation.alpha(1).restart();
        });

      restartButton.append('rect')
        .attr('width', 80)
        .attr('height', 25)
        .attr('fill', '#fff')
        .attr('stroke', '#ccc')
        .attr('rx', 3);

      restartButton.append('text')
        .attr('x', 40)
        .attr('y', 17)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .text('Restart');

    } catch (error) {
      console.error('Error creating Force Directed Graph:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create force directed graph'));
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="force-directed-graph-container" style={{ width, height }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Chart plugin configuration
export const ForceDirectedGraphConfig = {
  name: 'd3js-force-directed-graph',
  displayName: 'Force Directed Graph (D3.js)',
  category: 'advanced' as const,
  library: 'd3js' as const,
  version: '1.0.0',
  description: 'Interactive network visualization using force simulation to position nodes and links',
  tags: ['network', 'graph', 'force', 'relationships', 'interactive'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The title for the force directed graph'
      },
      nodeIdField: {
        type: 'string' as const,
        title: 'Node ID Field',
        description: 'Field containing node identifiers',
        default: 'id'
      },
      nodeGroupField: {
        type: 'string' as const,
        title: 'Node Group Field',
        description: 'Field containing node group/category',
        default: 'group'
      },
      nodeSizeField: {
        type: 'string' as const,
        title: 'Node Size Field',
        description: 'Field containing node size values',
        default: 'size'
      },
      nodeLabelField: {
        type: 'string' as const,
        title: 'Node Label Field',
        description: 'Field containing node labels',
        default: 'label'
      },
      linkSourceField: {
        type: 'string' as const,
        title: 'Link Source Field',
        description: 'Field containing source node IDs for links',
        default: 'source'
      },
      linkTargetField: {
        type: 'string' as const,
        title: 'Link Target Field',
        description: 'Field containing target node IDs for links',
        default: 'target'
      },
      linkValueField: {
        type: 'string' as const,
        title: 'Link Value Field',
        description: 'Field containing link strength/weight values',
        default: 'value'
      },
      forceStrength: {
        type: 'number' as const,
        title: 'Force Strength',
        description: 'Strength of the repulsion force between nodes',
        default: -300,
        minimum: -1000,
        maximum: 0
      },
      linkDistance: {
        type: 'number' as const,
        title: 'Link Distance',
        description: 'Target distance between connected nodes',
        default: 100,
        minimum: 20,
        maximum: 300
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        description: 'Color scheme for node groups',
        default: 'category10',
        options: [
          { label: 'Category 10', value: 'category10' },
          { label: 'Category 20', value: 'category20' },
          { label: 'Blues', value: 'blues' },
          { label: 'Greens', value: 'greens' }
        ]
      },
      showLabels: {
        type: 'boolean' as const,
        title: 'Show Labels',
        description: 'Display labels for nodes',
        default: true
      },
      enableDrag: {
        type: 'boolean' as const,
        title: 'Enable Drag',
        description: 'Allow dragging of nodes',
        default: true
      }
    },
    required: ['linkSourceField', 'linkTargetField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: undefined,
    requiredFields: ['linkSourceField', 'linkTargetField'],
    optionalFields: ['nodeIdField', 'nodeGroupField', 'nodeSizeField', 'nodeLabelField', 'linkValueField'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg'],
  
  interactionSupport: {
    zoom: false,
    pan: false,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  },
  
  component: ForceDirectedGraph
};

export default ForceDirectedGraph;