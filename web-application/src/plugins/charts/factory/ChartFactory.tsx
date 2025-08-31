// File: web-application/src/plugins/charts/factory/ChartFactory.tsx
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { CircularProgress, Alert, Box, Typography } from '@mui/material';
import { ChartProps } from '@/types/chart.types';
import { ChartRegistry } from '../registry/ChartRegistry';

// Import all chart components statically for reliability
import { BarChart as EChartsBarChart } from '../echarts/BarChart';
import { PieChart as EChartsPieChart } from '../echarts/PieChart';
import { LineChart as EChartsLineChart } from '../echarts/LineChart';
import { ScatterChart as EChartsScatterChart } from '../echarts/ScatterChart';
import { HeatmapChart as EChartsHeatmapChart } from '../echarts/HeatmapChart';
import { GaugeChart as EChartsGaugeChart } from '../echarts/GaugeChart';
import { TreemapChart as EChartsTreemapChart } from '../echarts/TreemapChart';
import { SankeyChart as EChartsSankeyChart } from '../echarts/SankeyChart';
import { CandlestickChart as EChartsCandlestickChart } from '../echarts/CandlestickChart';
import { WaterfallChart } from '../echarts/WaterfallChart';

// D3.js imports
import { CalendarHeatmap } from '../d3js/CalendarHeatmap';
import { ChordDiagram } from '../d3js/ChordDiagram';
import { ForceDirectedGraph } from '../d3js/ForceDirectedGraph';
import { GeographicMap } from '../d3js/GeographicMap';

// Chart.js imports
import { DonutChart } from '../chartjs/DonutChart';
import { RadarChart } from '../chartjs/RadarChart';
import { PolarAreaChart } from '../chartjs/PolarAreaChart';

// Plotly imports
import { SurfaceChart } from '../plotly/SurfaceChart';
import { ContourChart } from '../plotly/ContourChart';

// Drilldown imports
import { DrilldownBar } from '../drilldown/DrilldownBar';
import { DrilldownPie } from '../drilldown/DrilldownPie';

export interface ChartFactoryProps extends ChartProps {
  chartType: string;
  chartLibrary?: string;
  fallbackComponent?: React.ComponentType<ChartProps>;
  onPluginLoadError?: (error: Error) => void;
  enableDynamicLoading?: boolean;
}

interface ChartRegistration {
  component: React.ComponentType<ChartProps>;
  library: string;
  category: string;
}

// Static chart registry with all available components
const STATIC_CHART_REGISTRY: Record<string, ChartRegistration> = {
  // ECharts components
  'echarts-bar': { component: EChartsBarChart, library: 'echarts', category: 'basic' },
  'echarts-pie': { component: EChartsPieChart, library: 'echarts', category: 'basic' },
  'echarts-line': { component: EChartsLineChart, library: 'echarts', category: 'basic' },
  'echarts-scatter': { component: EChartsScatterChart, library: 'echarts', category: 'statistical' },
  'echarts-heatmap': { component: EChartsHeatmapChart, library: 'echarts', category: 'advanced' },
  'echarts-gauge': { component: EChartsGaugeChart, library: 'echarts', category: 'basic' },
  'echarts-treemap': { component: EChartsTreemapChart, library: 'echarts', category: 'advanced' },
  'echarts-sankey': { component: EChartsSankeyChart, library: 'echarts', category: 'advanced' },
  'echarts-candlestick': { component: EChartsCandlestickChart, library: 'echarts', category: 'financial' },
  'echarts-waterfall': { component: WaterfallChart, library: 'echarts', category: 'financial' },
  
  // D3.js components
  'd3js-calendar-heatmap': { component: CalendarHeatmap, library: 'd3js', category: 'advanced' },
  'd3js-chord': { component: ChordDiagram, library: 'd3js', category: 'advanced' },
  'd3js-force-graph': { component: ForceDirectedGraph, library: 'd3js', category: 'advanced' },
  'd3js-geographic-map': { component: GeographicMap, library: 'd3js', category: 'geographic' },
  
  // Chart.js components
  'chartjs-donut': { component: DonutChart, library: 'chartjs', category: 'basic' },
  'chartjs-radar': { component: RadarChart, library: 'chartjs', category: 'basic' },
  'chartjs-polar': { component: PolarAreaChart, library: 'chartjs', category: 'basic' },
  
  // Plotly components
  'plotly-surface': { component: SurfaceChart, library: 'plotly', category: 'statistical' },
  'plotly-contour': { component: ContourChart, library: 'plotly', category: 'statistical' },
  
  // Drilldown components
  'drilldown-bar': { component: DrilldownBar, library: 'drilldown', category: 'advanced' },
  'drilldown-pie': { component: DrilldownPie, library: 'drilldown', category: 'advanced' },
};

const ChartLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 200,
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading chart...
    </Typography>
  </Box>
);

const ChartErrorFallback: React.FC<{ error: string; chartType: string }> = ({ 
  error, 
  chartType 
}) => (
  <Alert 
    severity="error" 
    sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center',
      minHeight: 200 
    }}
  >
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Load Error
      </Typography>
      <Typography variant="body2">
        Failed to load chart type: <strong>{chartType}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {error}
      </Typography>
    </Box>
  </Alert>
);

