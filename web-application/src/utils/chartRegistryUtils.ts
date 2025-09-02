// web-application/src/utils/chartRegistryUtils.ts
import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';

export interface ChartTypeInfo {
  type: string;
  name: string;
  category: string;
  library: string;
  icon?: React.ReactNode;
  description?: string;
  version?: string;
}

export interface ChartCategory {
  name: string;
  displayName: string;
  charts: ChartTypeInfo[];
}

// Load available chart types from registry
export const loadAvailableChartTypes = async (): Promise<ChartTypeInfo[]> => {
  try {
    await ChartRegistry.initialize();
    const charts = ChartRegistry.getAllCharts();
    
    return charts.map(chart => ({
      type: chart.name.includes('-') ? chart.name.split('-').slice(1).join('-') : chart.name,
      name: chart.displayName || formatChartTypeName(chart.name),
      category: chart.category || 'basic',
      library: chart.library || 'echarts',
      description: chart.description,
      version: chart.version
    }));
  } catch (error) {
    console.error('Failed to load chart types from registry:', error);
    return [];
  }
};

// Format chart type name for display
export const formatChartTypeName = (chartType: string): string => {
  return chartType
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Group chart types by category
export const groupChartTypesByCategory = (chartTypes: ChartTypeInfo[]): { [key: string]: ChartTypeInfo[] } => {
  return chartTypes.reduce((acc, chartType) => {
    const category = chartType.category || 'basic';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(chartType);
    return acc;
  }, {} as { [key: string]: ChartTypeInfo[] });
};

// Get chart categories with display names
export const getChartCategories = (chartTypes: ChartTypeInfo[]): ChartCategory[] => {
  const groupedTypes = groupChartTypesByCategory(chartTypes);
  
  return Object.entries(groupedTypes).map(([category, charts]) => ({
    name: category,
    displayName: formatChartTypeName(category),
    charts
  }));
};

// Find chart type by name
export const findChartType = (chartTypes: ChartTypeInfo[], typeName: string): ChartTypeInfo | undefined => {
  return chartTypes.find(ct => ct.type === typeName || ct.name === typeName);
};

// Check if chart type is supported
export const isChartTypeSupported = async (chartType: string, library?: string): Promise<boolean> => {
  try {
    await ChartRegistry.initialize();
    
    if (library) {
      return ChartRegistry.isChartSupported(chartType, library);
    }
    
    // Check if any library supports this chart type
    const allCharts = ChartRegistry.getAllCharts();
    return allCharts.some(chart => 
      chart.name === chartType || 
      chart.name.endsWith(`-${chartType}`)
    );
  } catch (error) {
    console.error('Failed to check chart type support:', error);
    return false;
  }
};

// Get chart plugin info
export const getChartPluginInfo = async (chartType: string, library?: string) => {
  try {
    await ChartRegistry.initialize();
    
    if (library) {
      return ChartRegistry.getChartByTypeAndLibrary(chartType, library);
    }
    
    // Find first matching chart
    const allCharts = ChartRegistry.getAllCharts();
    return allCharts.find(chart => 
      chart.name === chartType || 
      chart.name.endsWith(`-${chartType}`)
    );
  } catch (error) {
    console.error('Failed to get chart plugin info:', error);
    return null;
  }
};

// Validate chart type configuration
export const validateChartTypeConfig = async (
  chartType: string, 
  config: any
): Promise<{ valid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    const isSupported = await isChartTypeSupported(chartType);
    if (!isSupported) {
      errors.push(`Chart type "${chartType}" is not supported`);
    }
    
    // Additional validation could be added here based on chart schema
    
  } catch (error) {
    errors.push(`Failed to validate chart type: ${error}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};