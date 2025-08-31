'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';

interface HierarchyNode {
  id: string;
  parent?: string | null;
  value?: number;
  label?: string;
  category?: string;
  children?: HierarchyNode[];
}

interface HierarchyChartConfig {
  idField?: string;
  parentField?: string;
  valueField?: string;
  labelField?: string;
  categoryField?: string;
  layout?: 'tree' | 'cluster' | 'treemap' | 'pack' | 'partition';
  orientation?: 'vertical' | 'horizontal';
  colorScheme?: 'category10' | 'category20' | 'blues' | 'greens' | 'spectral';
  showLabels?: boolean;
  nodeSize?: [number, number];
  linkStyle?: 'straight' | 'curved' | 'step';
  enableZoom?: boolean;
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

export const HierarchyChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 600,
  onInteraction,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || !hasValidData(data)) {
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const hierarchyConfig = config as HierarchyChartConfig;
      const {
        idField = 'id',
        parentField = 'parent',
        valueField = 'value',
        labelField = 'label',
        categoryField = 'category',
        layout = 'tree',
        orientation = 'vertical',
        colorScheme = 'category10',
        showLabels = true,
        nodeSize = [10, 10],
        linkStyle = 'curved',
        enableZoom = true
      } = hierarchyConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data to create hierarchy
      let hierarchyData: HierarchyNode[];

      // Check if data is already in hierarchical format or needs to be processed
      const firstItem = dataArray[0];
      if (firstItem && typeof firstItem === 'object' && 'children' in firstItem) {
        // Data is already in hierarchical format
        hierarchyData = dataArray as HierarchyNode[];
      } else {
        // Process tabular data to create hierarchy
        const processedData: HierarchyNode[] = dataArray.map((item: any, index: number) => {
          if (typeof item === 'object' && item !== null) {
            return {
              id: item[idField] || `node-${index}`,
              parent: item[parentField] || null,
              value: parseFloat(item[valueField]) || 1,
              label: item[labelField] || item[idField] || `Node ${index}`,
              category: item[categoryField] || 'default'
            };
          } else {
            // Fallback for simple format
            return {
              id: item.id || `node-${index}`,
              parent: item.parent || null,
              value: parseFloat(item.value) || 1,
              label: item.label || item.id || `Node ${index}`,
              category: item.category || 'default'
            };
          }
        });

        // Convert flat data to hierarchy
        const idMap = new Map<string, HierarchyNode>();
        const roots: HierarchyNode[] = [];

        // First pass: create all nodes
        processedData.forEach((item: any) => {
          item.children = [];
          idMap.set(item.id, item);
        });

        // Second pass: build parent-child relationships
        processedData.forEach((item: any) => {
          if (item.parent && idMap.has(item.parent)) {
            const parent = idMap.get(item.parent)!;
            if (!parent.children) parent.children = [];
            parent.children.push(item);
          } else {
            roots.push(item);
          }
        });

        hierarchyData = roots;
      }

      if (hierarchyData.length === 0) {
        throw new Error('No valid hierarchy data found');
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
        case 'spectral':
          colorScale = d3.scaleOrdinal(d3.schemeSpectral[11]);
          break;
        default:
          colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      }

      svg
        .attr('width', width)
        .attr('height', height);

      // Create container for zoom if enabled
      const container = svg.append('g')
        .attr('class', 'hierarchy-container');

      // Create hierarchy from data
      const root = d3.hierarchy(hierarchyData[0], (d: any) => d.children)
        .sum((d: any) => d.value || 1)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

      let hierarchyLayout: any;
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Apply different layouts based on config
      switch (layout) {
        case 'cluster':
          if (orientation === 'horizontal') {
            hierarchyLayout = d3.cluster<HierarchyNode>()
              .size([innerHeight, innerWidth]);
          } else {
            hierarchyLayout = d3.cluster<HierarchyNode>()
              .size([innerWidth, innerHeight]);
          }
          break;

        case 'treemap':
          hierarchyLayout = d3.treemap<HierarchyNode>()
            .size([innerWidth, innerHeight])
            .paddingOuter(4)
            .paddingTop(20)
            .paddingInner(2)
            .round(true);
          break;

        case 'pack':
          hierarchyLayout = d3.pack<HierarchyNode>()
            .size([innerWidth, innerHeight])
            .padding(3);
          break;

        case 'partition':
          hierarchyLayout = d3.partition<HierarchyNode>()
            .size([2 * Math.PI, Math.sqrt(innerWidth * innerHeight / Math.PI)]);
          break;

        case 'tree':
        default:
          if (orientation === 'horizontal') {
            hierarchyLayout = d3.tree<HierarchyNode>()
              .size([innerHeight, innerWidth])
              .nodeSize(nodeSize);
          } else {
            hierarchyLayout = d3.tree<HierarchyNode>()
              .size([innerWidth, innerHeight])
              .nodeSize(nodeSize);
          }
          break;
      }

      const layoutResult = hierarchyLayout(root);
      const nodes = layoutResult.descendants();
      const links = layoutResult.links();

      const g = container.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      if (layout === 'treemap') {
        // Treemap specific rendering
        const leaf = g.selectAll('g')
          .data(nodes.filter((d: any) => !d.children))
          .enter().append('g')
          .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

        leaf.append('rect')
          .attr('id', (d: any) => d.data.id)
          .attr('width', (d: any) => d.x1 - d.x0)
          .attr('height', (d: any) => d.y1 - d.y0)
          .attr('fill', (d: any) => colorScale(d.data.category || '0'))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('click', (event: any, d: any) => {
            onInteraction?.({
              type: 'click',
              data: {
                id: d.data.id,
                label: d.data.label,
                value: d.data.value,
                category: d.data.category,
                depth: d.depth,
                area: (d.x1 - d.x0) * (d.y1 - d.y0)
              },
              dataIndex: nodes.indexOf(d),
              event
            });
          })
          .on('mouseover', (event: any, d: any) => {
            d3.select(event.currentTarget)
              .attr('stroke', '#333')
              .attr('stroke-width', 2);

            onInteraction?.({
              type: 'hover',
              data: {
                id: d.data.id,
                label: d.data.label,
                value: d.data.value,
                category: d.data.category,
                depth: d.depth,
                area: (d.x1 - d.x0) * (d.y1 - d.y0)
              },
              dataIndex: nodes.indexOf(d),
              event
            });
          })
          .on('mouseout', (event: any) => {
            d3.select(event.currentTarget)
              .attr('stroke', '#fff')
              .attr('stroke-width', 1);
          });

        if (showLabels) {
          leaf.append('text')
            .attr('x', 4)
            .attr('y', 14)
            .text((d: any) => d.data.label)
            .attr('font-size', '11px')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#333')
            .style('pointer-events', 'none');
        }

      } else if (layout === 'pack') {
        // Pack (circle packing) specific rendering
        const node = g.selectAll('circle')
          .data(nodes)
          .enter().append('circle')
          .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
          .attr('r', (d: any) => d.r)
          .attr('fill', (d: any) => d.children ? '#fff' : colorScale(d.data.category || '0'))
          .attr('stroke', '#333')
          .attr('stroke-width', (d: any) => d.children ? 2 : 1)
          .style('cursor', 'pointer')
          .on('click', (event: any, d: any) => {
            onInteraction?.({
              type: 'click',
              data: {
                id: d.data.id,
                label: d.data.label,
                value: d.data.value,
                category: d.data.category,
                depth: d.depth,
                radius: d.r
              },
              dataIndex: nodes.indexOf(d),
              event
            });
          });

        if (showLabels) {
          g.selectAll('text')
            .data(nodes)
            .enter().append('text')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
            .attr('dy', '0.3em')
            .attr('text-anchor', 'middle')
            .text((d: any) => d.data.label)
            .attr('font-size', (d: any) => Math.min(2 * d.r, (2 * d.r - 8) / d.data.label.length * 24) + 'px')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', (d: any) => d.children ? '#333' : '#fff')
            .style('pointer-events', 'none');
        }

      } else {
        // Tree/Cluster rendering
        // Add links first (so they appear behind nodes)
        const link = g.append('g')
          .attr('class', 'links')
          .selectAll('path')
          .data(links)
          .enter().append('path')
          .attr('fill', 'none')
          .attr('stroke', '#555')
          .attr('stroke-opacity', 0.4)
          .attr('stroke-width', 1.5);

        // Define link path based on style and orientation
        if (linkStyle === 'straight') {
          if (orientation === 'horizontal') {
            link.attr('d', (d: any) => `M${d.source.y},${d.source.x}L${d.target.y},${d.target.x}`);
          } else {
            link.attr('d', (d: any) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
          }
        } else if (linkStyle === 'step') {
          if (orientation === 'horizontal') {
            link.attr('d', (d: any) => {
              const midY = (d.source.y + d.target.y) / 2;
              return `M${d.source.y},${d.source.x}H${midY}V${d.target.x}H${d.target.y}`;
            });
          } else {
            link.attr('d', (d: any) => {
              const midX = (d.source.x + d.target.x) / 2;
              return `M${d.source.x},${d.source.y}V${midX}H${d.target.x}V${d.target.y}`;
            });
          }
        } else {
          // Curved links
          if (orientation === 'horizontal') {
            link.attr('d', d3.linkHorizontal()
              .x((d: any) => d.y)
              .y((d: any) => d.x) as any);
          } else {
            link.attr('d', d3.linkVertical()
              .x((d: any) => d.x)
              .y((d: any) => d.y) as any);
          }
        }

        // Add nodes
        const node = g.append('g')
          .attr('class', 'nodes')
          .selectAll('g')
          .data(nodes)
          .enter().append('g')
          .attr('transform', (d: any) => 
            orientation === 'horizontal' 
              ? `translate(${d.y},${d.x})` 
              : `translate(${d.x},${d.y})`
          );

        node.append('circle')
          .attr('fill', (d: any) => d.children ? '#555' : colorScale(d.data.category || '0'))
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('r', (d: any) => d.children ? 6 : 4)
          .style('cursor', 'pointer')
          .on('click', (event: any, d: any) => {
            onInteraction?.({
              type: 'click',
              data: {
                id: d.data.id,
                label: d.data.label,
                value: d.data.value,
                category: d.data.category,
                depth: d.depth,
                hasChildren: !!d.children
              },
              dataIndex: nodes.indexOf(d),
              event
            });
          })
          .on('mouseover', (event: any, d: any) => {
            d3.select(event.currentTarget)
              .attr('stroke', '#333')
              .attr('stroke-width', 3);

            onInteraction?.({
              type: 'hover',
              data: {
                id: d.data.id,
                label: d.data.label,
                value: d.data.value,
                category: d.data.category,
                depth: d.depth,
                hasChildren: !!d.children
              },
              dataIndex: nodes.indexOf(d),
              event
            });
          })
          .on('mouseout', (event: any) => {
            d3.select(event.currentTarget)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);
          });

        if (showLabels) {
          node.append('text')
            .attr('dy', '0.31em')
            .attr('x', (d: any) => d.children ? -6 : 6)
            .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
            .text((d: any) => d.data.label)
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .attr('paint-order', 'stroke')
            .attr('font-size', '11px')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#333')
            .style('pointer-events', 'none');
        }
      }

      // Add zoom behavior if enabled
      if (enableZoom && (layout === 'tree' || layout === 'cluster')) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 4])
          .on('zoom', (event: any) => {
            container.attr('transform', event.transform);
          });

        svg.call(zoom);
      }

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

    } catch (error) {
      console.error('Error creating Hierarchy Chart:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create hierarchy chart'));
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="hierarchy-chart-container" style={{ width, height }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Chart plugin configuration
export const HierarchyChartConfig = {
  name: 'd3js-hierarchy-chart',
  displayName: 'Hierarchy Chart (D3.js)',
  category: 'advanced' as const,
  library: 'd3js' as const,
  version: '1.0.0',
  description: 'Visualizes hierarchical data using various layout algorithms including trees, treemaps, and circle packing',
  tags: ['hierarchy', 'tree', 'treemap', 'pack', 'organizational', 'nested'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The title for the hierarchy chart'
      },
      idField: {
        type: 'string' as const,
        title: 'ID Field',
        description: 'Field containing unique node identifiers',
        default: 'id'
      },
      parentField: {
        type: 'string' as const,
        title: 'Parent Field',
        description: 'Field containing parent node identifiers',
        default: 'parent'
      },
      valueField: {
        type: 'string' as const,
        title: 'Value Field',
        description: 'Field containing node values/sizes',
        default: 'value'
      },
      labelField: {
        type: 'string' as const,
        title: 'Label Field',
        description: 'Field containing node labels',
        default: 'label'
      },
      categoryField: {
        type: 'string' as const,
        title: 'Category Field',
        description: 'Field containing node categories for coloring',
        default: 'category'
      },
      layout: {
        type: 'select' as const,
        title: 'Layout Type',
        description: 'Layout algorithm to use for the hierarchy',
        default: 'tree',
        options: [
          { label: 'Tree', value: 'tree' },
          { label: 'Cluster', value: 'cluster' },
          { label: 'Treemap', value: 'treemap' },
          { label: 'Circle Pack', value: 'pack' },
          { label: 'Partition', value: 'partition' }
        ]
      },
      orientation: {
        type: 'select' as const,
        title: 'Orientation',
        description: 'Layout orientation (for tree and cluster layouts)',
        default: 'vertical',
        options: [
          { label: 'Vertical', value: 'vertical' },
          { label: 'Horizontal', value: 'horizontal' }
        ]
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        description: 'Color scheme for nodes',
        default: 'category10',
        options: [
          { label: 'Category 10', value: 'category10' },
          { label: 'Category 20', value: 'category20' },
          { label: 'Blues', value: 'blues' },
          { label: 'Greens', value: 'greens' },
          { label: 'Spectral', value: 'spectral' }
        ]
      },
      linkStyle: {
        type: 'select' as const,
        title: 'Link Style',
        description: 'Style for connecting links (tree/cluster only)',
        default: 'curved',
        options: [
          { label: 'Curved', value: 'curved' },
          { label: 'Straight', value: 'straight' },
          { label: 'Step', value: 'step' }
        ]
      },
      showLabels: {
        type: 'boolean' as const,
        title: 'Show Labels',
        description: 'Display labels for nodes',
        default: true
      },
      enableZoom: {
        type: 'boolean' as const,
        title: 'Enable Zoom',
        description: 'Allow zooming and panning (tree/cluster only)',
        default: true
      }
    },
    required: ['idField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: undefined,
    requiredFields: ['idField'],
    optionalFields: ['parentField', 'valueField', 'labelField', 'categoryField'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg'],
  
  interactionSupport: {
    zoom: true,
    pan: true,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  },
  
  component: HierarchyChart
};

export default HierarchyChart;