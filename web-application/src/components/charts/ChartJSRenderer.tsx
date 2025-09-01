'use client';

import React, { useMemo } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import {
  ChartProps,
  ChartConfiguration,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { Chart, ChartEvent, ActiveElement } from "chart.js";

// Import Chart.js components
import BarChart from '@/plugins/charts/chartjs/BarChart';
import LineChart from '@/plugins/charts/chartjs/LineChart';
import DoughnutChart from '@/plugins/charts/chartjs/DoughnutChart';
import RadarChart from '@/plugins/charts/chartjs/RadarChart';
import PolarChart from '@/plugins/charts/chartjs/PolarChart';
import BubbleChart from '@/plugins/charts/chartjs/BubbleChart';
import ScatterChart from '@/plugins/charts/chartjs/ScatterChart';
import MixedChart from '@/plugins/charts/chartjs/MixedChart';

interface ChartJSRendererProps extends ChartProps {
  className?: string;
  style?: React.CSSProperties;
}

const ChartJSRenderer: React.FC<ChartJSRendererProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  onError,
  className,
  style
}) => {
  // Transform data for Chart.js format
  const chartJSData = useMemo(() => {
    if (!data || data.length === 0) return null;

    try {
      return transformDataForChartJS(data, config);
    } catch (error) {
      console.error('Error transforming data for Chart.js:', error);
      onError?.({
        code: 'DATA_TRANSFORM_ERROR',
        message: 'Failed to transform data for Chart.js',
        timestamp: Date.now()
      });
      return null;
    }
  }, [data, config, onError]);

  // Chart.js options
  const chartJSOptions = useMemo(() => {
    return generateChartJSOptions(config, dimensions, theme, onInteraction);
  }, [config, dimensions, theme, onInteraction]);

  // Handle chart type and render appropriate component
  const renderChart = () => {
    if (!chartJSData) {
      return (
        <Alert severity="warning">
          No data available for Chart.js rendering
        </Alert>
      );
    }

    const chartType = config.chartType || config.library_config?.chartType || 'bar';
    const baseProps = {
      data: chartJSData,
      options: chartJSOptions,
      width: dimensions.width,
      height: dimensions.height,
      className: 'chartjs-chart'
    };

    switch (chartType) {
      case 'bar':
      case 'horizontal-bar':
        return <BarChart {...baseProps as any} />;
      
      case 'line':
      case 'area':
        return <LineChart {...baseProps as any} />;
      
      case 'doughnut':
      case 'pie':
        return <DoughnutChart {...baseProps as any} />;
      
      case 'radar':
        return <RadarChart {...baseProps as any} />;
      
      case 'polarArea':
        return <PolarChart {...baseProps as any} />;
      
      case 'bubble':
        return <BubbleChart {...baseProps as any} />;
      
      case 'scatter':
        return <ScatterChart {...baseProps as any} />;
      
      case 'mixed':
        return <MixedChart {...baseProps as any} />;
      
      default:
        return (
          <Alert severity="error">
            <Typography variant="subtitle2">
              Unsupported Chart.js chart type: {chartType}
            </Typography>
            <Typography variant="body2">
              Supported types: bar, line, doughnut, pie, radar, polarArea, bubble, scatter, mixed
            </Typography>
          </Alert>
        );
    }
  };

  return (
    <Box
      className={className}
      style={style}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {renderChart()}
    </Box>
  );
};

// Helper function to transform data for Chart.js format
const transformDataForChartJS = (data: any[], config: ChartConfiguration) => {
  const chartType = config.chartType || config.library_config?.chartType || 'bar';
  
  switch (chartType) {
    case 'bar':
    case 'line':
    case 'area':
      return transformForBarLineChart(data, config);
    
    case 'doughnut':
    case 'pie':
      return transformForPieChart(data, config);
    
    case 'radar':
      return transformForRadarChart(data, config);
    
    case 'polarArea':
      return transformForPolarChart(data, config);
    
    case 'bubble':
      return transformForBubbleChart(data, config);
    
    case 'scatter':
      return transformForScatterChart(data, config);
    
    default:
      return transformForBarLineChart(data, config);
  }
};

