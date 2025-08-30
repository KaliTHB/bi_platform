// web-application/src/plugins/charts/interfaces/index.ts

export interface ChartPlugin {
  name: string;
  displayName?: string;
  category?: string;
  component?: any;
  configSchema?: ChartConfigSchema;
}

export interface ChartConfigSchema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: any;
}

export interface SchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  minimum?: number;
  maximum?: number;
  enum?: any[];
}

export interface ChartProps {
  data: any[];
  config: any;
  dimensions: {
    width: number;
    height: number;
  };
  theme?: {
    name: string;
    colors: string[];
  };
  filters?: any[];
  onInteraction?: (event: ChartInteractionEvent) => void;
  onError?: (error: Error) => void;
  isLoading?: boolean;
  error?: string;
}

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan';
  data?: any;
  dataIndex?: number;
  seriesIndex?: number;
}