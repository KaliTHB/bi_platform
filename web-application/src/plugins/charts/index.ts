export { ChartFactory, ChartFactoryComponent } from './factory/ChartFactory';
export { ChartRegistry } from './registry/ChartRegistry';

// Utility exports
export * from './utils/chartDataUtils';

// Type exports
export type { ChartProps, ChartPluginConfig, ChartData } from '@/types/chart.types';
export type { ChartFactoryProps, ChartPluginInfo } from './factory/ChartFactory';

// Default export
export { ChartFactory as default } from './factory/ChartFactory';