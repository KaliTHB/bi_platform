// src/plugins/charts/plotly/Surface3D.tsx
import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { ChartProps, ChartPluginConfig, ChartInteractionEvent } from '@/types/chart.types';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';
import {
  getThemeTextColor,
  getThemeBackgroundColor,
  getThemeGridColor,
  getPlotlyTextFont,
  getPlotlyTitleFont
} from '@/utils/themeHelpers';

interface Surface3DConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  xField: string;
  yField: string;
  zField: string;
  colorscale?: string | Array<[number, string]>;
  showscale?: boolean;
  reversescale?: boolean;
  opacity?: number;
  surfacecolor?: string[];
  contours?: {
    x?: {
      show?: boolean;
      start?: number;
      end?: number;
      size?: number;
      color?: string;
    };
    y?: {
      show?: boolean;
      start?: number;
      end?: number;
      size?: number;
      color?: string;
    };
    z?: {
      show?: boolean;
      start?: number;
      end?: number;
      size?: number;
      color?: string;
    };
  };
  lighting?: {
    ambient?: number;
    diffuse?: number;
    specular?: number;
    roughness?: number;
    fresnel?: number;
  };
  lightposition?: {
    x?: number;
    y?: number;
    z?: number;
  };
  colorbar?: {
    title?: string;
    titleside?: string;
    len?: number;
    thickness?: number;
    x?: number;
    y?: number;
  };
  hovertemplate?: string;
  showlabels?: boolean;
}

export interface Surface3DProps extends ChartProps {
  config: Surface3DConfig;
}

const Surface3D: React.FC<Surface3DProps> = ({ 
  data, 
  config: surfaceConfig, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const processedData = useMemo(() => {
    if (!data) return null;
    
    try {
      const dataArray = getDataArray(data);
      
      if (isChartDataEmpty(dataArray)) {
        return null;
      }
      
      // Validate required fields
      if (!surfaceConfig.xField || !surfaceConfig.yField || !surfaceConfig.zField) {
        throw new Error('xField, yField, and zField are required for 3D surface plot');
      }

      // Extract coordinate data
      const xValues = dataArray.map(item => Number(item[surfaceConfig.xField])).filter(val => !isNaN(val));
      const yValues = dataArray.map(item => Number(item[surfaceConfig.yField])).filter(val => !isNaN(val));
      const zValues = dataArray.map(item => Number(item[surfaceConfig.zField])).filter(val => !isNaN(val));

      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        throw new Error('No valid numeric data found for 3D surface plot');
      }

      // Create unique sorted arrays for surface grid
      const uniqueX = [...new Set(xValues)].sort((a, b) => a - b);
      const uniqueY = [...new Set(yValues)].sort((a, b) => a - b);

      // Create Z matrix for surface
      const zMatrix: (number | null)[][] = [];
      for (let i = 0; i < uniqueY.length; i++) {
        zMatrix[i] = [];
        for (let j = 0; j < uniqueX.length; j++) {
          // Find corresponding Z value
          const dataIndex = dataArray.findIndex(item => 
            Number(item[surfaceConfig.xField]) === uniqueX[j] && 
            Number(item[surfaceConfig.yField]) === uniqueY[i]
          );
          
          if (dataIndex !== -1) {
            zMatrix[i][j] = Number(dataArray[dataIndex][surfaceConfig.zField]) || 0;
          } else {
            zMatrix[i][j] = null; // Missing data point
          }
        }
      }

      return {
        x: uniqueX,
        y: uniqueY,
        z: zMatrix,
        originalData: dataArray
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process 3D surface data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, surfaceConfig, onError]);

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
        <Typography color="text.secondary">No data available for 3D surface plot</Typography>
      </Box>
    );
  }

  const plotData: PlotData[] = [{
    type: 'surface',
    x: processedData.x,
    y: processedData.y,
    z: processedData.z,
    colorscale: surfaceConfig.colorscale || 'Viridis',
    showscale: surfaceConfig.showscale !== false,
    reversescale: surfaceConfig.reversescale || false,
    opacity: surfaceConfig.opacity || 1,
    surfacecolor: surfaceConfig.surfacecolor,
    contours: surfaceConfig.contours ? {
      x: surfaceConfig.contours.x ? {
        show: surfaceConfig.contours.x.show !== false,
        start: surfaceConfig.contours.x.start,
        end: surfaceConfig.contours.x.end,
        size: surfaceConfig.contours.x.size || 1,
        color: surfaceConfig.contours.x.color || getThemeGridColor(theme)
      } : { show: false },
      y: surfaceConfig.contours.y ? {
        show: surfaceConfig.contours.y.show !== false,
        start: surfaceConfig.contours.y.start,
        end: surfaceConfig.contours.y.end,
        size: surfaceConfig.contours.y.size || 1,
        color: surfaceConfig.contours.y.color || getThemeGridColor(theme)
      } : { show: false },
      z: surfaceConfig.contours.z ? {
        show: surfaceConfig.contours.z.show !== false,
        start: surfaceConfig.contours.z.start,
        end: surfaceConfig.contours.z.end,
        size: surfaceConfig.contours.z.size || 1,
        color: surfaceConfig.contours.z.color || getThemeGridColor(theme)
      } : { show: false }
    } : undefined,
    lighting: surfaceConfig.lighting ? {
      ambient: surfaceConfig.lighting.ambient || 0.8,
      diffuse: surfaceConfig.lighting.diffuse || 0.8,
      specular: surfaceConfig.lighting.specular || 0.05,
      roughness: surfaceConfig.lighting.roughness || 0.5,
      fresnel: surfaceConfig.lighting.fresnel || 0.2
    } : {
      ambient: 0.8,
      diffuse: 0.8,
      specular: 0.05,
      roughness: 0.5,
      fresnel: 0.2
    },
    lightposition: surfaceConfig.lightposition || { x: 100, y: 200, z: 0 },
    hovertemplate: surfaceConfig.hovertemplate || 
      `${surfaceConfig.xField}: %{x}<br>${surfaceConfig.yField}: %{y}<br>${surfaceConfig.zField}: %{z}<extra></extra>`
  } as unknown as PlotData];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: surfaceConfig.title,
      // FIXED: Use proper theme structure
      font: getPlotlyTitleFont(theme)
    },
    scene: {
      xaxis: { 
        title: { text: surfaceConfig.xField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      yaxis: { 
        title: { text: surfaceConfig.yField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      zaxis: { 
        title: { text: surfaceConfig.zField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      // FIXED: Use proper theme structure
      bgcolor: getThemeBackgroundColor(theme)
    },
    font: getPlotlyTextFont(theme),
    // FIXED: Use proper theme structure
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    margin: { l: 60, r: 60, t: 80, b: 60 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: '3d-surface-plot',
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
            onInteraction({
              type: 'click',
              chartId: '',
              data: { x: point.x, y: point.y, z: point.z },
              dataIndex: point.pointIndex,
              timestamp: Date.now()
            } as ChartInteractionEvent);
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'hover',
              chartId: '',
              data: { x: point.x, y: point.y, z: point.z },
              dataIndex: point.pointIndex,
              timestamp: Date.now()
            });
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default Surface3D;