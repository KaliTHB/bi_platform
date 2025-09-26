// ============================================================================
// FILE: /src/plugins/charts/services/index.ts
// PURPOSE: Chart services exports
// ============================================================================

// Import services first
import ConfigMappingServiceClass from './ConfigMappingService';
import ChartPluginServiceClass from './ChartPluginService';

// Core services exports
export { default as ConfigMappingService } from './ConfigMappingService';
export { default as ChartPluginService } from './ChartPluginService';

// Utility functions for quick access
export const ChartServices = {
  ConfigMapping: ConfigMappingServiceClass,
  Plugin: ChartPluginServiceClass
};

// Helper function to validate chart setup
export const validateChartSetup = (
  data: Record<string, any>[],
  config: any,
  assignments: any
) => {
  return ChartPluginServiceClass.validateChartConfiguration(config, assignments, data);
};

// Helper function for field mapping
export const createFieldMapping = (assignments: any) => {
  return ConfigMappingServiceClass.createFieldMapping(assignments);
};

// Helper function to get chart type recommendations
export const getChartRecommendations = (data: Record<string, any>[]) => {
  return ChartPluginServiceClass.getChartTypeRecommendations(data);
};

// Helper function to create smart default assignments
export const createSmartAssignments = (data: Record<string, any>[]) => {
  return ChartPluginServiceClass.createDefaultAssignments(data);
};