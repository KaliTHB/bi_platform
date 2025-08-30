// File: web-application/src/plugins/interfaces/ChartPlugin.ts
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

export interface ChartConfigSchema {
  type: 'object';
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'color';
      required?: boolean;
      default?: any;
      title?: string;
      description?: string;
      options?: Array<{ label: string; value: any }>;
    };
  };
  required?: string[];
}
