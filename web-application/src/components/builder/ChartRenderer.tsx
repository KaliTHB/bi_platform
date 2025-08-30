'use client';
import React from 'react';
import { ChartFactory } from '../../plugins/charts/ChartFactory';
import type { ChartProps } from '../../plugins/charts/interfaces';

interface ChartRendererProps extends ChartProps {
  chartType: string;
  title?: string;
  description?: string;
  className?: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chartType,
  title,
  description,
  className = '',
  ...chartProps
}) => {
  return (
    <div className={`chart-renderer bg-white rounded-lg shadow-sm ${className}`}>
      {(title || description) && (
        <div className="chart-header p-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="chart-content p-4">
        <ChartFactory
          chartType={chartType}
          {...chartProps}
        />
      </div>
    </div>
  );
};
