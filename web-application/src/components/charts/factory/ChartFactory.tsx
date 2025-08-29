// File: web-application/src/components/charts/factory/ChartFactory.tsx

import React, { useMemo } from 'react';
import { ChartPluginConfig, ChartProps } from '../interfaces/ChartPlugin';
import { getChartPlugin } from '../registry/ChartRegistry';

export interface ChartFactoryProps extends ChartProps {
  pluginName: string;
  fallback?: React.ReactNode;
}

export const ChartFactory: React.FC<ChartFactoryProps> = ({
  pluginName,
  fallback,
  ...chartProps
}) => {
  const plugin = useMemo(() => getChartPlugin(pluginName), [pluginName]);

  if (!plugin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded">
        <div className="text-gray-600 text-center">
          <p className="font-medium">Chart Plugin Not Found</p>
          <p className="text-sm">Plugin "{pluginName}" is not available</p>
        </div>
      </div>
    );
  }

  const ChartComponent = plugin.component;

  return <ChartComponent {...chartProps} />;
};

export default ChartFactory;