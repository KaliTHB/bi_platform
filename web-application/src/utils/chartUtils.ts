// web-application/src/utils/chartUtils.ts
import { ChartDimensions, ChartConfiguration, ChartTheme, ChartType, ChartData, ChartMetadata } from '@/types/chart.types';

// ============================================================================
// EXISTING UTILITIES (keeping all previous functions)
// ============================================================================

// Chart dimension utilities
export const createDefaultDimensions = (
  width: number = 400,
  height: number = 300
): ChartDimensions => ({
  width,
  height,
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  padding: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
});

export const calculateInnerDimensions = (dimensions: ChartDimensions) => {
  const margin = dimensions.margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = dimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  
  return {
    width: dimensions.width - (margin.left ?? 0) - (margin.right ?? 0) - (padding.left || 0) - (padding.right || 0),
    height: dimensions.height - (margin.top ?? 0) - (margin.bottom ?? 0) - (padding.top || 0) - (padding.bottom || 0)
  };
};

export const validateAndConstrainDimensions = (
  dimensions: ChartDimensions,
  minWidth: number = 100,
  minHeight: number = 100,
  maxWidth: number = 2000,
  maxHeight: number = 1500
): ChartDimensions => {
  return {
    ...dimensions,
    width: Math.max(minWidth, Math.min(maxWidth, dimensions.width)),
    height: Math.max(minHeight, Math.min(maxHeight, dimensions.height))
  };
};

export const createResponsiveDimensions = (
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9
): ChartDimensions => {
  const width = Math.min(containerWidth - 40, 800);
  const height = Math.min(width / aspectRatio, containerHeight - 40);
  
  return createDefaultDimensions(width, height);
};


export const validateChartConfiguration = (config: ChartConfiguration): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.dimensions || config.dimensions.width <= 0 || config.dimensions.height <= 0) {
    errors.push('Valid dimensions are required');
  }
  
  if (!config.series || !Array.isArray(config.series)) {
    errors.push('Series configuration is required');
  }
  
  return { valid: errors.length === 0, errors };
};

// Theme utilities
export const createChartTheme = (mode: 'light' | 'dark' = 'light'): ChartTheme => {
  const lightTheme: ChartTheme = {
    mode: 'light',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    gridColor: '#e0e0e0',
    axisColor: '#666666',
    colors: [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
      '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
    ]
  };
  
  const darkTheme: ChartTheme = {
    mode: 'dark',
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    gridColor: '#404040',
    axisColor: '#cccccc',
    colors: [
      '#4dabf7', '#69db7c', '#ffd43b', '#ff6b6b', '#4ecdc4',
      '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0', '#fd79a8'
    ]
  };
  
  return mode === 'dark' ? darkTheme : lightTheme;
};

// Data analysis utilities
export const analyzeDataForChartOptimization = (
  data: any[],
  chartType: ChartType
): { suggestedDimensions: ChartDimensions; suggestedConfig: Partial<ChartConfiguration> } => {
  const dataPointCount = data.length;
  
  let suggestedDimensions = createDefaultDimensions();
  let suggestedConfig: Partial<ChartConfiguration> = {};
  
  if (chartType === 'pie' || chartType === 'doughnut') {
    suggestedDimensions = createDefaultDimensions(300, 300);
  } else if (chartType === 'bar' || chartType === 'column') {
    const barWidth = Math.max(400, dataPointCount * 30);
    suggestedDimensions = createDefaultDimensions(barWidth, 300);
  }
  
  if (dataPointCount > 100) {
    suggestedConfig = {
      animation: {
        enabled: false
      },
      interactions: {
        enabled: false
      },
      sampling: {
        enabled: true,
        maxPoints: 1000 > 500 ? 1000 : 500
      }
    };
  }
  
  if (dataPointCount > 1000) {
    suggestedConfig.interactions = {
      tooltip: true,
      hover: { enabled: false },
      zoom: { enabled: true },
      pan: { enabled: true }
    };
  }
  
  return {
    suggestedDimensions,
    suggestedConfig
  };
};

