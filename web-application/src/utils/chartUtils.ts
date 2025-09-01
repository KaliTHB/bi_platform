// File: web-application/src/utils/chartUtils.ts

import { 
  ChartDimensions, 
  ChartConfiguration, 
  ChartTheme, 
  ChartSeries,
  ChartAxis,
  Chart
} from '@/types/chart.types';

// ============================================================================
// Chart Dimension Utilities
// ============================================================================

/**
 * Creates default chart dimensions with margin support
 */
export const createDefaultDimensions = (
  width: number = 400,
  height: number = 300,
  marginOverrides?: Partial<ChartDimensions['margin']>
): ChartDimensions => {
  const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };
  
  return {
    width,
    height,
    margin: {
      ...defaultMargin,
      ...marginOverrides
    },
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    }
  };
};

/**
 * Calculates the inner dimensions of a chart (excluding margins and padding)
 */
export const calculateInnerDimensions = (dimensions: ChartDimensions) => {
  const margin = dimensions.margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = dimensions.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  
  return {
    width: dimensions.width - margin.left - margin.right - (padding.left || 0) - (padding.right || 0),
    height: dimensions.height - margin.top - margin.bottom - (padding.top || 0) - (padding.bottom || 0),
    x: margin.left + (padding.left || 0),
    y: margin.top + (padding.top || 0)
  };
};

/**
 * Validates chart dimensions and applies minimum/maximum constraints
 */
