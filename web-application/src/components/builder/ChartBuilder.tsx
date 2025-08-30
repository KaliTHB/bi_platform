'use client';
import React, { useState } from 'react';
import { ChartSelector } from './ChartSelector';
import { ChartRenderer } from './ChartRenderer';
import { ChartPluginService } from '../../plugins/charts/services/ChartPluginService';

export const DashboardBuilder: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>({});

  const chartService = ChartPluginService.getInstance();

  const handleChartSelect = (chartType: string) => {
    setSelectedChart(chartType);
    const chartPlugin = chartService.getChart(chartType);
    
    if (chartPlugin) {
      // Initialize default config from schema
      const defaultConfig: any = {};
      Object.entries(chartPlugin.configSchema).forEach(([key, schema]) => {
        if (schema.default !== undefined) {
          defaultConfig[key] = schema.default;
        }
      });
      setChartConfig(defaultConfig);
    }
  };

  // Sample data for testing
  const sampleData = [
    { name: 'Jan', value: 100, category: 'A' },
    { name: 'Feb', value: 200, category: 'B' },
    { name: 'Mar', value: 150, category: 'A' },
    { name: 'Apr', value: 300, category: 'C' }
  ];

  return (
    <div className="dashboard-builder h-full flex">
      {/* Left Panel - Chart Selector */}
      <div className="w-80 border-r border-gray-200 bg-gray-50">
        <ChartSelector
          onSelectChart={handleChartSelect}
          selectedChart={selectedChart}
        />
      </div>

      {/* Main Panel - Chart Preview */}
      <div className="flex-1 p-6">
        {selectedChart ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Chart Preview</h2>
              <p className="text-gray-600">Selected: {selectedChart}</p>
            </div>
            
            <ChartRenderer
              chartType={selectedChart}
              data={sampleData}
              config={chartConfig}
              title="Sample Chart"
              description="This is a preview of your selected chart"
              className="h-96"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">Select a Chart</h3>
              <p>Choose a chart type from the left panel to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
