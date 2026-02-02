// ============================================================================
// FILE: /src/plugins/charts/factory/ChartFactory.tsx
// PURPOSE: Chart Factory without static fallbacks - Registry-only approach
// ============================================================================

import React, { Suspense } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ChartProps, ChartPluginConfig } from '@/types/chart.types';
import { ChartRegistry } from '../registry/ChartRegistry';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChartFactoryProps extends ChartProps {
  chartType: string;
  chartLibrary: string;
  enableDynamicLoading?: boolean;
  onPluginLoadError?: (error: Error) => void;
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
// LOADING AND ERROR COMPONENTS
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
      Loading chart component...
    </Typography>
  </Box>
);

const ChartErrorFallback: React.FC<{ error: string; chartType: string }> = ({ 
  error, 
  chartType 
}) => (
  <Alert severity="error" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Chart plugin not found: <strong>{chartType}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {error}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Please register this chart type in the ChartRegistry.
      </Typography>
    </Box>
  </Alert>
);

// ============================================================================
// CHART FACTORY COMPONENT - REGISTRY ONLY
// ============================================================================

const ChartFactoryComponent: React.FC<ChartFactoryProps> = ({
  chartType,
  chartLibrary,
  onPluginLoadError,
  ...chartProps
}) => {
  const [dynamicComponent, setDynamicComponent] = React.useState<React.ComponentType<ChartProps> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingError, setLoadingError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadDynamicChart = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        // ONLY use ChartRegistry - no static fallbacks
        await ChartRegistry.ensureInitialized();
        
        const chartKey = `${chartLibrary}-${chartType}`;
        const plugin = ChartRegistry.getPlugin(chartKey);
        
        if (plugin && plugin.component) {
          console.log(`✅ ChartFactory loaded: ${plugin.displayName}`);
          setDynamicComponent(() => plugin.component);
        } else {
          throw new Error(`Chart plugin '${chartKey}' not found in registry`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ChartFactory failed to load ${chartLibrary}-${chartType}:`, errorMessage);
        setLoadingError(errorMessage);
        onPluginLoadError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    loadDynamicChart();
  }, [chartType, chartLibrary, onPluginLoadError]);

  // Show loading state
  if (isLoading) {
    return <ChartLoadingFallback />;
  }

  // Show error if component not found - NO fallbacks
  if (loadingError || !dynamicComponent) {
    return (
      <ChartErrorFallback 
        error={loadingError || `Component not available for ${chartLibrary}-${chartType}`} 
        chartType={`${chartLibrary}-${chartType}`} 
      />
    );
  }

  // Render the chart component with error boundary
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <dynamicComponent {...chartProps} />
    </Suspense>
  );
};

// ============================================================================
// ENHANCED CHART PLUGIN SERVICE - REGISTRY ONLY
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
      console.log('🏭 Initializing ChartFactory (Registry Only)...');
      
      // ONLY load plugins from ChartRegistry - no static fallbacks
      await ChartRegistry.ensureInitialized();

      const registryPlugins = ChartRegistry.getAllPlugins();
      console.log(`📦 Loading ${registryPlugins.length} plugins from registry...`);

      // Clear existing plugins
      this.plugins.clear();

      for (const pluginConfig of registryPlugins) {
        this.plugins.set(pluginConfig.name, {
          name: pluginConfig.name.replace(/^[^-]+-/, ''), // Remove library prefix
          displayName: pluginConfig.displayName,
          component: pluginConfig.component as React.ComponentType<ChartProps>,
          library: pluginConfig.library,
          category: pluginConfig.category,
          description: pluginConfig.description,
          version: pluginConfig.version || '1.0.0'
        });
      }

      this.initialized = true;
      console.log(`✅ ChartFactory initialized with ${this.plugins.size} plugins from registry`);
    } catch (error) {
      console.error('❌ Failed to initialize ChartFactory:', error);
      // Don't throw, just log the error and continue with empty registry
      this.initialized = true;
    }
  }

  createChart(chartType: string, chartLibrary: string, props: ChartProps): React.ReactElement | null {
    if (!this.initialized) {
      console.warn('ChartFactory not initialized, cannot create chart');
      return null;
    }

    const chartKey = `${chartLibrary}-${chartType}`;
    const plugin = this.plugins.get(chartKey);

    if (plugin && plugin.component) {
      console.log(`🎯 ChartFactory creating: ${plugin.displayName}`);
      return React.createElement(plugin.component, props);
    }

    // NO static fallbacks - return null if not found
    console.warn(`⚠️ ChartFactory: No plugin found for ${chartKey}`);
    return null;
  }

  async isChartSupported(type: string, library: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    const chartKey = `${library}-${type}`;
    return this.plugins.has(chartKey);
  }

  getChart(chartKey: string): ChartPluginInfo | undefined {
    return this.plugins.get(chartKey);
  }

  getChartByTypeAndLibrary(type: string, library: string): ChartPluginInfo | undefined {
    const chartKey = `${library}-${type}`;
    return this.plugins.get(chartKey);
  }

  async getAllCharts(): Promise<ChartPluginInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }
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

  searchCharts(query: string): ChartPluginInfo[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.displayName?.toLowerCase().includes(lowercaseQuery) ||
      plugin.name?.toLowerCase().includes(lowercaseQuery) ||
      plugin.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Force re-initialization (useful for testing or plugin updates)
  async reinitialize(): Promise<void> {
    this.initialized = false;
    this.plugins.clear();
    await this.initialize();
  }

  // Debug methods
  debugFactory(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 ChartFactory Debug Info');
      console.log(`Initialized: ${this.initialized}`);
      console.log(`Total plugins: ${this.plugins.size}`);
      console.log('Available plugins:');
      this.plugins.forEach((plugin, key) => {
        console.log(`  - ${key}: ${plugin.displayName} (${plugin.library})`);
      });
      console.groupEnd();
    }
  }

  // Get plugin statistics
  getStatistics() {
    const stats = {
      total: this.plugins.size,
      byLibrary: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      initialized: this.initialized
    };

    this.plugins.forEach(plugin => {
      // Count by library
      if (plugin.library) {
        stats.byLibrary[plugin.library] = (stats.byLibrary[plugin.library] || 0) + 1;
      }

      // Count by category
      if (plugin.category) {
        stats.byCategory[plugin.category] = (stats.byCategory[plugin.category] || 0) + 1;
      }
    });

    return stats;
  }
}

// ============================================================================
// SINGLETON INSTANCES AND EXPORTS
// ============================================================================

export const ChartFactory = EnhancedChartPluginService.getInstance();

// Component export
export { ChartFactoryComponent };

// Type exports
export type { ChartFactoryProps, ChartPluginInfo };

// Default export
export default ChartFactory;