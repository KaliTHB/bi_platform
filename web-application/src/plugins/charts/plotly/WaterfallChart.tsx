// src/plugins/charts/plotly/WaterfallChart.tsx
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
  getThemePrimaryColor,
  getPlotlyTextFont,
  getPlotlyTitleFont,
  getThemeFontFamily,
  getChartColors
} from '@/utils/themeHelpers';

interface WaterfallChartConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  categoryField: string;
  valueField: string;
  measureField?: string; // 'relative', 'absolute', or 'total'
  textposition?: 'inside' | 'outside' | 'auto' | 'none';
  textinfo?: 'label' | 'value' | 'label+value';
  textfont?: {
    size?: number;
    color?: string;
    family?: string;
  };
  connector?: {
    line?: {
      color?: string;
      width?: number;
      dash?: string;
    };
    visible?: boolean;
  };
  increasing?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  decreasing?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  totals?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  hovertemplate?: string;
  showlegend?: boolean;
  orientation?: 'v' | 'h';
}

export interface WaterfallChartProps extends ChartProps {
  config: WaterfallChartConfig;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({
  data,
  config: waterfallConfig,
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

      const result = dataArray.map((item, index) => {
        const category = item[waterfallConfig.categoryField];
        const value = Number(item[waterfallConfig.valueField]) || 0;
        const measure = waterfallConfig.measureField ? 
          item[waterfallConfig.measureField] : 
          (index === dataArray.length - 1 ? 'total' : 'relative');

        return {
          category,
          value,
          measure
        };
      });

      return result.length > 0 ? result : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process waterfall chart data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, waterfallConfig, onError]);

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
        <Typography color="text.secondary">No data available for waterfall chart</Typography>
      </Box>
    );
  }

  // Default colors using theme-aware helpers
  const chartColors = getChartColors(theme, 3);
  const defaultIncreasingColor = getThemePrimaryColor(theme, 0) || '#2E8B57'; // Sea Green
  const defaultDecreasingColor = chartColors[1] || '#DC143C'; // Crimson
  const defaultTotalColor = chartColors[2] || '#4682B4';      // Steel Blue

  const plotData: PlotData[] = [{
    type: 'waterfall',
    x: waterfallConfig.orientation === 'h' ? processedData.map(item => item.value) : processedData.map(item => item.category),
    y: waterfallConfig.orientation === 'h' ? processedData.map(item => item.category) : processedData.map(item => item.value),
    text: processedData.map(item => item.category),
    textposition: waterfallConfig.textposition || 'outside',
    textinfo: waterfallConfig.textinfo || 'label+value',
    textfont: waterfallConfig.textfont ? {
      size: waterfallConfig.textfont.size || 12,
      // FIXED: Use proper theme structure
      color: waterfallConfig.textfont.color || getThemeTextColor(theme),
      family: waterfallConfig.textfont.family || getThemeFontFamily(theme)
    } : {
      size: 12,
      color: getThemeTextColor(theme),
      family: getThemeFontFamily(theme)
    },
    measure: processedData.map(item => item.measure),
    connector: waterfallConfig.connector ? {
      line: {
        // FIXED: Use proper theme structure
        color: waterfallConfig.connector.line?.color || getThemeGridColor(theme),
        width: waterfallConfig.connector.line?.width || 2,
        dash: waterfallConfig.connector.line?.dash || 'solid'
      },
      visible: waterfallConfig.connector.visible !== false
    } : {
      line: {
        color: getThemeGridColor(theme),
        width: 2,
        dash: 'solid'
      },
      visible: true
    },
    increasing: {
      marker: {
        color: waterfallConfig.increasing?.marker?.color || defaultIncreasingColor,
        line: {
          color: waterfallConfig.increasing?.marker?.line?.color || '#fff',
          width: waterfallConfig.increasing?.marker?.line?.width || 1
        }
      }
    },
    decreasing: {
      marker: {
        color: waterfallConfig.decreasing?.marker?.color || defaultDecreasingColor,
        line: {
          color: waterfallConfig.decreasing?.marker?.line?.color || '#fff',
          width: waterfallConfig.decreasing?.marker?.line?.width || 1
        }
      }
    },
    totals: {
      marker: {
        color: waterfallConfig.totals?.marker?.color || defaultTotalColor,
        line: {
          color: waterfallConfig.totals?.marker?.line?.color || '#fff',
          width: waterfallConfig.totals?.marker?.line?.width || 1
        }
      }
    },
    hovertemplate: waterfallConfig.hovertemplate || 
      `<b>%{text}</b><br>` +
      `${waterfallConfig.valueField}: %{y}<br>` +
      `Type: %{measure}<br>` +
      `<extra></extra>`,
    showlegend: waterfallConfig.showlegend !== false
  } as unknown as PlotData];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: waterfallConfig.title,
      font: { 
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        size: 16
      }
    },
    xaxis: {
      title: { 
        text: waterfallConfig.orientation === 'h' ? waterfallConfig.valueField : waterfallConfig.categoryField 
      },
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme),
      tickangle: waterfallConfig.orientation !== 'h' ? -45 : 0
    },
    yaxis: {
      title: { 
        text: waterfallConfig.orientation === 'h' ? waterfallConfig.categoryField : waterfallConfig.valueField 
      },
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme)
    },
    font: {
      color: getThemeTextColor(theme),
      family: getThemeFontFamily(theme)
    },
    // FIXED: Use proper theme structure
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    showlegend: waterfallConfig.showlegend !== false,
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
      filename: 'waterfall-chart',
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

export default WaterfallChart;