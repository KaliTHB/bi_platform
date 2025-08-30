'use client';

export interface ChartTypeDefinition {
  id: string;
  name: string;
  displayName: string;
  library: string;
  category: string;
  description: string;
  dataRequirements: {
    minColumns: number;
    maxColumns: number;
    requiredColumns: string[];
    optionalColumns: string[];
  };
  configOptions: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'color';
      default?: any;
      options?: string[] | number[];
      description: string;
    };
  };
  previewImage?: string;
  tags: string[];
}

export const CHART_TYPE_REGISTRY: ChartTypeDefinition[] = [
  // ECharts
  {
    id: 'echarts-bar',
    name: 'bar',
    displayName: 'Bar Chart',
    library: 'echarts',
    category: 'basic',
    description: 'Display data with rectangular bars',
    dataRequirements: {
      minColumns: 2,
      maxColumns: 3,
      requiredColumns: ['category', 'value'],
      optionalColumns: ['series'],
    },
    configOptions: {
      title: {
        type: 'string',
        default: 'Bar Chart',
        description: 'Chart title',
      },
      color: {
        type: 'color',
        default: '#5470c6',
        description: 'Bar color',
      },
      showLabels: {
        type: 'boolean',
        default: true,
        description: 'Show value labels on bars',
      },
    },
    tags: ['basic', 'comparison', 'categorical'],
  },
  {
    id: 'echarts-pie',
    name: 'pie',
    displayName: 'Pie Chart',
    library: 'echarts',
    category: 'basic',
    description: 'Display data as slices of a pie',
    dataRequirements: {
      minColumns: 2,
      maxColumns: 2,
      requiredColumns: ['category', 'value'],
      optionalColumns: [],
    },
    configOptions: {
      title: {
        type: 'string',
        default: 'Pie Chart',
        description: 'Chart title',
      },
      donut: {
        type: 'boolean',
        default: false,
        description: 'Display as donut chart',
      },
      showLabels: {
        type: 'boolean',
        default: true,
        description: 'Show labels on slices',
      },
    },
    tags: ['basic', 'proportion', 'parts-to-whole'],
  },
  {
    id: 'echarts-line',
    name: 'line',
    displayName: 'Line Chart',
    library: 'echarts',
    category: 'basic',
    description: 'Display data as connected points',
    dataRequirements: {
      minColumns: 2,
      maxColumns: 3,
      requiredColumns: ['x', 'y'],
      optionalColumns: ['series'],
    },
    configOptions: {
      title: {
        type: 'string',
        default: 'Line Chart',
        description: 'Chart title',
      },
      smooth: {
        type: 'boolean',
        default: false,
        description: 'Use smooth curves',
      },
      showPoints: {
        type: 'boolean',
        default: true,
        description: 'Show data points',
      },
      lineWidth: {
        type: 'number',
        default: 2,
        description: 'Line width in pixels',
      },
    },
    tags: ['basic', 'trend', 'time-series'],
  },

  // D3.js
  {
    id: 'd3js-calendar-heatmap',
    name: 'calendar-heatmap',
    displayName: 'Calendar Heatmap',
    library: 'd3js',
    category: 'advanced',
    description: 'Display time-series data as calendar',
    dataRequirements: {
      minColumns: 2,
      maxColumns: 2,
      requiredColumns: ['date', 'value'],
      optionalColumns: [],
    },
    configOptions: {
      colorScheme: {
        type: 'select',
        default: 'Blues',
        options: ['Blues', 'Greens', 'Reds', 'Purples'],
        description: 'Color scheme for heatmap',
      },
    },
    tags: ['advanced', 'time-series', 'calendar'],
  },
  {
    id: 'd3js-chord-diagram',
    name: 'chord-diagram',
    displayName: 'Chord Diagram',
    library: 'd3js',
    category: 'advanced',
    description: 'Visualize relationships between entities',
    dataRequirements: {
      minColumns: 3,
      maxColumns: 3,
      requiredColumns: ['source', 'target', 'value'],
      optionalColumns: [],
    },
    configOptions: {
      padAngle: {
        type: 'number',
        default: 0.05,
        description: 'Padding angle between groups',
      },
    },
    tags: ['advanced', 'relationships', 'network'],
  },
  {
    id: 'd3js-force-directed-graph',
    name: 'force-directed-graph',
    displayName: 'Force Directed Graph',
    library: 'd3js',
    category: 'network',
    description: 'Interactive network visualization',
    dataRequirements: {
      minColumns: 1,
      maxColumns: 1,
      requiredColumns: ['graph'],
      optionalColumns: [],
    },
    configOptions: {
      strength: {
        type: 'number',
        default: -300,
        description: 'Repulsion strength between nodes',
      },
      linkDistance: {
        type: 'number',
        default: 100,
        description: 'Desired distance between connected nodes',
      },
    },
    tags: ['advanced', 'network', 'interactive'],
  },
  {
    id: 'd3js-geographic-map',
    name: 'geographic-map',
    displayName: 'Geographic Map',
    library: 'd3js',
    category: 'geographic',
    description: 'Display data on world map',
    dataRequirements: {
      minColumns: 3,
      maxColumns: 4,
      requiredColumns: ['id', 'coordinates', 'value'],
      optionalColumns: ['label'],
    },
    configOptions: {
      projection: {
        type: 'select',
        default: 'mercator',
        options: ['mercator', 'naturalEarth1', 'orthographic'],
        description: 'Map projection type',
      },
    },
    tags: ['advanced', 'geographic', 'spatial'],
  },

  // Drilldown
  {
    id: 'drilldown-bar',
    name: 'bar',
    displayName: 'Drilldown Bar Chart',
    library: 'drilldown',
    category: 'hierarchical',
    description: 'Bar chart with drill-down capability',
    dataRequirements: {
      minColumns: 1,
      maxColumns: 1,
      requiredColumns: ['hierarchical'],
      optionalColumns: [],
    },
    configOptions: {
      maxLevels: {
        type: 'number',
        default: 3,
        description: 'Maximum drill-down levels',
      },
      showBreadcrumbs: {
        type: 'boolean',
        default: true,
        description: 'Show navigation breadcrumbs',
      },
    },
    tags: ['hierarchical', 'interactive', 'drill-down'],
  },
  {
    id: 'drilldown-pie',
    name: 'pie',
    displayName: 'Drilldown Pie Chart',
    library: 'drilldown',
    category: 'hierarchical',
    description: 'Pie chart with drill-down capability',
    dataRequirements: {
      minColumns: 1,
      maxColumns: 1,
      requiredColumns: ['hierarchical'],
      optionalColumns: [],
    },
    configOptions: {
      maxLevels: {
        type: 'number',
        default: 3,
        description: 'Maximum drill-down levels',
      },
      innerRadius: {
        type: 'number',
        default: 0.3,
        description: 'Inner radius for donut effect',
      },
    },
    tags: ['hierarchical', 'interactive', 'drill-down'],
  },
  {
    id: 'drilldown-treemap',
    name: 'treemap',
    displayName: 'Hierarchical Treemap',
    library: 'drilldown',
    category: 'hierarchical',
    description: 'Treemap with drill-down capability',
    dataRequirements: {
      minColumns: 1,
      maxColumns: 1,
      requiredColumns: ['hierarchical'],
      optionalColumns: [],
    },
    configOptions: {
      paddingTop: {
        type: 'number',
        default: 20,
        description: 'Top padding for labels',
      },
      colorScheme: {
        type: 'select',
        default: 'category10',
        options: ['category10', 'category20', 'blues', 'greens'],
        description: 'Color scheme',
      },
    },
    tags: ['hierarchical', 'interactive', 'space-filling'],
  },
];

export const getChartTypeById = (id: string): ChartTypeDefinition | undefined => {
  return CHART_TYPE_REGISTRY.find(chart => chart.id === id);
};

export const getChartTypesByLibrary = (library: string): ChartTypeDefinition[] => {
  return CHART_TYPE_REGISTRY.filter(chart => chart.library === library);
};

export const getChartTypesByCategory = (category: string): ChartTypeDefinition[] => {
  return CHART_TYPE_REGISTRY.filter(chart => chart.category === category);
};

export const searchChartTypes = (query: string): ChartTypeDefinition[] => {
  const lowercaseQuery = query.toLowerCase();
  return CHART_TYPE_REGISTRY.filter(chart => 
    chart.displayName.toLowerCase().includes(lowercaseQuery) ||
    chart.description.toLowerCase().includes(lowercaseQuery) ||
    chart.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getAvailableLibraries = (): string[] => {
  return Array.from(new Set(CHART_TYPE_REGISTRY.map(chart => chart.library)));
};

export const getAvailableCategories = (): string[] => {
  return Array.from(new Set(CHART_TYPE_REGISTRY.map(chart => chart.category)));
};