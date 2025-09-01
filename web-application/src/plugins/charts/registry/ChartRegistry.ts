import { ChartPluginConfig } from '@/types/chart.types';

export class ChartRegistry {
  private static plugins = new Map<string, ChartPluginConfig>();
  private static initialized = false;
  
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Dynamic imports for all chart components
      const chartModules = await Promise.allSettled([
        import('../echarts/BarChart').then(m => m.EChartsBarChartConfig),
        import('../echarts/PieChart').then(m => m.EChartsPieChartConfig),
        import('../echarts/LineChart').then(m => m.EChartsLineChartConfig),
        import('../echarts/ScatterChart').then(m => m.EChartsScatterChartConfig),
        import('../echarts/SunburstChart').then(m => m.EChartsSunburstChartConfig),
        import('../echarts/WaterfallChart').then(m => m.EChartsWaterfallChartConfig),
        import('../echarts/RadarChart').then(m => m.EChartsRadarChartConfig),
        import('../echarts/ParallelChart').then(m => m.EChartsParallelChartConfig),
      ]);

      // Register successfully loaded plugins
      chartModules.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.registerPlugin(result.value);
        } else if (result.status === 'rejected') {
          console.warn(`Failed to load chart plugin ${index}:`, result.reason);
        }
      });

      this.initialized = true;
      console.log('ChartRegistry initialized with', this.plugins.size, 'plugins');
    } catch (error) {
      console.error('Failed to initialize ChartRegistry:', error);
      // Initialize with empty registry rather than failing completely
      this.initialized = true;
    }
  }
  
  static registerPlugin(plugin: ChartPluginConfig): void {
    if (plugin && plugin.name) {
      this.plugins.set(plugin.name, plugin);
    }
  }
  
  static getPlugin(name: string): ChartPluginConfig | undefined {
    return this.plugins.get(name);
  }
  
  static getChartConfig(name: string): ChartPluginConfig | undefined {
    return this.plugins.get(name);
  }
  
  static getAllPlugins(): ChartPluginConfig[] {
    return Array.from(this.plugins.values());
  }
  
  static getAvailableCharts(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  static getPluginsByCategory(category: string): ChartPluginConfig[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.category === category);
  }
  
  static getPluginsByLibrary(library: string): ChartPluginConfig[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.library === library);
  }
  
  static getCategories(): string[] {
    const categories = new Set<string>();
    this.plugins.forEach(plugin => categories.add(plugin.category));
    return Array.from(categories);
  }
  
  static getLibraries(): string[] {
    const libraries = new Set<string>();
    this.plugins.forEach(plugin => libraries.add(plugin.library));
    return Array.from(libraries);
  }
  
  static validateChartConfig(chartType: string, config: any): boolean {
    const plugin = this.getPlugin(chartType);
    if (!plugin) return false;
    
    // Basic validation - can be extended with JSON schema validation
    return typeof config === 'object' && config !== null;
  }
  
  static isInitialized(): boolean {
    return this.initialized;
  }

  static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}