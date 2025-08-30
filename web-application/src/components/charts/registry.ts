import { ChartPluginConfig } from './types/chart.types';

// ECharts Components
import BarChart from './echarts/BarChart';
import LineChart from './echarts/LineChart';
import PieChart from './echarts/PieChart';
import ScatterChart from './echarts/ScatterChart';
import HeatmapChart from './echarts/HeatmapChart';

// D3.js Components
import ForceDirectedGraph from './d3/ForceDirectedGraph';
import TreemapChart from './d3/TreemapChart';
import SankeyChart from './d3/SankeyChart';

// Chart.js Components
import DonutChart from './chartjs/DonutChart';
import RadarChart from './chartjs/RadarChart';
import PolarAreaChart from './chartjs/PolarAreaChart';

// Plotly Components
import SurfaceChart from './plotly/SurfaceChart';
import ContourChart from './plotly/ContourChart';
import CandlestickChart from './plotly/CandlestickChart';

export const ChartPlugins: Record<string, ChartPluginConfig> = {
  // ECharts - Basic Charts
  'echarts-bar': {
    name: 'echarts-bar',
    displayName: 'Bar Chart',
    category: 'basic',
    library: 'echarts',
    version: '1.0.0',
    description: 'Standard bar chart with support for stacking and grouping',
    tags: ['bar', 'column', 'comparison'],
    
    configSchema: {
      xField: {
        type: 'select',
        required: true,
        label: 'X-Axis Field',
        options: 'columns'
      },
      yField: {
        type: 'select',
        required: true,
        label: 'Y-Axis Field',
        options: 'numeric_columns'
      },
      seriesField: {
        type: 'select',
        required: false,
        label: 'Series Field (for grouping)',
        options: 'categorical_columns'
      },
      stacked: {
        type: 'boolean',
        default: false,
        label: 'Stack bars'
      },
      horizontal: {
        type: 'boolean',
        default: false,
        label: 'Horizontal orientation'
      }
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
    description: 'Time series and trend visualization',
    tags: ['line', 'trend', 'time-series'],
    
    configSchema: {
      xField: {
        type: 'select',
        required: true,
        label: 'X-Axis Field',
        options: 'columns'
      },
      yField: {
        type: 'select',
        required: true,
        label: 'Y-Axis Field',
        options: 'numeric_columns'
      },
      seriesField: {
        type: 'select',
        required: false,
        label: 'Series Field',
        options: 'categorical_columns'
      },
      smooth: {
        type: 'boolean',
        default: false,
        label: 'Smooth curves'
      },
      showPoints: {
        type: 'boolean',
        default: true,
        label: 'Show data points'
      },
      areaFill: {
        type: 'boolean',
        default: false,
        label: 'Fill area under line'
      }
    },
    
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['xField', 'yField'],
      supportedTypes: ['string', 'number', 'date'],
      aggregationSupport: true
    },
    
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    
    interactionSupport: {
      zoom: true,
      pan: true,
      tooltip: true,
      crossFilter: true
    },
    
    component: LineChart
  },
  
  'echarts-pie': {
    name: 'echarts-pie',
    displayName: 'Pie Chart',
    category: 'basic',
    library: 'echarts',
    version: '1.0.0',
    description: 'Part-to-whole relationships',
    tags: ['pie', 'proportion', 'percentage'],
    
    configSchema: {
      categoryField: {
        type: 'select',
        required: true,
        label: 'Category Field',
        options: 'categorical_columns'
      },
      valueField: {
        type: 'select',
        required: true,
        label: 'Value Field',
        options: 'numeric_columns'
      },
      showLabels: {
        type: 'boolean',
        default: true,
        label: 'Show labels'
      },
      showPercentage: {
        type: 'boolean',
        default: true,
        label: 'Show percentages'
      },
      innerRadius: {
        type: 'number',
        default: 0,
        min: 0,
        max: 100,
        label: 'Inner radius (%)'
      }
    },
    
    dataRequirements: {
      minColumns: 2,
      maxColumns: 2,
      requiredFields: ['categoryField', 'valueField'],
      supportedTypes: ['string', 'number'],
      aggregationSupport: true
    },
    
    exportFormats: ['png', 'svg', 'pdf', 'jpg'],
    
    interactionSupport: {
      selection: true,
      tooltip: true,
      drilldown: true
    },
    
    component: PieChart
  },

  // D3.js Advanced Charts
  'd3-force-directed': {
    name: 'd3-force-directed',
    displayName: 'Force Directed Graph',
    category: 'advanced',
    library: 'd3js',
    version: '1.0.0',
    description: 'Network and relationship visualization',
    tags: ['network', 'graph', 'relationships'],
    
    configSchema: {
      sourceField: {
        type: 'select',
        required: true,
        label: 'Source Node Field',
        options: 'columns'
      },
      targetField: {
        type: 'select',
        required: true,
        label: 'Target Node Field',
        options: 'columns'
      },
      weightField: {
        type: 'select',
        required: false,
        label: 'Edge Weight Field',
        options: 'numeric_columns'
      },
      nodeSize: {
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        label: 'Node size'
      },
      linkDistance: {
        type: 'number',
        default: 100,
        min: 10,
        max: 500,
        label: 'Link distance'
      }
    },
    
    dataRequirements: {
      minColumns: 2,
      requiredFields: ['sourceField', 'targetField'],
      supportedTypes: ['string', 'number'],
      aggregationSupport: false
    },
    
    exportFormats: ['svg', 'png'],
    
    interactionSupport: {
      zoom: true,
      pan: true,
      selection: true,
      tooltip: true
    },
    
    component: ForceDirectedGraph
  },

  // Plotly Statistical Charts
  'plotly-surface': {
    name: 'plotly-surface',
    displayName: '3D Surface Plot',
    category: 'statistical',
    library: 'plotly',
    version: '1.0.0',
    description: '3D surface visualization for multivariate data',
    tags: ['3d', 'surface', 'multivariate'],
    
    configSchema: {
      xField: {
        type: 'select',
        required: true,
        label: 'X-Axis Field',
        options: 'numeric_columns'
      },
      yField: {
        type: 'select',
        required: true,
        label: 'Y-Axis Field',
        options: 'numeric_columns'
      },
      zField: {
        type: 'select',
        required: true,
        label: 'Z-Axis Field',
        options: 'numeric_columns'
      },
      colorScale: {
        type: 'select',
        default: 'viridis',
        options: ['viridis', 'plasma', 'inferno', 'magma'],
        label: 'Color scale'
      }
    },
    
    dataRequirements: {
      minColumns: 3,
      requiredFields: ['xField', 'yField', 'zField'],
      supportedTypes: ['number'],
      aggregationSupport: true
    },
    
    exportFormats: ['png', 'pdf', 'html'],
    
    interactionSupport: {
      zoom: true,
      pan: true,
      tooltip: true
    },
    
    component: SurfaceChart
  }
};

// Helper functions for plugin management
export const getChartPluginsByCategory = (category: string) => {
  return Object.values(ChartPlugins).filter(
    plugin => plugin.category === category
  );
};

export const getChartPluginsByLibrary = (library: string) => {
  return Object.values(ChartPlugins).filter(
    plugin => plugin.library === library
  );
};

export const getChartPlugin = (name: string) => {
  return ChartPlugins[name];
};

export const getAllChartCategories = () => {
  const categories = new Set(
    Object.values(ChartPlugins).map(plugin => plugin.category)
  );
  return Array.from(categories);
};

export const getPluginStatistics = () => {
  const total = Object.keys(ChartPlugins).length;
  const byCategory = Object.values(ChartPlugins).reduce((acc, plugin) => {
    acc[plugin.category] = (acc[plugin.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byLibrary = Object.values(ChartPlugins).reduce((acc, plugin) => {
    acc[plugin.library] = (acc[plugin.library] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return { total, byCategory, byLibrary };
};