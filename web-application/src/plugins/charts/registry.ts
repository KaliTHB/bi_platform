// Comprehensive Chart Plugin Registry
// File: web-application/src/plugins/charts/registry.ts
import { ChartPluginConfig } from './interfaces/ChartPlugin';

// ECharts Components
import { BarChart } from './echarts/BarChart';
import { LineChart } from './echarts/LineChart';
import { PieChart } from './echarts/PieChart';
import { ScatterChart } from './echarts/ScatterChart';
import { HeatmapChart } from './echarts/HeatmapChart';
import { GaugeChart } from './echarts/GaugeChart';
import { TreemapChart } from './echarts/TreemapChart';
import { SankeyChart } from './echarts/SankeyChart';
import { CandlestickChart } from './echarts/CandlestickChart';
import { WaterfallChart } from './echarts/WaterfallChart';
import { SunburstChart } from './echarts/SunburstChart';
import { BoxplotChart } from './echarts/BoxplotChart';
import { ParallelChart } from './echarts/ParallelChart';

// D3.js Components
import { ForceDirectedGraph } from './d3js/ForceDirectedGraph';
import { CalendarHeatmap } from './d3js/CalendarHeatmap';
import { GeographicMap } from './d3js/GeographicMap';
import { ChordDiagram } from './d3js/ChordDiagram';
import { StreamGraph } from './d3js/StreamGraph';
import { VoronoiDiagram } from './d3js/VoronoiDiagram';
import { HierarchyChart } from './d3js/HierarchyChart';

// Chart.js Components
import { DonutChart } from './chartjs/DonutChart';
import { RadarChart } from './chartjs/RadarChart';
import { PolarAreaChart } from './chartjs/PolarAreaChart';
import { ChartJSBarChart } from './chartjs/BarChart';
import { ChartJSBubbleChart } from './chartjs/BubbleChart';
import { ChartJSMixedChart } from './chartjs/MixedChart';

// Plotly Components
import { SurfaceChart } from './plotly/SurfaceChart';
import { ContourChart } from './plotly/ContourChart';
import { CandlestickChart as PlotlyCandlestick } from './plotly/CandlestickChart';
import { PlotlyMesh3D } from './plotly/Mesh3D';
import { PlotlyFunnelChart } from './plotly/FunnelChart';
import { PlotlyViolinPlot } from './plotly/ViolinPlot';

// Drilldown Components
import { DrilldownBar } from './drilldown/DrilldownBar';
import { DrilldownPie } from './drilldown/DrilldownPie';
import { HierarchicalTreemap } from './drilldown/HierarchicalTreemap';

