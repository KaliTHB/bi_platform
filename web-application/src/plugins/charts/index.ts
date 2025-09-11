// ============================================================================
// FILE: /src/plugins/charts/index.ts
// PURPOSE: Main charts plugin exports - NO DIRECT RENDERER IMPORTS
// ============================================================================

// ============================================================================
// CORE PLUGIN SYSTEM EXPORTS
// ============================================================================

// Factory and Registry - Primary chart loading mechanisms
export { ChartFactory, ChartFactoryComponent } from './factory/ChartFactory';
export { ChartRegistry } from './registry/ChartRegistry';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Chart utilities and helpers
export * from './utils/chartDataUtils';
export * from './utils/chartConfigUtils';
export * from './utils/chartThemeUtils';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core chart types
export type { 
  ChartProps, 
  ChartPluginConfig, 
  ChartData,
  ChartConfiguration,
  ChartDimensions,
  ChartTheme,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';

// Factory-specific types
export type { 
  ChartFactoryProps, 
  ChartPluginInfo 
} from './factory/ChartFactory';

// ============================================================================
// ECHARTS COMPONENT EXPORTS (Dynamic Loading Only)
// ============================================================================

// NOTE: These are exported for direct usage if needed, but ChartRenderer
// should load them dynamically through the registry system

// Basic ECharts components
export * from './echarts/BarChart';
export * from './echarts/LineChart';
export * from './echarts/PieChart';
export * from './echarts/ScatterChart';

// Advanced ECharts components
export * from './echarts/HeatmapChart';
export * from './echarts/TreemapChart';
export * from './echarts/GaugeChart';
export * from './echarts/RadarChart';
export * from './echarts/WaterfallChart';
export * from './echarts/SunburstChart';
export * from './echarts/CandlestickChart';
export * from './echarts/BoxplotChart';
export * from './echarts/ParallelChart';
export * from './echarts/SankeyChart';
export * from './echarts/GraphChart';

// ============================================================================
// REMOVED EXPORTS - NO LONGER SUPPORTED
// ============================================================================

// REMOVED: Direct renderer exports (static components)
// export { default as EChartsRenderer } from './renderer/EChartsRenderer';
// export { default as D3ChartRenderer } from './renderer/D3ChartRenderer';

// REMOVED: Other chart library exports (focus on ECharts only)
// export * from './d3js/';
// export * from './chartjs/';
// export * from './plotly/';
// export * from './drilldown/';

// ============================================================================
// CONFIGURATION EXPORTS
// ============================================================================

// Chart configuration presets and schemas
export * from './config/chartPresets';
export * from './config/chartSchemas';

// ============================================================================
// PLUGIN REGISTRY HELPERS
// ============================================================================

// Helper functions for working with the plugin system
export const getAvailableChartTypes = async () => {
  const { ChartFactory } = await import('./factory/ChartFactory');
  await ChartFactory.initialize();
  return ChartFactory.getAllCharts();
};

export const getChartsByLibrary = async (library: string) => {
  const { ChartFactory } = await import('./factory/ChartFactory');
  await ChartFactory.initialize();
  return ChartFactory.getChartsByLibrary(library);
};

export const isChartTypeSupported = async (type: string, library: string = 'echarts') => {
  const { ChartFactory } = await import('./factory/ChartFactory');
  return ChartFactory.isChartSupported(type, library);
};

// Debug helper for development
export const debugChartPlugins = async () => {
  if (process.env.NODE_ENV === 'development') {
    const { ChartRegistry } = await import('./registry/ChartRegistry');
    const { ChartFactory } = await import('./factory/ChartFactory');
    
    console.group('🔍 Chart Plugins Debug');
    
    console.log('📊 Registry Status:');
    await ChartRegistry.initialize();
    console.log('Registry plugins:', ChartRegistry.getAllPlugins().length);
    
    console.log('🏭 Factory Status:');
    await ChartFactory.initialize();
    ChartFactory.debugFactory();
    
    console.log('📈 Statistics:');
    console.log(ChartFactory.getStatistics());
    
    console.groupEnd();
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

// Default export is the ChartFactory for backward compatibility
export { ChartFactory as default } from './factory/ChartFactory';