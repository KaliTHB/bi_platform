'use client';

import React, { useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';
import { 
  getDataArray, 
  hasDataContent, 
  isChartDataEmpty 
} from '../utils/chartDataUtils';

interface TreemapData {
  name: string;
  value?: number;
  children?: TreemapData[];
}

interface DrilldownState {
  currentData: TreemapData;
  breadcrumbs: Array<{ name: string; data: any[] }>; // Match NavigationBreadcrumbs expected interface
  level: number;
}

// Define specific props for this component
interface HierarchicalTreemapProps extends ChartProps {
  onDataPointClick?: (data: any, event?: any) => void;
  onDataPointHover?: (data: any, event?: any) => void;
}

export const HierarchicalTreemap: React.FC<HierarchicalTreemapProps> = ({
  data,
  config,
  width = 800,
  height = 600,
  onDataPointClick,
  onDataPointHover,
}) => {
  // Helper function to convert data to TreemapData format
  const convertToTreemapData = React.useCallback((inputData: any[] | ChartData): TreemapData => {
  // If it's already in the correct format, return it
  if (inputData && typeof inputData === 'object' && 'name' in inputData) {
    return inputData as TreemapData;
  }

  // Use existing utilities to handle data safely
  if (isChartDataEmpty(inputData)) {
    return {
      name: 'Root',
      value: 0,
      children: []
    };
  }

  // Get data array using utility (this handles undefined rows safely)
  const dataArray = getDataArray(inputData);
  
  // If we got an empty array, return empty structure
  if (dataArray.length === 0) {
    return {
      name: 'Root',
      value: 0,
      children: []
    };
  }

  // If it's an array, assume it's already TreemapData format
  if (Array.isArray(inputData)) {
    return {
      name: 'Root',
      children: inputData as TreemapData[]
    };
  }

  // Convert to TreemapData format
  try {
    return {
      name: 'Root',
      children: dataArray.map((row, index) => {
        // Add safety checks for each row
        if (!row || typeof row !== 'object') {
          return {
            name: `Item ${index}`,
            value: 1
          };
        }
        
        return {
          name: row.name || row.label || `Item ${index}`,
          value: typeof row.value === 'number' ? row.value : 
                 typeof row.count === 'number' ? row.count : 1
        };
      })
    };
  } catch (error) {
    console.error('Error converting data to TreemapData:', error);
    return {
      name: 'Root',
      value: 0,
      children: []
    };
  }
}, []);

  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    currentData: convertToTreemapData(data),
    breadcrumbs: [{ name: 'Root', data: [convertToTreemapData(data)] }], // Wrap in array
    level: 0
  });

  // Update state when data changes
    React.useEffect(() => {
      // Use utility function to validate data
      if (hasDataContent(data)) {
        const newData = convertToTreemapData(data);
        setDrilldownState({
          currentData: newData,
          breadcrumbs: [{ name: 'Root', data: [newData] }],
          level: 0
        });
      } else {
        // Handle empty data case
        const emptyData = {
          name: 'Root',
          value: 0,
          children: []
        };
        setDrilldownState({
          currentData: emptyData,
          breadcrumbs: [{ name: 'Root', data: [emptyData] }],
          level: 0
        });
      }
    }, [data, convertToTreemapData]);

  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleDrillDown = useCallback((item: TreemapData) => {
    const hasChildren = item.children !== undefined && 
                       Array.isArray(item.children) && 
                       item.children.length > 0;
    
    if (hasChildren) {
      setDrilldownState(prev => ({
        currentData: item,
        breadcrumbs: [...prev.breadcrumbs, { name: item.name, data: [item] }], // Wrap in array
        level: prev.level + 1
      }));
    }
    onDataPointClick?.(item);
  }, [onDataPointClick]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    const newBreadcrumbs = drilldownState.breadcrumbs.slice(0, index + 1);
    const selectedData = newBreadcrumbs[newBreadcrumbs.length - 1].data[0]; // Extract from array
    setDrilldownState({
      currentData: selectedData,
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

    // Apply treemap layout - this adds x0, y0, x1, y1 properties
    treemap(root);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Type the nodes properly after treemap layout
    type TreemapNode = d3.HierarchyRectangularNode<TreemapData>;

    // Create groups for each leaf node
    const leaf = svg.selectAll('.leaf')
      .data(root.leaves() as TreemapNode[])
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
      .style('cursor', d => {
        const hasChildren = d.data.children !== undefined && 
                           Array.isArray(d.data.children) && 
                           d.data.children.length > 0;
        return hasChildren ? 'pointer' : 'default';
      })
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
    leaf.filter(d => {
      return d.data.children !== undefined && 
             Array.isArray(d.data.children) && 
             d.data.children.length > 0;
    })
      .append('circle')
      .attr('cx', d => (d.x1 - d.x0) - 15)
      .attr('cy', 15)
      .attr('r', 8)
      .attr('fill', '#007bff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    leaf.filter(d => {
      return d.data.children !== undefined && 
             Array.isArray(d.data.children) && 
             d.data.children.length > 0;
    })
      .append('text')
      .attr('x', d => (d.x1 - d.x0) - 15)
      .attr('y', 15)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .text('▼');

  }, [drilldownState.currentData, width, height, handleDrillDown, onDataPointHover]);

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