export const ChartPlugins: Record<string, ChartPluginConfig> = {
  // =========================
  // ECHARTS COMPONENTS
  // =========================
  
  // Basic Charts
  'echarts-bar': {
    name: 'echarts-bar',
    displayName: 'Bar Chart',
    category: 'basic',
    library: 'echarts',
    version: '1.0.0',
    description: 'Standard bar chart with support for stacking and grouping',
    tags: ['bar', 'column', 'comparison'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      seriesField: { type: 'string', required: false, label: 'Series Field' },
      stacked: { type: 'boolean', default: false, label: 'Stack bars' },
      horizontal: { type: 'boolean', default: false, label: 'Horizontal orientation' }
    },
    dataRequirements: {
      minColumns: 2,
      maxColumns: 3,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number', 'date'],
      aggregationSupport: true
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    interactionSupport: {
      zoom: true,
      selection: true,
      tooltip: true,
      drilldown: true
    },
    component: BarChart
  },

  'echarts-line': {
    name: 'echarts-line',
    displayName: 'Line Chart',
    category: 'basic',
    library: 'echarts',
    version: '1.0.0',
    description: 'Line chart for time series and trend visualization',
    tags: ['line', 'trend', 'time-series'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      seriesField: { type: 'string', required: false, label: 'Series Field' },
      smooth: { type: 'boolean', default: false, label: 'Smooth curves' },
      area: { type: 'boolean', default: false, label: 'Fill area' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number', 'date']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: LineChart
  },

  'echarts-pie': {
    name: 'echarts-pie',
    displayName: 'Pie Chart',
    category: 'basic',
    library: 'echarts',
    version: '1.0.0',
    description: 'Pie chart for categorical data distribution',
    tags: ['pie', 'proportion', 'percentage'],
    configSchema: {
      nameField: { type: 'string', required: true, label: 'Category Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' },
      donut: { type: 'boolean', default: false, label: 'Donut style' },
      showLabels: { type: 'boolean', default: true, label: 'Show labels' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['nameField', 'valueField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: PieChart
  },

  'echarts-scatter': {
    name: 'echarts-scatter',
    displayName: 'Scatter Plot',
    category: 'statistical',
    library: 'echarts',
    version: '1.0.0',
    description: 'Scatter plot for correlation analysis',
    tags: ['scatter', 'correlation', 'regression'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      sizeField: { type: 'string', required: false, label: 'Size Field' },
      colorField: { type: 'string', required: false, label: 'Color Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: ScatterChart
  },

  'echarts-heatmap': {
    name: 'echarts-heatmap',
    displayName: 'Heatmap',
    category: 'statistical',
    library: 'echarts',
    version: '1.0.0',
    description: 'Heatmap for matrix data visualization',
    tags: ['heatmap', 'matrix', 'intensity'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['xField', 'yField', 'valueField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: HeatmapChart
  },

  'echarts-gauge': {
    name: 'echarts-gauge',
    displayName: 'Gauge Chart',
    category: 'advanced',
    library: 'echarts',
    version: '1.0.0',
    description: 'Gauge chart for KPI visualization',
    tags: ['gauge', 'speedometer', 'kpi'],
    configSchema: {
      valueField: { type: 'string', required: true, label: 'Value Field' },
      min: { type: 'number', default: 0, label: 'Minimum Value' },
      max: { type: 'number', default: 100, label: 'Maximum Value' },
      unit: { type: 'string', required: false, label: 'Unit' }
    },
    dataRequirements: {
      minColumns: 1,
      requiredFields: ['valueField'],
      supportedTypes: ['number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: GaugeChart
  },

  // Advanced Charts
  'echarts-waterfall': {
    name: 'echarts-waterfall',
    displayName: 'Waterfall Chart',
    category: 'financial',
    library: 'echarts',
    version: '1.0.0',
    description: 'Waterfall chart for cumulative value analysis',
    tags: ['waterfall', 'financial', 'cumulative'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'Category Field' },
      yField: { type: 'string', required: true, label: 'Value Field' },
      showConnect: { type: 'boolean', default: true, label: 'Show connectors' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: WaterfallChart
  },

  'echarts-sunburst': {
    name: 'echarts-sunburst',
    displayName: 'Sunburst Chart',
    category: 'advanced',
    library: 'echarts',
    version: '1.0.0',
    description: 'Sunburst chart for hierarchical data',
    tags: ['sunburst', 'hierarchy', 'radial'],
    configSchema: {
      nameField: { type: 'string', required: true, label: 'Name Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' },
      parentField: { type: 'string', required: false, label: 'Parent Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['nameField', 'valueField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: SunburstChart
  },

  'echarts-boxplot': {
    name: 'echarts-boxplot',
    displayName: 'Box Plot',
    category: 'statistical',
    library: 'echarts',
    version: '1.0.0',
    description: 'Box and whisker plot for statistical analysis',
    tags: ['boxplot', 'statistics', 'quartiles'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'Category Field' },
      yField: { type: 'string', required: true, label: 'Value Field' },
      seriesField: { type: 'string', required: false, label: 'Series Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: BoxplotChart
  },

  'echarts-parallel': {
    name: 'echarts-parallel',
    displayName: 'Parallel Coordinates',
    category: 'advanced',
    library: 'echarts',
    version: '1.0.0',
    description: 'Parallel coordinates for multidimensional data',
    tags: ['parallel', 'multidimensional', 'coordinates'],
    configSchema: {
      dimensions: { type: 'array', required: true, label: 'Dimensions' },
      colorField: { type: 'string', required: false, label: 'Color Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['dimensions'],
      supportedTypes: ['number']
    },
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    component: ParallelChart
  },

  // =========================
  // D3.JS COMPONENTS  
  // =========================

  'd3js-force-graph': {
    name: 'd3js-force-graph',
    displayName: 'Force Directed Graph',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Force-directed network graph',
    tags: ['network', 'graph', 'nodes', 'links'],
    configSchema: {
      sourceField: { type: 'string', required: true, label: 'Source Field' },
      targetField: { type: 'string', required: true, label: 'Target Field' },
      weightField: { type: 'string', required: false, label: 'Weight Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['sourceField', 'targetField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['svg', 'png'],
    component: ForceDirectedGraph
  },

  'd3js-calendar-heatmap': {
    name: 'd3js-calendar-heatmap',
    displayName: 'Calendar Heatmap',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Calendar-based heatmap visualization',
    tags: ['calendar', 'heatmap', 'time', 'activity'],
    configSchema: {
      dateField: { type: 'string', required: true, label: 'Date Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['dateField', 'valueField'],
      supportedTypes: ['date', 'number']
    },
    exportFormats: ['svg', 'png'],
    component: CalendarHeatmap
  },

  'd3js-chord-diagram': {
    name: 'd3js-chord-diagram',
    displayName: 'Chord Diagram',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Chord diagram for relationship visualization',
    tags: ['chord', 'relationships', 'flow'],
    configSchema: {
      sourceField: { type: 'string', required: true, label: 'Source Field' },
      targetField: { type: 'string', required: true, label: 'Target Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['sourceField', 'targetField', 'valueField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['svg', 'png'],
    component: ChordDiagram
  },

  'd3js-stream-graph': {
    name: 'd3js-stream-graph',
    displayName: 'Stream Graph',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Stream graph for flowing data visualization',
    tags: ['stream', 'flow', 'stacked', 'area'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      seriesField: { type: 'string', required: true, label: 'Series Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['xField', 'yField', 'seriesField'],
      supportedTypes: ['string', 'number', 'date']
    },
    exportFormats: ['svg', 'png'],
    component: StreamGraph
  },

  'd3js-voronoi-diagram': {
    name: 'd3js-voronoi-diagram',
    displayName: 'Voronoi Diagram',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Voronoi diagram for proximity analysis',
    tags: ['voronoi', 'proximity', 'tessellation'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      colorField: { type: 'string', required: false, label: 'Color Field' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['number']
    },
    exportFormats: ['svg', 'png'],
    component: VoronoiDiagram
  },

  'd3js-hierarchy': {
    name: 'd3js-hierarchy',
    displayName: 'Hierarchy Chart',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Hierarchical data visualization (tree, pack, partition)',
    tags: ['hierarchy', 'tree', 'pack', 'partition'],
    configSchema: {
      nameField: { type: 'string', required: true, label: 'Name Field' },
      valueField: { type: 'string', required: false, label: 'Value Field' },
      parentField: { type: 'string', required: false, label: 'Parent Field' },
      type: { type: 'select', options: ['tree', 'cluster', 'pack', 'partition'], default: 'tree', label: 'Layout Type' }
    },
    dataRequirements: {
      minColumns: 1,
      requiredFields: ['nameField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['svg', 'png'],
    component: HierarchyChart
  },

  // =========================
  // CHART.JS COMPONENTS
  // =========================

  'chartjs-bar': {
    name: 'chartjs-bar',
    displayName: 'Chart.js Bar Chart',
    category: 'basic',
    library: 'chartjs',
    version: '1.0.0',
    description: 'Chart.js bar chart with animations',
    tags: ['bar', 'chartjs', 'animated'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      seriesField: { type: 'string', required: false, label: 'Series Field' },
      stacked: { type: 'boolean', default: false, label: 'Stacked' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'jpg'],
    component: ChartJSBarChart
  },

  'chartjs-bubble': {
    name: 'chartjs-bubble',
    displayName: 'Bubble Chart',
    category: 'statistical',
    library: 'chartjs',
    version: '1.0.0',
    description: 'Chart.js bubble chart for three-dimensional data',
    tags: ['bubble', 'chartjs', '3d-data'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      sizeField: { type: 'string', required: true, label: 'Size Field' },
      colorField: { type: 'string', required: false, label: 'Color Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['xField', 'yField', 'sizeField'],
      supportedTypes: ['number']
    },
    exportFormats: ['png', 'jpg'],
    component: ChartJSBubbleChart
  },

  'chartjs-mixed': {
    name: 'chartjs-mixed',
    displayName: 'Mixed Chart',
    category: 'advanced',
    library: 'chartjs',
    version: '1.0.0',
    description: 'Chart.js mixed chart with multiple chart types',
    tags: ['mixed', 'chartjs', 'combination'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      series: { type: 'array', required: true, label: 'Series Configuration' },
      dualAxis: { type: 'boolean', default: false, label: 'Dual Y-Axis' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'series'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'jpg'],
    component: ChartJSMixedChart
  },

  // =========================
  // PLOTLY COMPONENTS
  // =========================

  'plotly-mesh3d': {
    name: 'plotly-mesh3d',
    displayName: 'Mesh 3D',
    category: 'advanced',
    library: 'plotly',
    version: '1.0.0',
    description: 'Plotly 3D mesh visualization',
    tags: ['3d', 'mesh', 'plotly'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      zField: { type: 'string', required: true, label: 'Z-Axis Field' },
      colorField: { type: 'string', required: false, label: 'Color Field' }
    },
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['xField', 'yField', 'zField'],
      supportedTypes: ['number']
    },
    exportFormats: ['png', 'html', 'pdf'],
    component: PlotlyMesh3D
  },

  'plotly-funnel': {
    name: 'plotly-funnel',
    displayName: 'Funnel Chart',
    category: 'basic',
    library: 'plotly',
    version: '1.0.0',
    description: 'Plotly funnel chart for conversion analysis',
    tags: ['funnel', 'conversion', 'plotly'],
    configSchema: {
      nameField: { type: 'string', required: true, label: 'Name Field' },
      valueField: { type: 'string', required: true, label: 'Value Field' },
      textposition: { type: 'select', options: ['inside', 'outside', 'auto'], default: 'inside', label: 'Text Position' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['nameField', 'valueField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'html', 'pdf'],
    component: PlotlyFunnelChart
  },

  'plotly-violin': {
    name: 'plotly-violin',
    displayName: 'Violin Plot',
    category: 'statistical',
    library: 'plotly',
    version: '1.0.0',
    description: 'Plotly violin plot for distribution analysis',
    tags: ['violin', 'distribution', 'plotly'],
    configSchema: {
      xField: { type: 'string', required: true, label: 'X-Axis Field' },
      yField: { type: 'string', required: true, label: 'Y-Axis Field' },
      groupField: { type: 'string', required: false, label: 'Group Field' },
      box: { type: 'boolean', default: true, label: 'Show Box' }
    },
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number']
    },
    exportFormats: ['png', 'html', 'pdf'],
    component: PlotlyViolinPlot
  }
};

// Utility functions
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

export const getChartCategories = (): string[] => {
  return Array.from(new Set(Object.values(ChartPlugins).map(chart => chart.category)));
};

export const getChartLibraries = (): string[] => {
  return Array.from(new Set(Object.values(ChartPlugins).map(chart => chart.library)));
};

export const searchCharts = (query: string): ChartPluginConfig[] => {
  const lowercaseQuery = query.toLowerCase();
  return Object.values(ChartPlugins).filter(chart => 
    chart.displayName.toLowerCase().includes(lowercaseQuery) ||
    chart.description?.toLowerCase().includes(lowercaseQuery) ||
    chart.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getChartsByTags = (tags: string[]): ChartPluginConfig[] => {
  return Object.values(ChartPlugins).filter(chart =>
    tags.some(tag => chart.tags?.includes(tag))
  );
};

// Export count by library
export const getChartStatistics = () => {
  const stats = Object.values(ChartPlugins).reduce((acc, chart) => {
    acc[chart.library] = (acc[chart.library] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: Object.keys(ChartPlugins).length,
    byLibrary: stats,
    byCategory: Object.values(ChartPlugins).reduce((acc, chart) => {
      acc[chart.category] = (acc[chart.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};