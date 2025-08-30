'use client';

import React from 'react';
import { ChartProps } from '@/types/chart.types';

// ECharts imports
import { BarChart as EChartsBarChart } from '../echarts/BarChart';
import { PieChart as EChartsPieChart } from '../echarts/PieChart';
import { LineChart as EChartsLineChart } from '../echarts/LineChart';

// D3.js imports
import { CalendarHeatmap } from '../d3js/CalendarHeatmap';
import { ChordDiagram } from '../d3js/ChordDiagram';
import { ForceDirectedGraph } from '../d3js/ForceDirectedGraph';
import { GeographicMap } from '../d3js/GeographicMap';
import { HierarchyChart } from '../d3js/HierarchyChart';
import { StreamGraph } from '../d3js/StreamGraph';
import { VoronoiDiagram } from '../d3js/VoronoiDiagram';

// Drilldown imports
import { DrilldownBar } from '../drilldown/DrilldownBar';
import { DrilldownPie } from '../drilldown/DrilldownPie';
import { HierarchicalTreemap } from '../drilldown/HierarchicalTreemap';

export interface ChartFactoryProps extends ChartProps {
  chartType: string;
  chartLibrary: string;
}

export const ChartFactory: React.FC<ChartFactoryProps> = ({
  chartType,
  chartLibrary,
  ...props
}) => {
  const getChartComponent = () => {
    const key = `${chartLibrary}-${chartType}`;
    
    switch (key) {
      // ECharts components
      case 'echarts-bar':
        return <EChartsBarChart {...props} />;
      case 'echarts-pie':
        return <EChartsPieChart {...props} />;
      case 'echarts-line':
        return <EChartsLineChart {...props} />;

      // D3.js components
      case 'd3js-calendar-heatmap':
        return <CalendarHeatmap {...props} />;
      case 'd3js-chord-diagram':
        return <ChordDiagram {...props} />;
      case 'd3js-force-directed-graph':
        return <ForceDirectedGraph {...props} />;
      case 'd3js-geographic-map':
        return <GeographicMap {...props} />;
      case 'd3js-hierarchy-chart':
        return <HierarchyChart {...props} />;
      case 'd3js-stream-graph':
        return <StreamGraph {...props} />;
      case 'd3js-voronoi-diagram':
        return <VoronoiDiagram {...props} />;

      // Drilldown components
      case 'drilldown-bar':
        return <DrilldownBar {...props} />;
      case 'drilldown-pie':
        return <DrilldownPie {...props} />;
      case 'drilldown-treemap':
        return <HierarchicalTreemap {...props} />;

      default:
        console.warn(`Unknown chart type: ${key}`);
        return (
          <div className="chart-error">
            <p>Chart type "{chartType}" from library "{chartLibrary}" is not supported.</p>
            <p>Supported combinations:</p>
            <ul>
              <li>echarts: bar, pie, line</li>
              <li>d3js: calendar-heatmap, chord-diagram, force-directed-graph, geographic-map, hierarchy-chart, stream-graph, voronoi-diagram</li>
              <li>drilldown: bar, pie, treemap</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="chart-factory-container">
      {getChartComponent()}
    </div>
  );
};

export default ChartFactory;