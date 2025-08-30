'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface StreamData {
  key: string;
  values: Array<{
    date: string;
    value: number;
  }>;
}

export const StreamGraph: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 400,
  onDataPointClick,
  onDataPointHover,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const processedData = data as StreamData[];
    
    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatDate = d3.timeFormat('%Y-%m-%d');

    // Process data for stack
    const dates = Array.from(new Set(
      processedData.flatMap(d => d.values.map(v => v.date))
    )).sort();

    const stackData = dates.map(date => {
      const obj: any = { date: parseDate(date) };
      processedData.forEach(series => {
        const value = series.values.find(v => v.date === date)?.value || 0;
        obj[series.key] = value;
      });
      return obj;
    });

    // Create stack
    const stack = d3.stack()
      .keys(processedData.map(d => d.key))
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderNone);

    const series = stack(stackData);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(stackData, d => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(series.flat().flat()) as [number, number])
      .range([chartHeight, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Area generator
    const area = d3.area<any>()
      .x(d => xScale(d.data.date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis);

    // Draw areas
    g.selectAll('.area')
      .data(series)
      .enter()
      .append('path')
      .attr('class', 'area')
      .attr('d', area)
      .style('fill', (d, i) => colorScale(i.toString()))
      .style('opacity', 0.8)
      .on('click', (event, d) => {
        onDataPointClick?.({ key: d.key, data: d }, event);
      })
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).style('opacity', 1);
        onDataPointHover?.({ key: d.key, data: d }, event);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).style('opacity', 0.8);
      });

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%b %Y'));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - 100}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(processedData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .style('fill', (d, i) => colorScale(i.toString()));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => d.key)
      .style('font-size', '12px')
      .style('fill', '#333');

  }, [data, width, height, config]);

  return (
    <div className="stream-graph-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default StreamGraph;