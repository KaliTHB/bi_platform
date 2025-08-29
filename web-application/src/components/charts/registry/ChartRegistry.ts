// File: web-application/src/components/charts/registry/ChartRegistry.ts
import { ChartPluginConfig } from '../interfaces';
import { EChartsBarChartConfig } from '../echarts/BarChart';

export class ChartRegistry {
  private static plugins = new Map<string, ChartPluginConfig>();
  
  static {
    // Register all chart plugins
    this.registerPlugin(EChartsBarChartConfig);
    
    // Add more chart plugins here as they are implemented
    // this.registerPlugin(EChartsPieChartConfig);
    // this.registerPlugin(EChartsLineChartConfig);
    // this.registerPlugin(D3NetworkChartConfig);
    // etc.
  }
  
  static registerPlugin(plugin: ChartPluginConfig): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  static getPlugin(name: string): ChartPluginConfig | undefined {
    return this.plugins.get(name);
  }
  
  static getAllPlugins(): ChartPluginConfig[] {
    return Array.from(this.plugins.values());
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
}
