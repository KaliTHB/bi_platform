// src/plugins/charts/registry/ChartRegistry.ts
import { ChartPluginConfig } from '@/types/chart.types';

export class ChartRegistry {
  private static plugins = new Map<string, ChartPluginConfig>();
  private static initialized = false;
  
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Initializing ChartRegistry...');
      
      // Dynamic imports for chart components with proper error handling
      const chartImports = [
        // ECharts components
        { 
          name: 'echarts-bar',
          importFn: () => import('../echarts/BarChart').then(m => m.EChartsBarChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-pie',
          importFn: () => import('../echarts/PieChart').then(m => m.EChartsPieChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-line',
          importFn: () => import('../echarts/LineChart').then(m => m.EChartsLineChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-scatter',
          importFn: () => import('../echarts/ScatterChart').then(m => m.EChartsScatterChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-waterfall',
          importFn: () => import('../echarts/WaterfallChart').then(m => m.EChartsWaterfallChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-radar',
          importFn: () => import('../echarts/RadarChart').then(m => m.EChartsRadarChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-sunburst',
          importFn: () => import('../echarts/SunburstChart').then(m => m.EChartsSunburstChartConfig || m.default?.config)
        },
        { 
          name: 'echarts-parallel',
          importFn: () => import('../echarts/ParallelChart').then(m => m.EChartsParallelChartConfig || m.default?.config)
        },
        
        // Chart.js components - FIXED: Use DoughnutChart instead of PieChart
        { 
          name: 'chartjs-bar',
          importFn: () => import('../chartjs/BarChart').then(m => m.ChartJSBarConfig || m.default?.config)
        },
        { 
          name: 'chartjs-line',
          importFn: () => import('../chartjs/LineChart').then(m => m.ChartJSLineConfig || m.default?.config)
        },
        { 
          name: 'chartjs-doughnut', // Changed from 'chartjs-pie' to 'chartjs-doughnut'
          importFn: () => import('../chartjs/DoughnutChart').then(m => m.ChartJSDoughnutConfig || m.default?.config) // Changed to DoughnutChart
        },
        { 
          name: 'chartjs-radar',
          importFn: () => import('../chartjs/RadarChart').then(m => m.ChartJSRadarConfig || m.default?.config)
        },
        { 
          name: 'chartjs-polar',
          importFn: () => import('../chartjs/PolarChart').then(m => m.ChartJSPolarConfig || m.default?.config)
        },
        { 
          name: 'chartjs-bubble',
          importFn: () => import('../chartjs/BubbleChart').then(m => m.ChartJSBubbleConfig || m.default?.config)
        },
        { 
          name: 'chartjs-scatter',
          importFn: () => import('../chartjs/ScatterChart').then(m => m.ChartJSScatterConfig || m.default?.config)
        },
        { 
          name: 'chartjs-mixed',
          importFn: () => import('../chartjs/MixedChart').then(m => m.ChartJSMixedConfig || m.default?.config)
        },
        
        // Plotly components
        { 
          name: 'plotly-surface3d',
          importFn: () => import('../plotly/Surface3D').then(m => m.Surface3DConfig || m.default?.config)
        },
        { 
          name: 'plotly-mesh3d',
          importFn: () => import('../plotly/Mesh3D').then(m => m.Mesh3DConfig || m.default?.config)
        },
        { 
          name: 'plotly-contour',
          importFn: () => import('../plotly/ContourPlot').then(m => m.ContourPlotConfig || m.default?.config)
        },
        { 
          name: 'plotly-violin',
          importFn: () => import('../plotly/ViolinPlot').then(m => m.ViolinPlotConfig || m.default?.config)
        },
        { 
          name: 'plotly-funnel',
          importFn: () => import('../plotly/FunnelChart').then(m => m.FunnelChartConfig || m.default?.config)
        },
        { 
          name: 'plotly-waterfall',
          importFn: () => import('../plotly/WaterfallChart').then(m => m.WaterfallChartConfig || m.default?.config)
        }
      ];

      // Execute all imports
      const results = await Promise.allSettled(
        chartImports.map(async ({ name, importFn }) => {
          try {
            const config = await importFn();
            return { name, config };
          } catch (error) {
            console.warn(`Failed to import chart ${name}:`, error);
            return { name, config: null, error };
          }
        })
      );

      // Register successfully loaded plugins
      let loadedCount = 0;
      let failedCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { name, config, error } = result.value;
          
          if (config && !error) {
            // Ensure the config has required properties
            const validatedConfig: ChartPluginConfig = {
              name: config.name || name,
              displayName: config.displayName || name,
              category: config.category || 'basic',
              library: config.library || 'unknown',
              version: config.version || '1.0.0',
              configSchema: config.configSchema || { type: 'object', properties: {} },
              dataRequirements: config.dataRequirements || { 
                minColumns: 1,
                requiredFields: [],
                supportedTypes: ['string', 'number']
              },
              exportFormats: config.exportFormats || ['png'],
              component: config.component,
              ...config
            };

            this.registerPlugin(validatedConfig);
            loadedCount++;
            console.log(`✅ Registered chart plugin: ${validatedConfig.name}`);
          } else {
            failedCount++;
            console.warn(`❌ Failed to register chart plugin: ${name}`, error);
          }
        } else {
          failedCount++;
          console.warn(`❌ Failed to load chart plugin:`, result.reason);
        }
      });

      this.initialized = true;
      console.log(`🎯 ChartRegistry initialized successfully!`);
      console.log(`   - Loaded: ${loadedCount} plugins`);
      console.log(`   - Failed: ${failedCount} plugins`);
      console.log(`   - Available charts: ${this.getAvailableCharts().join(', ')}`);
      
    } catch (error) {
      console.error('❌ Critical error initializing ChartRegistry:', error);
      // Initialize with empty registry rather than failing completely
      this.initialized = true;
    }
  }
  
  static registerPlugin(plugin: ChartPluginConfig): void {
    if (!plugin || !plugin.name) {
      console.warn('Cannot register plugin: missing name or invalid plugin object');
      return;
    }

    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered, overwriting...`);
    }

    this.plugins.set(plugin.name, plugin);
  }
  
  static getPlugin(name: string): ChartPluginConfig | undefined {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Chart plugin "${name}" not found. Available: ${this.getAvailableCharts().join(', ')}`);
    }
    return plugin;
  }
  
  static getChartConfig(name: string): ChartPluginConfig | undefined {
    return this.getPlugin(name);
  }
  
  static getAllPlugins(): ChartPluginConfig[] {
    return Array.from(this.plugins.values());
  }
  
  static getAvailableCharts(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  static getPluginsByCategory(category: string): ChartPluginConfig[] {
    return this.getAllPlugins().filter(plugin => plugin.category === category);
  }
  
  static getPluginsByLibrary(library: string): ChartPluginConfig[] {
    return this.getAllPlugins().filter(plugin => plugin.library === library);
  }
  
  static hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
  
  static clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
  
  static getRegistrationStats(): {
    total: number;
    byCategory: Record<string, number>;
    byLibrary: Record<string, number>;
    plugins: string[];
  } {
    const plugins = this.getAllPlugins();
    
    const byCategory = plugins.reduce((acc, plugin) => {
      acc[plugin.category] = (acc[plugin.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byLibrary = plugins.reduce((acc, plugin) => {
      acc[plugin.library] = (acc[plugin.library] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: plugins.length,
      byCategory,
      byLibrary,
      plugins: plugins.map(p => p.name)
    };
  }

  // Helper method for debugging
  static debugRegistry(): void {
    console.group('🔍 ChartRegistry Debug Info');
    console.log('Initialized:', this.initialized);
    console.log('Plugin count:', this.plugins.size);
    
    if (this.plugins.size > 0) {
      console.table(
        Array.from(this.plugins.entries()).map(([name, config]) => ({
          name,
          displayName: config.displayName,
          category: config.category,
          library: config.library,
          version: config.version,
          hasComponent: !!config.component
        }))
      );
    }
    
    console.groupEnd();
  }
}

export default ChartRegistry;