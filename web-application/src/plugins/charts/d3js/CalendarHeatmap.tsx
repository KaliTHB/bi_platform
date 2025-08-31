'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData } from '@/types/chart.types';

interface CalendarHeatmapData {
  date: string;
  value: number;
}

interface CalendarHeatmapConfig {
  dateField?: string;
  valueField?: string;
  colorScheme?: 'Blues' | 'Greens' | 'Reds' | 'Purples' | 'Viridis';
  year?: number;
  showMonthLabels?: boolean;
  showDayLabels?: boolean;
  cellPadding?: number;
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
  // If data is ChartData object, return the rows array
  return data.rows || [];
};

// Helper function to check if we have valid data
const hasValidData = (data: any[] | ChartData): boolean => {
  if (isDataArray(data)) {
    return data.length > 0;
  }
  // For ChartData object, check if rows exist and have length
  return data.rows && data.rows.length > 0;
};

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
    if (!data || !svgRef.current || !hasValidData(data)) {
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const calendarConfig = config as CalendarHeatmapConfig;
      const {
        dateField = 'date',
        valueField = 'value',
        colorScheme = 'Blues',
        year = new Date().getFullYear(),
        showMonthLabels = true,
        showDayLabels = true,
        cellPadding = 1
      } = calendarConfig;

      const margin = { top: 20, right: 20, bottom: 20, left: 50 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      // Process data
      const parseDate = d3.timeParse('%Y-%m-%d');
      const formatDate = d3.timeFormat('%Y-%m-%d');

      const dataByDate = new Map<string, number>();
      dataArray.forEach(d => {
        let dateStr: string;
        let value: number;

        if (typeof d === 'object' && d !== null) {
          dateStr = d[dateField];
          value = parseFloat(d[valueField]) || 0;
        } else {
          // Fallback for simple array format
          dateStr = d.date || d[0];
          value = parseFloat(d.value || d[1]) || 0;
        }

        if (dateStr) {
          dataByDate.set(dateStr, value);
        }
      });

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // Color scale
      const values = Array.from(dataByDate.values());
      const maxValue = d3.max(values) || 1;
      const minValue = d3.min(values) || 0;

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
        case 'Viridis':
          colorInterpolator = d3.interpolateViridis;
          break;
        default:
          colorInterpolator = d3.interpolateBlues;
      }

      const colorScale = d3.scaleSequential(colorInterpolator)
        .domain([minValue, maxValue]);

      // Cell size
      const cellSize = Math.min(chartWidth / 53, chartHeight / 7) - cellPadding;

      // Create calendar grid
      const days = d3.timeDays(startDate, endDate);
      
      const rect = g.selectAll('.day')
        .data(days)
        .enter()
        .append('rect')
        .attr('class', 'day')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('x', d => d3.timeWeek.count(startDate, d) * (cellSize + cellPadding))
        .attr('y', d => d.getDay() * (cellSize + cellPadding))
        .attr('fill', d => {
          const dateStr = formatDate(d);
          const value = dataByDate.get(dateStr);
          return value !== undefined ? colorScale(value) : '#eee';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('rx', 2)
        .attr('ry', 2)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          const dateStr = formatDate(d);
          const value = dataByDate.get(dateStr) || 0;
          
          onInteraction?.({
            type: 'click',
            data: {
              date: dateStr,
              value: value,
              formattedDate: d.toLocaleDateString()
            },
            dataIndex: days.indexOf(d),
            event
          });
        })
        .on('mouseover', (event, d) => {
          const dateStr = formatDate(d);
          const value = dataByDate.get(dateStr) || 0;
          
          // Highlight cell on hover
          d3.select(event.currentTarget)
            .attr('stroke-width', 2)
            .attr('stroke', '#333');
          
          onInteraction?.({
            type: 'hover',
            data: {
              date: dateStr,
              value: value,
              formattedDate: d.toLocaleDateString()
            },
            dataIndex: days.indexOf(d),
            event
          });
        })
        .on('mouseout', (event) => {
          // Remove highlight
          d3.select(event.currentTarget)
            .attr('stroke-width', 1)
            .attr('stroke', '#fff');
        });

      // Add month labels
      if (showMonthLabels) {
        const months = d3.timeMonths(startDate, endDate);
        g.selectAll('.month-label')
          .data(months)
          .enter()
          .append('text')
          .attr('class', 'month-label')
          .attr('x', d => d3.timeWeek.count(startDate, d) * (cellSize + cellPadding))
          .attr('y', -10)
          .attr('font-size', '12px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('fill', '#666')
          .text(d => d3.timeFormat('%b')(d));
      }

      // Add day labels
      if (showDayLabels) {
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        g.selectAll('.day-label')
          .data(dayLabels)
          .enter()
          .append('text')
          .attr('class', 'day-label')
          .attr('x', -15)
          .attr('y', (d, i) => i * (cellSize + cellPadding) + cellSize / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '10px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('fill', '#666')
          .attr('text-anchor', 'middle')
          .text(d => d);
      }

      // Add title if provided
      if (config.title) {
        g.append('text')
          .attr('class', 'chart-title')
          .attr('x', chartWidth / 2)
          .attr('y', -35)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-weight', 'bold')
          .attr('fill', '#333')
          .text(config.title);
      }

      // Add color legend
      const legendWidth = 200;
      const legendHeight = 10;
      const legendX = chartWidth - legendWidth;
      const legendY = chartHeight + 30;

      const legendScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format('.0f'));

      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      // Create gradient for legend
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'calendar-gradient');

      const numStops = 10;
      for (let i = 0; i <= numStops; i++) {
        gradient.append('stop')
          .attr('offset', `${(i / numStops) * 100}%`)
          .attr('stop-color', colorScale(minValue + (maxValue - minValue) * (i / numStops)));
      }

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#calendar-gradient)');

      legend.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(legendAxis);

      legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', legendHeight + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .text(valueField);

    } catch (error) {
      console.error('Error creating Calendar Heatmap:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create calendar heatmap'));
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="calendar-heatmap-container" style={{ width, height }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Chart plugin configuration
export const CalendarHeatmapConfig = {
  name: 'd3js-calendar-heatmap',
  displayName: 'Calendar Heatmap (D3.js)',
  category: 'advanced' as const,
  library: 'd3js' as const,
  version: '1.0.0',
  description: 'Displays time-series data in a calendar format with color-coded intensity',
  tags: ['calendar', 'heatmap', 'time-series', 'temporal'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The title for the calendar heatmap'
      },
      dateField: {
        type: 'string' as const,
        title: 'Date Field',
        description: 'Field containing date values (YYYY-MM-DD format)',
        default: 'date'
      },
      valueField: {
        type: 'string' as const,
        title: 'Value Field',
        description: 'Field containing numeric values to visualize',
        default: 'value'
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        description: 'Color scheme for the heatmap',
        default: 'Blues',
        options: [
          { label: 'Blues', value: 'Blues' },
          { label: 'Greens', value: 'Greens' },
          { label: 'Reds', value: 'Reds' },
          { label: 'Purples', value: 'Purples' },
          { label: 'Viridis', value: 'Viridis' }
        ]
      },
      year: {
        type: 'number' as const,
        title: 'Year',
        description: 'Year to display in calendar',
        default: new Date().getFullYear()
      },
      showMonthLabels: {
        type: 'boolean' as const,
        title: 'Show Month Labels',
        description: 'Display month names above the calendar',
        default: true
      },
      showDayLabels: {
        type: 'boolean' as const,
        title: 'Show Day Labels',
        description: 'Display day abbreviations on the side',
        default: true
      },
      cellPadding: {
        type: 'number' as const,
        title: 'Cell Padding',
        description: 'Padding between calendar cells',
        default: 1,
        minimum: 0,
        maximum: 5
      }
    },
    required: ['dateField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: undefined,
    requiredFields: ['dateField', 'valueField'],
    optionalFields: [],
    supportedTypes: ['string', 'number', 'date'],
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
  
  component: CalendarHeatmap
};

export default CalendarHeatmap;