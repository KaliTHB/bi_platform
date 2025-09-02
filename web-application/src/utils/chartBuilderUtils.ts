// web-application/src/utils/chartBuilderUtils.ts
import type { ChartConfiguration, ChartDimensions } from '../types/chart.types';

export interface BuilderChart {
  id: string;
  name: string;
  type: string;
  config: ChartConfiguration;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataset_id: string;
  dataset?: {
    id: string;
    name: string;
  };
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// Convert BuilderChart to ChartContainer format
export const convertToChartContainerType = (builderChart: BuilderChart) => ({
  id: builderChart.id,
  name: builderChart.name,
  type: builderChart.type,
  config: builderChart.config,
  dataset_id: builderChart.dataset_id,
  dataset: builderChart.dataset
});

// Convert API chart to BuilderChart format
export const convertApiChartToBuilderChart = (apiChart: any): BuilderChart => ({
  id: apiChart.id,
  name: apiChart.name,
  type: apiChart.chart_type || apiChart.type,
  config: apiChart.config_json || apiChart.configuration || {},
  position: apiChart.position || { x: 0, y: 0, width: 6, height: 4 },
  dataset_id: apiChart.dataset_id,
  dataset: apiChart.dataset
});

// Generate grid layout from charts
export const generateGridLayout = (charts: BuilderChart[]): GridLayoutItem[] => 
  charts.map(chart => ({
    i: chart.id,
    x: chart.position.x,
    y: chart.position.y,
    w: chart.position.width,
    h: chart.position.height,
    minW: 2,
    minH: 2
  }));

// Update chart positions from grid layout
export const updateChartsFromLayout = (
  charts: BuilderChart[], 
  layout: GridLayoutItem[]
): BuilderChart[] => 
  charts.map(chart => {
    const layoutItem = layout.find(item => item.i === chart.id);
    if (layoutItem) {
      return {
        ...chart,
        position: {
          x: layoutItem.x,
          y: layoutItem.y,
          width: layoutItem.w,
          height: layoutItem.h
        }
      };
    }
    return chart;
  });

// Create new chart instance
export const createNewChart = (
  chartType: string, 
  dataset: { id: string; name: string; },
  availableChartTypes: any[]
): BuilderChart => {
  const chartTypeInfo = availableChartTypes.find(ct => ct.type === chartType);
  const displayName = chartTypeInfo?.name || chartType.replace(/[-_]/g, ' ');
  
  return {
    id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${displayName}`,
    type: chartType,
    config: {
      title: { text: displayName },
      animation: true,
      responsive: true,
      dimensions: {
        width: 400,
        height: 300,
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        padding: { top: 10, right: 10, bottom: 10, left: 10 }
      }
    },
    position: {
      x: 0,
      y: Infinity, // Grid layout will place at bottom
      width: 6,
      height: 4
    },
    dataset_id: dataset.id,
    dataset
  };
};

// Prepare dashboard data for API
export const prepareDashboardForSave = (
  dashboard: any,
  charts: BuilderChart[],
  layouts: { [key: string]: any[] }
) => ({
  name: dashboard.name,
  display_name: dashboard.display_name || dashboard.name,
  description: dashboard.description,
  slug: dashboard.slug,
  config_json: {
    layout_config: layouts,
    auto_refresh: { enabled: false, interval: 30 },
    export_settings: {
      include_filters: true,
      page_size: 'A4',
      orientation: 'landscape'
    },
    interaction_settings: {
      enable_cross_filtering: true,
      enable_drill_through: true,
      click_behavior: 'filter'
    },
    performance_settings: {
      lazy_loading: true,
      concurrent_chart_loads: 3,
      cache_duration: 300
    }
  },
  status: dashboard.status || 'draft',
  is_public: dashboard.is_public || false,
  is_featured: dashboard.is_featured || false,
  sort_order: dashboard.sort_order || 0,
  tags: dashboard.tags || [],
  workspace_id: dashboard.workspace_id, // Include workspace_id
  charts: charts.map(chart => ({
    id: chart.id.startsWith('chart_') ? undefined : chart.id, // Don't send temp IDs
    name: chart.name,
    chart_type: chart.type,
    config_json: chart.config,
    configuration: chart.config,
    position: chart.position,
    dataset_id: chart.dataset_id,
    dashboard_id: dashboard.id
  }))
});

// Validate chart configuration
export const validateChartConfig = (chart: BuilderChart): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!chart.name?.trim()) {
    errors.push('Chart name is required');
  }
  
  if (!chart.type?.trim()) {
    errors.push('Chart type is required');
  }
  
  if (!chart.dataset_id) {
    errors.push('Dataset is required');
  }
  
  if (chart.position.width < 2) {
    errors.push('Chart width must be at least 2 units');
  }
  
  if (chart.position.height < 2) {
    errors.push('Chart height must be at least 2 units');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};