'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps } from '@/types/chart.types';

interface CalendarHeatmapData {
  date: string;
  value: number;
}

export const CalendarHeatmap: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 200,
  onDataPointClick,
  onDataPointHover,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data
    const processedData = data as CalendarHeatmapData[];
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatDate = d3.timeFormat('%Y-%m-%d');

    const dataByDate = new Map(
      processedData.map(d => [d.date, d.value])
    );

    const year = new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Color scale
    const maxValue = d3.max(processedData, d => d.value) || 0;
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, maxValue]);

    // Cell size
    const cellSize = Math.min(chartWidth / 53, chartHeight / 7);

    // Create calendar grid
    const days = d3.timeDays(startDate, endDate);
    
    const rect = g.selectAll('.day')
      .data(days)
      .enter()
      .append('rect')
      .attr('class', 'day')
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('x', d => d3.timeWeek.count(startDate, d) * cellSize)
      .attr('y', d => d.getDay() * cellSize)
      .attr('fill', d => {
        const dateStr = formatDate(d);
        const value = dataByDate.get(dateStr) || 0;
        return value > 0 ? colorScale(value) : '#eee';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('click', (event, d) => {
        const dateStr = formatDate(d);
        const value = dataByDate.get(dateStr) || 0;
        onDataPointClick?.({ date: dateStr, value }, event);
      })
      .on('mouseover', (event, d) => {
        const dateStr = formatDate(d);
        const value = dataByDate.get(dateStr) || 0;
        onDataPointHover?.({ date: dateStr, value }, event);
      });

    // Add month labels
    const months = d3.timeMonths(startDate, endDate);
    g.selectAll('.month-label')
      .data(months)
      .enter()
      .append('text')
      .attr('class', 'month-label')
      .attr('x', d => d3.timeWeek.count(startDate, d) * cellSize)
      .attr('y', -10)
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text(d => d3.timeFormat('%b')(d));

    // Add day labels
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    g.selectAll('.day-label')
      .data(dayLabels)
      .enter()
      .append('text')
      .attr('class', 'day-label')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d);

  }, [data, width, height, config]);

  return (
    <div className="calendar-heatmap-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CalendarHeatmap;