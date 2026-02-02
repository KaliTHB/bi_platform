import React from 'react';

export interface ChartFactoryConfig {
  data: any[];
  config: any;
  dimensions?: { width: number; height: number };
  theme?: ChartTheme;
  onError?: (error: Error) => void;
  onInteraction?: (event: ChartInteractionEvent) => void;
}

export interface ChartTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  colors?: string[];
  darkMode?: boolean;
}

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan';
  data?: any;
  point?: { x: number; y: number };
  selection?: any[];
}

export interface ChartCreationResult {
  success: boolean;
  chartElement?: React.ReactElement;
  chartType: string;
  library: string;
  config?: any;
  error?: string;
  warnings?: string[];
}

export interface ChartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChartPluginInfo {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  library: string;
  version: string;
  tags?: string[];
  configSchema: any;
  dataRequirements: any;
  exportFormats: string[];
  interactionSupport?: any;
}

export interface ChartError extends Error {
  code?: string;
  chartType?: string;
  library?: string;
  phase?: 'initialization' | 'configuration' | 'rendering' | 'interaction';
}