// web-application/src/plugins/charts/utils/chartThemeUtils.ts
// Complete Chart Theme Utilities

import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  BarChart,
  PieChart,
  ShowChart,
  Timeline,
  BubbleChart,
  DonutLarge,
  ScatterPlot,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Refresh,
  FileCopy,
} from '@mui/icons-material';

import { ChartTheme } from '@/types/chart.types';

// web-application/src/plugins/charts/utils/chartThemeUtils.ts
// Complete Chart Theme Utilities - NO JSX, TS COMPATIBLE

import { ChartTheme } from '@/types/chart.types';

/**
 * Get chart icon component reference (not JSX) based on type and library
 */
export const getChartIconName = (type: string, library: string): string => {
  const key = `${library}-${type}`;
  switch (key) {
    case 'echarts-bar': return 'BarChart';
    case 'echarts-pie': return 'PieChart';
    case 'echarts-line': return 'ShowChart';
    case 'echarts-scatter': return 'BubbleChart';
    case 'echarts-area': return 'Timeline';
    case 'd3js-network': return 'ScatterPlot';
    case 'drilldown-pie': return 'DonutLarge';
    default: return 'BarChart';
  }
};

/**
 * Get chart icon props for Material-UI icons
 */
export const getChartIconProps = (type: string, library: string) => {
  return {
    iconName: getChartIconName(type, library),
    color: getLibraryColor(library)
  };
};

/**
 * Get library-specific color
 */
export const getLibraryColor = (library: string) => {
  switch (library) {
    case 'echarts': return 'primary';
    case 'd3js': return 'secondary';
    case 'plotly': return 'info';
    case 'chartjs': return 'success';
    case 'drilldown': return 'warning';
    default: return 'default';
  }
};

/**
 * Create default light theme
 */
export const createLightTheme = (): ChartTheme => ({
  colors: {
    primary: [
      '#1976d2', '#dc004e', '#388e3c', '#f57c00',
      '#7b1fa2', '#c62828', '#00796b', '#f9a825'
    ],
    text: '#333333',
    background: '#ffffff',
    grid: '#e0e0e0',
    axis: '#666666'
  },
  fonts: {
    family: 'Roboto, Arial, sans-serif',
    sizes: {
      title: 16,
      subtitle: 14,
      axis: 12,
      legend: 12,
      tooltip: 11
    }
  }
});

/**
 * Create default dark theme
 */
export const createDarkTheme = (): ChartTheme => ({
  colors: {
    primary: [
      '#90caf9', '#f48fb1', '#a5d6a7', '#ffcc02',
      '#ce93d8', '#ef9a9a', '#80cbc4', '#fff59d'
    ],
    text: '#ffffff',
    background: '#121212',
    grid: '#333333',
    axis: '#aaaaaa'
  },
  fonts: {
    family: 'Roboto, Arial, sans-serif',
    sizes: {
      title: 16,
      subtitle: 14,
      axis: 12,
      legend: 12,
      tooltip: 11
    }
  }
});

/**
 * Get theme by name
 */
export const getTheme = (themeName: 'light' | 'dark' = 'light'): ChartTheme => {
  return themeName === 'dark' ? createDarkTheme() : createLightTheme();
};

/**
 * Merge theme with overrides
 */
export const mergeTheme = (baseTheme: ChartTheme, overrides: Partial<ChartTheme>): ChartTheme => {
  return {
    colors: {
      ...baseTheme.colors,
      ...overrides.colors,
      primary: overrides.colors?.primary || baseTheme.colors.primary
    },
    fonts: {
      ...baseTheme.fonts,
      ...overrides.fonts,
      sizes: {
        ...baseTheme.fonts.sizes,
        ...overrides.fonts?.sizes
      }
    }
  };
};

/**
 * Convert theme to ECharts format
 */
export const convertThemeForECharts = (theme: ChartTheme): any => ({
  color: theme.colors.primary,
  backgroundColor: theme.colors.background,
  textStyle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.family
  },
  title: {
    textStyle: {
      color: theme.colors.text,
      fontFamily: theme.fonts.family,
      fontSize: theme.fonts.sizes.title
    }
  },
  legend: {
    textStyle: {
      color: theme.colors.text,
      fontFamily: theme.fonts.family,
      fontSize: theme.fonts.sizes.legend
    }
  },
  tooltip: {
    backgroundColor: theme.colors.background,
    textStyle: {
      color: theme.colors.text,
      fontFamily: theme.fonts.family,
      fontSize: theme.fonts.sizes.tooltip
    }
  }
});

/**
 * Convert theme to Chart.js format
 */
export const convertThemeForChartJS = (theme: ChartTheme): any => ({
  plugins: {
    legend: {
      labels: {
        color: theme.colors.text,
        font: {
          family: theme.fonts.family,
          size: theme.fonts.sizes.legend
        }
      }
    },
    tooltip: {
      backgroundColor: theme.colors.background,
      titleColor: theme.colors.text,
      bodyColor: theme.colors.text,
      titleFont: {
        family: theme.fonts.family,
        size: theme.fonts.sizes.tooltip
      },
      bodyFont: {
        family: theme.fonts.family,
        size: theme.fonts.sizes.tooltip
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: theme.colors.text,
        font: {
          family: theme.fonts.family,
          size: theme.fonts.sizes.axis
        }
      },
      grid: {
        color: theme.colors.grid
      }
    },
    y: {
      ticks: {
        color: theme.colors.text,
        font: {
          family: theme.fonts.family,
          size: theme.fonts.sizes.axis
        }
      },
      grid: {
        color: theme.colors.grid
      }
    }
  }
});

/**
 * Get color palette from theme
 */
export const getColorPalette = (theme: ChartTheme, count: number = 8): string[] => {
  const colors = theme.colors.primary;
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

/**
 * Validate theme structure
 */
export const validateTheme = (theme: any): theme is ChartTheme => {
  return (
    theme &&
    theme.colors &&
    Array.isArray(theme.colors.primary) &&
    typeof theme.colors.text === 'string' &&
    typeof theme.colors.background === 'string' &&
    theme.fonts &&
    typeof theme.fonts.family === 'string' &&
    theme.fonts.sizes &&
    typeof theme.fonts.sizes.title === 'number'
  );
};

export default {
  getChartIconName,
  getChartIconProps,
  getLibraryColor,
  createLightTheme,
  createDarkTheme,
  getTheme,
  mergeTheme,
  convertThemeForECharts,
  convertThemeForChartJS,
  getColorPalette,
  validateTheme
};