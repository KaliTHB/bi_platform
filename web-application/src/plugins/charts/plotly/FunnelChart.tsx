// src/plugins/charts/plotly/FunnelChart.tsx
import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { ChartProps, ChartPluginConfig } from '@/types/chart.types';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';
import {
  getThemeTextColor,
  getThemeBackgroundColor,
  getThemeGridColor,
  getPlotlyTextFont,
  getPlotlyTitleFont,
  getThemeFontFamily,
  getChartColors
} from '@/utils/themeHelpers';

interface FunnelChartConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  labelField: string;
  valueField: string;
  textposition?: 'inside' | 'outside' | 'auto' | 'none';
  textinfo?: 'label' | 'value' | 'percent' | 'label+value' | 'label+percent' | 'value+percent' | 'label+value+percent';
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
    line?: {
      color?: string;
      width?: number;
    };
  };
  hoverinfo?: string;
  hovertemplate?: string;
  showlegend?: boolean;
  orientation?: 'v' | 'h';
}

export interface FunnelChartProps extends ChartProps {
  config: FunnelChartConfig;
}

const FunnelChart: React.FC<FunnelChartProps> = ({
  data,
  config: funnelConfig,
  dimensions,
  theme,
  filters,
  onInteraction,
  onError,
  isLoading,
  error
}) => {
  // Process and validate data
  const processedData = useMemo(() => {
    if (!data) return null;
    
    try {
      const dataArray = getDataArray(data);
      
      if (isChartDataEmpty(dataArray)) {
        return null;
      }

      const result = dataArray.map(item => ({
        label: item[funnelConfig.labelField],
        value: Number(item[funnelConfig.valueField]) || 0
      })).filter(item => item.value > 0); // Remove zero/negative values

      return result.length > 0 ? result : null;
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

  if (!processedData) {
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

  // Generate colors if not provided using theme-aware helpers
  const chartColors = getChartColors(theme, processedData.length);
  const colors = funnelConfig.marker?.colors || chartColors;

  const plotData: PlotData[] = [{
    type: 'funnel',
    x: funnelConfig.orientation === 'h' ? processedData.map(item => item.value) : processedData.map(item => item.label),
    y: funnelConfig.orientation === 'h' ? processedData.map(item => item.label) : processedData.map(item => item.value),
    text: processedData.map(item => item.label),
    values: processedData.map(item => item.value),
    textposition: funnelConfig.textposition || 'inside',
    textinfo: funnelConfig.textinfo || 'label+percent',
    textfont: funnelConfig.textfont ? {
      size: funnelConfig.textfont.size || 12,
      // FIXED: Use proper theme structure
      color: funnelConfig.textfont.color || getThemeTextColor(theme),
      family: funnelConfig.textfont.family || getThemeFontFamily(theme)
    } : {
      size: 12,
      color: getThemeTextColor(theme),
      family: getThemeFontFamily(theme)
    },
    connector: funnelConfig.connector ? {
      line: {
        // FIXED: Use proper theme structure
        color: funnelConfig.connector.line?.color || getThemeGridColor(theme),
        width: funnelConfig.connector.line?.width || 2
      },
      fillcolor: funnelConfig.connector.fillcolor || 'rgba(136,136,136,0.2)',
      visible: funnelConfig.connector.visible !== false
    } : {
      line: { color: getThemeGridColor(theme), width: 2 },
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
  } as unknown as PlotData];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: funnelConfig.title,
      font: { 
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        size: 16
      }
    },
    font: {
      color: getThemeTextColor(theme),
      family: getThemeFontFamily(theme)
    },
    // FIXED: Use proper theme structure
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    showlegend: funnelConfig.showlegend !== false && processedData.length > 1,
    legend: {
      orientation: 'v',
      x: 1.02,
      y: 1,
      font: { color: getThemeTextColor(theme) }
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
        onClick={(event) => {
          if (onInteraction) {
            onInteraction({
              type: 'click',
              chartId: '',
              data: event.points[0],
              dataIndex: event.points[0].pointIndex,
              timestamp: Date.now()
            });
          }
        }}
        onHover={(event) => {
          if (onInteraction) {
            onInteraction({
              type: 'hover',
              chartId: '',
              data: event.points[0],
              dataIndex: event.points[0].pointIndex,
              timestamp: Date.now()
            });
          }
        }}
      />
    </Box>
  );
};

export default FunnelChart;