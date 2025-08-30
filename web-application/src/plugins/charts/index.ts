import type { ChartPluginConfig } from './interfaces';

// Import all chart plugin configurations
import { EChartsBarChartConfig } from './echarts/BarChart';
import { EChartsPieChartConfig } from './echarts/PieChart';
import { EChartsLineChartConfig } from './echarts/LineChart';
import { EChartsScatterChartConfig } from './echarts/ScatterChart';
import { EChartsHeatmapChartConfig } from './echarts/HeatmapChart';
import { EChartsTreemapChartConfig } from './echarts/TreemapChart';
import { EChartsGaugeChartConfig } from './echarts/GaugeChart';
import { EChartsSankeyChartConfig } from './echarts/SankeyChart';
import { EChartsCandlestickChartConfig } from './echarts/CandlestickChart';

import { D3ForceDirectedGraphConfig } from './d3js/ForceDirectedGraph';
import { D3CalendarHeatmapConfig } from './d3js/CalendarHeatmap';
import { D3GeographicMapConfig } from './d3js/GeographicMap';

import { PlotlySurface3DConfig } from './plotly/Surface3D';
import { PlotlyViolinPlotConfig } from './plotly/ViolinPlot';

import { ChartJSDoughnutChartConfig } from './chartjs/DoughnutChart';
import { ChartJSRadarChartConfig } from './chartjs/RadarChart';

import { DrilldownBarChartConfig } from './drilldown/DrilldownBar';

// Complete Chart Plugin Registry
export const ChartPlugins: Record<string, ChartPluginConfig> = {
  // ECharts Library - Basic
  'echarts-bar': EChartsBarChartConfig,
  'echarts-pie': EChartsPieChartConfig,
  'echarts-line': EChartsLineChartConfig,
  'echarts-gauge': EChartsGaugeChartConfig,
  
  // ECharts Library - Statistical
  'echarts-scatter': EChartsScatterChartConfig,
  'echarts-heatmap': EChartsHeatmapChartConfig,
  
  // ECharts Library - Advanced
  'echarts-treemap': EChartsTreemapChartConfig,
  'echarts-sankey': EChartsSankeyChartConfig,
  
  // ECharts Library - Financial
  'echarts-candlestick': EChartsCandlestickChartConfig,
  
  // D3.js Library - Advanced
  'd3js-force-graph': D3ForceDirectedGraphConfig,
  'd3js-calendar-heatmap': D3CalendarHeatmapConfig,
  
  // D3.js Library - Geographic
  'd3js-geographic-map': D3GeographicMapConfig,
  
  // Plotly Library - Advanced
  'plotly-surface-3d': PlotlySurface3DConfig,
  
  // Plotly Library - Statistical
  'plotly-violin': PlotlyViolinPlotConfig,
  
  // Chart.js Library - Basic
  'chartjs-doughnut': ChartJSDoughnutChartConfig,
  
  // Chart.js Library - Statistical
  'chartjs-radar': ChartJSRadarChartConfig,
  
  // Drilldown Charts - Custom
  'drilldown-bar': DrilldownBarChartConfig
};

// Utility functions for external use
export const getAllCharts = (): ChartPluginConfig[] => {
  return Object.values(ChartPlugins);
};

export const getChartsByCategory = (category: string): ChartPluginConfig[] => {
  return Object.values(ChartPlugins).filter(chart => chart.category === category);
};

export const getChartsByLibrary = (library: string): ChartPluginConfig[] => {
  return Object.values(ChartPlugins).filter(chart => chart.library === library);
};

export const getChartPlugin = (name: string): ChartPluginConfig | undefined => {
  return ChartPlugins[name];
};