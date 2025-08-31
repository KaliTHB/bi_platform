// D3.js Calendar Heatmap Component
// File: web-application/src/plugins/charts/d3js/CalendarHeatmap.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';
import { getDataArray, hasDataContent } from '../utils/chartDataUtils';

interface CalendarHeatmapData {
  date: string;
  value: number;
}

export interface CalendarHeatmapConfig {
  dateField: string;
  valueField: string;
  colorScheme?: 'Blues' | 'Greens' | 'Reds' | 'Purples';
  year?: number;
}

export const CalendarHeatmap: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 200,
  onInteraction,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Use utility function to check data availability
    if (!hasDataContent(data) || !svgRef.current) return;

    try {
      const {
        dateField = 'date',
        valueField = 'value',
        colorScheme = 'Blues',
        year = new Date().getFullYear()
      } = config as CalendarHeatmapConfig;

      // Get the actual data array
      const dataArray = getDataArray(data);

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
      const processedData = dataArray.map(d => ({
        date: d[dateField],
        value: parseFloat(d[valueField]) || 0
      })) as CalendarHeatmapData[];

      const parseDate = d3.timeParse('%Y-%m-%d');
      const formatDate = d3.timeFormat('%Y-%m-%d');

      const dataByDate = new Map(
        processedData.map(d => [d.date, d.value])
      );

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // Color scale
      const maxValue = d3.max(processedData, d => d.value) || 0;
      
      let colorInterpolator;
      switch (colorScheme) {
        case 'Greens':
          colorInterpolator = d3.interpolateGreens;
          break;
        case 'Reds':
          colorInterpolator = d3.interpolateReds;
          break;
        case 'Purples':
          colorInterpolator = d3.interpolatePurples;
          break;
        default:
          colorInterpolator = d3.interpolateBlues;
      }

      const colorScale = d3.scaleSequential()
        .interpolator(colorInterpolator)
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
          onInteraction?.({
            type: 'click',
            data: { date: dateStr, value },
            dataIndex: days.indexOf(d)
          });
        })
        .on('mouseover', (event, d) => {
          const dateStr = formatDate(d);
          const value = dataByDate.get(dateStr) || 0;
          onInteraction?.({
            type: 'hover',
            data: { date: dateStr, value },
            dataIndex: days.indexOf(d)
          });
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

      // Add legend
      const legendWidth = 200;
      const legendHeight = 20;
      const legendX = chartWidth - legendWidth;
      const legendY = chartHeight + 10;

      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format('.1s'));

      const legendColorScale = d3.scaleSequential()
        .interpolator(colorInterpolator)
        .domain([0, legendWidth]);

      legend.selectAll('.legend-rect')
        .data(d3.range(legendWidth))
        .enter()
        .append('rect')
        .attr('class', 'legend-rect')
        .attr('x', (d, i) => i)
        .attr('y', 0)
        .attr('width', 1)
        .attr('height', legendHeight)
        .attr('fill', (d, i) => legendColorScale(i));

      legend.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(legendAxis);

    } catch (error) {
      console.error('Error rendering calendar heatmap:', error);
      onError?.(error as Error);
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="calendar-heatmap-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CalendarHeatmap;