export const validateAndConstrainDimensions = (
  dimensions: ChartDimensions,
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
  }
): ChartDimensions => {
  const {
    minWidth = 100,
    maxWidth = 2000,
    minHeight = 100,
    maxHeight = 1500,
    aspectRatio
  } = constraints || {};

  let { width, height } = dimensions;

  // Apply width constraints
  width = Math.max(minWidth, Math.min(maxWidth, width));
  
  // Apply height constraints
  height = Math.max(minHeight, Math.min(maxHeight, height));

  // Apply aspect ratio if specified
  if (aspectRatio && aspectRatio > 0) {
    const currentRatio = width / height;
    if (currentRatio > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  // Ensure margins don't exceed chart dimensions
  const margin = dimensions.margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const maxMarginH = width * 0.4;
  const maxMarginV = height * 0.4;

  const constrainedMargin = {
    top: Math.min(margin.top, maxMarginV),
    right: Math.min(margin.right, maxMarginH),
    bottom: Math.min(margin.bottom, maxMarginV),
    left: Math.min(margin.left, maxMarginH)
  };

  return {
    ...dimensions,
    width: Math.round(width),
    height: Math.round(height),
    margin: constrainedMargin
  };
};

/**
 * Creates responsive dimensions based on container size
 */
export const createResponsiveDimensions = (
  containerWidth: number,
  containerHeight: number,
  chartType: string,
  baseMargin?: Partial<ChartDimensions['margin']>
): ChartDimensions => {
  // Different chart types may need different margin defaults
  const getDefaultMarginForChartType = (type: string) => {
    switch (type) {
      case 'pie':
      case 'donut':
        return { top: 10, right: 10, bottom: 10, left: 10 };
      case 'bar':
        return { top: 20, right: 20, bottom: 40, left: 60 };
      case 'line':
      case 'area':
        return { top: 20, right: 30, bottom: 40, left: 50 };
      case 'scatter':
        return { top: 20, right: 20, bottom: 40, left: 50 };
      default:
        return { top: 20, right: 20, bottom: 20, left: 20 };
    }
  };

  const defaultMargin = getDefaultMarginForChartType(chartType);
  const margin = { ...defaultMargin, ...baseMargin };

  // Ensure minimum dimensions
  const width = Math.max(200, containerWidth);
  const height = Math.max(150, containerHeight);

  return {
    width,
    height,
    margin,
    padding: {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5
    }
  };
};

// ============================================================================
// Chart Configuration Utilities
// ============================================================================

/**
 * Merges chart configurations with proper type safety
 */
export const mergeChartConfigurations = (
  base: ChartConfiguration,
  override: Partial<ChartConfiguration>
): ChartConfiguration => {
  const merged: ChartConfiguration = {
    ...base,
    ...override
  };

  // Deep merge specific nested objects
  if (base.dimensions || override.dimensions) {
    merged.dimensions = {
      ...base.dimensions,
      ...override.dimensions,
      margin: {
        ...base.dimensions?.margin,
        ...override.dimensions?.margin
      },
      padding: {
        ...base.dimensions?.padding,
        ...override.dimensions?.padding
      }
    } as ChartDimensions;
  }

  if (base.axes || override.axes) {
    merged.axes = {
      x: { ...base.axes?.x, ...override.axes?.x },
      y: { ...base.axes?.y, ...override.axes?.y },
      y2: { ...base.axes?.y2, ...override.axes?.y2 }
    };
  }

  if (base.legend || override.legend) {
    merged.legend = {
      ...base.legend,
      ...override.legend,
      textStyle: {
        ...base.legend?.textStyle,
        ...override.legend?.textStyle
      }
    };
  }

  if (base.title || override.title) {
    merged.title = {
      ...base.title,
      ...override.title,
      textStyle: {
        ...base.title?.textStyle,
        ...override.title?.textStyle
      },
      subtitleStyle: {
        ...base.title?.subtitleStyle,
        ...override.title?.subtitleStyle
      }
    };
  }

  if (base.theme || override.theme) {
    merged.theme = {
      ...base.theme,
      ...override.theme
    };
  }

  return merged;
};

/**
 * Validates a complete chart configuration
 */
export const validateChartConfiguration = (config: ChartConfiguration): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate dimensions
  if (config.dimensions) {
    if (!config.dimensions.width || config.dimensions.width <= 0) {
      errors.push('Chart width must be greater than 0');
    }
    if (!config.dimensions.height || config.dimensions.height <= 0) {
      errors.push('Chart height must be greater than 0');
    }

    const innerDims = calculateInnerDimensions(config.dimensions);
    if (innerDims.width <= 0) {
      errors.push('Chart inner width is too small after applying margins and padding');
    }
    if (innerDims.height <= 0) {
      errors.push('Chart inner height is too small after applying margins and padding');
    }

    if (innerDims.width < 50) {
      warnings.push('Chart inner width is very small and may not render well');
    }
    if (innerDims.height < 50) {
      warnings.push('Chart inner height is very small and may not render well');
    }
  }

  // Validate axes
  if (config.axes) {
    if (config.axes.x && !config.axes.x.field) {
      errors.push('X-axis field is required');
    }
    if (config.axes.y && !config.axes.y.field) {
      errors.push('Y-axis field is required');
    }
  }

  // Validate series
  if (config.series && config.series.length === 0) {
    warnings.push('No data series configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// Chart Theme Utilities
// ============================================================================

/**
 * Creates a chart theme with proper defaults
 */
export const createChartTheme = (
  name: string,
  overrides?: Partial<ChartTheme>
): ChartTheme => {
  const baseThemes: Record<string, ChartTheme> = {
    light: {
      name: 'light',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      gridColor: '#e0e0e0',
      axisColor: '#666666',
      colorPalette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4'],
      darkMode: false
    },
    dark: {
      name: 'dark',
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      gridColor: '#404040',
      axisColor: '#cccccc',
      colorPalette: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee'],
      darkMode: true
    },
    corporate: {
      name: 'corporate',
      backgroundColor: '#f8f9fa',
      textColor: '#2d3748',
      gridColor: '#e2e8f0',
      axisColor: '#4a5568',
      colorPalette: ['#2b6cb0', '#c53030', '#2f855a', '#d69e2e', '#553c9a', '#c05621', '#0987a0'],
      darkMode: false
    }
  };

  const baseTheme = baseThemes[name] || baseThemes.light;
  
  return {
    ...baseTheme,
    ...overrides
  };
};

// ============================================================================
// Chart Data Utilities
// ============================================================================

/**
 * Analyzes chart data to suggest optimal dimensions and configuration
 */
export const analyzeDataForChartOptimization = (
  data: any[],
  chartType: string
): {
  suggestedDimensions: ChartDimensions;
  suggestedConfig: Partial<ChartConfiguration>;
} => {
  const dataPointCount = data.length;
  
  // Base dimensions calculation
  let baseWidth = 400;
  let baseHeight = 300;
  
  // Adjust dimensions based on data characteristics
  if (chartType === 'bar') {
    // For bar charts, consider the number of categories
    baseWidth = Math.max(400, Math.min(800, dataPointCount * 40));
    baseHeight = Math.max(300, 400);
  } else if (chartType === 'line' || chartType === 'area') {
    // For line charts, consider time series length
    if (dataPointCount > 50) {
      baseWidth = Math.max(600, Math.min(1200, dataPointCount * 8));
    }
  } else if (chartType === 'pie' || chartType === 'donut') {
    // Pie charts are typically square
    const size = Math.max(300, Math.min(500, 350));
    baseWidth = size;
    baseHeight = size;
  }

  const suggestedDimensions = createDefaultDimensions(baseWidth, baseHeight);
  
  const suggestedConfig: Partial<ChartConfiguration> = {
    dimensions: suggestedDimensions,
    animation: {
      enabled: dataPointCount < 1000, // Disable animation for large datasets
      duration: dataPointCount < 100 ? 1000 : 500
    }
  };

  // Add performance optimizations for large datasets
  if (dataPointCount > 1000) {
    suggestedConfig.interactions = {
      tooltip: true,
      hover: { enabled: false }, // Disable hover for performance
      zoom: { enabled: true },
      pan: { enabled: true }
    };
  }

  return {
    suggestedDimensions,
    suggestedConfig
  };
};

/**
 * Helper to create a complete chart configuration with all required fields
 */
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
// Export all utilities
// ============================================================================

export default {
  createDefaultDimensions,
  calculateInnerDimensions,
  validateAndConstrainDimensions,
  createResponsiveDimensions,
  mergeChartConfigurations,
  validateChartConfiguration,
  createChartTheme,
  analyzeDataForChartOptimization,
  createCompleteChartConfig
};