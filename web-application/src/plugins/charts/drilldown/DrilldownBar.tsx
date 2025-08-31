'use client';

import React, { useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';

interface DrilldownData {
  name: string;
  value: number;
  children?: DrilldownData[];
  parent?: string;
  level?: number;
}

interface DrilldownState {
  currentData: DrilldownData[];
  breadcrumbs: Array<{ name: string; data: DrilldownData[] }>;
  level: number;
}

// ⬇️ Local extension of ChartProps
interface DrilldownBarProps extends ChartProps {
  onDataPointClick?: (d: DrilldownData, event?: React.MouseEvent<SVGRectElement, MouseEvent>) => void;
  onDataPointHover?: (d: DrilldownData, event?: React.MouseEvent<SVGRectElement, MouseEvent>) => void;
}

export const DrilldownBar: React.FC<DrilldownBarProps> = ({
  data,
  config,
  width = 800,
  height = 400,
  onDataPointClick,
  onDataPointHover,
}) => {
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    currentData: data as DrilldownData[],
    breadcrumbs: [{ name: 'Root', data: data as DrilldownData[] }],
    level: 0
  });

  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleDrillDown = useCallback((item: DrilldownData) => {
    if (item.children && item.children.length > 0) {
      setDrilldownState(prev => ({
        currentData: item.children!,
        breadcrumbs: [...prev.breadcrumbs, { name: item.name, data: item.children! }],
        level: prev.level + 1
      }));
    }
    onDataPointClick?.(item); // ✅ now typed
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

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(drilldownState.currentData.map(d => d.name))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(drilldownState.currentData, d => d.value) || 0])
      .range([chartHeight, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw bars
    g.selectAll('.bar')
      .data(drilldownState.currentData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(d.value))
      .attr('height', d => chartHeight - yScale(d.value))
      .attr('fill', (d, i) => colorScale(i.toString()))
      .style('cursor', d => d.children && d.children.length > 0 ? 'pointer' : 'default')
      .on('click', (event, d) => {
        handleDrillDown(d);
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('opacity', 0.8);
        onDataPointHover?.(d, event);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).attr('opacity', 1);
      });

    // Add value labels
    g.selectAll('.value-label')
      .data(drilldownState.currentData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text(d => d.value);

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add drill indicator for items with children
    g.selectAll('.drill-indicator')
      .data(drilldownState.currentData.filter(d => d.children && d.children.length > 0))
      .enter()
      .append('text')
      .attr('class', 'drill-indicator')
      .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() - 10)
      .attr('y', d => yScale(d.value) + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#666')
      .text('▼');

  }, [drilldownState.currentData, width, height, config]);

  return (
    <div className="drilldown-bar-container">
      <NavigationBreadcrumbs
        breadcrumbs={drilldownState.breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DrilldownBar;

// Export the chart plugin configuration
export const DrilldownBarChartConfig = {
  name: 'drilldown-bar',
  displayName: 'Drilldown Bar Chart',
  category: 'custom' as const,
  library: 'drilldown' as const,
  version: '1.0.0',
  description: 'Interactive bar chart with multi-level drill-down capabilities',
  tags: ['interactive', 'drilldown', 'hierarchical', 'bar'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        default: 'Drilldown Bar Chart'
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Blues', value: 'blues' },
          { label: 'Greens', value: 'greens' },
          { label: 'Reds', value: 'reds' }
        ],
        default: 'default'
      },
      showValues: {
        type: 'boolean' as const,
        title: 'Show Values',
        default: true
      },
      orientation: {
        type: 'select' as const,
        title: 'Orientation',
        options: [
          { label: 'Vertical', value: 'vertical' },
          { label: 'Horizontal', value: 'horizontal' }
        ],
        default: 'vertical'
      },
      showAxes: {
        type: 'boolean' as const,
        title: 'Show Axes',
        default: true
      }
    },
    required: ['title']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 100,
    requiredFields: ['name', 'value'],
    optionalFields: ['children'],
    supportedTypes: ['string', 'number'] as const,
    aggregationSupport: false,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg', 'pdf'] as const,
  component: DrilldownBar
};