const transformForBarLineChart = (data: any[], config: ChartConfiguration) => {
  const xField = config.axes?.x?.field || config.x_axis?.column;
  const yFields = (config.axes?.y?.field ? [config.axes.y.field] : []) 
    .concat(config.y_axes?.map((y: any) => y.column) || [])
    .filter(Boolean);
  
  if (!xField || yFields.length === 0) {
    throw new Error('Missing axis configuration for bar/line chart');
  }

  const labels = data.map(row => row[xField]);
  
  const datasets = yFields.map((field: string, index: number) => {
    const yAxisConfig = config.y_axes?.find((y: any) => y.column === field) || {};
    
    return {
      label: yAxisConfig.name || field,
      data: data.map(row => row[field]),
      backgroundColor: yAxisConfig.color || getDefaultColor(index, 0.6),
      borderColor: yAxisConfig.color || getDefaultColor(index, 1),
      borderWidth: yAxisConfig.line_width || 2,
      fill: config.chartType === 'area',
      tension: yAxisConfig.line_style === 'smooth' ? 0.4 : 0,
    };
  });

  return { labels, datasets };
};

const transformForPieChart = (data: any[], config: ChartConfiguration) => {
  const labelField = config.axes?.x?.field || config.category_field;
  const valueField = config.axes?.y?.field?.[0] || config.value_field;
  
  if (!labelField || !valueField) {
    throw new Error('Missing field configuration for pie chart');
  }

  const labels = data.map(row => row[labelField]);
  const values = data.map(row => row[valueField]);
  
  const datasets = [{
    data: values,
    backgroundColor: data.map((_, index) => getDefaultColor(index, 0.8)),
    borderColor: data.map((_, index) => getDefaultColor(index, 1)),
    borderWidth: 1
  }];

  return { labels, datasets };
};

const transformForRadarChart = (data: any[], config: ChartConfiguration) => {
  const labelField = config.axes?.x?.field || config.category_field;
  const valueFields = (config.axes?.y?.field ? [config.axes.y.field] : [])
    .concat(config.metrics || [])
    .filter(Boolean);
  
  if (!labelField || valueFields.length === 0) {
    throw new Error('Missing field configuration for radar chart');
  }

  const labels = data.map(row => row[labelField]);
  
  const datasets = valueFields.map((field: string, index: number) => ({
    label: field,
    data: data.map(row => row[field]),
    backgroundColor: getDefaultColor(index, 0.2),
    borderColor: getDefaultColor(index, 1),
    borderWidth: 2,
    pointBackgroundColor: getDefaultColor(index, 1)
  }));

  return { labels, datasets };
};

const transformForPolarChart = (data: any[], config: ChartConfiguration) => {
  // Similar to pie chart transformation
  return transformForPieChart(data, config);
};

const transformForBubbleChart = (data: any[], config: ChartConfiguration) => {
  const xField = config.axes?.x?.field || config.x_field;
  const yField = config.axes?.y?.field || config.y_field;
  const sizeField = config.size_field || config.bubble_size_field;
  
  if (!xField || !yField || !sizeField) {
    throw new Error('Missing field configuration for bubble chart');
  }

  const datasets = [{
    label: 'Bubble Chart',
    data: data.map(row => ({
      x: row[xField],
      y: row[yField],
      r: row[sizeField]
    })),
    backgroundColor: getDefaultColor(0, 0.6),
    borderColor: getDefaultColor(0, 1),
    borderWidth: 1
  }];

  return { datasets };
};

