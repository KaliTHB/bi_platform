// Updated Chart Factory with All Components
// File: web-application/src/plugins/charts/factory/ChartFactory.tsx
'use client';

import React from 'react';
import { ChartProps } from '@/types/chart.types';

// ECharts imports
import { BarChart as EChartsBarChart } from '../echarts/BarChart';
import { PieChart as EChartsPieChart } from '../echarts/PieChart';
import { LineChart as EChartsLineChart } from '../echarts/LineChart';
import { ScatterChart as EChartsScatterChart } from '../echarts/ScatterChart';
import { HeatmapChart as EChartsHeatmapChart } from '../echarts/HeatmapChart';
import { GaugeChart as EChartsGaugeChart } from '../echarts/GaugeChart';
import { TreemapChart as EChartsTreemapChart } from '../echarts/TreemapChart';
import { SankeyChart as EChartsSankeyChart } from '../echarts/SankeyChart';
import { CandlestickChart as EChartsCandlestickChart } from '../echarts/CandlestickChart';
import { WaterfallChart } from '../echarts/WaterfallChart';
import { SunburstChart } from '../echarts/SunburstChart';
import { BoxplotChart } from '../echarts/BoxplotChart';
import { ParallelChart } from '../echarts/ParallelChart';

// D3.js imports
import { CalendarHeatmap } from '../d3js/CalendarHeatmap';
import { ChordDiagram } from '../d3js/ChordDiagram';
import { ForceDirectedGraph } from '../d3js/ForceDirectedGraph';
import { GeographicMap } from '../d3js/GeographicMap';
import { HierarchyChart } from '../d3js/HierarchyChart';
import { StreamGraph } from '../d3js/StreamGraph';
import { VoronoiDiagram } from '../d3js/VoronoiDiagram';

// Chart.js imports
import { DonutChart } from '../chartjs/DonutChart';
import { RadarChart } from '../chartjs/RadarChart';
import { PolarAreaChart } from '../chartjs/PolarAreaChart';
import { ChartJSBarChart } from '../chartjs/BarChart';
import { ChartJSBubbleChart } from '../chartjs/BubbleChart';
import { ChartJSMixedChart } from '../chartjs/MixedChart';

