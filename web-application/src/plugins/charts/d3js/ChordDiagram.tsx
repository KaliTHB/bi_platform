'use client';

import React, { useEffect, useRef ,useMemo} from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData, ChartInteractionEvent } from '@/types/chart.types';

interface ChordData {
  source: string;
  target: string;
  value: number;
}

interface ChordDiagramConfig {
  sourceField?: string;
  targetField?: string;
  valueField?: string;
  padAngle?: number;
  sortGroups?: boolean;
  sortSubgroups?: boolean;
  colorScheme?: 'category10' | 'category20' | 'spectral' | 'set3';
  showLabels?: boolean;
  labelPadding?: number;
  innerRadius?: number;
  outerRadius?: number;
  opacity?: number;
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
  return Boolean(data.rows && data.rows.length > 0);
};

export const ChordDiagram: React.FC<ChartProps> = ({
  data,
  config,
  width = 600,
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

      const chordConfig = config as ChordDiagramConfig;
      const {
        sourceField = 'source',
        targetField = 'target',
        valueField = 'value',
        padAngle = 0.05,
        sortGroups = true,
        sortSubgroups = true,
        colorScheme = 'category10',
        showLabels = true,
        labelPadding = 10,
        innerRadius,
        outerRadius,
        opacity = 0.8
      } = chordConfig;

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data to create chord matrix
      const processedData: ChordData[] = dataArray.map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          return {
            source: item[sourceField] || `source-${index}`,
            target: item[targetField] || `target-${index}`,
            value: parseFloat(item[valueField]) || 0
          };
        } else {
          // Fallback for simple array format
          return {
            source: item.source || `source-${index}`,
            target: item.target || `target-${index}`,
            value: parseFloat(item.value) || 0
          };
        }
      });

      if (processedData.length === 0) {
        throw new Error('No valid data found for chord diagram');
      }

      // Get unique nodes
      const nodes = Array.from(new Set([
        ...processedData.map(d => d.source),
        ...processedData.map(d => d.target)
      ]));

      const nodeCount = nodes.length;
      if (nodeCount < 2) {
        throw new Error('Need at least 2 nodes for chord diagram');
      }

      // Create adjacency matrix
      const matrix: number[][] = Array(nodeCount).fill(0).map(() => Array(nodeCount).fill(0));
      
      processedData.forEach(d => {
        const sourceIndex = nodes.indexOf(d.source);
        const targetIndex = nodes.indexOf(d.target);
        if (sourceIndex !== -1 && targetIndex !== -1) {
          matrix[sourceIndex][targetIndex] += d.value;
        }
      });

      // Calculate dimensions
      const size = Math.min(width, height);
      const radius = size * 0.4;
      const calculatedInnerRadius = innerRadius ?? radius * 0.9;
      const calculatedOuterRadius = outerRadius ?? radius;

      svg
        .attr('width', width)
        .attr('height', height);

      const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      // Set up color scale
      let colorScale: d3.ScaleOrdinal<string, string>;
      switch (colorScheme) {
        case 'category20':
          colorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeCategory10));
          break;
        case 'spectral':
          colorScale = d3.scaleOrdinal(d3.schemeSpectral[Math.min(nodeCount, 11)] || d3.schemeSpectral[11]);
          break;
        case 'set3':
          colorScale = d3.scaleOrdinal(d3.schemeSet3);
          break;
        default:
          colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      }

      // Create chord layout
      const chord = d3.chord()
        .padAngle(padAngle)
        .sortGroups(sortGroups ? d3.descending : null)
        .sortSubgroups(sortSubgroups ? d3.descending : null);

      const chords = chord(matrix);

      // Create ribbon generator
      const ribbon = d3.ribbon()
        .radius(calculatedInnerRadius);

      // Generate a stable chartId for this component instance
      const chartId = useMemo(() => 
        `chord-diagram-${Math.random().toString(36).substr(2, 9)}`, 
        []
      );

      // Create arc generator for groups
      const arc = d3.arc()
        .innerRadius(calculatedInnerRadius)
        .outerRadius(calculatedOuterRadius);

      // Add groups (the arcs)
      const group = g.append('g')
        .attr('class', 'groups')
        .selectAll('g')
        .data(chords.groups)
        .enter()
        .append('g')
        .attr('class', 'group');

      group.append('path')
        .style('fill', (d, i) => colorScale(i.toString()))
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .attr('d', arc as any)
        .on('click', (event, d) => {
          const nodeData = {
            index: d.index,
            name: nodes[d.index],
            value: d.value,
            startAngle: d.startAngle,
            endAngle: d.endAngle
          };
           onInteraction?.({
            type: 'click',
            chartId,
            data: nodeData,
            dataIndex: d.index,
            timestamp: Date.now(),
          });
        })
        .on('mouseover', (event, d) => {
          // Highlight related ribbons
          g.selectAll('.ribbons path')
            .style('opacity', (ribbonData: any) => 
              ribbonData.source.index === d.index || ribbonData.target.index === d.index ? opacity : 0.1
            );
          
          // Highlight current group
          d3.select(event.currentTarget)
            .style('stroke', '#333')
            .style('stroke-width', 2);

          const nodeData = {
            index: d.index,
            name: nodes[d.index],
            value: d.value,
            startAngle: d.startAngle,
            endAngle: d.endAngle
          };
            onInteraction?.({
              type: 'hover',
              chartId,
              data: nodeData,
              dataIndex: d.index,
              timestamp: Date.now()
            });
        })
        .on('mouseout', (event) => {
          // Reset ribbon opacity
          g.selectAll('.ribbons path')
            .style('opacity', opacity);
          
          // Reset group highlight
          d3.select(event.currentTarget)
            .style('stroke', '#fff')
            .style('stroke-width', 1);
        });

      // Add labels if enabled
      if (showLabels) {
        group.append('text')
          .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
          .attr('dy', '.35em')
          .attr('transform', (d: any) => {
            const angle = d.angle * 180 / Math.PI - 90;
            const radius = calculatedOuterRadius + labelPadding;
            return `rotate(${angle}) translate(${radius},0)${angle > 90 ? ' rotate(180)' : ''}`;
          })
          .style('text-anchor', (d: any) => d.angle > Math.PI ? 'end' : 'start')
          .style('font-size', '12px')
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .text((d, i) => nodes[i]);
      }

      // Add ribbons (the chords)
      const ribbons = g.append('g')
        .attr('class', 'ribbons')
        .selectAll('path')
        .data(chords)
        .enter()
        .append('path')
        .attr('d', ribbon as any)
        .style('fill', (d) => colorScale(d.source.index.toString()))
        .style('opacity', opacity)
        .style('stroke', '#fff')
        .style('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          const ribbonData = {
            source: {
              index: d.source.index,
              name: nodes[d.source.index],
              value: d.source.value
            },
            target: {
              index: d.target.index,
              name: nodes[d.target.index],
              value: d.target.value
            },
            value: matrix[d.source.index][d.target.index]
          };

           onInteraction?.({
    type: 'click',
    chartId,
    data: ribbonData,
    dataIndex: chords.indexOf(d),
    timestamp: Date.now()
  });
        })
        .on('mouseover', (event, d) => {
          // Highlight this ribbon
          d3.select(event.currentTarget)
            .style('opacity', 1)
            .style('stroke', '#333')
            .style('stroke-width', 2);
          
          // Highlight connected groups
          g.selectAll('.groups path')
            .style('opacity', (groupData: any) => 
              groupData.index === d.source.index || groupData.index === d.target.index ? 1 : 0.3
            );

          const ribbonData = {
            source: {
              index: d.source.index,
              name: nodes[d.source.index],
              value: d.source.value
            },
            target: {
              index: d.target.index,
              name: nodes[d.target.index],
              value: d.target.value
            },
            value: matrix[d.source.index][d.target.index]
          };
           onInteraction?.({
              type: 'click',
              chartId,
              data: ribbonData,
              dataIndex: chords.indexOf(d),
              timestamp: Date.now()
            });
        })
        .on('mouseout', (event) => {
          // Reset ribbon highlight
          d3.select(event.currentTarget)
            .style('opacity', opacity)
            .style('stroke', '#fff')
            .style('stroke-width', 0.5);
          
          // Reset group opacity
          g.selectAll('.groups path')
            .style('opacity', 1);
        });

      // Add title if provided
      if (config.title) {
        svg.append('text')
          .attr('class', 'chart-title')
          .attr('x', width / 2)
          .attr('y', 30)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-weight', 'bold')
          .attr('fill', '#333')
          .text(config.title);
      }

      // Add legend if there are not too many nodes
      if (nodeCount <= 10) {
        const legend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', `translate(20, 50)`);

        const legendItems = legend.selectAll('.legend-item')
          .data(nodes)
          .enter()
          .append('g')
          .attr('class', 'legend-item')
          .attr('transform', (d, i) => `translate(0, ${i * 20})`);

        legendItems.append('circle')
          .attr('r', 6)
          .attr('fill', (d, i) => colorScale(i.toString()));

        legendItems.append('text')
          .attr('x', 15)
          .attr('y', 4)
          .style('font-size', '12px')
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333')
          .text(d => d);
      }

      // Add statistics text
      const totalValue = processedData.reduce((sum, d) => sum + d.value, 0);
      const stats = svg.append('g')
        .attr('class', 'statistics')
        .attr('transform', `translate(${width - 150}, ${height - 40})`);

      stats.append('text')
        .style('font-size', '11px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', '#666')
        .text(`${nodeCount} nodes, ${processedData.length} connections`);

      stats.append('text')
        .attr('y', 15)
        .style('font-size', '11px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', '#666')
        .text(`Total value: ${totalValue.toLocaleString()}`);

    } catch (error) {
      console.error('Error creating Chord Diagram:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create chord diagram'));
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="chord-diagram-container" style={{ width, height }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Chart plugin configuration
export const ChordDiagramConfig = {
  name: 'd3js-chord-diagram',
  displayName: 'Chord Diagram (D3.js)',
  category: 'advanced' as const,
  library: 'd3js' as const,
  version: '1.0.0',
  description: 'Visualizes relationships between entities using curved ribbons in a circular layout',
  tags: ['chord', 'relationships', 'flow', 'circular', 'connections'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The title for the chord diagram'
      },
      sourceField: {
        type: 'string' as const,
        title: 'Source Field',
        description: 'Field containing source entity names',
        default: 'source'
      },
      targetField: {
        type: 'string' as const,
        title: 'Target Field',
        description: 'Field containing target entity names',
        default: 'target'
      },
      valueField: {
        type: 'string' as const,
        title: 'Value Field',
        description: 'Field containing relationship strength/flow values',
        default: 'value'
      },
      padAngle: {
        type: 'number' as const,
        title: 'Padding Angle',
        description: 'Angle padding between groups (in radians)',
        default: 0.05,
        minimum: 0,
        maximum: 0.2
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        description: 'Color scheme for the chord diagram',
        default: 'category10',
        options: [
          { label: 'Category 10', value: 'category10' },
          { label: 'Category 20', value: 'category20' },
          { label: 'Spectral', value: 'spectral' },
          { label: 'Set 3', value: 'set3' }
        ]
      },
      sortGroups: {
        type: 'boolean' as const,
        title: 'Sort Groups',
        description: 'Sort groups by total value',
        default: true
      },
      sortSubgroups: {
        type: 'boolean' as const,
        title: 'Sort Subgroups',
        description: 'Sort ribbons within groups',
        default: true
      },
      showLabels: {
        type: 'boolean' as const,
        title: 'Show Labels',
        description: 'Display labels for groups',
        default: true
      },
      labelPadding: {
        type: 'number' as const,
        title: 'Label Padding',
        description: 'Distance between arcs and labels',
        default: 10,
        minimum: 5,
        maximum: 30
      },
      opacity: {
        type: 'number' as const,
        title: 'Ribbon Opacity',
        description: 'Opacity of chord ribbons',
        default: 0.8,
        minimum: 0.1,
        maximum: 1
      }
    },
    required: ['sourceField', 'targetField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: undefined,
    requiredFields: ['sourceField', 'targetField', 'valueField'],
    optionalFields: [],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
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
  
  component: ChordDiagram
};

export default ChordDiagram;