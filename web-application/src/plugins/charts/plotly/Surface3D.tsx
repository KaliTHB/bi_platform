import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';

interface Surface3DConfig extends ChartConfiguration {
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

export const Surface3D: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const surfaceConfig = config as Surface3DConfig;

  const processedData = useMemo(() => {
    if (isChartDataEmpty(data)) {
      return null;
    }

    try {
      const dataArray = getDataArray(data);
      
      // Validate required fields
      if (!surfaceConfig.xField || !surfaceConfig.yField || !surfaceConfig.zField) {
        throw new Error('xField, yField, and zField are required for 3D surface plot');
      }

      // Extract and validate numeric values
      const xValues = dataArray.map(item => Number(item[surfaceConfig.xField])).filter(val => !isNaN(val));
      const yValues = dataArray.map(item => Number(item[surfaceConfig.yField])).filter(val => !isNaN(val));
      const zValues = dataArray.map(item => Number(item[surfaceConfig.zField])).filter(val => !isNaN(val));

      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        throw new Error('No valid numeric data found for 3D surface plot');
      }

      // Get unique x and y values and sort them
      const xUnique = [...new Set(xValues)].sort((a, b) => a - b);
      const yUnique = [...new Set(yValues)].sort((a, b) => a - b);

      // Create z matrix for surface plot
      const zMatrix: number[][] = [];
      for (let i = 0; i < yUnique.length; i++) {
        zMatrix[i] = [];
        for (let j = 0; j < xUnique.length; j++) {
          // Find data points that match this x,y coordinate
          const matchingItems = dataArray.filter(item => {
            const x = Number(item[surfaceConfig.xField]);
            const y = Number(item[surfaceConfig.yField]);
            return Math.abs(x - xUnique[j]) < 0.001 && Math.abs(y - yUnique[i]) < 0.001;
          });
          
          if (matchingItems.length > 0) {
            // Average z values if multiple points exist at same x,y
            const avgZ = matchingItems.reduce((sum, item) => 
              sum + Number(item[surfaceConfig.zField]), 0) / matchingItems.length;
            zMatrix[i][j] = avgZ;
          } else {
            // Interpolate or use 0 for missing values
            zMatrix[i][j] = 0;
          }
        }
      }

      return {
        x: xUnique,
        y: yUnique,
        z: zMatrix
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

  const plotData: any[] = [{
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
        size: surfaceConfig.contours.x.size,
        color: surfaceConfig.contours.x.color || theme?.colors?.[0] || '#636efa'
      } : undefined,
      y: surfaceConfig.contours.y ? {
        show: surfaceConfig.contours.y.show !== false,
        start: surfaceConfig.contours.y.start,
        end: surfaceConfig.contours.y.end,
        size: surfaceConfig.contours.y.size,
        color: surfaceConfig.contours.y.color || theme?.colors?.[1] || '#ef553b'
      } : undefined,
      z: surfaceConfig.contours.z ? {
        show: surfaceConfig.contours.z.show !== false,
        start: surfaceConfig.contours.z.start,
        end: surfaceConfig.contours.z.end,
        size: surfaceConfig.contours.z.size,
        color: surfaceConfig.contours.z.color || theme?.colors?.[2] || '#00cc96'
      } : undefined
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
    colorbar: surfaceConfig.colorbar ? {
      ...surfaceConfig.colorbar,
      titlefont: { color: theme?.textColor || '#333' },
      tickfont: { color: theme?.textColor || '#333' }
    } : {
      titlefont: { color: theme?.textColor || '#333' },
      tickfont: { color: theme?.textColor || '#333' }
    },
    hovertemplate: surfaceConfig.hovertemplate || 
      `${surfaceConfig.xField}: %{x}<br>${surfaceConfig.yField}: %{y}<br>${surfaceConfig.zField}: %{z}<extra></extra>`
  }];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: surfaceConfig.title,
      font: { color: theme?.textColor || '#333' }
    },
    scene: {
      xaxis: { 
        title: { text: surfaceConfig.xField },
        color: theme?.textColor || '#333',
        gridcolor: theme?.gridColor || '#e0e0e0'
      },
      yaxis: { 
        title: { text: surfaceConfig.yField },
        color: theme?.textColor || '#333',
        gridcolor: theme?.gridColor || '#e0e0e0'
      },
      zaxis: { 
        title: { text: surfaceConfig.zField },
        color: theme?.textColor || '#333',
        gridcolor: theme?.gridColor || '#e0e0e0'
      },
      bgcolor: theme?.backgroundColor || 'white'
    },
    plot_bgcolor: theme?.backgroundColor || 'white',
    paper_bgcolor: theme?.backgroundColor || 'white',
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
              data: { x: point.x, y: point.y, z: point.z },
              dataIndex: point.pointIndex
            });
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'hover',
              data: { x: point.x, y: point.y, z: point.z },
              dataIndex: point.pointIndex
            });
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default Surface3D;