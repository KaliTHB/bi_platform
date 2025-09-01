// File: web-application/src/components/charts/D3ChartRenderer.tsx
'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartInteractionEvent } from '@/types/chart.types';
import { calculateInnerDimensions } from '@/utils/chartUtils';

const D3ChartRenderer: React.FC<ChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError,
  className,
  style
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate inner dimensions
  const innerDimensions = useMemo(() => calculateInnerDimensions(dimensions), [dimensions]);

  // Color scale
  const colorScale = useMemo(() => {
    const colors = config.colors || theme?.colorPalette || ['#3b82f6', '#ef4444', '#10b981'];
    return d3.scaleOrdinal<string>().range(colors);
  }, [config.colors, theme?.colorPalette]);

  // Create scales based on data and configuration
  const scales = useMemo(() => {
    if (!config.axes?.x?.field || !config.axes?.y?.field || data.length === 0) {
      return null;
    }

    const xField = config.axes.x.field;
    const yField = config.axes.y.field;

    // X Scale
    let xScale: d3.ScaleLinear<number, number> | d3.ScaleBand<string> | d3.ScaleTime<number, number>;
    
    if (config.axes.x.type === 'time') {
      const xExtent = d3.extent(data, d => new Date(d[xField])) as [Date, Date];
      xScale = d3.scaleTime()
        .domain(xExtent)
        .range([0, innerDimensions.width]);
    } else if (config.axes.x.type === 'value') {
      const xExtent = d3.extent(data, d => +d[xField]) as [number, number];
      xScale = d3.scaleLinear()
        .domain(xExtent)
        .range([0, innerDimensions.width]);
    } else {
      // Category scale
      const xValues = Array.from(new Set(data.map(d => String(d[xField]))));
      xScale = d3.scaleBand()
        .domain(xValues)
        .range([0, innerDimensions.width])
        .padding(0.1);
    }

    // Y Scale
    let yScale: d3.ScaleLinear<number, number>;
    
    if (config.axes.y.scale === 'log') {
      const yExtent = d3.extent(data, d => Math.max(1, +d[yField])) as [number, number];
      yScale = d3.scaleLog()
        .domain(yExtent)
        .range([innerDimensions.height, 0]);
    } else {
      const yExtent = d3.extent(data, d => +d[yField]) as [number, number];
      // Add 10% padding to the domain
      const padding = (yExtent[1] - yExtent[0]) * 0.1;
      yScale = d3.scaleLinear()
        .domain([yExtent[0] - padding, yExtent[1] + padding])
        .range([innerDimensions.height, 0]);
    }

    return { xScale, yScale, xField, yField };
  }, [data, config.axes, innerDimensions]);

  // Render chart based on series configuration
  const renderChart = useCallback(() => {
    if (!svgRef.current || !scales) return;

    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group with margins
    const g = svg.append('g')
      .attr('transform', `translate(${dimensions.margin?.left || 20}, ${dimensions.margin?.top || 20})`);

    try {
      // Render grid if enabled
      if (config.grid?.show_x_grid || config.grid?.show_y_grid) {
        renderGrid(g, scales);
      }

      // Render axes
      renderAxes(g, scales);

      // Render data based on series type
      if (config.series && config.series.length > 0) {
        config.series.forEach((series, index) => {
          renderSeries(g, series, scales, index);
        });
      } else {
        // Default line chart
        renderDefaultLineSeries(g, scales);
      }

      // Render legend if enabled
      if (config.legend?.show) {
        renderLegend(svg, scales);
      }

    } catch (error) {
      console.error('D3 rendering error:', error);
      onError?.({
        code: 'D3_RENDER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to render D3 chart',
        timestamp: new Date()
      });
    }
  }, [svgRef, scales, dimensions, config, theme, onError]);

  // Render grid lines
  const renderGrid = useCallback((g: d3.Selection<SVGGElement, unknown, null, undefined>, scales: any) => {
    const { xScale, yScale } = scales;

    if (config.grid?.show_x_grid) {
      if ('bandwidth' in xScale) {
        // For band scales, create grid lines at each band
        g.selectAll('.grid-x')
          .data(xScale.domain())
          .enter()
          .append('line')
          .attr('class', 'grid-x')
          .attr('x1', d => (xScale(d) || 0) + xScale.bandwidth() / 2)
          .attr('x2', d => (xScale(d) || 0) + xScale.bandwidth() / 2)
          .attr('y1', 0)
          .attr('y2', innerDimensions.height)
          .style('stroke', config.grid?.x_grid_color || theme?.gridColor || '#e0e0e0')
          .style('stroke-width', config.grid?.x_grid_width || 1)
          .style('stroke-dasharray', config.grid?.x_grid_dash?.join(',') || 'none');
      } else {
        // For continuous scales
        g.append('g')
          .attr('class', 'grid-x')
          .attr('transform', `translate(0, ${innerDimensions.height})`)
          .call(d3.axisBottom(xScale)
            .tickSize(-innerDimensions.height)
            .tickFormat(() => '')
          )
          .selectAll('line')
          .style('stroke', config.grid?.x_grid_color || theme?.gridColor || '#e0e0e0')
          .style('stroke-width', config.grid?.x_grid_width || 1);
      }
    }

    if (config.grid?.show_y_grid) {
      g.append('g')
        .attr('class', 'grid-y')
        .call(d3.axisLeft(yScale)
          .tickSize(-innerDimensions.width)
          .tickFormat(() => '')
        )
        .selectAll('line')
        .style('stroke', config.grid?.y_grid_color || theme?.gridColor || '#e0e0e0')
        .style('stroke-width', config.grid?.y_grid_width || 1);
    }
  }, [config.grid, theme, innerDimensions]);

  // Render axes
  const renderAxes = useCallback((g: d3.Selection<SVGGElement, unknown, null, undefined>, scales: any) => {
    const { xScale, yScale } = scales;

    // X Axis
    if (config.axes?.x?.visible !== false) {
      const xAxis = g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerDimensions.height})`);

      if ('bandwidth' in xScale) {
        xAxis.call(d3.axisBottom(xScale));
      } else {
        xAxis.call(d3.axisBottom(xScale));
      }

      // X Axis title
      if (config.axes.x.title) {
        xAxis.append('text')
          .attr('x', innerDimensions.width / 2)
          .attr('y', 40)
          .attr('text-anchor', 'middle')
          .style('fill', theme?.textColor || '#333')
          .style('font-size', '12px')
          .text(config.axes.x.title);
      }

      // Style x-axis
      xAxis.selectAll('text')
        .style('fill', theme?.textColor || '#666')
        .style('font-size', `${config.axes?.x?.labels?.fontSize || 12}px`);

      if (config.axes?.x?.labels?.rotation) {
        xAxis.selectAll('text')
          .style('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '.15em')
          .attr('transform', `rotate(${config.axes.x.labels.rotation})`);
      }
    }

    // Y Axis
    if (config.axes?.y?.visible !== false) {
      const yAxis = g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));

      // Y Axis title
      if (config.axes.y.title) {
        yAxis.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', -40)
          .attr('x', -innerDimensions.height / 2)
          .attr('text-anchor', 'middle')
          .style('fill', theme?.textColor || '#333')
          .style('font-size', '12px')
          .text(config.axes.y.title);
      }

      // Style y-axis
      yAxis.selectAll('text')
        .style('fill', theme?.textColor || '#666')
        .style('font-size', `${config.axes?.y?.labels?.fontSize || 12}px`);
    }
  }, [config.axes, theme, innerDimensions]);

  // Render individual series
  const renderSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>, 
    series: any, 
    scales: any, 
    index: number
  ) => {
    const { xScale, yScale, xField, yField } = scales;
    const seriesData = data.filter(d => d[series.data_field] !== undefined);

    switch (series.type) {
      case 'line':
        renderLineSeries(g, seriesData, xScale, yScale, xField, series.data_field, series, index);
        break;
      case 'bar':
        renderBarSeries(g, seriesData, xScale, yScale, xField, series.data_field, series, index);
        break;
      case 'scatter':
        renderScatterSeries(g, seriesData, xScale, yScale, xField, series.data_field, series, index);
        break;
      case 'area':
        renderAreaSeries(g, seriesData, xScale, yScale, xField, series.data_field, series, index);
        break;
      default:
        renderLineSeries(g, seriesData, xScale, yScale, xField, series.data_field, series, index);
    }
  }, [data]);

  // Render line series
  const renderLineSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    seriesData: any[],
    xScale: any,
    yScale: any,
    xField: string,
    yField: string,
    series: any,
    index: number
  ) => {
    const line = d3.line<any>()
      .x(d => {
        if ('bandwidth' in xScale) {
          return (xScale(String(d[xField])) || 0) + xScale.bandwidth() / 2;
        }
        return xScale(d[xField]);
      })
      .y(d => yScale(d[yField]))
      .curve(series.line?.smooth ? d3.curveCardinal : d3.curveLinear);

    const color = series.color || colorScale(String(index));

    // Draw line
    g.append('path')
      .datum(seriesData)
      .attr('class', `line-series-${index}`)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', series.line?.width || 2)
      .attr('d', line)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        onInteraction?.({
          type: 'click',
          data: { series, seriesData },
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      });

    // Draw points if enabled
    if (series.markers?.enabled !== false) {
      g.selectAll(`.point-series-${index}`)
        .data(seriesData)
        .enter()
        .append('circle')
        .attr('class', `point-series-${index}`)
        .attr('cx', d => {
          if ('bandwidth' in xScale) {
            return (xScale(String(d[xField])) || 0) + xScale.bandwidth() / 2;
          }
          return xScale(d[xField]);
        })
        .attr('cy', d => yScale(d[yField]))
        .attr('r', series.markers?.size || 3)
        .style('fill', color)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          onInteraction?.({
            type: 'click',
            data: d,
            originalEvent: event,
            seriesId: series.name,
            chartId: 'd3'
          });
        })
        .on('mouseover', function(event, d) {
          onInteraction?.({
            type: 'hover',
            data: d,
            originalEvent: event,
            seriesId: series.name,
            chartId: 'd3'
          });
        });
    }
  }, [colorScale, onInteraction]);

  // Render bar series
  const renderBarSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    seriesData: any[],
    xScale: any,
    yScale: any,
    xField: string,
    yField: string,
    series: any,
    index: number
  ) => {
    const color = series.color || colorScale(String(index));

    g.selectAll(`.bar-series-${index}`)
      .data(seriesData)
      .enter()
      .append('rect')
      .attr('class', `bar-series-${index}`)
      .attr('x', d => {
        if ('bandwidth' in xScale) {
          return xScale(String(d[xField])) || 0;
        }
        return xScale(d[xField]) - 5;
      })
      .attr('width', 'bandwidth' in xScale ? xScale.bandwidth() : 10)
      .attr('y', d => yScale(Math.max(0, d[yField])))
      .attr('height', d => Math.abs(yScale(d[yField]) - yScale(0)))
      .style('fill', color)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        onInteraction?.({
          type: 'click',
          data: d,
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      })
      .on('mouseover', function(event, d) {
        onInteraction?.({
          type: 'hover',
          data: d,
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      });
  }, [colorScale, onInteraction]);

  // Render scatter series
  const renderScatterSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    seriesData: any[],
    xScale: any,
    yScale: any,
    xField: string,
    yField: string,
    series: any,
    index: number
  ) => {
    const color = series.color || colorScale(String(index));

    g.selectAll(`.scatter-series-${index}`)
      .data(seriesData)
      .enter()
      .append('circle')
      .attr('class', `scatter-series-${index}`)
      .attr('cx', d => xScale(d[xField]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', series.markers?.size || 4)
      .style('fill', color)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        onInteraction?.({
          type: 'click',
          data: d,
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      })
      .on('mouseover', function(event, d) {
        onInteraction?.({
          type: 'hover',
          data: d,
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      });
  }, [colorScale, onInteraction]);

  // Render area series
  const renderAreaSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    seriesData: any[],
    xScale: any,
    yScale: any,
    xField: string,
    yField: string,
    series: any,
    index: number
  ) => {
    const area = d3.area<any>()
      .x(d => {
        if ('bandwidth' in xScale) {
          return (xScale(String(d[xField])) || 0) + xScale.bandwidth() / 2;
        }
        return xScale(d[xField]);
      })
      .y0(yScale(0))
      .y1(d => yScale(d[yField]))
      .curve(series.line?.smooth ? d3.curveCardinal : d3.curveLinear);

    const color = series.color || colorScale(String(index));

    g.append('path')
      .datum(seriesData)
      .attr('class', `area-series-${index}`)
      .attr('fill', color)
      .attr('fill-opacity', series.area?.opacity || 0.3)
      .attr('d', area)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        onInteraction?.({
          type: 'click',
          data: { series, seriesData },
          originalEvent: event,
          seriesId: series.name,
          chartId: 'd3'
        });
      });
  }, [colorScale, onInteraction]);

  // Render default line series when no series config provided
  const renderDefaultLineSeries = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    scales: any
  ) => {
    const { xScale, yScale, xField, yField } = scales;
    
    const line = d3.line<any>()
      .x(d => {
        if ('bandwidth' in xScale) {
          return (xScale(String(d[xField])) || 0) + xScale.bandwidth() / 2;
        }
        return xScale(d[xField]);
      })
      .y(d => yScale(d[yField]))
      .curve(d3.curveLinear);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colorScale('0'))
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add points
    g.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => {
        if ('bandwidth' in xScale) {
          return (xScale(String(d[xField])) || 0) + xScale.bandwidth() / 2;
        }
        return xScale(d[xField]);
      })
      .attr('cy', d => yScale(d[yField]))
      .attr('r', 3)
      .style('fill', colorScale('0'))
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        onInteraction?.({
          type: 'click',
          data: d,
          originalEvent: event,
          chartId: 'd3'
        });
      });
  }, [data, colorScale, onInteraction]);

  // Render legend
  const renderLegend = useCallback((
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    scales: any
  ) => {
    if (!config.series || config.series.length === 0) return;

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${dimensions.width - 100}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(config.series)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .style('cursor', 'pointer');

    legendItems.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .style('fill', (d, i) => d.color || colorScale(String(i)));

    legendItems.append('text')
      .attr('x', 15)
      .attr('y', 9)
      .style('fill', theme?.textColor || '#333')
      .style('font-size', '12px')
      .text(d => d.name);

    legendItems.on('click', function(event, d) {
      onInteraction?.({
        type: 'legend-click',
        data: { series: d },
        originalEvent: event,
        chartId: 'd3'
      });
    });
  }, [config.series, dimensions, colorScale, theme, onInteraction]);

  // Re-render when data or config changes
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ backgroundColor: theme?.backgroundColor || 'transparent' }}
      />
    </div>
  );
};

export default D3ChartRenderer;