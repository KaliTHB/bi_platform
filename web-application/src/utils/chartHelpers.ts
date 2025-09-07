import { FieldInfo, ChartTypeInfo } from '@/types/chart.types';

export const formatChartTypeName = (chartType: string): string => {
  return chartType
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getChartIcon = (chartType: string): string => {
  const iconMap: Record<string, string> = {
    'bar': '📊',
    'line': '📈',
    'pie': '🍰',
    'scatter': '⭐',
    'area': '🏔️',
    'bubble': '⭕',
    'heatmap': '🔥',
    'treemap': '🌳',
    'waterfall': '💧',
    'radar': '🎯',
    'candlestick': '🕯️',
    'gauge': '⏱️',
    'funnel': '🔻',
    'sankey': '🌊',
    'sunburst': '☀️'
  };

  const lowerType = chartType.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerType.includes(key)) {
      return icon;
    }
  }
  
  return '📊'; // Default icon
};

export const getLibraryColor = (library: string): string => {
  const colorMap: Record<string, string> = {
    'd3js': 'warning',
    'echarts': 'primary',
    'chartjs': 'success',
    'plotly': 'secondary'
  };
  
  return colorMap[library] || 'default';
};

export const generateChartId = (chartType: string, library: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `${chartType}-${library}-${timestamp}-${random}`;
};

export const validateFieldCompatibility = (
  field: FieldInfo,
  supportedTypes: string[]
): { compatible: boolean; warning?: string } => {
  if (supportedTypes.includes(field.type)) {
    return { compatible: true };
  }

  // Check for possible type casting
  const castingRules: Record<string, string[]> = {
    'string': ['number'], // Can attempt to parse strings to numbers
    'number': ['string'], // Can always convert numbers to strings
    'date': ['string'], // Can format dates as strings
    'boolean': ['number', 'string'] // Can convert boolean to 1/0 or true/false
  };

  const possibleCasts = castingRules[field.type] || [];
  const canCast = supportedTypes.some(type => possibleCasts.includes(type));

  if (canCast) {
    return {
      compatible: true,
      warning: `Field '${field.displayName || field.name}' will be converted from ${field.type}. Consider adding cast operations in your dataset.`
    };
  }

  return { compatible: false };
};

export const getDefaultAggregation = (fieldType: string): string => {
  const aggregationMap: Record<string, string> = {
    'number': 'sum',
    'string': 'count',
    'date': 'count',
    'boolean': 'count'
  };

  return aggregationMap[fieldType] || 'count';
};

export const formatFieldValue = (value: any, fieldType: string): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  switch (fieldType) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
    default:
      return String(value);
  }
};

export const isChartTypeCompatible = (
  chartType: ChartTypeInfo,
  availableFields: FieldInfo[]
): { compatible: boolean; missingRequirements: string[] } => {
  const missingRequirements: string[] = [];

  // Check if we have enough fields for required axes
  Object.entries(chartType.dataRequirements.axes).forEach(([axisType, config]) => {
    if (config.required) {
      const compatibleFields = availableFields.filter(field =>
        config.supportedTypes.includes(field.type)
      );

      if (compatibleFields.length === 0) {
        missingRequirements.push(
          `${axisType}: requires ${config.supportedTypes.join(' or ')} field`
        );
      }
    }
  });

  return {
    compatible: missingRequirements.length === 0,
    missingRequirements
  };
};