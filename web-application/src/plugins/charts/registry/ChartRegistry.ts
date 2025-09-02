// src/plugins/charts/registry/ChartRegistry.ts
import { ChartPluginConfig } from '@/types/chart.types';

export class ChartRegistry {
  private static plugins = new Map<string, ChartPluginConfig>();
  private static initialized = false;
  
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Initializing ChartRegistry...');
      
      // ONLY IMPORT COMPONENTS THAT ACTUALLY EXIST
      // Start conservative - add more as you implement them
      const chartImports = [
        // Core ECharts components that should exist
        { 
          name: 'echarts-bar',
          importFn: async () => {
            try {
              const m = await import('../echarts/BarChart');
              return m.EChartsBarChartConfig || this.createFallbackConfig('echarts-bar', 'Bar Chart', m.default);
            } catch (error) {
              console.warn('BarChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'echarts-pie',
          importFn: async () => {
            try {
              const m = await import('../echarts/PieChart');
              return m.EChartsPieChartConfig || this.createFallbackConfig('echarts-pie', 'Pie Chart', m.default);
            } catch (error) {
              console.warn('PieChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'echarts-line',
          importFn: async () => {
            try {
              const m = await import('../echarts/LineChart');
              return m.EChartsLineChartConfig || this.createFallbackConfig('echarts-line', 'Line Chart', m.default);
            } catch (error) {
              console.warn('LineChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'echarts-scatter',
          importFn: async () => {
            try {
              const m = await import('../echarts/ScatterChart');
              return m.EChartsScatterChartConfig || this.createFallbackConfig('echarts-scatter', 'Scatter Chart', m.default);
            } catch (error) {
              console.warn('ScatterChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'echarts-waterfall',
          importFn: async () => {
            try {
              const m = await import('../echarts/WaterfallChart');
              return m.EChartsWaterfallChartConfig || this.createFallbackConfig('echarts-waterfall', 'Waterfall Chart', m.WaterfallChart || m.default);
            } catch (error) {
              console.warn('WaterfallChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'echarts-radar',
          importFn: async () => {
            try {
              const m = await import('../echarts/RadarChart');
              return m.EChartsRadarChartConfig || this.createFallbackConfig('echarts-radar', 'Radar Chart', m.default);
            } catch (error) {
              console.warn('RadarChart not found, skipping...');
              return null;
            }
          }
        },

        // Chart.js components with error handling
        { 
          name: 'chartjs-line',
          importFn: async () => {
            try {
              const m = await import('../chartjs/LineChart');
              return m.ChartJSLineConfig || this.createFallbackConfig('chartjs-line', 'Chart.js Line Chart', m.default);
            } catch (error) {
              console.warn('Chart.js LineChart not found, skipping...');
              return null;
            }
          }
        },
        { 
          name: 'chartjs-doughnut',
          importFn: async () => {
            try {
              const m = await import('../chartjs/DoughnutChart');
              return m.ChartJSDoughnutConfig || this.createFallbackConfig('chartjs-doughnut', 'Chart.js Doughnut Chart', m.default);
            } catch (error) {
              console.warn('Chart.js DoughnutChart not found, skipping...');
              return null;
            }
          }
        }

        // Add more components here as you implement them
        // Uncomment these when the files exist:
        
        // { 
        //   name: 'echarts-sunburst',
        //   importFn: async () => {
        //     try {
        //       const m = await import('../echarts/SunburstChart');
        //       return m.EChartsSunburstChartConfig || this.createFallbackConfig('echarts-sunburst', 'Sunburst Chart', m.default);
        //     } catch (error) {
        //       console.warn('SunburstChart not found, skipping...');
        //       return null;
        //     }
        //   }
        // },
        // { 
        //   name: 'echarts-parallel',
        //   importFn: async () => {
        //     try {
        //       const m = await import('../echarts/ParallelChart');
        //       return m.EChartsParallelChartConfig || this.createFallbackConfig('echarts-parallel', 'Parallel Chart', m.default);
        //     } catch (error) {
        //       console.warn('ParallelChart not found, skipping...');
        //       return null;
        //     }
        //   }
        // }
      ];

      // Load plugins with enhanced error handling
      let loadedCount = 0;
      let skippedCount = 0;

      for (const { name, importFn } of chartImports) {
        try {
          const config = await importFn();
          if (config && config.component) {
            const validatedConfig = this.validateAndEnrichConfig(config, name);
            this.registerPlugin(validatedConfig);
            loadedCount++;
            console.log(`✅ Registered chart plugin: ${validatedConfig.name}`);
          } else {
            skippedCount++;
            console.log(`⚠️ Skipped chart plugin: ${name} (no component)`);
          }
        } catch (error) {
          skippedCount++;
          console.warn(`❌ Failed to load chart plugin ${name}:`, error);
        }
      }

      this.initialized = true;
      console.log(`🎯 ChartRegistry initialized successfully!`);
      console.log(`   - Loaded: ${loadedCount} plugins`);
      console.log(`   - Skipped: ${skippedCount} plugins`);
      console.log(`   - Available charts: ${this.getAvailableCharts().join(', ')}`);
      
    } catch (error) {
      console.error('❌ Critical error initializing ChartRegistry:', error);
      // Initialize with empty registry rather than failing completely
      this.initialized = true;
    }
  }

  /**
   * Create a fallback configuration for charts that don't have proper plugin configs
   */
  private static createFallbackConfig(name: string, displayName: string, component: any): ChartPluginConfig | null {
    if (!component) return null;

    console.log(`📝 Creating fallback config for ${name}`);

    const library = name.startsWith('chartjs-') ? 'chartjs' : 
                   name.startsWith('echarts-') ? 'echarts' : 'unknown';

    return {
      name,
      displayName,
      category: 'basic',
      library: library as any,
      version: '1.0.0',
      description: `${displayName} - Auto-generated configuration`,
      tags: [name.replace(/^(chartjs-|echarts-)/, ''), 'auto-generated'],
      
      configSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            title: 'Chart Title',
            default: displayName
          },
          xField: {
            type: 'string',
            title: 'X-Axis Field'
          },
          yField: {
            type: 'string',
            title: 'Y-Axis Field'
          }
        }
      },
      
      dataRequirements: {
        minColumns: 1,
        requiredFields: [],
        supportedTypes: ['string', 'number']
      },
      
      exportFormats: ['png'],
      component: component,
      
      interactionSupport: {
        tooltip: true
      }
    };
  }

  /**
   * Validate and enrich plugin configuration
   */
  private static validateAndEnrichConfig(config: ChartPluginConfig, fallbackName: string): ChartPluginConfig {
    return {
      ...config,
      name: config.name || fallbackName,
      displayName: config.displayName || fallbackName.replace(/^(chartjs-|echarts-)/, '').replace(/-/g, ' '),
      category: config.category || 'basic',
      library: config.library || 'unknown',
      version: config.version || '1.0.0',
      description: config.description || '',
      tags: config.tags || [],
      configSchema: config.configSchema || {
        type: 'object',
        properties: {}
      },
      dataRequirements: config.dataRequirements || { 
        minColumns: 1,
        requiredFields: [],
        supportedTypes: ['string', 'number']
      },
      exportFormats: config.exportFormats || ['png'],
      component: config.component,
      interactionSupport: config.interactionSupport || {}
    };
  }

  /**
   * Ensure the registry is initialized (alternative to initialize for compatibility)
   */
  static async ensureInitialized(): Promise<void> {
    return this.initialize();
  }
  
  /**
   * Register a single plugin
   */
  static registerPlugin(plugin: ChartPluginConfig): void {
    if (!plugin || !plugin.name) {
      console.warn('Cannot register plugin: missing name or invalid plugin object');
      return;
    }

    if (!plugin.component) {
      console.warn(`Cannot register plugin ${plugin.name}: missing component`);
      return;
    }

    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered, overwriting...`);
    }

    this.plugins.set(plugin.name, plugin);
  }
  
  /**
   * Get a plugin by name
   */
  static getPlugin(name: string): ChartPluginConfig | undefined {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Chart plugin "${name}" not found. Available: ${this.getAvailableCharts().join(', ')}`);
    }
    return plugin;
  }
  
  /**
   * Get chart configuration (alias for getPlugin)
   */
  static getChartConfig(name: string): ChartPluginConfig | undefined {
    return this.getPlugin(name);
  }
  
  /**
   * Get all registered plugins
   */
  static getAllPlugins(): ChartPluginConfig[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get list of available chart names
   */
  static getAvailableCharts(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Get plugins filtered by category
   */
  static getPluginsByCategory(category: string): ChartPluginConfig[] {
    return this.getAllPlugins().filter(plugin => plugin.category === category);
  }
  
  /**
   * Get plugins filtered by library
   */
  static getPluginsByLibrary(library: string): ChartPluginConfig[] {
    return this.getAllPlugins().filter(plugin => plugin.library === library);
  }
  
  /**
   * Check if a plugin is registered
   */
  static hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Clear all plugins and reset initialization state
   */
  static clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
  
  /**
   * Get registration statistics
   */
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

  /**
   * Helper method for debugging
   */
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

  /**
   * Gradually add more components as they become available
   */
  static async addOptionalComponents(): Promise<void> {
    const optionalComponents = [
      // Add these when the files exist
      { name: 'echarts-heatmap', path: '../echarts/HeatmapChart', configName: 'EChartsHeatmapChartConfig' },
      { name: 'echarts-treemap', path: '../echarts/TreemapChart', configName: 'EChartsTreemapChartConfig' },
      { name: 'echarts-gauge', path: '../echarts/GaugeChart', configName: 'EChartsGaugeChartConfig' },
      { name: 'echarts-sunburst', path: '../echarts/SunburstChart', configName: 'EChartsSunburstChartConfig' },
      { name: 'echarts-parallel', path: '../echarts/ParallelChart', configName: 'EChartsParallelChartConfig' },
      { name: 'chartjs-bar', path: '../chartjs/BarChart', configName: 'ChartJSBarConfig' },
      { name: 'chartjs-radar', path: '../chartjs/RadarChart', configName: 'ChartJSRadarConfig' }
    ];

    for (const { name, path, configName } of optionalComponents) {
      if (!this.hasPlugin(name)) {
        try {
          const module = await import(path);
          const config = module[configName] || this.createFallbackConfig(name, name, module.default);
          
          if (config && config.component) {
            const validatedConfig = this.validateAndEnrichConfig(config, name);
            this.registerPlugin(validatedConfig);
            console.log(`✅ Added optional chart plugin: ${name}`);
          }
        } catch (error) {
          // Silently ignore - these are optional
        }
      }
    }
  }
}

export default ChartRegistry;