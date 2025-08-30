// File: web-application/src/plugins/charts/factory/ChartFactory.tsx
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { CircularProgress, Alert, Box, Typography } from '@mui/material';
import { ChartProps } from '../interfaces';
import { ChartRegistry } from '../registry/ChartRegistry';
import { ChartPluginService } from '../services/ChartPluginService';

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
}

// Chart component registry for static imports
const CHART_COMPONENTS: Record<string, React.ComponentType<ChartProps>> = {
  // ECharts components
  'echarts-bar': EChartsBarChart,
  'echarts-pie': EChartsPieChart,
  'echarts-line': EChartsLineChart,
  'echarts-scatter': EChartsScatterChart,
  'echarts-heatmap': EChartsHeatmapChart,
  'echarts-gauge': EChartsGaugeChart,
  'echarts-treemap': EChartsTreemapChart,
  'echarts-sankey': EChartsSankeyChart,
  'echarts-candlestick': EChartsCandlestickChart,
  'echarts-waterfall': WaterfallChart,
  
  // D3.js components
  'd3js-calendar': CalendarHeatmap,
  'd3js-chord': ChordDiagram,
  'd3js-force': ForceDirectedGraph,
  'd3js-map': GeographicMap,
  
  // Chart.js components
  'chartjs-donut': DonutChart,
  'chartjs-radar': RadarChart,
  'chartjs-polar': PolarAreaChart,
  
  // Plotly components
  'plotly-surface': SurfaceChart,
  'plotly-contour': ContourChart,
  
  // Drilldown components
  'drilldown-bar': DrilldownBar,
  'drilldown-pie': DrilldownPie,
};

// Loading placeholder component
const ChartLoadingPlaceholder: React.FC<{ chartType: string }> = ({ chartType }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
    p={3}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="textSecondary" mt={2}>
      Loading {chartType} chart...
    </Typography>
  </Box>
);

// Error fallback component
const ChartErrorFallback: React.FC<{ error: string; chartType: string; onRetry?: () => void }> = ({ 
  error, 
  chartType, 
  onRetry 
}) => (
  <Alert 
    severity="error" 
    action={
      onRetry && (
        <button onClick={onRetry} style={{ marginLeft: '8px' }}>
          Retry
        </button>
      )
    }
  >
    <Typography variant="body2">
      Failed to load {chartType} chart: {error}
    </Typography>
  </Alert>
);

// Dynamic component loader with error handling
const useDynamicChartComponent = (chartKey: string, chartType: string) => {
  const [Component, setComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try static import first
        if (CHART_COMPONENTS[chartKey]) {
          if (mounted) {
            setComponent(() => CHART_COMPONENTS[chartKey]);
            setLoading(false);
          }
          return;
        }

        // Try plugin registry
        const pluginConfig = ChartRegistry.getPlugin(chartKey);
        if (pluginConfig?.component) {
          if (mounted) {
            setComponent(() => pluginConfig.component);
            setLoading(false);
          }
          return;
        }

        // Try service lookup
        const chartService = ChartPluginService.getInstance?.();
        if (chartService) {
          const plugin = chartService.getChart?.(chartType);
          if (plugin?.component) {
            if (mounted) {
              setComponent(() => plugin.component);
              setLoading(false);
            }
            return;
          }
        }

        // Attempt dynamic import as fallback
        try {
          const [library, type] = chartKey.split('-');
          const modulePath = `../plugins/charts/${library}/${type.charAt(0).toUpperCase() + type.slice(1)}Chart`;
          
          const dynamicImport = await import(modulePath);
          const DynamicComponent = dynamicImport.default || dynamicImport[Object.keys(dynamicImport)[0]];
          
          if (DynamicComponent && mounted) {
            setComponent(() => DynamicComponent);
            setLoading(false);
            return;
          }
        } catch (importError) {
          console.warn(`Failed to dynamically import ${chartKey}:`, importError);
        }

        // If all fails
        if (mounted) {
          setError(`Chart type "${chartType}" not found`);
          setLoading(false);
        }

      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [chartKey, chartType]);

  return { Component, loading, error };
};

export const ChartFactory: React.FC<ChartFactoryProps> = ({
  chartType,
  chartLibrary = 'echarts',
  fallbackComponent: FallbackComponent,
  onPluginLoadError,
  ...props
}) => {
  // Create chart key for component lookup
  const chartKey = chartLibrary ? `${chartLibrary}-${chartType}` : chartType;
  
  // Use dynamic component loading hook
  const { Component, loading, error } = useDynamicChartComponent(chartKey, chartType);

  // Handle plugin load errors
  useEffect(() => {
    if (error && onPluginLoadError) {
      onPluginLoadError(new Error(error));
    }
  }, [error, onPluginLoadError]);

  // Show loading state
  if (loading) {
    return <ChartLoadingPlaceholder chartType={chartType} />;
  }

  // Show error state with retry option
  if (error) {
    if (FallbackComponent) {
      return (
        <Suspense fallback={<ChartLoadingPlaceholder chartType={chartType} />}>
          <FallbackComponent {...props} />
        </Suspense>
      );
    }
    
    return (
      <ChartErrorFallback 
        error={error} 
        chartType={chartType}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Render the chart component
  if (!Component) {
    return (
      <ChartErrorFallback 
        error="Component not available" 
        chartType={chartType}
      />
    );
  }

  return (
    <Suspense fallback={<ChartLoadingPlaceholder chartType={chartType} />}>
      <Component {...props} />
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
      const registryPlugins = ChartRegistry.getAllPlugins();
      registryPlugins.forEach(plugin => {
        this.plugins.set(plugin.name, plugin);
      });

      // Load plugins from static components
      Object.entries(CHART_COMPONENTS).forEach(([key, component]) => {
        if (!this.plugins.has(key)) {
          this.plugins.set(key, {
            name: key,
            displayName: key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            component,
            library: key.split('-')[0],
            category: 'basic'
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

export default ChartFactory;