export const ChartFactory: React.FC<ChartFactoryProps> = ({
  chartType,
  chartLibrary,
  fallbackComponent: FallbackComponent,
  onPluginLoadError,
  enableDynamicLoading = false,
  ...chartProps
}) => {
  const [dynamicComponent, setDynamicComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Try to get component from static registry first
  const staticChartConfig = STATIC_CHART_REGISTRY[chartType];
  
  useEffect(() => {
    // If we have a static component, use it
    if (staticChartConfig) {
      setDynamicComponent(null);
      setLoadingError(null);
      return;
    }

    // Only attempt dynamic loading if enabled and no static component found
    if (enableDynamicLoading && !staticChartConfig) {
      setIsLoading(true);
      setLoadingError(null);
      
      // Attempt dynamic import
      const loadDynamicChart = async () => {
        try {
          const chartConfig = await ChartRegistry.getChartConfig(chartType);
          if (chartConfig?.component) {
            setDynamicComponent(() => chartConfig.component);
          } else {
            throw new Error(`Chart configuration not found for type: ${chartType}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setLoadingError(errorMessage);
          onPluginLoadError?.(error instanceof Error ? error : new Error(errorMessage));
        } finally {
          setIsLoading(false);
        }
      };

      loadDynamicChart();
    } else if (!staticChartConfig) {
      // No static component and dynamic loading disabled
      setLoadingError(`Chart type '${chartType}' is not available in static registry`);
    }
  }, [chartType, enableDynamicLoading, staticChartConfig, onPluginLoadError]);

  // Show loading state
  if (isLoading) {
    return <ChartLoadingFallback />;
  }

  // Show error if component not found and no fallback
  if (loadingError && !FallbackComponent && !staticChartConfig) {
    return <ChartErrorFallback error={loadingError} chartType={chartType} />;
  }

  // Determine which component to render
  let ComponentToRender: React.ComponentType<ChartProps> | null = null;

  if (staticChartConfig) {
    ComponentToRender = staticChartConfig.component;
  } else if (dynamicComponent) {
    ComponentToRender = dynamicComponent;
  } else if (FallbackComponent) {
    ComponentToRender = FallbackComponent;
  }

  // Final fallback if no component available
  if (!ComponentToRender) {
    return (
      <ChartErrorFallback 
        error={loadingError || `No component available for chart type: ${chartType}`} 
        chartType={chartType} 
      />
    );
  }

  // Render the chart component with error boundary
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <ComponentToRender {...chartProps} />
    </Suspense>
  );
};

// Enhanced plugin service integration
export class EnhancedChartPluginService {
  private static instance: EnhancedChartPluginService;
  private plugins: Map<string, any> = new Map();
  private initialized = false;

  static getInstance(): EnhancedChartPluginService {
    if (!this.instance) {
      this.instance = new EnhancedChartPluginService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load plugins from registry
      const registryPlugins = ChartRegistry.getAvailableCharts();
      registryPlugins.forEach(chartType => {
        const registration = STATIC_CHART_REGISTRY[chartType];
        if (registration) {
          this.plugins.set(chartType, {
            name: chartType,
            displayName: chartType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            component: registration.component,
            library: registration.library,
            category: registration.category
          });
        }
      });

      // Load additional plugins from static components
      Object.entries(STATIC_CHART_REGISTRY).forEach(([key, registration]) => {
        if (!this.plugins.has(key)) {
          this.plugins.set(key, {
            name: key,
            displayName: key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            component: registration.component,
            library: registration.library,
            category: registration.category
          });
        }
      });

      this.initialized = true;
      console.log('Enhanced Chart Plugin Service initialized with', this.plugins.size, 'plugins');
    } catch (error) {
      console.error('Failed to initialize Enhanced Chart Plugin Service:', error);
      throw error;
    }
  }

  getChart(name: string): any {
    return this.plugins.get(name);
  }

  getAllCharts(): any[] {
    return Array.from(this.plugins.values());
  }

  getChartsByCategory(category: string): any[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.category === category
    );
  }

  getChartsByLibrary(library: string): any[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.library === library
    );
  }

  getChartCategories(): string[] {
    const categories = new Set<string>();
    this.plugins.forEach(plugin => {
      if (plugin.category) categories.add(plugin.category);
    });
    return Array.from(categories);
  }

  getChartLibraries(): string[] {
    const libraries = new Set<string>();
    this.plugins.forEach(plugin => {
      if (plugin.library) libraries.add(plugin.library);
    });
    return Array.from(libraries);
  }

  searchCharts(query: string): any[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.displayName?.toLowerCase().includes(lowercaseQuery) ||
      plugin.name?.toLowerCase().includes(lowercaseQuery) ||
      plugin.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  validateChartConfig(chartName: string, config: any): { valid: boolean; errors: string[] } {
    const plugin = this.getChart(chartName);
    if (!plugin) {
      return { valid: false, errors: [`Chart "${chartName}" not found`] };
    }

    // Basic validation - extend as needed
    return { valid: true, errors: [] };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export { EnhancedChartPluginService };
export default ChartFactory;