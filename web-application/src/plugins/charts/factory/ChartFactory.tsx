// File: web-application/src/components/charts/factory/ChartFactory.tsx
import React from 'react';
import { ChartRegistry } from '../registry/ChartRegistry';
import { ChartProps } from '../interfaces';

interface ChartFactoryProps extends ChartProps {
  chartType: string;
}

export const ChartFactory: React.FC<ChartFactoryProps> = ({
  chartType,
  ...props
}) => {
  const plugin = ChartRegistry.getPlugin(chartType);
  
  if (!plugin) {
    return (
      <div style={{ 
        width: props.width || 400, 
        height: props.height || 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: 4
      }}>
        <span>Chart type "{chartType}" not found</span>
      </div>
    );
  }
  
  const ChartComponent = plugin.component;
  
  return <ChartComponent {...props} />;
};

export default ChartFactory;