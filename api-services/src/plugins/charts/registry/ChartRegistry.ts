// File: api-services/src/plugins/charts/registry/ChartRegistry.ts
export interface ChartPluginConfig {
  name: string;
  displayName: string;
  category: string;
  version: string;
  description?: string;
  configSchema?: any;
}

export class ChartRegistry {
  private static plugins = new Map<string, ChartPluginConfig>();

  static {
    // Register essential chart plugins only
    this.registerPlugin({
      name: 'echarts-bar',
      displayName: 'Bar Chart',
      category: 'basic',
      version: '1.0.0',
      description: 'Standard bar chart visualization',
      configSchema: {
        type: 'object',
        properties: {
          xField: { type: 'string', required: true, title: 'X-Axis Field' },
          yField: { type: 'string', required: true, title: 'Y-Axis Field' },
          colorField: { type: 'string', title: 'Color Field' },
          showLegend: { type: 'boolean', default: true, title: 'Show Legend' }
        }
      }
    });

    this.registerPlugin({
      name: 'echarts-line',
      displayName: 'Line Chart',
      category: 'basic',
      version: '1.0.0',
      description: 'Time series and trend visualization',
      configSchema: {
        type: 'object',
        properties: {
          xField: { type: 'string', required: true, title: 'X-Axis Field' },
          yField: { type: 'string', required: true, title: 'Y-Axis Field' },
          smooth: { type: 'boolean', default: false, title: 'Smooth Lines' }
        }
      }
    });

    this.registerPlugin({
      name: 'echarts-pie',
      displayName: 'Pie Chart',
      category: 'basic',
      version: '1.0.0',
      description: 'Proportional data visualization',
      configSchema: {
        type: 'object',
        properties: {
          categoryField: { type: 'string', required: true, title: 'Category Field' },
          valueField: { type: 'string', required: true, title: 'Value Field' },
          showLabels: { type: 'boolean', default: true, title: 'Show Labels' }
        }
      }
    });
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

  static validatePluginConfiguration(pluginName: string, config: any): { valid: boolean; errors: string[] } {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      return { valid: false, errors: [`Chart plugin ${pluginName} not found`] };
    }

    // Basic validation - can be extended with proper schema validation
    return { valid: true, errors: [] };
  }
}
