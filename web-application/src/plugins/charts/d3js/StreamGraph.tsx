// D3.js Stream Graph Component
// File: web-application/src/plugins/charts/d3js/StreamGraph.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';

export interface StreamGraphConfig {
  xField: string;
  yField: string;
  seriesField: string;
  offset?: 'expand' | 'diverging' | 'silhouette' | 'wiggle';
  curve?: 'basis' | 'cardinal' | 'linear' | 'monotone';
}

// Type guard to check if data is ChartData
const isChartData = (data: any[] | ChartData): data is ChartData => {
  return data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows);
};

// Helper function to get the data array
const getDataArray = (data: any[] | ChartData): any[] => {
  if (isChartData(data)) {
    return data.rows;
  }
  return data || [];
};

export const StreamGraph: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Get the actual data array and check if it has length
    const dataArray = getDataArray(data);
    if (!svgRef.current || !dataArray.length) return;

    try {
      const { xField, yField, seriesField, offset = 'wiggle', curve = 'basis' } = config as StreamGraphConfig;
      
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const margin = { top: 20, right: 30, bottom: 30, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Group data by x and series
      const grouped = d3.group(dataArray, (d: any) => d[xField]);
      const series = Array.from(new Set(dataArray.map((d: any) => d[seriesField])));
      
      // Create stacked data
      const stackedData: any[] = [];
      grouped.forEach((values, key) => {
        const point: any = { [xField]: key };
        series.forEach(s => {
          const item = values.find((d: any) => d[seriesField] === s);
          point[s] = item ? parseFloat(item[yField]) || 0 : 0;
        });
        stackedData.push(point);
      });

      // Sort by x field
      stackedData.sort((a, b) => d3.ascending(a[xField], b[xField]));

      // Create stack generator with proper D3 API functions
      const getStackOffset = (offsetType: string) => {
        switch (offsetType) {
          case 'expand':
            return d3.stackOffsetExpand;
          case 'diverging':
            return d3.stackOffsetDiverging;
          case 'silhouette':
            return d3.stackOffsetSilhouette;
          case 'wiggle':
            return d3.stackOffsetWiggle;
          default:
            return d3.stackOffsetWiggle;
        }
      };

      const stack = d3.stack()
        .keys(series)
        .offset(getStackOffset(offset))
        .order(d3.stackOrderNone);

      const stackedSeries = stack(stackedData);

      // Create scales
      const xScale = d3.scaleLinear()
        .domain(d3.extent(stackedData, d => parseFloat(d[xField])) as [number, number])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain(d3.extent(stackedSeries.flat(), d => Math.max(Math.abs(d[0]), Math.abs(d[1]))) as [number, number])
        .range([innerHeight, 0]);

      // Create color scale
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(series);

      // Create area generator with proper D3 curve functions
      const getCurveType = (curveType: string) => {
        switch (curveType) {
          case 'basis':
            return d3.curveBasis;
          case 'cardinal':
            return d3.curveCardinal;
          case 'linear':
            return d3.curveLinear;
          case 'monotone':
            return d3.curveMonotoneX;
          default:
            return d3.curveBasis;
        }
      };

      const area = d3.area<any>()
        .x((d, i) => xScale(parseFloat(stackedData[i][xField])))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(getCurveType(curve));

      // Draw areas
      g.selectAll('.stream-layer')
        .data(stackedSeries)
        .enter()
        .append('path')
        .attr('class', 'stream-layer')
        .attr('d', area)
        .style('fill', (d: any) => colorScale(d.key))
        .style('opacity', 0.8)
        .on('mouseover', function(event, d: any) {
          d3.select(this).style('opacity', 1);
          onInteraction?.({
            type: 'hover',
            data: d,
            seriesIndex: series.indexOf(d.key)
          });
        })
        .on('mouseout', function(event, d: any) {
          d3.select(this).style('opacity', 0.8);
        })
        .on('click', function(event, d: any) {
          onInteraction?.({
            type: 'click',
            data: d,
            seriesIndex: series.indexOf(d.key)
          });
        });

      // Add x-axis
      const xAxis = d3.axisBottom(xScale);
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis);

      // Add y-axis
      const yAxis = d3.axisLeft(yScale);
      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);

      // Add legend
      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth - 100}, 20)`);

      const legendItems = legend.selectAll('.legend-item')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

      legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .style('fill', d => colorScale(d));

      legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(d => d);

    } catch (error) {
      console.error('Error rendering stream graph:', error);
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