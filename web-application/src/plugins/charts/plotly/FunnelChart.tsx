import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';

interface FunnelChartConfig extends ChartConfiguration {
  title?: string;
  subtitle?: string;
  labelField: string;
  valueField: string;
  textposition?: 'inside' | 'outside' | 'auto' | 'none';
  textinfo?: 'label' | 'percent' | 'value' | 'label+percent' | 'label+value' | 'percent+value' | 'label+percent+value';
  textfont?: {
    size?: number;
    color?: string;
    family?: string;
  };
  connector?: {
    line?: {
      color?: string;
      width?: number;
    };
    fillcolor?: string;
    visible?: boolean;
  };
  opacity?: number;
  marker?: {
    colors?: string[];
    colorscale?: string;
    line?: {
      color?: string;
      width?: number;
    };
  };
  hoverinfo?: string;
  hovertemplate?: string;
  showlegend?: boolean;
  orientation?: 'v' | 'h';
  sort?: boolean;
}

export const FunnelChart: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const funnelConfig = config as FunnelChartConfig;

  const processedData = useMemo(() => {
    if (isChartDataEmpty(data)) {
      return null;
    }

    try {
      const dataArray = getDataArray(data);
      
      // Validate required fields
      if (!funnelConfig.labelField || !funnelConfig.valueField) {
        throw new Error('labelField and valueField are required for funnel chart');
      }

      // Extract and process data
      const processedItems = dataArray
        .map(item => ({
          label: String(item[funnelConfig.labelField] || ''),
          value: Number(item[funnelConfig.valueField]) || 0
        }))
        .filter(item => item.label && item.value > 0);

      if (processedItems.length === 0) {
        throw new Error('No valid data found for funnel chart');
      }

      // Sort by value descending if sort is enabled (default behavior for funnels)
      if (funnelConfig.sort !== false) {
        processedItems.sort((a, b) => b.value - a.value);
      }

      return processedItems;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process funnel chart data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, funnelConfig, onError]);

  if (error) {
    return (
      <Alert severity="error" sx={{ width: dimensions?.width, height: dimensions?.height }}>
        Chart Error: {error}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ 
        width: dimensions?.width, 
        height: dimensions?.height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <Box sx={{ 
        width: dimensions?.width, 
        height: dimensions?.height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px dashed #ccc',
        borderRadius: 1
      }}>
        <Typography color="text.secondary">No data available for funnel chart</Typography>
      </Box>
    );
  }

  // Generate colors if not provided
  const defaultColors = theme?.colors || [
    '#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a',
    '#19d3f3', '#ff6692', '#b6e880', '#ff97ff', '#fecb52'
  ];
  
  const colors = funnelConfig.marker?.colors || 
    processedData.map((_, index) => defaultColors[index % defaultColors.length]);

  const plotData: any[] = [{
    type: 'funnel',
    x: funnelConfig.orientation === 'h' ? processedData.map(item => item.value) : processedData.map(item => item.label),
    y: funnelConfig.orientation === 'h' ? processedData.map(item => item.label) : processedData.map(item => item.value),
    text: processedData.map(item => item.label),
    values: processedData.map(item => item.value),
    textposition: funnelConfig.textposition || 'inside',
    textinfo: funnelConfig.textinfo || 'label+percent',
    textfont: funnelConfig.textfont ? {
      size: funnelConfig.textfont.size || 12,
      color: funnelConfig.textfont.color || theme?.textColor || '#333',
      family: funnelConfig.textfont.family || theme?.fontFamily || 'Arial, sans-serif'
    } : {
      size: 12,
      color: theme?.textColor || '#333',
      family: theme?.fontFamily || 'Arial, sans-serif'
    },
    connector: funnelConfig.connector ? {
      line: {
        color: funnelConfig.connector.line?.color || theme?.gridColor || '#888',
        width: funnelConfig.connector.line?.width || 2
      },
      fillcolor: funnelConfig.connector.fillcolor || 'rgba(136,136,136,0.2)',
      visible: funnelConfig.connector.visible !== false
    } : {
      line: { color: theme?.gridColor || '#888', width: 2 },
      fillcolor: 'rgba(136,136,136,0.2)',
      visible: true
    },
    opacity: funnelConfig.opacity || 0.8,
    marker: {
      colors: colors,
      line: {
        color: funnelConfig.marker?.line?.color || '#fff',
        width: funnelConfig.marker?.line?.width || 1
      }
    },
    hoverinfo: funnelConfig.hoverinfo || 'label+percent+value',
    hovertemplate: funnelConfig.hovertemplate || 
      `<b>%{label}</b><br>` +
      `${funnelConfig.valueField}: %{value}<br>` +
      `Percentage: %{percent}<br>` +
      `<extra></extra>`,
    showlegend: funnelConfig.showlegend !== false
  }];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: funnelConfig.title,
      font: { 
        color: theme?.textColor || '#333',
        size: 16
      }
    },
    font: {
      color: theme?.textColor || '#333',
      family: theme?.fontFamily || 'Arial, sans-serif'
    },
    plot_bgcolor: theme?.backgroundColor || 'white',
    paper_bgcolor: theme?.backgroundColor || 'white',
    showlegend: funnelConfig.showlegend !== false && processedData.length > 1,
    legend: {
      orientation: 'v',
      x: 1.02,
      y: 1,
      font: { color: theme?.textColor || '#333' }
    },
    margin: { l: 60, r: 100, t: 80, b: 60 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'zoom2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'funnel-chart',
      height: dimensions?.height || 300,
      width: dimensions?.width || 400,
      scale: 1
    }
  };

  return (
    <Box sx={{ width: dimensions?.width, height: dimensions?.height }}>
      <Plot
        data={plotData}
        layout={layout}
        config={plotConfig}
        onClick={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            const dataIndex = point.pointNumber;
            const item = processedData[dataIndex];
            
            onInteraction({
              type: 'click',
              data: {
                label: item.label,
                value: item.value,
                percent: point.percent
              },
              dataIndex
            });
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            const dataIndex = point.pointNumber;
            const item = processedData[dataIndex];
            
            onInteraction({
              type: 'hover',
              data: {
                label: item.label,
                value: item.value,
                percent: point.percent
              },
              dataIndex
            });
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default FunnelChart;