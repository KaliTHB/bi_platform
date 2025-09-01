'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ChartProps, ChartData, ChartInteractionEvent } from '@/types/chart.types';

interface GeoData {
  id: string;
  coordinates: [number, number];
  value: number;
  label?: string;
}

interface GeographicMapConfig {
  idField?: string;
  longitudeField?: string;
  latitudeField?: string;
  valueField?: string;
  labelField?: string;
  colorScheme?: 'Blues' | 'Greens' | 'Reds' | 'Purples' | 'Viridis';
  projection?: 'mercator' | 'naturalEarth' | 'orthographic' | 'equirectangular' | 'albers';
  showLabels?: boolean;
  minSize?: number;
  maxSize?: number;
  enableZoom?: boolean;
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
  return data.rows || [];
};

// Helper function to check if we have valid data
const hasValidData = (data: any[] | ChartData): boolean => {
  if (isDataArray(data)) {
    return data.length > 0;
  }
  return Boolean(data.rows && data.rows.length > 0);
};

export const GeographicMap: React.FC<ChartProps> = ({
  data,
  config,
  width = 800,
  height = 600,
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

      const mapConfig = config as GeographicMapConfig;
      const {
        idField = 'id',
        longitudeField = 'longitude',
        latitudeField = 'latitude',
        valueField = 'value',
        labelField = 'label',
        colorScheme = 'Blues',
        projection = 'mercator',
        showLabels = true,
        minSize = 3,
        maxSize = 20,
        enableZoom = true
      } = mapConfig;

      svg
        .attr('width', width)
        .attr('height', height);

      // Get data array regardless of input format
      const dataArray = getDataArray(data);

      const chartId = useMemo(() => 
    `geographic-map-${Math.random().toString(36).substr(2, 9)}`, 
    []
  );

      // Process data
      const processedData: GeoData[] = dataArray.map((item, index) => {
        let coordinates: [number, number];
        let value: number;
        let id: string;
        let label: string | undefined;

        if (typeof item === 'object' && item !== null) {
          coordinates = [
            parseFloat(item[longitudeField]) || 0,
            parseFloat(item[latitudeField]) || 0
          ];
          value = parseFloat(item[valueField]) || 0;
          id = item[idField] || `point-${index}`;
          label = item[labelField];
        } else {
          // Fallback for simple array format
          coordinates = [item.coordinates?.[0] || 0, item.coordinates?.[1] || 0];
          value = parseFloat(item.value) || 0;
          id = item.id || `point-${index}`;
          label = item.label;
        }

        return {
          id,
          coordinates,
          value,
          label
        };
      });

      // Set up projection
      let proj;
      switch (projection) {
        case 'naturalEarth':
          proj = d3.geoNaturalEarth1();
          break;
        case 'orthographic':
          proj = d3.geoOrthographic();
          break;
        case 'equirectangular':
          proj = d3.geoEquirectangular();
          break;
        case 'albers':
          proj = d3.geoAlbersUsa();
          break;
        default:
          proj = d3.geoMercator();
      }

      // Set up projection with appropriate scaling and centering
      // Note: Using 'any' type due to D3 projection interface variations
      let projectionFn: any;
      
      switch (projection) {
        case 'naturalEarth':
          projectionFn = d3.geoNaturalEarth1()
            .scale(200)
            .center([0, 0])
            .translate([width / 2, height / 2]);
          break;
        case 'orthographic':
          projectionFn = d3.geoOrthographic()
            .scale(250)
            .center([0, 0])
            .translate([width / 2, height / 2]);
          break;
        case 'equirectangular':
          projectionFn = d3.geoEquirectangular()
            .scale(150)
            .center([0, 0])
            .translate([width / 2, height / 2]);
          break;
        case 'albers':
          projectionFn = d3.geoAlbersUsa()
            .scale(1000)
            .translate([width / 2, height / 2]);
          break;
        default:
          projectionFn = d3.geoMercator()
            .scale(150)
            .center([0, 20])
            .translate([width / 2, height / 2]);
      }

      const path = d3.geoPath()
        .projection(projectionFn);

      // Create color scale based on values
      const values = processedData.map(d => d.value);
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

      // Size scale for circles
      const sizeScale = d3.scaleSqrt()
        .domain([minValue, maxValue])
        .range([minSize, maxSize]);

      // Create container group for zoom
      const container = svg.append('g')
        .attr('class', 'map-container');

      // Load world map data (simplified world outline for demo)
      const worldData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]
              ]]
            },
            properties: {}
          }
        ]
      };

      // Draw world map background
      container.append('g')
        .attr('class', 'world-map')
        .selectAll('path')
        .data(worldData.features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('fill', '#f8f9fa')
        .attr('stroke', '#dee2e6')
        .attr('stroke-width', 0.5);

      // Add graticule (grid lines)
      const graticule = d3.geoGraticule();
      container.append('path')
        .datum(graticule)
        .attr('class', 'graticule')
        .attr('d', path as any)
        .attr('fill', 'none')
        .attr('stroke', '#e9ecef')
        .attr('stroke-width', 0.3);

      // Add data points
      const points = container.append('g')
        .attr('class', 'data-points')
        .selectAll('circle')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('cx', d => projectionFn(d.coordinates)?.[0] || 0)
        .attr('cy', d => projectionFn(d.coordinates)?.[1] || 0)
        .attr('r', d => sizeScale(d.value))
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          onInteraction?.({
    type: 'click',
    chartId,
    data: {
      id: d.id,
      coordinates: d.coordinates,
      value: d.value,
      label: d.label,
      formattedValue: d.value.toLocaleString()
    },
    dataIndex: processedData.indexOf(d),
    timestamp: Date.now()
  });
        })
        .on('mouseover', (event, d) => {
          // Highlight point on hover
          d3.select(event.currentTarget)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
            .attr('stroke', '#333');
          
           onInteraction?.({
    type: 'hover',
    chartId,
    data: {
      id: d.id,
      coordinates: d.coordinates,
      value: d.value,
      label: d.label,
      formattedValue: d.value.toLocaleString()
    },
    dataIndex: processedData.indexOf(d),
    timestamp: Date.now()
  });
        })
        .on('mouseout', (event) => {
          // Remove highlight
          d3.select(event.currentTarget)
            .attr('opacity', 0.8)
            .attr('stroke-width', 1.5)
            .attr('stroke', '#fff');
        });

      // Add labels for significant points
      if (showLabels) {
        const significantPoints = processedData.filter(d => 
          d.label && (d.value > maxValue * 0.5 || processedData.length <= 20)
        );

        container.append('g')
          .attr('class', 'labels')
          .selectAll('text')
          .data(significantPoints)
          .enter()
          .append('text')
          .attr('x', d => (projectionFn(d.coordinates)?.[0] || 0) + sizeScale(d.value) + 8)
          .attr('y', d => (projectionFn(d.coordinates)?.[1] || 0) + 4)
          .text(d => d.label || d.id)
          .style('font-size', '11px')
          .style('font-family', 'Arial, sans-serif')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)');
      }

      // Add zoom behavior
      if (enableZoom) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.5, 8])
          .on('zoom', (event) => {
            container.attr('transform', event.transform);
          });

        svg.call(zoom);

        // Add zoom reset button
        const resetButton = svg.append('g')
          .attr('class', 'reset-button')
          .attr('transform', `translate(${width - 80}, 20)`)
          .style('cursor', 'pointer')
          .on('click', () => {
            svg.transition()
              .duration(500)
              .call(zoom.transform, d3.zoomIdentity);
          });

        resetButton.append('rect')
          .attr('width', 60)
          .attr('height', 25)
          .attr('fill', '#fff')
          .attr('stroke', '#ccc')
          .attr('rx', 3);

        resetButton.append('text')
          .attr('x', 30)
          .attr('y', 17)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('fill', '#666')
          .text('Reset');
      }

      // Add title if provided
      if (config.title) {
        svg.append('text')
          .attr('class', 'chart-title')
          .attr('x', width / 2)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('font-weight', 'bold')
          .attr('fill', '#333')
          .text(config.title);
      }

      // Add legend
      const legendWidth = 200;
      const legendHeight = 15;
      const legendX = 20;
      const legendY = height - 60;

      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      // Create gradient for legend
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'map-gradient')
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '0%');

      const numStops = 10;
      for (let i = 0; i <= numStops; i++) {
        gradient.append('stop')
          .attr('offset', `${(i / numStops) * 100}%`)
          .attr('stop-color', colorScale(minValue + (maxValue - minValue) * (i / numStops)));
      }

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#map-gradient)')
        .attr('stroke', '#ccc');

      const legendScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format('.2s'));

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
      console.error('Error creating Geographic Map:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to create geographic map'));
    }
  }, [data, width, height, config, onInteraction, onError]);

  return (
    <div className="geographic-map-container" style={{ width, height }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Chart plugin configuration
export const GeographicMapConfig = {
  name: 'd3js-geographic-map',
  displayName: 'Geographic Map (D3.js)',
  category: 'geographic' as const,
  library: 'd3js' as const,
  version: '1.0.0',
  description: 'Interactive world map visualization with data points positioned by coordinates',
  tags: ['map', 'geographic', 'coordinates', 'spatial'],
  
  configSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        title: 'Chart Title',
        description: 'The title for the geographic map'
      },
      idField: {
        type: 'string' as const,
        title: 'ID Field',
        description: 'Field containing unique identifiers',
        default: 'id'
      },
      longitudeField: {
        type: 'string' as const,
        title: 'Longitude Field',
        description: 'Field containing longitude coordinates',
        default: 'longitude'
      },
      latitudeField: {
        type: 'string' as const,
        title: 'Latitude Field',
        description: 'Field containing latitude coordinates',
        default: 'latitude'
      },
      valueField: {
        type: 'string' as const,
        title: 'Value Field',
        description: 'Field containing numeric values to visualize',
        default: 'value'
      },
      labelField: {
        type: 'string' as const,
        title: 'Label Field',
        description: 'Field containing labels for data points',
        default: 'label'
      },
      colorScheme: {
        type: 'select' as const,
        title: 'Color Scheme',
        description: 'Color scheme for the data points',
        default: 'Blues',
        options: [
          { label: 'Blues', value: 'Blues' },
          { label: 'Greens', value: 'Greens' },
          { label: 'Reds', value: 'Reds' },
          { label: 'Purples', value: 'Purples' },
          { label: 'Viridis', value: 'Viridis' }
        ]
      },
      projection: {
        type: 'select' as const,
        title: 'Map Projection',
        description: 'Geographic projection to use',
        default: 'mercator',
        options: [
          { label: 'Mercator', value: 'mercator' },
          { label: 'Natural Earth', value: 'naturalEarth' },
          { label: 'Robinson', value: 'robinson' },
          { label: 'Equirectangular', value: 'equirectangular' }
        ]
      },
      showLabels: {
        type: 'boolean' as const,
        title: 'Show Labels',
        description: 'Display labels for data points',
        default: true
      },
      minSize: {
        type: 'number' as const,
        title: 'Minimum Point Size',
        description: 'Minimum radius for data points',
        default: 3,
        minimum: 1,
        maximum: 10
      },
      maxSize: {
        type: 'number' as const,
        title: 'Maximum Point Size',
        description: 'Maximum radius for data points',
        default: 20,
        minimum: 10,
        maximum: 50
      },
      enableZoom: {
        type: 'boolean' as const,
        title: 'Enable Zoom',
        description: 'Allow zooming and panning of the map',
        default: true
      }
    },
    required: ['longitudeField', 'latitudeField', 'valueField']
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: undefined,
    requiredFields: ['longitudeField', 'latitudeField', 'valueField'],
    optionalFields: ['idField', 'labelField'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false
  },
  
  exportFormats: ['png', 'svg'],
  
  interactionSupport: {
    zoom: true,
    pan: true,
    selection: true,
    brush: false,
    drilldown: true,
    tooltip: true,
    crossFilter: true
  },
  
  component: GeographicMap
};

export default GeographicMap;