export const createCompleteChartConfig = (
  chartType: string,
  dimensions: ChartDimensions,
  partialConfig?: Partial<ChartConfiguration>
): ChartConfiguration => {
  const baseConfig: ChartConfiguration = {
    dimensions,
    series: [],
    axes: {
      x: {
        field: '',
        title: '',
        type: 'category',
        scale: 'linear',
        grid: true,
        labels: { enabled: true },
        ticks: { enabled: true },
        line: { enabled: true },
        visible: true
      },
      y: {
        field: '',
        title: '',
        type: 'value',
        scale: 'linear',
        grid: true,
        labels: { enabled: true },
        ticks: { enabled: true },
        line: { enabled: true },
        visible: true
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      orientation: 'horizontal',
      align: 'center'
    },
    title: {
      text: '',
      position: 'center'
    },
    theme: createChartTheme('light'),
    animation: {
      enabled: true,
      duration: 1000,
      easing: 'easeInOutQuad'
    }
  };

  return mergeChartConfigurations(baseConfig, partialConfig || {});
};

// ============================================================================
// NEW: PLUGIN KEY RESOLUTION UTILITIES (moved from ChartContainer)
// ============================================================================

/**
 * Normalize chart type name for consistent plugin key generation
 * Examples: "Bar Chart" -> "bar", "line_chart" -> "line", "Scatter Plot" -> "scatter-plot"
 */
export const normalizeChartType = (chartType: string): string => {
  if (!chartType) return 'bar'; // Default fallback
  
  return chartType
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')    // Replace underscores and spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters except hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
};

/**
 * Normalize library name for consistent plugin key generation
 * Examples: "Chart.js" -> "chartjs", "ECharts" -> "echarts", "D3.js" -> "d3"
 */
export const normalizeLibraryName = (library: string): string => {
  if (!library) return 'echarts'; // Default fallback
  
  const normalized = library
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
  
  // Map common variations to standard names
  const libraryMap: Record<string, string> = {
    'echarts': 'echarts',
    'echart': 'echarts',
    'apacheecharts': 'echarts',
    'chartjs': 'chartjs',
    'chartdotjs': 'chartjs',
    'chart': 'chartjs',
    'd3': 'd3',
    'd3js': 'd3',
    'plotly': 'plotly',
    'plotlyjs': 'plotly',
    'recharts': 'recharts',
    'victory': 'victory',
    'nivo': 'nivo',
    'amcharts': 'amcharts',
    'highcharts': 'highcharts'
  };
  
  return libraryMap[normalized] || normalized;
};

/**
 * Generate plugin key with multiple fallback strategies
 * Returns primary key and ordered fallback keys for robust plugin loading
 */
export const generatePluginKey = (chartType: string, library: string): {
  primaryKey: string;
  fallbackKeys: string[];
  chartType: string;
  library: string;
} => {
  // Normalize values
  const normalizedChartType = normalizeChartType(chartType);
  const normalizedLibrary = normalizeLibraryName(library);
  
  // Generate primary plugin key
  const primaryKey = `${normalizedLibrary}-${normalizedChartType}`;
  
  // Generate fallback keys in order of preference
  const fallbackKeys = [
    `${normalizedLibrary}-renderer`,           // Library-specific universal renderer
    `echarts-${normalizedChartType}`,          // Default to echarts for specific type
    `echarts-renderer`,                        // Ultimate fallback to echarts universal
    `chartjs-${normalizedChartType}`,          // Try Chart.js alternative
    `chartjs-renderer`,                        // Chart.js universal fallback
    `fallback-renderer`                        // Final fallback renderer
  ].filter((key, index, array) => array.indexOf(key) === index); // Remove duplicates
  
  return {
    primaryKey,
    fallbackKeys,
    chartType: normalizedChartType,
    library: normalizedLibrary
  };
};

/**
 * Validate plugin key format
 */
export const isValidPluginKey = (key: string): boolean => {
  // Plugin key should be: library-charttype or library-renderer
  const pluginKeyRegex = /^[a-z][a-z0-9]*-[a-z][a-z0-9-]*$/;
  return pluginKeyRegex.test(key);
};

/**
 * Get suggested chart types for a given library
 */
export const getSuggestedChartTypes = (library: string): string[] => {
  const normalizedLibrary = normalizeLibraryName(library);
  
  const chartTypesByLibrary: Record<string, string[]> = {
    echarts: ['bar', 'line', 'pie', 'scatter', 'radar', 'heatmap', 'treemap', 'sankey', 'sunburst', 'parallel'],
    chartjs: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polar-area', 'bubble', 'scatter'],
    d3: ['bar', 'line', 'scatter', 'network', 'tree', 'force', 'chord', 'arc'],
    plotly: ['scatter', 'line', 'bar', 'box', 'violin', 'heatmap', '3d-scatter', 'surface', 'mesh'],
    recharts: ['line', 'area', 'bar', 'composed', 'pie', 'radar', 'radial-bar', 'treemap', 'funnel'],
    victory: ['line', 'area', 'bar', 'scatter', 'pie', 'candlestick', 'box-plot', 'histogram'],
    nivo: ['bar', 'line', 'pie', 'heatmap', 'chord', 'network', 'treemap', 'circle-packing', 'sunburst']
  };
  
  return chartTypesByLibrary[normalizedLibrary] || ['bar', 'line', 'pie'];
};

/**
 * Checks if chart data is empty regardless of input type
 */
export const isChartDataEmpty = (data: any[] | ChartData | null | undefined): boolean => {
  if (!data) return true;
  
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  
  if (typeof data === 'object' && 'data' in data) {
    return !data.data || data.data.length === 0;
  }
  
  return true;
};

/**
 * Validates chart for rendering requirements
 */
export const validateChartForRendering = (chart: any): { valid: boolean; message?: string } => {
  if (!chart) {
    return { valid: false, message: 'Chart is required' };
  }

  if (!chart.name || chart.name.trim().length === 0) {
    return { valid: false, message: 'Chart name is required' };
  }

  if (!chart.chart_type) {
    return { valid: false, message: 'Chart type is required' };
  }

  if (!chart.dataset_id) {
    return { valid: false, message: 'Dataset is required' };
  }

  return { valid: true };
};

/**
 * Generate plugin key from chart configuration
 */
export const generatePluginKeyFromChart = (chart: any) => {
  if (!chart) {
    return {
      primaryKey: 'echarts/bar',
      library: 'echarts',
      type: 'bar',
      valid: false
    };
  }

  const library = chart.chart_library || 'echarts';
  const type = chart.chart_type || 'bar';
  const primaryKey = `${library}/${type}`;

  return {
    primaryKey,
    library,
    type,
    valid: !!chart.chart_type
  };
};

/**
 * Format query execution time
 */
export const formatQueryTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (value: number, precision: number = 1): string => {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(precision) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(precision) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(precision) + 'K';
  }
  return value.toString();
};

