import React, { Suspense, useState, useEffect } from 'react';
import { Alert, Box, Typography, CircularProgress } from '@mui/material';
import { ChartRegistry } from '../registry/ChartRegistry';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ChartProps {
  data: any[];
  config: any;
  dimensions: {
    width: string | number;
    height: string | number;
  };
  theme?: any;
  onError?: (error: Error) => void;
  onInteraction?: (event: any) => void;
}

export interface ChartFactoryProps extends ChartProps {
  chartType: string;
  chartLibrary: string;
  fallbackComponent?: React.ComponentType<ChartProps>;
  onPluginLoadError?: (error: Error) => void;
  enableDynamicLoading?: boolean;
}

export interface StaticChartRegistration {
  component: React.ComponentType<ChartProps>;
  library: string;
  category: string;
  displayName?: string;
  description?: string;
}

export interface ChartPluginInfo {
  name: string;
  displayName: string;
  library: string;
  category: string;
  component: React.ComponentType<ChartProps>;
  version?: string;
  description?: string;
}

// ============================================================================
// Static Chart Registry (File-Based Plugins)
// ============================================================================

// Placeholder components - replace with actual implementations
const EChartsBarChart: React.FC<ChartProps> = ({ data, config, dimensions, onError }) => {
  return (
    <Box 
      sx={{ 
        width: dimensions.width, 
        height: dimensions.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #1976d2',
        borderRadius: 1,
        bgcolor: '#f3f4f6'
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" color="primary">📊 ECharts Bar Chart</Typography>
        <Typography variant="caption" color="text.secondary">
          {data?.length || 0} rows • {Object.keys(config || {}).length} config options
        </Typography>
      </Box>
    </Box>
  );
};

const EChartsLineChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #2196f3', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">📈 ECharts Line Chart</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const EChartsPieChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #4caf50', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">🥧 ECharts Pie Chart</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const EChartsScatterChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ff9800', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">📍 ECharts Scatter Plot</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const EChartsAreaChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #9c27b0', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">📊 ECharts Area Chart</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const ChartJsDonutChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e91e63', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">🍩 Chart.js Donut Chart</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const ChartJsRadarChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #00bcd4', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">🎯 Chart.js Radar Chart</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

const ChartJsPolarChart: React.FC<ChartProps> = ({ data, config, dimensions }) => (
  <Box sx={{ width: dimensions.width, height: dimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #607d8b', borderRadius: 1, bgcolor: '#f3f4f6' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" color="primary">🌐 Chart.js Polar Area</Typography>
      <Typography variant="caption" color="text.secondary">{data?.length || 0} rows</Typography>
    </Box>
  </Box>
);

// ============================================================================
// Static Chart Registry (File-Based Plugins at Compile Time)
// ============================================================================

const STATIC_CHART_REGISTRY: Record<string, StaticChartRegistration> = {
  // ECharts family
  'echarts-bar': {
    component: EChartsBarChart,
    library: 'echarts',
    category: 'basic',
    displayName: 'Bar Chart',
    description: 'Basic bar chart for comparing categories'
  },
  'echarts-line': {
    component: EChartsLineChart,
    library: 'echarts',
    category: 'basic',
    displayName: 'Line Chart',
    description: 'Line chart for showing trends over time'
  },
  'echarts-pie': {
    component: EChartsPieChart,
    library: 'echarts',
    category: 'basic',
    displayName: 'Pie Chart',
    description: 'Pie chart for showing proportions'
  },
  'echarts-scatter': {
    component: EChartsScatterChart,
    library: 'echarts',
    category: 'statistical',
    displayName: 'Scatter Plot',
    description: 'Scatter plot for correlation analysis'
  },
  'echarts-area': {
    component: EChartsAreaChart,
    library: 'echarts',
    category: 'basic',
    displayName: 'Area Chart',
    description: 'Area chart for showing cumulative values'
  },

  // Chart.js family
  'chartjs-donut': {
    component: ChartJsDonutChart,
    library: 'chartjs',
    category: 'basic',
    displayName: 'Donut Chart',
    description: 'Donut chart with center content'
  },
  'chartjs-radar': {
    component: ChartJsRadarChart,
    library: 'chartjs',
    category: 'basic',
    displayName: 'Radar Chart',
    description: 'Radar chart for multi-dimensional data'
  },
  'chartjs-polar': {
    component: ChartJsPolarChart,
    library: 'chartjs',
    category: 'basic',
    displayName: 'Polar Area Chart',
    description: 'Polar area chart for circular data'
  },

  // Add more chart types here as needed
  // 'd3-network': { component: D3NetworkChart, library: 'd3', category: 'advanced' },
  // 'plotly-3d': { component: Plotly3DChart, library: 'plotly', category: 'advanced' },
};

// ============================================================================
// Fallback Components
// ============================================================================

const ChartLoadingFallback: React.FC = () => (
  <Box display="flex" alignItems="center" justifyContent="center" height="100%" minHeight={200}>
    <Box textAlign="center">
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Loading chart...
      </Typography>
    </Box>
  </Box>
);

const ChartErrorFallback: React.FC<{ error: string; chartType: string }> = ({ error, chartType }) => (
  <Alert severity="error" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Failed to load chart: <strong>{chartType}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {error}
      </Typography>
    </Box>
  </Alert>
);

// ============================================================================
// Enhanced Chart Plugin Service
// ============================================================================

export class EnhancedChartPluginService {
  private static instance: EnhancedChartPluginService;
  private plugins: Map<string, ChartPluginInfo> = new Map();
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
      // Load plugins from static registry
      Object.entries(STATIC_CHART_REGISTRY).forEach(([key, registration]) => {
        // Create chart key from library and type
        const [library, type] = this.parseChartKey(key);
        
        this.plugins.set(key, {
          name: type,
          displayName: registration.displayName || this.formatDisplayName(type),
          component: registration.component,
          library: registration.library,
          category: registration.category,
          description: registration.description
        });
      });

      // Load additional plugins from ChartRegistry if available
      try {
        const registryPlugins = ChartRegistry.getAvailableCharts();
        for (const chartType of registryPlugins) {
          const chartConfig = ChartRegistry.getChartConfig(chartType);
          if (chartConfig && !this.plugins.has(chartType)) {
            this.plugins.set(chartType, {
              name: chartConfig.name,
              displayName: chartConfig.displayName,
              component: chartConfig.component,
              library: chartConfig.library,
              category: chartConfig.category,
              description: chartConfig.description
            });
          }
        }
      } catch (error) {
        console.warn('ChartRegistry not available, using static registry only:', error);
      }

      this.initialized = true;
      console.log('Enhanced Chart Plugin Service initialized with', this.plugins.size, 'plugins');
    } catch (error) {
      console.error('Failed to initialize Enhanced Chart Plugin Service:', error);
      throw error;
    }
  }

  private parseChartKey(key: string): [string, string] {
    const parts = key.split('-');
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join('-')];
    }
    return ['unknown', key];
  }

  private formatDisplayName(type: string): string {
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getChart(chartKey: string): ChartPluginInfo | undefined {
    return this.plugins.get(chartKey);
  }

  getChartByTypeAndLibrary(type: string, library: string): ChartPluginInfo | undefined {
    const chartKey = `${library}-${type}`;
    return this.plugins.get(chartKey);
  }

  getAllCharts(): ChartPluginInfo[] {
    return Array.from(this.plugins.values());
  }

  getChartsByCategory(category: string): ChartPluginInfo[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.category === category
    );
  }

  getChartsByLibrary(library: string): ChartPluginInfo[] {
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

  isChartSupported(type: string, library: string): boolean {
    const chartKey = `${library}-${type}`;
    return this.plugins.has(chartKey);
  }

  searchCharts(query: string): ChartPluginInfo[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.displayName?.toLowerCase().includes(lowercaseQuery) ||
      plugin.name?.toLowerCase().includes(lowercaseQuery) ||
      plugin.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  validateChartConfig(chartType: string, config: any): { valid: boolean; errors: string[] } {
    const chartKey = Object.keys(STATIC_CHART_REGISTRY).find(key => 
      key.endsWith(`-${chartType}`)
    );
    
    if (!chartKey) {
      return { valid: false, errors: [`Chart "${chartType}" not found`] };
    }

    // Basic validation - extend as needed with JSON schema
    const errors: string[] = [];
    
    if (config && typeof config !== 'object') {
      errors.push('Configuration must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Chart Factory Component (React Component)
// ============================================================================

export const ChartFactoryComponent: React.FC<ChartFactoryProps> = ({
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
  const chartKey = `${chartLibrary}-${chartType}`;
  const staticChartConfig = STATIC_CHART_REGISTRY[chartKey];
  
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
  }, [chartType, chartLibrary, enableDynamicLoading, staticChartConfig, onPluginLoadError]);

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

// ============================================================================
// Chart Factory Class (Static Methods for API Compatibility)
// ============================================================================

export class ChartFactory {
  private static pluginService: EnhancedChartPluginService | null = null;
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.pluginService = EnhancedChartPluginService.getInstance();
    await this.pluginService.initialize();
    this.initialized = true;
  }

  /**
   * Create a chart React element dynamically
   * This method supports the interface expected by ChartBuilder
   */
  static createChart(
    type: string,
    library: string,
    props: {
      data: any[];
      config: any;
      dimensions: { width: string | number; height: string | number };
      onError?: (error: Error) => void;
      onInteraction?: (event: any) => void;
    }
  ): React.ReactElement {
    // Lazy initialize if not already done
    if (!this.pluginService) {
      this.pluginService = EnhancedChartPluginService.getInstance();
      // Note: async initialization will happen in background
    }

    // Try to find the chart in static registry first (immediate lookup)
    const chartKey = `${library}-${type}`;
    const staticChart = STATIC_CHART_REGISTRY[chartKey];

    if (staticChart) {
      // Create React element from static component
      return React.createElement(staticChart.component, {
        key: `${chartKey}-${Date.now()}`,
        ...props
      });
    }

    // Try to find chart in plugin service (if initialized)
    if (this.pluginService) {
      const pluginChart = this.pluginService.getChartByTypeAndLibrary(type, library);
      
      if (pluginChart) {
        return React.createElement(pluginChart.component, {
          key: `${chartKey}-${Date.now()}`,
          ...props
        });
      }
    }

    // Return error component if chart not found
    return React.createElement(ChartErrorFallback, {
      key: `error-${chartKey}`,
      error: `Chart type '${type}' not found for library '${library}'. Available: ${Object.keys(STATIC_CHART_REGISTRY).join(', ')}`,
      chartType: `${library}.${type}`
    });
  }

  /**
   * Get chart information
   */
  static getChartInfo(type: string, library: string): ChartPluginInfo | null {
    if (!this.pluginService) {
      this.pluginService = EnhancedChartPluginService.getInstance();
    }
    
    return this.pluginService.getChartByTypeAndLibrary(type, library) || null;
  }

  /**
   * Get available chart types for a library
   */
  static getChartTypes(library: string): ChartPluginInfo[] {
    if (!this.pluginService) {
      this.pluginService = EnhancedChartPluginService.getInstance();
    }
    
    return this.pluginService.getChartsByLibrary(library);
  }

  /**
   * Get all available charts with lazy initialization
   */
  static getAllCharts(): ChartPluginInfo[] {
    // Return static charts immediately, plugin service charts when available
    const staticCharts: ChartPluginInfo[] = Object.entries(STATIC_CHART_REGISTRY).map(([key, registration]) => {
      const [library, type] = key.includes('-') ? key.split('-', 2) : ['unknown', key];
      return {
        name: type,
        displayName: registration.displayName || type.replace(/\b\w/g, l => l.toUpperCase()),
        component: registration.component,
        library: registration.library,
        category: registration.category,
        description: registration.description
      };
    });

    // Add plugin service charts if available
    if (this.pluginService && this.pluginService.isInitialized()) {
      try {
        const pluginCharts = this.pluginService.getAllCharts();
        // Merge and deduplicate
        const allCharts = [...staticCharts];
        pluginCharts.forEach(plugin => {
          if (!allCharts.some(chart => chart.name === plugin.name && chart.library === plugin.library)) {
            allCharts.push(plugin);
          }
        });
        return allCharts;
      } catch (error) {
        console.warn('Error getting plugin service charts:', error);
      }
    }

    return staticCharts;
  }

  /**
   * Get available categories with lazy initialization
   */
  static getCategories(): string[] {
    const staticCategories = new Set(Object.values(STATIC_CHART_REGISTRY).map(reg => reg.category));
    
    // Add plugin service categories if available
    if (this.pluginService && this.pluginService.isInitialized()) {
      try {
        const pluginCategories = this.pluginService.getChartCategories();
        pluginCategories.forEach(cat => staticCategories.add(cat));
      } catch (error) {
        console.warn('Error getting plugin service categories:', error);
      }
    }

    return Array.from(staticCategories);
  }

  /**
   * Search charts by query
   */
  static searchCharts(query: string): ChartPluginInfo[] {
    if (!this.pluginService) {
      this.pluginService = EnhancedChartPluginService.getInstance();
    }
    
    return this.pluginService.searchCharts(query);
  }

  /**
   * Validate chart configuration
   */
  static validateConfig(type: string, library: string, config: any): { valid: boolean; errors: string[] } {
    if (!this.pluginService) {
      this.pluginService = EnhancedChartPluginService.getInstance();
    }
    
    return this.pluginService.validateChartConfig(type, config);
  }
}

// ============================================================================
// Initialize Plugin Service on Module Load
// ============================================================================

// Auto-initialize when module is imported
ChartFactory.initialize().catch(error => {
  console.error('Failed to initialize ChartFactory:', error);
});

// ============================================================================
// Exports
// ============================================================================

// Main export - ChartFactory class with static methods
export { ChartFactory };

// Also export the React component for direct JSX usage
export { ChartFactoryComponent };

// Export the service for advanced usage
export { EnhancedChartPluginService };

// Export types
export type { ChartProps, ChartFactoryProps, StaticChartRegistration, ChartPluginInfo };

// Default export
export default ChartFactory;