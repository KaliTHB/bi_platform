// File: web-application/src/components/charts/registry/ChartRegistry.ts

import { ChartPluginConfig } from '../interfaces/ChartPlugin';
import { echartsBarChartConfig } from '../echarts/chartConfig';

// Chart Plugin Registry
export const ChartPlugins: Record<string, ChartPluginConfig> = {
  'echarts-bar': echartsBarChartConfig
  // Additional chart plugins will be registered here
};

export const getChartPlugin = (name: string): ChartPluginConfig | null => {
  return ChartPlugins[name] || null;
};

export const getAvailableChartPlugins = (library?: string, category?: string) => {
  const plugins = Object.values(ChartPlugins);
  
  return plugins.filter(plugin => {
    if (library && plugin.library !== library) return false;
    if (category && plugin.category !== category) return false;
    return true;
  });
};

export const getChartCategories = (): string[] => {
  const categories = new Set(Object.values(ChartPlugins).map(p => p.category));
  return Array.from(categories).sort();
};

export const getChartLibraries = (): string[] => {
  const libraries = new Set(Object.values(ChartPlugins).map(p => p.library));
  return Array.from(libraries).sort();
};

export const registerChartPlugin = (plugin: ChartPluginConfig): void => {
  ChartPlugins[plugin.name] = plugin;
};

export const unregisterChartPlugin = (name: string): boolean => {
  if (ChartPlugins[name]) {
    delete ChartPlugins[name];
    return true;
  }
  return false;
};