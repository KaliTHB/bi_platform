// web-application/src/utils/chartUtils.ts
import { ChartDimensions, ChartConfiguration, ChartTheme, ChartType } from '@/types/chart.types';

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

// Chart configuration utilities
export const mergeChartConfigurations = (
  baseConfig: ChartConfiguration,
  overrideConfig: Partial<ChartConfiguration>
): ChartConfiguration => {
  return {
    ...baseConfig,
    ...overrideConfig,
    dimensions: {
      ...baseConfig.dimensions,
      ...overrideConfig.dimensions
    },
    axes: {
      ...baseConfig.axes,
      ...overrideConfig.axes,
      x: {
        ...baseConfig.axes?.x,
        ...overrideConfig.axes?.x
      },
      y: {
        ...baseConfig.axes?.y,
        ...overrideConfig.axes?.y
      }
    },
    legend: {
      ...baseConfig.legend,
      ...overrideConfig.legend
    },
    title: {
      ...baseConfig.title,
      ...overrideConfig.title
    }
  };
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
 * Generate plugin key from chart object with multiple data source fallbacks
 * Handles various chart object formats and configurations
 */
export const generatePluginKeyFromChart = (chart: {
  chart_type?: string;
  type?: string;
  config_json?: { chartType?: string; library?: string; };
  config?: { library?: string; };
}): {
  primaryKey: string;
  fallbackKeys: string[];
  chartType: string;
  library: string;
} => {
  // Extract chart type from multiple sources
  const rawChartType = chart.chart_type || 
                      chart.config_json?.chartType || 
                      chart.type || 
                      'bar';
  
  // Extract library from multiple sources  
  const rawLibrary = chart.config_json?.library || 
                    chart.config?.library ||
                    'echarts';
  
  return generatePluginKey(rawChartType, rawLibrary);
};

/**
 * Format time duration for display
 * Examples: 500 -> "500ms", 1500 -> "1.5s", 65000 -> "1m 5s"
 */
export const formatQueryTime = (timeMs: number): string => {
  if (timeMs < 1000) {
    return `${timeMs.toFixed(0)}ms`;
  }
  
  if (timeMs < 60000) {
    return `${(timeMs / 1000).toFixed(1)}s`;
  }
  
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  
  if (seconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${seconds}s`;
};

/**
 * Format large numbers for display in charts
 * Examples: 1234 -> "1.2K", 1234567 -> "1.2M", 1234567890 -> "1.2B"
 */
export const formatLargeNumber = (value: number, precision: number = 1): string => {
  if (Math.abs(value) >= 1e12) {
    return `${(value / 1e12).toFixed(precision)}T`;
  }
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(precision)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(precision)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(precision)}K`;
  }
  return value.toString();
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
  getSuggestedChartTypes
};

export default chartUtils;