/**
 * Merge chart configurations with precedence
 */
export const mergeChartConfigurations = (
  baseConfig: any = {},
  userConfig: any = {},
  overrides: any = {}
): any => {
  return {
    ...baseConfig,
    ...userConfig,
    ...overrides
  };
};

/**
 * Create chart metadata object
 */
export const createChartMetadata = (
  chart: any,
  chartData?: ChartData,
  executionTime?: number
): ChartMetadata => {
  return {
    chartId: chart.id || chart.chart_id || '',
    chartName: chart.name || chart.display_name || 'Untitled Chart',
    chartType: chart.chart_type || 'unknown',
    datasetId: chart.dataset_id || '',
    rowCount: chartData?.data?.length || 0,
    columnCount: chartData?.columns?.length || 0,
    executionTime: executionTime || 0,
    lastUpdated: new Date().toISOString(),
    pluginKey: chart.chart_library ? `${chart.chart_library}/${chart.chart_type}` : 'echarts/bar',
    version: chart.version || 1
  };
};

/**
 * Default chart dimensions constant
 */
export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 400,
  height: 300,
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  padding: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
};

// ============================================================================
// Export all utilities (existing + new) - FIXED SYNTAX
// ============================================================================

const chartUtils = {
  // Existing utilities
  createDefaultDimensions,
  calculateInnerDimensions,
  validateAndConstrainDimensions,
  createResponsiveDimensions,
  mergeChartConfigurations,
  validateChartConfiguration,
  createChartTheme,
  analyzeDataForChartOptimization,
  createCompleteChartConfig,
  
  // New plugin key utilities
  normalizeChartType,
  normalizeLibraryName,
  generatePluginKey,
  generatePluginKeyFromChart,
  formatQueryTime,
  formatLargeNumber,
  isValidPluginKey,
  getSuggestedChartTypes,
  createChartMetadata,
  validateChartForRendering
};

export default chartUtils;
