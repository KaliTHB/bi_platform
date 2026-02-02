// web-application/src/plugins/charts/utils/chartConfigUtils.ts
// Chart Configuration Utilities

import { ChartConfiguration, ChartType, ChartDimensions } from '@/types/chart.types';

/**
 * Validate chart configuration object
 */
export const validateChartConfig = (config: Partial<ChartConfiguration>): boolean => {
  try {
    // Basic validation checks
    if (!config) return false;
    
    // Check required dimensions
    if (config.dimensions) {
      const { width, height } = config.dimensions;
      if (width && (width < 50 || width > 5000)) return false;
      if (height && (height < 50 || height > 5000)) return false;
    }
    
    return true;
  } catch (error) {
    console.error('Chart config validation error:', error);
    return false;
  }
};

/**
 * Create default configuration for specific chart type
 */
export const createDefaultConfig = (chartType: ChartType): Partial<ChartConfiguration> => {
  const baseConfig: Partial<ChartConfiguration> = {
    animation: {
      enabled: true,
      duration: 1000
    },
    interactions: {
      enabled: true,
      tooltip: true
    }
  };

  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return {
        ...baseConfig,
        legend: {
          show: true,
          position: 'right',
          orientation: 'vertical'
        }
      };
    
    case 'line':
    case 'area':
      return {
        ...baseConfig,
        legend: {
          show: true,
          position: 'top',
          orientation: 'horizontal'
        }
      };
    
    default:
      return {
        ...baseConfig,
        legend: {
          show: true,
          position: 'bottom',
          orientation: 'horizontal'
        }
      };
  }
};

/**
 * Merge chart configurations with defaults
 */
export const mergeConfigurations = (
  base: Partial<ChartConfiguration>,
  override: Partial<ChartConfiguration>
): Partial<ChartConfiguration> => {
  return {
    ...base,
    ...override,
    // Deep merge nested objects
    animation: {
      ...base.animation,
      ...override.animation
    },
    interactions: {
      ...base.interactions,
      ...override.interactions
    },
    legend: {
      ...base.legend,
      ...override.legend
    }
  };
};

/**
 * Optimize configuration based on data size
 */
export const optimizeConfigForData = (
  config: Partial<ChartConfiguration>,
  dataSize: number
): Partial<ChartConfiguration> => {
  const optimized = { ...config };
  
  // Disable animations for large datasets
  if (dataSize > 1000) {
    optimized.animation = {
      ...optimized.animation,
      enabled: false
    };
  }
  
  // Adjust interaction settings for performance
  if (dataSize > 5000) {
    optimized.interactions = {
      ...optimized.interactions,
      hover: { enabled: false }
    };
  }
  
  return optimized;
};

/**
 * Convert configuration to library-specific format
 */
export const convertConfigForLibrary = (
  config: Partial<ChartConfiguration>,
  library: string
): any => {
  switch (library.toLowerCase()) {
    case 'echarts':
      return convertToEChartsConfig(config);
    case 'd3':
      return convertToD3Config(config);
    case 'chartjs':
      return convertToChartJSConfig(config);
    default:
      return config;
  }
};

/**
 * Convert to ECharts configuration format
 */
const convertToEChartsConfig = (config: Partial<ChartConfiguration>): any => {
  return {
    animation: config.animation?.enabled || true,
    animationDuration: config.animation?.duration || 1000,
    tooltip: {
      trigger: 'item',
      show: config.interactions?.tooltip || true
    },
    legend: {
      show: config.legend?.show || true,
      orient: config.legend?.orientation || 'horizontal',
      [config.legend?.position || 'bottom']: 0
    }
  };
};

/**
 * Convert to D3 configuration format
 */
const convertToD3Config = (config: Partial<ChartConfiguration>): any => {
  return {
    width: config.dimensions?.width || 400,
    height: config.dimensions?.height || 300,
    margin: config.dimensions?.margin || { top: 20, right: 20, bottom: 40, left: 40 },
    animate: config.animation?.enabled || true,
    duration: config.animation?.duration || 1000
  };
};

/**
 * Convert to Chart.js configuration format
 */
const convertToChartJSConfig = (config: Partial<ChartConfiguration>): any => {
  return {
    responsive: true,
    animation: {
      duration: config.animation?.duration || 1000
    },
    plugins: {
      legend: {
        display: config.legend?.show || true,
        position: config.legend?.position || 'bottom'
      },
      tooltip: {
        enabled: config.interactions?.tooltip || true
      }
    }
  };
};

/**
 * Extract color palette from configuration
 */
export const extractColorPalette = (config: Partial<ChartConfiguration>): string[] => {
  const defaultColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];
  
  return config.theme?.colors?.primary || defaultColors;
};

/**
 * Validate configuration against chart type requirements
 */
export const validateConfigForChartType = (
  config: Partial<ChartConfiguration>,
  chartType: ChartType
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Chart-specific validations
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      if (!config.series || config.series.length === 0) {
        errors.push('Pie charts require at least one data series');
      }
      break;
      
    case 'line':
    case 'area':
    case 'bar':
    case 'column':
      if (!config.axes?.x?.field || !config.axes?.y?.field) {
        errors.push('Charts require both X and Y axis field mappings');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  validateChartConfig,
  createDefaultConfig,
  mergeConfigurations,
  optimizeConfigForData,
  convertConfigForLibrary,
  extractColorPalette,
  validateConfigForChartType
};