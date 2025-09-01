import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';
import { ChartProps,ChartPluginConfig,ChartConfiguration } from '@/types/chart.types';

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
    titleside?: string;
    tickmode?: string;
    tick0?: number;
    dtick?: number;
  };
  autocontour?: boolean;
  ncontours?: number;
  reversescale?: boolean;
}

export const ContourPlot: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const contourConfig = config as ContourPlotConfig;

  const processedData = useMemo(() => {
    if (isChartDataEmpty(data)) {
      return null;
    }

    try {
      const dataArray = getDataArray(data);
      
      // Validate required fields
      if (!contourConfig.xField || !contourConfig.yField || !contourConfig.zField) {
        throw new Error('xField, yField, and zField are required for contour plot');
      }

      // Extract values
      const xValues = dataArray.map(item => Number(item[contourConfig.xField])).filter(val => !isNaN(val));
      const yValues = dataArray.map(item => Number(item[contourConfig.yField])).filter(val => !isNaN(val));
      const zValues = dataArray.map(item => Number(item[contourConfig.zField])).filter(val => !isNaN(val));

      if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
        throw new Error('No valid numeric data found for contour plot');
      }

      // Get unique x and y values and sort them
      const xUnique = [...new Set(xValues)].sort((a, b) => a - b);
      const yUnique = [...new Set(yValues)].sort((a, b) => a - b);

      // Create z matrix
      const zMatrix: number[][] = [];
      for (let i = 0; i < yUnique.length; i++) {
        zMatrix[i] = [];
        for (let j = 0; j < xUnique.length; j++) {
          // Find data points that match this x,y coordinate
          const matchingItems = dataArray.filter(item => {
            const x = Number(item[contourConfig.xField]);
            const y = Number(item[contourConfig.yField]);
            return Math.abs(x - xUnique[j]) < 0.001 && Math.abs(y - yUnique[i]) < 0.001;
          });
          
          if (matchingItems.length > 0) {
            // Average z values if multiple points exist at same x,y
            const avgZ = matchingItems.reduce((sum, item) => 
              sum + Number(item[contourConfig.zField]), 0) / matchingItems.length;
            zMatrix[i][j] = avgZ;
          } else {
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to process contour data';
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

  const plotData: any[] = [{
    type: 'contour',
    x: processedData.x,
    y: processedData.y,
    z: processedData.z,
    colorscale: contourConfig.colorscale || 'Viridis',
    showscale: contourConfig.showscale !== false,
    connectgaps: contourConfig.connectgaps !== false,
    hoverongaps: contourConfig.hoverongaps !== false,
    autocontour: contourConfig.autocontour !== false,
    ncontours: contourConfig.ncontours || 15,
    reversescale: contourConfig.reversescale || false,
    contours: contourConfig.contours ? {
      start: contourConfig.contours.start,
      end: contourConfig.contours.end,
      size: contourConfig.contours.size,
      coloring: contourConfig.contours.coloring || 'fill',
      showlines: contourConfig.contours.showlines !== false,
      labelfont: contourConfig.contours.labelfont
    } : undefined,
    line: contourConfig.line,
    colorbar: contourConfig.colorbar ? {
      ...contourConfig.colorbar,
      titlefont: { color: theme?.textColor || '#333' },
      tickfont: { color: theme?.textColor || '#333' }
    } : {
      titlefont: { color: theme?.textColor || '#333' },
      tickfont: { color: theme?.textColor || '#333' }
    },
    hovertemplate: contourConfig.hovertemplate || 
      `${contourConfig.xField}: %{x}<br>${contourConfig.yField}: %{y}<br>${contourConfig.zField}: %{z}<extra></extra>`
  }];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: contourConfig.title,
      font: { color: theme?.textColor || '#333' }
    },
    xaxis: {
      title: { text: contourConfig.xField },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0'
    },
    yaxis: {
      title: { text: contourConfig.yField },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0'
    },
    plot_bgcolor: theme?.backgroundColor || 'white',
    paper_bgcolor: theme?.backgroundColor || 'white',
    margin: { l: 80, r: 80, t: 80, b: 60 }
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

export default ContourPlot;