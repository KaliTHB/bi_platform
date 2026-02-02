// src/utils/themeHelpers.ts
import { ChartTheme } from '@/types/chart.types';

/**
 * Utility functions for accessing ChartTheme properties safely
 * Prevents TypeScript errors and provides consistent fallbacks
 */

export const getThemeTextColor = (theme?: ChartTheme): string => {
  return theme?.colors?.text || '#333333';
};

export const getThemeBackgroundColor = (theme?: ChartTheme): string => {
  return theme?.colors?.background || '#ffffff';
};

export const getThemeGridColor = (theme?: ChartTheme): string => {
  return theme?.colors?.grid || '#e0e0e0';
};

export const getThemeAxisColor = (theme?: ChartTheme): string => {
  return theme?.colors?.axis || '#666666';
};

export const getThemePrimaryColor = (theme?: ChartTheme, index: number = 0): string => {
  return theme?.colors?.primary?.[index] || '#1976d2';
};

export const getThemeFontFamily = (theme?: ChartTheme): string => {
  return theme?.fonts?.family || 'Roboto, Arial, sans-serif';
};

export const getThemeFontSize = (
  theme?: ChartTheme, 
  type: 'title' | 'subtitle' | 'axis' | 'legend' | 'tooltip' = 'axis'
): number => {
  const defaultSizes = {
    title: 16,
    subtitle: 14,
    axis: 12,
    legend: 12,
    tooltip: 11
  };
  
  return theme?.fonts?.sizes?.[type] || defaultSizes[type];
};

// Plotly-specific theme helpers
export const getPlotlyTextFont = (theme?: ChartTheme, size?: number) => ({
  color: getThemeTextColor(theme),
  family: getThemeFontFamily(theme),
  size: size || getThemeFontSize(theme, 'axis')
});

export const getPlotlyTitleFont = (theme?: ChartTheme) => ({
  color: getThemeTextColor(theme),
  family: getThemeFontFamily(theme),
  size: getThemeFontSize(theme, 'title')
});

// ECharts-specific theme helpers
export const getEChartsTextStyle = (theme?: ChartTheme, type: 'title' | 'axis' | 'legend' = 'axis') => ({
  color: getThemeTextColor(theme),
  fontFamily: getThemeFontFamily(theme),
  fontSize: getThemeFontSize(theme, type)
});

// D3/Generic chart helpers
export const getChartColors = (theme?: ChartTheme, count: number = 8): string[] => {
  const defaultColors = [
    '#1976d2', '#dc004e', '#388e3c', '#f57c00',
    '#7b1fa2', '#c62828', '#00796b', '#f9a825'
  ];
  
  if (!theme?.colors?.primary) {
    return defaultColors.slice(0, count);
  }
  
  const themeColors = theme.colors.primary;
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    colors.push(themeColors[i % themeColors.length]);
  }
  
  return colors;
};

// Migration helper - warns about deprecated usage
export const deprecatedThemeProperty = (propertyName: string) => {
  console.warn(`⚠️ Deprecated theme property: ${propertyName}. Please use the new ChartTheme structure.`);
};

// Type guards
export const hasValidTheme = (theme: any): theme is ChartTheme => {
  return theme && 
         typeof theme === 'object' &&
         theme.colors &&
         typeof theme.colors.text === 'string' &&
         theme.fonts &&
         typeof theme.fonts.family === 'string';
};