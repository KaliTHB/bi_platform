// src/plugins/charts/plotly/Mesh3D.tsx
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
  getPlotlyTitleFont
} from '@/utils/themeHelpers';

interface Mesh3DConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  xField: string;
  yField: string;
  zField: string;
  colorField?: string;
  intensityField?: string;
  // Mesh connectivity (optional - if not provided, will use Delaunay triangulation)
  iField?: string; // triangle vertex indices (i, j, k)
  jField?: string;
  kField?: string;
  // Styling options
  colorscale?: string | Array<[number, string]>;
  showscale?: boolean;
  reversescale?: boolean;
  opacity?: number;
  flatshading?: boolean;
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
  contour?: {
    show?: boolean;
    color?: string;
    width?: number;
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
  showlegend?: boolean;
}

export interface Mesh3DProps extends ChartProps {
  config: Mesh3DConfig;
}

const Mesh3D: React.FC<Mesh3DProps> = ({ 
  data, 
  config: meshConfig, 
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
      if (!meshConfig.xField || !meshConfig.yField || !meshConfig.zField) {
        throw new Error('xField, yField, and zField are required for 3D mesh plot');
      }

      // Extract coordinate data
      const xValues = dataArray.map(item => Number(item[meshConfig.xField])).filter(val => !isNaN(val));
      const yValues = dataArray.map(item => Number(item[meshConfig.yField])).filter(val => !isNaN(val));
      const zValues = dataArray.map(item => Number(item[meshConfig.zField])).filter(val => !isNaN(val));

      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        throw new Error('No valid numeric data found for 3D mesh plot');
      }

      // Extract color/intensity data if specified
      let colorData = null;
      let intensityData = null;
      
      if (meshConfig.colorField) {
        colorData = dataArray.map(item => Number(item[meshConfig.colorField!])).filter(val => !isNaN(val));
      }
      
      if (meshConfig.intensityField) {
        intensityData = dataArray.map(item => Number(item[meshConfig.intensityField!])).filter(val => !isNaN(val));
      }

      // Extract triangle connectivity if provided
      let triangleIndices = null;
      if (meshConfig.iField && meshConfig.jField && meshConfig.kField) {
        const iIndices = dataArray.map(item => Number(item[meshConfig.iField!])).filter(val => !isNaN(val));
        const jIndices = dataArray.map(item => Number(item[meshConfig.jField!])).filter(val => !isNaN(val));
        const kIndices = dataArray.map(item => Number(item[meshConfig.kField!])).filter(val => !isNaN(val));
        
        if (iIndices.length === jIndices.length && jIndices.length === kIndices.length) {
          triangleIndices = { i: iIndices, j: jIndices, k: kIndices };
        }
      }

      return {
        x: xValues,
        y: yValues,
        z: zValues,
        color: colorData,
        intensity: intensityData,
        triangles: triangleIndices
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process 3D mesh data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, meshConfig, onError]);

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
        <Typography color="text.secondary">No data available for 3D mesh plot</Typography>
      </Box>
    );
  }

  // Build the mesh3d trace
  const meshTrace: any = {
    type: 'mesh3d',
    x: processedData.x,
    y: processedData.y,
    z: processedData.z,
    colorscale: meshConfig.colorscale || 'Viridis',
    showscale: meshConfig.showscale !== false,
    reversescale: meshConfig.reversescale || false,
    opacity: meshConfig.opacity || 0.7,
    flatshading: meshConfig.flatshading !== false,
    lighting: meshConfig.lighting ? {
      ambient: meshConfig.lighting.ambient || 0.8,
      diffuse: meshConfig.lighting.diffuse || 0.8,
      specular: meshConfig.lighting.specular || 0.05,
      roughness: meshConfig.lighting.roughness || 0.5,
      fresnel: meshConfig.lighting.fresnel || 0.2
    } : {
      ambient: 0.8,
      diffuse: 0.8,
      specular: 0.05,
      roughness: 0.5,
      fresnel: 0.2
    },
    lightposition: meshConfig.lightposition || { x: 100, y: 200, z: 0 },
    contour: meshConfig.contour ? {
      show: meshConfig.contour.show !== false,
      // FIXED: Use proper theme structure
      color: meshConfig.contour.color || getThemeGridColor(theme),
      width: meshConfig.contour.width || 2
    } : undefined,
    hovertemplate: meshConfig.hovertemplate || 
      `${meshConfig.xField}: %{x}<br>${meshConfig.yField}: %{y}<br>${meshConfig.zField}: %{z}<extra></extra>`,
    showlegend: meshConfig.showlegend !== false
  };

  // Add color data if available
  if (processedData.color && processedData.color.length === processedData.x.length) {
    meshTrace.intensity = processedData.color;
  } else if (processedData.intensity && processedData.intensity.length === processedData.x.length) {
    meshTrace.intensity = processedData.intensity;
  }

  // Add triangle connectivity if available
  if (processedData.triangles) {
    meshTrace.i = processedData.triangles.i;
    meshTrace.j = processedData.triangles.j;
    meshTrace.k = processedData.triangles.k;
  }

  const plotData: PlotData[] = [meshTrace as unknown as PlotData];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: meshConfig.title,
      // FIXED: Use proper theme structure
      font: getPlotlyTitleFont(theme)
    },
    scene: {
      xaxis: { 
        title: { text: meshConfig.xField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      yaxis: { 
        title: { text: meshConfig.yField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      zaxis: { 
        title: { text: meshConfig.zField },
        // FIXED: Use proper theme structure
        color: getThemeTextColor(theme),
        gridcolor: getThemeGridColor(theme)
      },
      // FIXED: Use proper theme structure
      bgcolor: getThemeBackgroundColor(theme),
      camera: {
        eye: { x: 1.2, y: 1.2, z: 1.2 }
      }
    },
    font: getPlotlyTextFont(theme),
    // FIXED: Use proper theme structure
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    showlegend: meshConfig.showlegend !== false,
    margin: { l: 60, r: 60, t: 80, b: 60 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: '3d-mesh-plot',
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
              data: { 
                x: point.x, 
                y: point.y, 
                z: point.z,
                intensity: point.intensity 
              },
              dataIndex: point.pointIndex,
              timestamp: Date.now()
            });
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'hover',
              chartId: '',
              data: { 
                x: point.x, 
                y: point.y, 
                z: point.z,
                intensity: point.intensity 
              },
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

export default Mesh3D;