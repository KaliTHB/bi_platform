// src/plugins/charts/registry/ChartRegistry.ts
import { ChartPlugin } from '@/types/plugin.types';

// Use ChartPlugin as the base interface for registry
type ChartPluginConfig = ChartPlugin & {
  component: React.ComponentType<any>;
  interactionSupport?: {
    tooltip?: boolean;
    zoom?: boolean;
    pan?: boolean;
    selection?: boolean;
    brush?: boolean;
    drilldown?: boolean;
    crossFilter?: boolean;
  };
};

// Static imports at the top level - this solves the webpack critical dependency warning
const chartModules = {
  'echarts-line': () => import('../echarts/LineChart'),
  'echarts-bar': () => import('../echarts/BarChart'), 
  'echarts-pie': () => import('../echarts/PieChart'),
  'echarts-scatter': () => import('../echarts/ScatterChart'),
  'chartjs-line': () => import('../chartjs/LineChart'),
  'chartjs-doughnut': () => import('../chartjs/DoughnutChart'),
  
  // Optional modules - these will fail gracefully if files don't exist
  'echarts-heatmap': () => import('../echarts/HeatmapChart').catch(() => null),
  'echarts-treemap': () => import('../echarts/TreemapChart').catch(() => null),
  'echarts-gauge': () => import('../echarts/GaugeChart').catch(() => null),
  'echarts-sunburst': () => import('../echarts/SunburstChart').catch(() => null),
  'echarts-parallel': () => import('../echarts/ParallelChart').catch(() => null),
  'echarts-waterfall': () => import('../echarts/WaterfallChart').catch(() => null),
  'echarts-radar': () => import('../echarts/RadarChart').catch(() => null),
  'chartjs-bar': () => import('../chartjs/BarChart').catch(() => null),
  'chartjs-radar': () => import('../chartjs/RadarChart').catch(() => null),
  'chartjs-bubble': () => import('../chartjs/BubbleChart').catch(() => null),
  'chartjs-polar': () => import('../chartjs/PolarChart').catch(() => null)
} as const;

type ChartModuleKey = keyof typeof chartModules;

export class ChartRegistry {
  private static plugins: Map<string, ChartPluginConfig> = new Map();
  private static initialized: boolean = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the chart registry using the chartModules const
   */
  static async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (ChartRegistry.initialized) {
      console.log('📊 ChartRegistry already initialized');
      return;
    }

    // Return existing promise if initialization is in progress
    if (ChartRegistry.initializationPromise) {
      return ChartRegistry.initializationPromise;
    }

    // Create and store the initialization promise
    ChartRegistry.initializationPromise = ChartRegistry.doInitialization();
    return ChartRegistry.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private static async doInitialization(): Promise<void> {
    console.log('🚀 Initializing ChartRegistry with dynamic module loading...');
    
    try {
      let loadedCount = 0;
      let skippedCount = 0;

      // Process all chart modules from the const definition
      const initPromises = Object.entries(chartModules).map(async ([chartName, importFn]) => {
        try {
          console.log(`🔄 Loading chart module: ${chartName}`);
          
          const module = await importFn();
          
          // Skip if module is null (optional module that failed to load)
          if (!module) {
            console.log(`⚠️ Skipped optional chart module: ${chartName} (not available)`);
            skippedCount++;
            return;
          }

          // Try to extract the config from the module
          const config = ChartRegistry.extractConfigFromModule(module, chartName);
          
          if (config && config.component) {
            const validatedConfig = ChartRegistry.validateAndEnrichConfig(config, chartName);
            ChartRegistry.registerPlugin(validatedConfig);
            console.log(`✅ Registered chart plugin: ${validatedConfig.name}`);
            loadedCount++;
          } else {
            console.log(`⚠️ Skipped chart module: ${chartName} (no valid config or component)`);
            skippedCount++;
          }
        } catch (error) {
          console.warn(`❌ Failed to load chart module ${chartName}:`, error);
          skippedCount++;
        }
      });

      // Wait for all modules to be processed
      await Promise.allSettled(initPromises);

      ChartRegistry.initialized = true;
      console.log(`🎯 ChartRegistry initialized successfully!`);
      console.log(`   - Loaded: ${loadedCount} plugins`);
      console.log(`   - Skipped: ${skippedCount} plugins`);
      console.log(`   - Available charts: ${ChartRegistry.getAvailableCharts().join(', ')}`);
      
    } catch (error) {
      console.error('❌ Critical error initializing ChartRegistry:', error);
      // Initialize with empty registry rather than failing completely
      ChartRegistry.initialized = true;
    }
  }

