// web-application/src/utils/chartDisplayUtils.ts
// Utility functions for displaying chart information safely

import type { Chart } from '@/types/chart.types';
import { getChartLibraryDisplayName, getChartTypeDisplayName } from './chartIconUtils';

/**
 * Safely extracts and formats chart display information
 */
export const getChartDisplayInfo = (chart: Chart) => {
  return {
    name: chart.display_name || chart.name || 'Untitled Chart',
    description: chart.description || 'No description available',
    type: chart.chart_type || 'Unknown',
    library:  chart.chart_library || 'Unknown',
    category: chart.chart_category || 'Uncategorized',
    updatedAt: chart.updated_at || chart.created_at || '',
    createdBy: chart.created_by || 'Unknown',
    isActive: chart.is_active ?? true,
  };
};

/**
 * Gets unique values from an array of charts for filtering
 */
export const getUniqueChartValues = (charts: Chart[]) => {
  const types = new Set<string>();
  const libraries = new Set<string>();
  const categories = new Set<string>();

  charts.forEach(chart => {
    if ( chart.chart_type) {
      types.add( chart.chart_type || '');
    }
    if (chart.chart_library) {
      libraries.add( chart.chart_library || '');
    }
    if (chart.chart_category) {
      categories.add(chart.chart_category);
    }
  });

  return {
    types: Array.from(types).filter(Boolean).sort(),
    libraries: Array.from(libraries).filter(Boolean).sort(),
    categories: Array.from(categories).filter(Boolean).sort(),
  };
};

/**
 * Safely formats chart type for display
 */
export const formatChartType = (type: string | undefined): string => {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ');
};

/**
 * Safely formats chart library for display
 */
export const formatChartLibrary = (library: string | undefined): string => {
  if (!library) return 'Unknown';
  
  const displayNames: { [key: string]: string } = {
    'echarts': 'ECharts',
    'plotly': 'Plotly',
    'd3': 'D3.js',
    'd3js': 'D3.js',
    'chartjs': 'Chart.js',
    'material-ui': 'Material-UI',
    'drilldown': 'Drilldown'
  };
  
  return displayNames[library.toLowerCase()] || 
         library.charAt(0).toUpperCase() + library.slice(1);
};

/**
 * Safely formats chart category for display
 */
export const formatChartCategory = (category: string | undefined): string => {
  if (!category) return 'Uncategorized';
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/[-_]/g, ' ');
};