const transformForScatterChart = (data: any[], config: ChartConfiguration) => {
  const xField = config.axes?.x?.field || config.x_field;
  const yField = config.axes?.y?.field || config.y_field;
  
  if (!xField || !yField) {
    throw new Error('Missing field configuration for scatter chart');
  }

  const datasets = [{
    label: 'Scatter Plot',
    data: data.map(row => ({
      x: row[xField],
      y: row[yField]
    })),
    backgroundColor: getDefaultColor(0, 0.6),
    borderColor: getDefaultColor(0, 1),
    borderWidth: 1
  }];

  return { datasets };
};

// Generate Chart.js options
const generateChartJSOptions = (
  config: ChartConfiguration,
  dimensions: any,
  theme: any,
  onInteraction?: (event: ChartInteractionEvent) => void
) => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!config.title?.text,
        text: config.title?.text,
        position: config.title?.position || 'top',
        font: {
          size: config.title?.textStyle?.fontSize || 16,
          weight: config.title?.textStyle?.fontWeight || 'bold',
        },
        color: config.title?.textStyle?.color || theme?.textColor || '#333'
      },
      legend: {
        display: config.legend?.show !== false,
        position: config.legend?.position || 'top',
        labels: {
          color: theme?.textColor || '#666',
          font: {
            size: config.legend?.textStyle?.fontSize || 12
          }
        }
      },
      tooltip: {
        enabled: config.tooltip?.show !== false,
        backgroundColor: theme?.backgroundColor || 'rgba(0,0,0,0.8)',
        titleColor: theme?.textColor || '#fff',
        bodyColor: theme?.textColor || '#fff'
      }
    },
    scales: generateScales(config, theme),
    onClick: (event: ChartEvent, elements: ActiveElement[], chart: Chart) => {
  if (onInteraction && elements.length > 0) {
    const element = elements[0];
    const dataset = chart.data.datasets[element.datasetIndex];
    const value = element.parsed; // parsed value from chart
    const label = chart.data.labels?.[element.index]; // optional: label

    onInteraction({
      type: "click",
      dataIndex: element.index,
      seriesIndex: element.datasetIndex,
      value, // ✅ safe now
      label, // optional
      timestamp: Date.now(),
    });
  }
},
    onHover: (event: any, elements: any[]) => {
      if (onInteraction && elements.length > 0) {
        const element = elements[0];
        onInteraction({
          type: 'hover',
          dataIndex: element.index,
          seriesIndex: element.datasetIndex,
          value: element.parsed,
          timestamp: Date.now()
        });
      }
    }
  };

  return baseOptions;
};

const generateScales = (config: ChartConfiguration, theme: any) => {
  const scales: any = {};

  if (config.axes?.x) {
    scales.x = {
      display: config.axes.x.show !== false,
      title: {
        display: !!config.axes.x.title,
        text: config.axes.x.title,
        color: theme?.textColor || '#666'
      },
      ticks: {
        color: theme?.textColor || '#666'
      },
      grid: {
        display: config.axes.x.gridlines !== false,
        color: theme?.gridColor || '#e0e0e0'
      }
    };
  }

  if (config.axes?.y) {
    scales.y = {
      display: config.axes.y.show !== false,
      title: {
        display: !!config.axes.y.title,
        text: config.axes.y.title,
        color: theme?.textColor || '#666'
      },
      ticks: {
        color: theme?.textColor || '#666'
      },
      grid: {
        display: config.axes.y.gridlines !== false,
        color: theme?.gridColor || '#e0e0e0'
      }
    };
  }

  return scales;
};

// Helper function to get default colors
const getDefaultColor = (index: number, alpha: number = 1): string => {
  const colors = [
    '#1976d2', '#dc004e', '#388e3c', '#f57c00',
    '#7b1fa2', '#c62828', '#00796b', '#f9a825',
    '#5d4037', '#455a64', '#e91e63', '#00bcd4'
  ];
  
  const color = colors[index % colors.length];
  
  if (alpha === 1) {
    return color;
  }
  
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default ChartJSRenderer;