  /**
   * Extract configuration from a loaded module
   * Tries multiple possible export patterns
   */
  private static extractConfigFromModule(module: any, chartName: string): ChartPluginConfig | null {
    if (!module) return null;

    // List of possible config export names to try
    const possibleConfigNames = [
      // Exact match patterns
      `${ChartRegistry.toPascalCase(chartName)}Config`,
      `${ChartRegistry.toPascalCase(chartName.replace(/^(echarts|chartjs)-/, ''))}Config`,
      
      // Library-specific patterns
      chartName.startsWith('echarts-') ? `ECharts${ChartRegistry.toPascalCase(chartName.replace('echarts-', ''))}ChartConfig` : null,
      chartName.startsWith('chartjs-') ? `ChartJS${ChartRegistry.toPascalCase(chartName.replace('chartjs-', ''))}Config` : null,
      
      // Generic patterns
      'chartConfig',
      'config',
      'default'
    ].filter(Boolean) as string[];

    // Try each possible config name
    for (const configName of possibleConfigNames) {
      if (module[configName]) {
        console.log(`🔍 Found config for ${chartName} at export: ${configName}`);
        return module[configName];
      }
    }

    // If no config found, try to create a fallback from the default export
    if (module.default) {
      console.log(`📝 Creating fallback config for ${chartName} from default export`);
      return ChartRegistry.createFallbackConfig(chartName, module.default);
    }

    return null;
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private static toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Create a fallback configuration for charts that don't have proper plugin configs
   */
  private static createFallbackConfig(chartName: string, component: any): ChartPluginConfig | null {
    if (!component) return null;

    const library = chartName.startsWith('chartjs-') ? 'chartjs' : 
                   chartName.startsWith('echarts-') ? 'echarts' : 'unknown';
    
    const displayName = chartName
      .replace(/^(chartjs-|echarts-)/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Chart';

    return {
      name: chartName,
      displayName,
      category: 'basic',
      library: library as any,
      version: '1.0.0',
      description: `${displayName} - Auto-generated configuration`,
      tags: [chartName.replace(/^(chartjs-|echarts-)/, ''), 'auto-generated'],
      
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

    if (ChartRegistry.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered, overwriting...`);
    }

    ChartRegistry.plugins.set(plugin.name, plugin);
  }

  /**
   * Get a plugin by name
   */
  static getPlugin(name: string): ChartPluginConfig | undefined {
    const plugin = ChartRegistry.plugins.get(name);
    if (!plugin) {
      console.warn(`Chart plugin "${name}" not found. Available plugins: ${Array.from(ChartRegistry.plugins.keys()).join(', ')}`);
    }
    return plugin;
  }

  /**
   * Check if a plugin exists
   */
  static hasPlugin(name: string): boolean {
    return ChartRegistry.plugins.has(name);
  }

  /**
   * Get all available chart names
   */
  static getAvailableCharts(): string[] {
    return Array.from(ChartRegistry.plugins.keys());
  }

  /**
   * Get all plugins
   */
  static getAllPlugins(): ChartPluginConfig[] {
    return Array.from(ChartRegistry.plugins.values());
  }

  /**
   * Get plugins as a Map
   */
  static getPluginsMap(): Map<string, ChartPluginConfig> {
    return new Map(ChartRegistry.plugins);
  }

  /**
   * Clear all plugins (useful for testing)
   */
  static clearPlugins(): void {
    ChartRegistry.plugins.clear();
    ChartRegistry.initialized = false;
    ChartRegistry.initializationPromise = null;
  }

  /**
   * Ensure the registry is initialized (alternative method name for compatibility)
   */
  static async ensureInitialized(): Promise<void> {
    return ChartRegistry.initialize();
  }

  /**
   * Add a new chart module dynamically (for runtime registration)
   */
  static async addDynamicChart(name: string, importFn: () => Promise<any>): Promise<boolean> {
    try {
      console.log(`🔄 Dynamically loading chart: ${name}`);
      
      const module = await importFn();
      const config = ChartRegistry.extractConfigFromModule(module, name);
      
      if (config && config.component) {
        const validatedConfig = ChartRegistry.validateAndEnrichConfig(config, name);
        ChartRegistry.registerPlugin(validatedConfig);
        console.log(`✅ Dynamically registered chart plugin: ${validatedConfig.name}`);
        return true;
      } else {
        console.warn(`⚠️ Failed to dynamically register chart: ${name} (no valid config)`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to dynamically load chart ${name}:`, error);
      return false;
    }
  }

  /**
   * Get plugins filtered by category
   */
  static getPluginsByCategory(category: string): ChartPluginConfig[] {
    return ChartRegistry.getAllPlugins().filter(plugin => plugin.category === category);
  }

  /**
   * Get plugins filtered by library
   */
  static getPluginsByLibrary(library: string): ChartPluginConfig[] {
    return ChartRegistry.getAllPlugins().filter(plugin => plugin.library === library);
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
    const plugins = ChartRegistry.getAllPlugins();
    
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
    console.log('Initialized:', ChartRegistry.initialized);
    console.log('Plugin count:', ChartRegistry.plugins.size);
    
    if (ChartRegistry.plugins.size > 0) {
      console.table(
        Array.from(ChartRegistry.plugins.entries()).map(([name, config]: [string, ChartPluginConfig]) => ({
          name,
          displayName: config.displayName,
          category: config.category,
          library: config.library,
          version: config.version,
          hasComponent: !!config.component
        }))
      );
    } else {
      console.log('No plugins registered');
    }
    
    console.groupEnd();
  }

  /**
   * Get statistics about the registry
   */
  static getStats(): {
    totalPlugins: number;
    pluginsByLibrary: Record<string, number>;
    pluginsByCategory: Record<string, number>;
    initialized: boolean;
  } {
    const plugins = Array.from(ChartRegistry.plugins.values());
    
    const pluginsByLibrary: Record<string, number> = {};
    const pluginsByCategory: Record<string, number> = {};
    
    plugins.forEach(plugin => {
      pluginsByLibrary[plugin.library] = (pluginsByLibrary[plugin.library] || 0) + 1;
      pluginsByCategory[plugin.category] = (pluginsByCategory[plugin.category] || 0) + 1;
    });

    return {
      totalPlugins: plugins.length,
      pluginsByLibrary,
      pluginsByCategory,
      initialized: ChartRegistry.initialized
    };
  }
}

export default ChartRegistry;