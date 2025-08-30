// Simple ChartPluginService for frontend
export class ChartPluginService {
  private static plugins: Map<string, any> = new Map();
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Basic chart types - can be expanded later
    const chartTypes = [
      { name: 'bar', component: null },
      { name: 'line', component: null },
      { name: 'pie', component: null },
      { name: 'area', component: null },
      { name: 'scatter', component: null },
    ];

    chartTypes.forEach(chart => {
      this.plugins.set(chart.name, chart);
    });

    this.initialized = true;
    console.log('Chart plugins initialized:', this.plugins.size);
  }

  static getPlugin(type: string): any {
    return this.plugins.get(type);
  }

  static getAllPlugins(): [string, any][] {
    return Array.from(this.plugins.entries());
  }

  static getAvailableTypes(): string[] {
    return Array.from(this.plugins.keys());
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}