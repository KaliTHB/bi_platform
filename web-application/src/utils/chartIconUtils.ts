// src/utils/chartIconUtils.ts - Common Chart Icon Utilities

import React from 'react';
import {
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Timeline as TimelineIcon,
  DonutLarge as DonutLargeIcon,
  TableChart as TableChartIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  BubbleChart as BubbleChartIcon,
  HelpOutline as HelpOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Warning as WarningIcon,
  InsertChart as DefaultChartIcon
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import type { Chart } from '@/types/chart.types';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ChartIconOptions {
  size?: 'inherit' | 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'action' | 'disabled' | 'error';
  showTooltip?: boolean;
  tooltipTitle?: string;
  fallbackStrategy?: 'help' | 'error' | 'default' | 'warning';
  className?: string;
  style?: React.CSSProperties;
}

export interface ChartTypeIconMap {
  [library: string]: {
    [type: string]: React.ComponentType<any>;
  };
}

// =============================================================================
// Icon Mappings
// =============================================================================

const CHART_ICON_MAP: ChartTypeIconMap = {
  echarts: {
    bar: BarChartIcon,
    column: BarChartIcon,
    line: LineChartIcon,
    area: TimelineIcon,
    pie: PieChartIcon,
    doughnut: DonutLargeIcon,
    donut: DonutLargeIcon,
    scatter: ScatterPlotIcon,
    bubble: BubbleChartIcon,
    table: TableChartIcon,
    metric: TrendingUpIcon,
    gauge: AssessmentIcon,
    funnel: AssessmentIcon,
    treemap: AssessmentIcon,
    heatmap: AssessmentIcon,
    radar: AssessmentIcon,
    sankey: AssessmentIcon,
    waterfall: BarChartIcon,
    candlestick: LineChartIcon,
    boxplot: AssessmentIcon,
    histogram: BarChartIcon,
    timeline: TimelineIcon,
    gantt: TableChartIcon
  },
  plotly: {
    bar: BarChartIcon,
    line: LineChartIcon,
    scatter: ScatterPlotIcon,
    pie: PieChartIcon,
    heatmap: AssessmentIcon,
    surface: AssessmentIcon,
    mesh: AssessmentIcon,
    contour: AssessmentIcon,
    violin: AssessmentIcon,
    funnel: AssessmentIcon,
    waterfall: BarChartIcon,
    sunburst: PieChartIcon,
    treemap: AssessmentIcon
  },
  d3: {
    bar: BarChartIcon,
    line: LineChartIcon,
    pie: PieChartIcon,
    scatter: ScatterPlotIcon,
    force: BubbleChartIcon,
    tree: AssessmentIcon,
    chord: AssessmentIcon,
    sankey: AssessmentIcon,
    hierarchy: AssessmentIcon,
    geographic: AssessmentIcon,
    network: BubbleChartIcon
  },
  chartjs: {
    bar: BarChartIcon,
    line: LineChartIcon,
    pie: PieChartIcon,
    doughnut: DonutLargeIcon,
    radar: AssessmentIcon,
    polar: AssessmentIcon,
    bubble: BubbleChartIcon,
    scatter: ScatterPlotIcon,
    mixed: DefaultChartIcon
  },
  'material-ui': {
    table: TableChartIcon,
    metric: TrendingUpIcon
  }
};

const FALLBACK_ICONS = {
  help: HelpOutlineIcon,
  error: ErrorOutlineIcon,
  warning: WarningIcon,
  default: DefaultChartIcon
};

// =============================================================================
// Core Utility Functions
// =============================================================================

/**
 * Safely extracts chart type from Chart object
 */
export const getChartTypeForIcon = (chart: Chart): string => {
  return chart.chart_type || chart.type || 'bar';
};

/**
 * Safely extracts chart library from Chart object
 */
export const getChartLibraryForIcon = (chart: Chart): string => {
  return chart.chart_library || 'echarts';
};

/**
 * Gets the appropriate icon component for a chart type and library
 */
export const getChartIconComponent = (
  chartType: string, 
  chartLibrary: string
): React.ComponentType<any> => {
  try {
    const libraryMap = CHART_ICON_MAP[chartLibrary?.toLowerCase()];
    if (libraryMap) {
      const IconComponent = libraryMap[chartType?.toLowerCase()];
      if (IconComponent) {
        return IconComponent;
      }
    }
    
    // Try to find the chart type in any library as fallback
    for (const [, typeMap] of Object.entries(CHART_ICON_MAP)) {
      const IconComponent = typeMap[chartType?.toLowerCase()];
      if (IconComponent) {
        return IconComponent;
      }
    }
    
    return FALLBACK_ICONS.default;
  } catch (error) {
    console.warn('Error getting chart icon component:', error);
    return FALLBACK_ICONS.error;
  }
};

// =============================================================================
// Main Chart Icon Rendering Function
// =============================================================================

/**
 * Renders a chart icon with comprehensive error handling and fallbacks
 * 
 * @param chart - Chart object (can have optional properties)
 * @param options - Rendering options
 * @returns JSX element with chart icon
 */
export const renderChartIcon = (
  chart: Chart, 
  options: ChartIconOptions = {}
): React.ReactElement => {
  const {
    size = 'medium',
    color = 'inherit',
    showTooltip = false,
    tooltipTitle,
    fallbackStrategy = 'default',
    className,
    style
  } = options;

  try {
    // Safely extract chart properties
    const chartType = getChartTypeForIcon(chart);
    const chartLibrary = getChartLibraryForIcon(chart);

    // Validate extracted values
    if (!chartType || !chartLibrary) {
      console.warn('Invalid chart type or library:', { chartType, chartLibrary, chartId: chart.id });
      const FallbackIcon = FALLBACK_ICONS[fallbackStrategy];
      return (
        <FallbackIcon 
          fontSize={size} 
          color={color}
          className={className}
          style={style}
        />
      );
    }

    // Get the appropriate icon component
    const IconComponent = getChartIconComponent(chartType, chartLibrary);
    
    // Create the icon element
    const iconElement = (
      <IconComponent 
        fontSize={size} 
        color={color}
        className={className}
        style={style}
      />
    );

    // Wrap with tooltip if requested
    if (showTooltip) {
      const title = tooltipTitle || 
        `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart (${chartLibrary})`;
      
      return (
        <Tooltip title={title} arrow>
          <span>{iconElement}</span>
        </Tooltip>
      );
    }

    return iconElement;

  } catch (error) {
    console.error('Error rendering chart icon:', {
      error,
      chartId: chart.id,
      chartType: chart.chart_type,
      chartLibrary: chart.chart_library
    });
    
    const ErrorIcon = FALLBACK_ICONS.error;
    const errorElement = (
      <ErrorIcon 
        fontSize={size} 
        color="error"
        className={className}
        style={style}
      />
    );

    if (showTooltip) {
      return (
        <Tooltip title="Error loading chart icon" arrow>
          <span>{errorElement}</span>
        </Tooltip>
      );
    }

    return errorElement;
  }
};

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Renders a chart icon with tooltip
 */
export const renderChartIconWithTooltip = (
  chart: Chart, 
  options: Omit<ChartIconOptions, 'showTooltip'> = {}
): React.ReactElement => {
  return renderChartIcon(chart, { ...options, showTooltip: true });
};

/**
 * Renders a small chart icon
 */
export const renderSmallChartIcon = (
  chart: Chart, 
  options: Omit<ChartIconOptions, 'size'> = {}
): React.ReactElement => {
  return renderChartIcon(chart, { ...options, size: 'small' });
};

/**
 * Renders a large chart icon
 */
export const renderLargeChartIcon = (
  chart: Chart, 
  options: Omit<ChartIconOptions, 'size'> = {}
): React.ReactElement => {
  return renderChartIcon(chart, { ...options, size: 'large' });
};

/**
 * Renders a chart icon for list items (small with tooltip)
 */
export const renderListChartIcon = (chart: Chart): React.ReactElement => {
  return renderChartIcon(chart, {
    size: 'small',
    showTooltip: true,
    fallbackStrategy: 'help'
  });
};

/**
 * Renders a chart icon for card headers (medium with tooltip)
 */
export const renderCardChartIcon = (chart: Chart): React.ReactElement => {
  return renderChartIcon(chart, {
    size: 'medium',
    showTooltip: true,
    color: 'primary'
  });
};

/**
 * Batch render multiple chart icons (for performance)
 */
export const renderMultipleChartIcons = (
  charts: Chart[],
  options: ChartIconOptions = {}
): React.ReactElement[] => {
  return charts.map((chart, index) => (
    <React.Fragment key={chart.id || index}>
      {renderChartIcon(chart, options)}
    </React.Fragment>
  ));
};

// =============================================================================
// Utility Functions for Chart Information
// =============================================================================

/**
 * Gets display-friendly chart type name
 */
export const getChartTypeDisplayName = (chart: Chart): string => {
  const type = getChartTypeForIcon(chart);
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ');
};

/**
 * Gets display-friendly chart library name
 */
export const getChartLibraryDisplayName = (chart: Chart): string => {
  const library = getChartLibraryForIcon(chart);
  const displayNames: { [key: string]: string } = {
    'echarts': 'ECharts',
    'plotly': 'Plotly',
    'd3': 'D3.js',
    'chartjs': 'Chart.js',
    'material-ui': 'Material-UI'
  };
  return displayNames[library] || library.charAt(0).toUpperCase() + library.slice(1);
};

/**
 * Checks if a chart type is supported by a library
 */
export const isChartTypeSupported = (chartType: string, chartLibrary: string): boolean => {
  const libraryMap = CHART_ICON_MAP[chartLibrary?.toLowerCase()];
  return !!(libraryMap && libraryMap[chartType?.toLowerCase()]);
};

/**
 * Gets all supported chart types for a library
 */
export const getSupportedChartTypes = (chartLibrary: string): string[] => {
  const libraryMap = CHART_ICON_MAP[chartLibrary?.toLowerCase()];
  return libraryMap ? Object.keys(libraryMap) : [];
};

/**
 * Gets all available chart libraries
 */
export const getAvailableChartLibraries = (): string[] => {
  return Object.keys(CHART_ICON_MAP);
};

// =============================================================================
// React Hook for Chart Icons
// =============================================================================

/**
 * React hook for chart icon rendering with memoization
 */
export const useChartIcon = (
  chart: Chart, 
  options: ChartIconOptions = {}
): React.ReactElement => {
  return React.useMemo(() => {
    return renderChartIcon(chart, options);
  }, [
    chart.id,
    chart.chart_type,
    chart.type,
    chart.chart_library,
    options.size,
    options.color,
    options.showTooltip,
    options.fallbackStrategy
  ]);
};

export default {
  renderChartIcon,
  renderChartIconWithTooltip,
  renderSmallChartIcon,
  renderLargeChartIcon,
  renderListChartIcon,
  renderCardChartIcon,
  getChartTypeDisplayName,
  getChartLibraryDisplayName,
  isChartTypeSupported,
  getSupportedChartTypes,
  getAvailableChartLibraries,
  useChartIcon
};