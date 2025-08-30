'use client';

import React, { useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';

interface TreemapData {
  name: string;
  value?: number;
  children?: TreemapData[];
}

interface DrilldownState {
  currentData: TreemapData;
  breadcrumbs: Array<{ name: string; data: TreemapData }>;
  level: number;
}

export const HierarchicalTreemap: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 600,
  onDataPointClick,
  onDataPointHover,
}) => {
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    currentData: data as TreemapData,
    breadcrumbs: [{ name: 'Root', data: data as TreemapData }],
    level: 0
  });

  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleDrillDown = useCallback((item: TreemapData) => {
    if (item.children && item.children.length > 0) {
      setDrilldownState(prev => ({
        currentData: item,
        breadcrumbs: [...prev.breadcrumbs, { name: item.name, data: item }],
        level: prev.level + 1
      }));
    }
    onDataPointClick?.(item);
  }, [onDataPointClick]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    const newBreadcrumbs = drilldownState.breadcrumbs.slice(0, index + 1);
    setDrilldownState({
      currentData: newBreadcrumbs[newBreadcrumbs.length - 1].data,
      breadcrumbs: newBreadcrumbs,
      level: index
    });
  }, [drilldownState.breadcrumbs]);

  React.useEffect(() => {
    if (!drilldownState.currentData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr('width', width)
      .attr('height', height);

    // Create treemap layout
    const treemap = d3.treemap<TreemapData>()
      .size([width, height])
      .paddingTop(20)
      .paddingRight(3)
      .paddingBottom(3)
      .paddingLeft(3)
      .round(true);

    // Create hierarchy
    const root = d3.hierarchy(drilldownState.currentData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemap(root);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create groups for each node
    const leaf = svg.selectAll('.leaf')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'leaf')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    leaf.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', d => d.data.children && d.data.children.length > 0 ? 'pointer' : 'default')
      .on('click', (event, d) => {
        handleDrillDown(d.data);
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('opacity', 0.8);
        onDataPointHover?.(d.data, event);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).attr('opacity', 1);
      });

    // Add text labels
    leaf.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text(d => d.data.name)
      .style('font-size', d => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        return Math.min(rectWidth / 6, rectHeight / 4, 14) + 'px';
      })
      .style('fill', '#333')
      .style('pointer-events', 'none');

    // Add value labels
    leaf.append('text')
      .attr('x', 4)
      .attr('y', 28)
      .text(d => d.data.value || 0)
      .style('font-size', d => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        return Math.min(rectWidth / 8, rectHeight / 6, 12) + 'px';
      })
      .style('fill', '#666')
      .style('pointer-events', 'none');

    // Add drill indicators for nodes with children
    leaf.filter(d => d.data.children && d.data.children.length > 0)
      .append('circle')
      .attr('cx', d => (d.x1 - d.x0) - 15)
      .attr('cy', 15)
      .attr('r', 8)
      .attr('fill', '#007bff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    leaf.filter(d => d.data.children && d.data.children.length > 0)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) - 15)
      .attr('y', 15)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .text('▼');

  }, [drilldownState.currentData, width, height, config]);

  return (
    <div className="hierarchical-treemap-container">
      <NavigationBreadcrumbs
        breadcrumbs={drilldownState.breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default HierarchicalTreemap;