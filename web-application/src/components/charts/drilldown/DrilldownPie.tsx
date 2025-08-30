'use client';

import React, { useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';

interface DrilldownPieData {
  name: string;
  value: number;
  children?: DrilldownPieData[];
  parent?: string;
  level?: number;
}

interface DrilldownState {
  currentData: DrilldownPieData[];
  breadcrumbs: Array<{ name: string; data: DrilldownPieData[] }>;
  level: number;
}

export const DrilldownPie: React.FC<ChartProps> = ({
  data,
  config,
  width = 600,
  height = 600,
  onDataPointClick,
  onDataPointHover,
}) => {
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    currentData: data as DrilldownPieData[],
    breadcrumbs: [{ name: 'Root', data: data as DrilldownPieData[] }],
    level: 0
  });

  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleDrillDown = useCallback((item: DrilldownPieData) => {
    if (item.children && item.children.length > 0) {
      setDrilldownState(prev => ({
        currentData: item.children!,
        breadcrumbs: [...prev.breadcrumbs, { name: item.name, data: item.children! }],
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

    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius * 0.3; // Create a donut chart for better drilldown visualization

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create pie layout
    const pie = d3.pie<DrilldownPieData>()
      .sort(null)
      .value(d => d.value);

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<DrilldownPieData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcHover = d3.arc<d3.PieArcDatum<DrilldownPieData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create pie slices
    const arcs = g.selectAll('.arc')
      .data(pie(drilldownState.currentData))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Add paths
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', d => d.data.children && d.data.children.length > 0 ? 'pointer' : 'default')
      .on('click', (event, d) => {
        handleDrillDown(d.data);
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('d', arcHover);
        onDataPointHover?.(d.data, event);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr('d', arc);
      });

    // Add labels
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text(d => d.data.name);

    // Add value labels
    arcs.append('text')
      .attr('transform', d => {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1] + 15})`;
      })
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .style('pointer-events', 'none')
      .text(d => d.data.value);

    // Add drill indicators
    arcs.filter(d => d.data.children && d.data.children.length > 0)
      .append('circle')
      .attr('transform', d => {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0] + 20}, ${centroid[1] - 20})`;
      })
      .attr('r', 8)
      .attr('fill', '#007bff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    arcs.filter(d => d.data.children && d.data.children.length > 0)
      .append('text')
      .attr('transform', d => {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0] + 20}, ${centroid[1] - 20})`;
      })
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .text('▼');

    // Add center label showing current level
    g.append('text')
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text(`Level ${drilldownState.level}`);

  }, [drilldownState.currentData, width, height, config]);

  return (
    <div className="drilldown-pie-container">
      <NavigationBreadcrumbs
        breadcrumbs={drilldownState.breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DrilldownPie;