// Plotly imports
import { SurfaceChart } from '../plotly/SurfaceChart';
import { ContourChart } from '../plotly/ContourChart';
import { CandlestickChart as PlotlyCandlestickChart } from '../plotly/CandlestickChart';
import { PlotlyMesh3D } from '../plotly/Mesh3D';
import { PlotlyFunnelChart } from '../plotly/FunnelChart';
import { PlotlyViolinPlot } from '../plotly/ViolinPlot';

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
      // =========================
      // ECHARTS COMPONENTS
      // =========================
      
      // Basic ECharts
      case 'echarts-bar':
        return <EChartsBarChart {...props} />;
      case 'echarts-pie':
        return <EChartsPieChart {...props} />;
      case 'echarts-line':
        return <EChartsLineChart {...props} />;
      case 'echarts-scatter':
        return <EChartsScatterChart {...props} />;
      case 'echarts-heatmap':
        return <EChartsHeatmapChart {...props} />;
      case 'echarts-gauge':
        return <EChartsGaugeChart {...props} />;
      
      // Advanced ECharts
      case 'echarts-treemap':
        return <EChartsTreemapChart {...props} />;
      case 'echarts-sankey':
        return <EChartsSankeyChart {...props} />;
      case 'echarts-candlestick':
        return <EChartsCandlestickChart {...props} />;
      case 'echarts-waterfall':
        return <WaterfallChart {...props} />;
      case 'echarts-sunburst':
        return <SunburstChart {...props} />;
      case 'echarts-boxplot':
        return <BoxplotChart {...props} />;
      case 'echarts-parallel':
        return <ParallelChart {...props} />;

      // =========================
      // D3JS COMPONENTS
      // =========================
      
      case 'd3js-calendar-heatmap':
        return <CalendarHeatmap {...props} />;
      case 'd3js-chord-diagram':
        return <ChordDiagram {...props} />;
      case 'd3js-force-directed-graph':
      case 'd3js-force-graph':
        return <ForceDirectedGraph {...props} />;
      case 'd3js-geographic-map':
        return <GeographicMap {...props} />;
      case 'd3js-hierarchy-chart':
      case 'd3js-hierarchy':
        return <HierarchyChart {...props} />;
      case 'd3js-stream-graph':
        return <StreamGraph {...props} />;
      case 'd3js-voronoi-diagram':
        return <VoronoiDiagram {...props} />;

      // =========================
      // CHART.JS COMPONENTS  
      // =========================
      
      case 'chartjs-donut':
        return <DonutChart {...props} />;
      case 'chartjs-radar':
        return <RadarChart {...props} />;
      case 'chartjs-polar':
      case 'chartjs-polar-area':
        return <PolarAreaChart {...props} />;
      case 'chartjs-bar':
        return <ChartJSBarChart {...props} />;
      case 'chartjs-bubble':
        return <ChartJSBubbleChart {...props} />;
      case 'chartjs-mixed':
        return <ChartJSMixedChart {...props} />;

      // =========================
      // PLOTLY COMPONENTS
      // =========================
      
      case 'plotly-surface':
      case 'plotly-surface-3d':
        return <SurfaceChart {...props} />;
      case 'plotly-contour':
        return <ContourChart {...props} />;
      case 'plotly-candlestick':
        return <PlotlyCandlestickChart {...props} />;
      case 'plotly-mesh3d':
        return <PlotlyMesh3D {...props} />;
      case 'plotly-funnel':
        return <PlotlyFunnelChart {...props} />;
      case 'plotly-violin':
        return <PlotlyViolinPlot {...props} />;

      // =========================
      // DRILLDOWN COMPONENTS
      // =========================
      
      case 'drilldown-bar':
        return <DrilldownBar {...props} />;
      case 'drilldown-pie':
        return <DrilldownPie {...props} />;
      case 'drilldown-treemap':
        return <HierarchicalTreemap {...props} />;

      // =========================
      // FALLBACK
      // =========================
      
      default:
        console.warn(`Unknown chart type: ${key}`);
        return (
          <div className="chart-error" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '20px',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ color: '#666', marginBottom: '16px' }}>
              Chart Not Found
            </h3>
            <p style={{ color: '#999', textAlign: 'center', marginBottom: '16px' }}>
              Chart type "{chartType}" from library "{chartLibrary}" is not supported.
            </p>
            
            <details style={{ marginTop: '16px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>
                View Supported Chart Types
              </summary>
              <div style={{ marginTop: '12px', fontSize: '14px' }}>
                <strong>ECharts:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>bar, pie, line, scatter, heatmap, gauge</li>
                  <li>treemap, sankey, candlestick, waterfall</li>
                  <li>sunburst, boxplot, parallel</li>
                </ul>
                
                <strong>D3.js:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>calendar-heatmap, chord-diagram, force-graph</li>
                  <li>geographic-map, hierarchy, stream-graph</li>
                  <li>voronoi-diagram</li>
                </ul>
                
                <strong>Chart.js:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>donut, radar, polar-area, bar</li>
                  <li>bubble, mixed</li>
                </ul>
                
                <strong>Plotly:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>surface-3d, contour, candlestick</li>
                  <li>mesh3d, funnel, violin</li>
                </ul>
                
                <strong>Drilldown:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>bar, pie, treemap</li>
                </ul>
              </div>
            </details>
          </div>
        );
    }
  };

  return (
    <div className="chart-factory-container" style={{ width: '100%', height: '100%' }}>
      {getChartComponent()}
    </div>
  );
};

// Helper function to validate chart configuration
export const validateChartConfig = (chartType: string, chartLibrary: string, config: any): boolean => {
  const key = `${chartLibrary}-${chartType}`;
  
  // Basic validation - could be expanded with schema validation
  const supportedCharts = [
    // ECharts
    'echarts-bar', 'echarts-pie', 'echarts-line', 'echarts-scatter', 
    'echarts-heatmap', 'echarts-gauge', 'echarts-treemap', 'echarts-sankey',
    'echarts-candlestick', 'echarts-waterfall', 'echarts-sunburst', 
    'echarts-boxplot', 'echarts-parallel',
    
    // D3.js
    'd3js-calendar-heatmap', 'd3js-chord-diagram', 'd3js-force-graph',
    'd3js-geographic-map', 'd3js-hierarchy', 'd3js-stream-graph',
    'd3js-voronoi-diagram',
    
    // Chart.js
    'chartjs-donut', 'chartjs-radar', 'chartjs-polar-area', 'chartjs-bar',
    'chartjs-bubble', 'chartjs-mixed',
    
    // Plotly
    'plotly-surface-3d', 'plotly-contour', 'plotly-candlestick',
    'plotly-mesh3d', 'plotly-funnel', 'plotly-violin',
    
    // Drilldown
    'drilldown-bar', 'drilldown-pie', 'drilldown-treemap'
  ];
  
  return supportedCharts.includes(key);
};

// Helper function to get chart requirements
export const getChartRequirements = (chartType: string, chartLibrary: string) => {
  // This could return specific data requirements for each chart type
  // For now, return basic requirements
  return {
    minColumns: 1,
    maxColumns: 10,
    supportedTypes: ['string', 'number', 'date', 'boolean']
  };
};

export default ChartFactory;