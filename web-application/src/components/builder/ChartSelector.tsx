'use client';
import React, { useState, useEffect } from 'react';
import { ChartPluginService } from '../../plugins/charts/services/ChartPluginService';
import type { ChartPluginConfig } from '../../plugins/charts/interfaces';

interface ChartSelectorProps {
  onSelectChart: (chartType: string) => void;
  selectedChart?: string;
}

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  onSelectChart,
  selectedChart
}) => {
  const [charts, setCharts] = useState<ChartPluginConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chartService = ChartPluginService.getInstance();

  useEffect(() => {
    // Load chart plugins
    const loadCharts = () => {
      if (selectedCategory === 'all') {
        setCharts(chartService.getAllCharts());
      } else {
        setCharts(chartService.getChartsByCategory(selectedCategory));
      }
    };

    loadCharts();
  }, [selectedCategory, chartService]);

  const filteredCharts = searchQuery
    ? chartService.searchCharts(searchQuery)
    : charts;

  const categories = chartService.getChartCategories();

  return (
    <div className="chart-selector p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Select Chart Type</h3>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search charts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3"
        />

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredCharts.map(chart => (
          <div
            key={chart.name}
            onClick={() => onSelectChart(chart.name)}
            className={`
              chart-option p-3 border rounded-lg cursor-pointer transition-colors
              ${selectedChart === chart.name 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{chart.icon || '📊'}</div>
              <h4 className="text-sm font-medium text-gray-800">{chart.displayName}</h4>
              <p className="text-xs text-gray-500 mt-1">{chart.library}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredCharts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No charts found matching your criteria
        </div>
      )}
    </div>
  );
};
