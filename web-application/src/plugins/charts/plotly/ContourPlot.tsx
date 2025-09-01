// src/plugins/charts/plotly/ContourPlot.tsx
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
  getThemeFontSize,
  getPlotlyTextFont,
  getPlotlyTitleFont 
} from '@/utils/themeHelpers';

interface ContourPlotConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  xField: string;
  yField: string;
  zField: string;
  contours?: {
    start?: number;
    end?: number;
    size?: number;
    coloring?: 'fill' | 'heatmap' | 'lines';
    showlines?: boolean;
    labelfont?: {
      size?: number;
      color?: string;
    };
  };
  colorscale?: string | Array<[number, string]>;
  showscale?: boolean;
  connectgaps?: boolean;
  line?: {
    color?: string;
    width?: number;
    smoothing?: number;
  };
  hoverongaps?: boolean;
  hovertemplate?: string;
  colorbar?: {
    title?: string;
    titleside?: 'right' | 'top' | 'bottom';
    tickmode?: string;
    tick0?: number;
    dtick?: number;
  };
  autocontour?: boolean;
  ncontours?: number;
  reversescale?: boolean;
  opacity?: number;
}

export interface ContourPlotProps extends ChartProps {
  config: ContourPlotConfig;
}

const ContourPlot: React.FC<ContourPlotProps> = ({
  data,
  config: contourConfig,
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

      // Extract values for each field
      const xValues = dataArray.map(item => item[contourConfig.xField]).filter(val => val !== null && val !== undefined);
      const yValues = dataArray.map(item => item[contourConfig.yField]).filter(val => val !== null && val !== undefined);
      const zValues = dataArray.map(item => item[contourConfig.zField]).filter(val => val !== null && val !== undefined);

      // Return null if any field has no valid values
      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        return null;
      }

      return {
        x: xValues,
        y: yValues,
        z: zValues,
        originalData: dataArray
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process contour plot data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, contourConfig, onError]);

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
        <Typography color="text.secondary">No data available for contour plot</Typography>
      </Box>
    );
  }

  // Create unique sorted arrays for grid
  const uniqueX = [...new Set(processedData.x)].sort((a, b) => a - b);
  const uniqueY = [...new Set(processedData.y)].sort((a, b) => a - b);

  // Create Z matrix - explicitly type to allow null values
  const zMatrix: (number | null)[][] = [];
  for (let i = 0; i < uniqueY.length; i++) {
    zMatrix[i] = [];
    for (let j = 0; j < uniqueX.length; j++) {
      // Find corresponding Z value
      const dataIndex = processedData.originalData.findIndex(item => 
        item[contourConfig.xField] === uniqueX[j] && 
        item[contourConfig.yField] === uniqueY[i]
      );
      
      if (dataIndex !== -1) {
        zMatrix[i][j] = Number(processedData.originalData[dataIndex][contourConfig.zField]) || 0;
      } else {
        zMatrix[i][j] = null; // Missing data point
      }
    }
  }

  const plotData: PlotData[] = [{
    type: 'contour',
    x: uniqueX,
    y: uniqueY,
    z: zMatrix,
    colorscale: contourConfig.colorscale || 'Viridis',
    showscale: contourConfig.showscale !== false,
    connectgaps: contourConfig.connectgaps || false,
    hoverongaps: contourConfig.hoverongaps || false,
    autocontour: contourConfig.autocontour !== false,
    ncontours: contourConfig.ncontours || 15,
    reversescale: contourConfig.reversescale || false,
    opacity: contourConfig.opacity || 1,
    contours: contourConfig.contours ? {
      start: contourConfig.contours.start,
      end: contourConfig.contours.end,
      size: contourConfig.contours.size,
      coloring: contourConfig.contours.coloring || 'fill',
      showlines: contourConfig.contours.showlines !== false,
      labelfont: contourConfig.contours.labelfont ? {
        size: contourConfig.contours.labelfont.size || getThemeFontSize(theme, 'axis'),
        color: contourConfig.contours.labelfont.color || getThemeTextColor(theme)
      } : getPlotlyTextFont(theme, 10)
    } : {
      coloring: 'fill',
      showlines: true,
      labelfont: getPlotlyTextFont(theme, 10)
    },
    line: contourConfig.line ? {
      color: contourConfig.line.color || getThemeTextColor(theme),
      width: contourConfig.line.width || 1,
      smoothing: contourConfig.line.smoothing || 1
    } : {
      color: getThemeTextColor(theme),
      width: 1,
      smoothing: 1
    },
    hovertemplate: contourConfig.hovertemplate || 
      `<b>%{fullData.name}</b><br>` +
      `${contourConfig.xField}: %{x}<br>` +
      `${contourConfig.yField}: %{y}<br>` +
      `${contourConfig.zField}: %{z}<br>` +
      `<extra></extra>`,
    colorbar: contourConfig.colorbar ? {
      title: contourConfig.colorbar.title || contourConfig.zField,
      titleside: contourConfig.colorbar.titleside || 'right',
      tickmode: contourConfig.colorbar.tickmode || 'linear',
      tick0: contourConfig.colorbar.tick0,
      dtick: contourConfig.colorbar.dtick
    } : {
      title: contourConfig.zField
    }
  } as unknown as PlotData];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: contourConfig.title,
      font: getPlotlyTitleFont(theme)
    },
    font: getPlotlyTextFont(theme),
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    xaxis: {
      title: { text: contourConfig.xField },
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme)
    },
    yaxis: {
      title: { text: contourConfig.yField },
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme)
    },
    margin: { l: 60, r: 100, t: 80, b: 60 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'contour-plot',
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

export default ContourPlot;