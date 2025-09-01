import React, { Suspense, useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ChartProps, ChartPluginConfig, ChartData } from '@/types/chart.types';
import { ChartRegistry } from '../registry/ChartRegistry';

// ============================================================================
// Additional Interfaces for ChartFactory
// ============================================================================

interface ChartFactoryProps extends ChartProps {
  chartType: string;
  chartLibrary: string;
  enableDynamicLoading?: boolean;
  FallbackComponent?: React.ComponentType<ChartProps>;
  onPluginLoadError?: (error: Error) => void;
}

interface StaticChartRegistration {
  displayName: string;
  component: React.ComponentType<ChartProps>;
  library: string;
  category: string;
  description?: string;
}

interface ChartPluginInfo {
  name: string;
  displayName?: string;
  component: React.ComponentType<ChartProps>;
  library: string;
  category: string;
  description?: string;
  version?: string;
}

// ============================================================================
// Static Chart Registry (Fallback)
// ============================================================================

const STATIC_CHART_REGISTRY: Record<string, StaticChartRegistration> = {
  // Fallback registry for essential charts
  'echarts-bar': {
    displayName: 'Bar Chart',
    component: React.lazy(() => import('../echarts/BarChart').then(m => ({ default: m.BarChart }))),
    library: 'echarts',
    category: 'basic',
    description: 'Basic bar chart visualization'
  }
};

// ============================================================================
// Loading and Error Components
// ============================================================================

const ChartLoadingFallback: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    minHeight={200}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Loading chart...
    </Typography>
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
// Chart Factory Component
// ============================================================================

const ChartFactoryComponent: React.FC<ChartFactoryProps> = ({
  chartType,
  chartLibrary,
  enableDynamicLoading = true,
  FallbackComponent,
  onPluginLoadError,
  ...chartProps
}) => {
  const [dynamicComponent, setDynamicComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Check static registry first
  const chartKey = `${chartLibrary}-${chartType}`;
  const staticChartConfig = STATIC_CHART_REGISTRY[chartKey];

  useEffect(() => {
    // If static component exists and dynamic loading is disabled, use static
    if (staticChartConfig && !enableDynamicLoading) {
      return;
    }

    // Try to load component dynamically
    if (enableDynamicLoading) {
      const loadDynamicChart = async () => {
        setIsLoading(true);
        setLoadingError(null);

        try {
          // Ensure ChartRegistry is initialized
          await ChartRegistry.ensureInitialized();
          
          // Get chart from registry
          const plugin = ChartRegistry.getPlugin(chartKey);
          
          if (plugin && plugin.component) {
            setDynamicComponent(() => plugin.component);
          } else {
            throw new Error(`Chart plugin '${chartKey}' not found in registry`);
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
  }, [chartType, chartLibrary, enableDynamicLoading, staticChartConfig, chartKey, onPluginLoadError]);

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
// Enhanced Chart Plugin Service
// ============================================================================

class EnhancedChartPluginService {
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
      // Initialize ChartRegistry first
      await ChartRegistry.ensureInitialized();

      // Load plugins from ChartRegistry
      const registryPlugins = ChartRegistry.getAllPlugins();
      for (const pluginConfig of registryPlugins) {
        this.plugins.set(pluginConfig.name, {
          name: pluginConfig.name,
          displayName: pluginConfig.displayName,
          component: pluginConfig.component as React.ComponentType<ChartProps>,
          library: pluginConfig.library,
          category: pluginConfig.category,
          description: pluginConfig.description,
          version: pluginConfig.version
        });
      }

      // Load additional plugins from static registry if available
      Object.entries(STATIC_CHART_REGISTRY).forEach(([key, registration]) => {
        if (!this.plugins.has(key)) {
          const [library, type] = this.parseChartKey(key);
          this.plugins.set(key, {
            name: type,
            displayName: registration.displayName,
            component: registration.component,
            library: registration.library,
            category: registration.category,
            description: registration.description
          });
        }
      });

      this.initialized = true;
      console.log('Enhanced Chart Plugin Service initialized with', this.plugins.size, 'plugins');
    } catch (error) {
      console.error('Failed to initialize Enhanced Chart Plugin Service:', error);
      // Don't throw, just log the error and continue with empty registry
      this.initialized = true;
    }
  }

  private parseChartKey(key: string): [string, string] {
    const parts = key.split('-');
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join('-')];
    }
    return ['unknown', key];
  }

  isInitialized(): boolean {
    return this.initialized;
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

  validateChartConfig(type: string, library: string, config: any): { valid: boolean; errors: string[] } {
    const chartKey = `${library}-${type}`;
    const plugin = this.getChart(chartKey);
    
    if (!plugin) {
      return {
        valid: false,
        errors: [`Chart type '${type}' not supported for library '${library}'`]
      };
    }

    // Basic validation - can be extended
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Chart Factory Class (Static Methods for API Compatibility)
// ============================================================================

class ChartFactory {
  private static pluginService: EnhancedChartPluginService | null = null;
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.pluginService = EnhancedChartPluginService.getInstance();
      await this.pluginService.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ChartFactory:', error);
      // Initialize with empty service rather than failing completely
      this.pluginService = EnhancedChartPluginService.getInstance();
      this.initialized = true;
    }
  }

  /**
   * Create a chart React element dynamically
   */
  static createChart(
    type: string,
    library: string,
    props: {
      data: any[] | ChartData;
      config: any;
      dimensions: { width: string | number; height: string | number };
      onError?: (error: Error) => void;
      onInteraction?: (event: any) => void;
    }
  ): React.ReactElement {
    // Use ChartFactoryComponent for consistent loading behavior
    return React.createElement(ChartFactoryComponent, {
  key: `${library}-${type}-${Date.now()}`,
  chartType: type,
  chartLibrary: library,
  ...props,
  dimensions: {
    width: Number(props.dimensions.width) || 400,
    height: Number(props.dimensions.height) || 300
  }
} as any);

}
  /**
   * Get chart information
   */
  static async getChartInfo(type: string, library: string): Promise<ChartPluginInfo | null> {
    await this.ensureInitialized();
    return this.pluginService!.getChartByTypeAndLibrary(type, library) || null;
  }

  /**
   * Get all available charts
   */
  static async getAllCharts(): Promise<ChartPluginInfo[]> {
    await this.ensureInitialized();
    return this.pluginService!.getAllCharts();
  }

  /**
   * Get available categories
   */
  static async getCategories(): Promise<string[]> {
    await this.ensureInitialized();
    return this.pluginService!.getChartCategories();
  }

  /**
   * Search charts by query
   */
  static async searchCharts(query: string): Promise<ChartPluginInfo[]> {
    await this.ensureInitialized();
    return this.pluginService!.searchCharts(query);
  }

  /**
   * Validate chart configuration
   */
  static async validateConfig(type: string, library: string, config: any): Promise<{ valid: boolean; errors: string[] }> {
    await this.ensureInitialized();
    return this.pluginService!.validateChartConfig(type, library, config);
  }

  /**
   * Check if chart is supported
   */
  static async isChartSupported(type: string, library: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.pluginService!.isChartSupported(type, library);
  }

  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// ============================================================================
// Auto-initialize on module load
// ============================================================================

// Initialize when module is imported (fire-and-forget)
ChartFactory.initialize().catch(error => {
  console.error('Failed to initialize ChartFactory:', error);
});

// ============================================================================
// Exports (Single source, no duplicates)
// ============================================================================

export { ChartFactory };
export { ChartFactoryComponent };  // ✅ This should be the ONLY export of ChartFactoryComponent
export { EnhancedChartPluginService };
export type { ChartFactoryProps, StaticChartRegistration, ChartPluginInfo };
export default ChartFactory;