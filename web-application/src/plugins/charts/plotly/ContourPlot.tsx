import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as Plotly from 'plotly.js-dist';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';

interface ContourPlotConfig extends ChartConfiguration {
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

interface ContourPlotProps extends ChartProps {
  config: ContourPlotConfig;
}

export const ContourPlot: React.FC<ContourPlotProps> = ({
  data,
  config,
  dimensions = { width: 800, height: 600 },
  theme,
  onInteraction,
  onError,
  isLoading = false,
  error
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [processedData, setProcessedData] = useState<{
    x: number[];
    y: number[];
    z: number[][];
    xUnique: number[];
    yUnique: number[];
  }>({
    x: [],
    y: [],
    z: [],
    xUnique: [],
    yUnique: []
  });

  // Process data for contour plot
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessedData({ x: [], y: [], z: [], xUnique: [], yUnique: [] });
      return;
    }

    try {
      // Extract x, y, z values
      const xValues = data.map(item => Number(item[config.xField]) || 0);
      const yValues = data.map(item => Number(item[config.yField]) || 0);
      const zValues = data.map(item => Number(item[config.zField]) || 0);

      // Get unique sorted values for x and y
      const xUnique = [...new Set(xValues)].sort((a, b) => a - b);
      const yUnique = [...new Set(yValues)].sort((a, b) => a - b);

      // Create 2D grid for z values
      const zGrid: number[][] = [];
      
      // Initialize grid with null values
      for (let i = 0; i < yUnique.length; i++) {
        zGrid[i] = new Array(xUnique.length).fill(null);
      }

      // Fill grid with actual z values
      data.forEach((item, index) => {
        const x = Number(item[config.xField]) || 0;
        const y = Number(item[config.yField]) || 0;
        const z = Number(item[config.zField]) || 0;
        
        const xIndex = xUnique.indexOf(x);
        const yIndex = yUnique.indexOf(y);
        
        if (xIndex !== -1 && yIndex !== -1) {
          zGrid[yIndex][xIndex] = z;
        }
      });

      // Handle missing values by interpolation or filling
      for (let i = 0; i < zGrid.length; i++) {
        for (let j = 0; j < zGrid[i].length; j++) {
          if (zGrid[i][j] === null) {
            // Simple strategy: use average of non-null neighbors or 0
            let sum = 0;
            let count = 0;
            
            // Check adjacent cells
            const neighbors = [
              [i-1, j], [i+1, j], [i, j-1], [i, j+1]
            ];
            
            neighbors.forEach(([ni, nj]) => {
              if (ni >= 0 && ni < zGrid.length && nj >= 0 && nj < zGrid[ni].length && zGrid[ni][nj] !== null) {
                sum += zGrid[ni][nj]!;
                count++;
              }
            });
            
            zGrid[i][j] = count > 0 ? sum / count : 0;
          }
        }
      }

      setProcessedData({
        x: xValues,
        y: yValues,
        z: zGrid,
        xUnique,
        yUnique
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process contour plot data';
      onError?.(new Error(errorMessage));
      setProcessedData({ x: [], y: [], z: [], xUnique: [], yUnique: [] });
    }
  }, [data, config]);

  // Initialize and update plot
  useEffect(() => {
    if (!plotRef.current || processedData.z.length === 0) return;

    try {
      const plotData: Plotly.Data[] = [{
        type: 'contour',
        x: processedData.xUnique,
        y: processedData.yUnique,
        z: processedData.z,
        colorscale: config.colorscale || 'Viridis',
        showscale: config.showscale !== false,
        connectgaps: config.connectgaps !== false,
        hoverongaps: config.hoverongaps !== false,
        autocontour: config.autocontour !== false,
        ncontours: config.ncontours || 15,
        reversescale: config.reversescale || false,
        contours: config.contours ? {
          start: config.contours.start,
          end: config.contours.end,
          size: config.contours.size,
          coloring: config.contours.coloring || 'fill',
          showlines: config.contours.showlines !== false,
          labelfont: config.contours.labelfont ? {
            size: config.contours.labelfont.size || 12,
            color: config.contours.labelfont.color || theme?.textColor || '#333'
          } : undefined
        } : undefined,
        line: config.line ? {
          color: config.line.color || theme?.colors?.[0] || '#636efa',
          width: config.line.width || 0.5,
          smoothing: config.line.smoothing || 1
        } : undefined,
        colorbar: config.colorbar ? {
          title: config.colorbar.title,
          titleside: config.colorbar.titleside || 'right',
          tickmode: config.colorbar.tickmode,
          tick0: config.colorbar.tick0,
          dtick: config.colorbar.dtick,
          titlefont: {
            color: theme?.textColor || '#333'
          },
          tickfont: {
            color: theme?.textColor || '#333'
          }
        } : {
          titlefont: {
            color: theme?.textColor || '#333'
          },
          tickfont: {
            color: theme?.textColor || '#333'
          }
        },
        hovertemplate: config.hovertemplate || 
          `x: %{x}<br>y: %{y}<br>z: %{z}<extra></extra>`
      }];

      const layout: Partial<Plotly.Layout> = {
        title: config.title ? {
          text: config.subtitle ? `${config.title}<br><sub>${config.subtitle}</sub>` : config.title,
          font: {
            color: theme?.textColor || '#333'
          }
        } : undefined,
        xaxis: {
          title: {
            text: config.xField,
            font: {
              color: theme?.textColor || '#333'
            }
          },
          tickfont: {
            color: theme?.textColor || '#333'
          },
          gridcolor: theme?.gridColor || '#e0e6ed',
          zerolinecolor: theme?.gridColor || '#e0e6ed'
        },
        yaxis: {
          title: {
            text: config.yField,
            font: {
              color: theme?.textColor || '#333'
            }
          },
          tickfont: {
            color: theme?.textColor || '#333'
          },
          gridcolor: theme?.gridColor || '#e0e6ed',
          zerolinecolor: theme?.gridColor || '#e0e6ed'
        },
        width: dimensions.width,
        height: dimensions.height,
        paper_bgcolor: theme?.backgroundColor || 'transparent',
        plot_bgcolor: theme?.backgroundColor || 'transparent',
        font: {
          color: theme?.textColor || '#333'
        },
        margin: {
          l: 60,
          r: 50,
          t: config.title ? 80 : 30,
          b: 60
        },
        hoverlabel: {
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: theme?.gridColor || '#ccc',
          font: {
            color: '#333'
          }
        }
      };

      const plotConfig: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'contour-plot',
          height: dimensions.height,
          width: dimensions.width,
          scale: 1
        }
      };

      // Create or update plot
      Plotly.newPlot(plotRef.current, plotData, layout, plotConfig).then(() => {
        // Handle interactions
        if (onInteraction) {
          plotRef.current!.on('plotly_click', (eventData: any) => {
            if (eventData.points && eventData.points.length > 0) {
              const point = eventData.points[0];
              onInteraction({
                type: 'click',
                data: {
                  x: point.x,
                  y: point.y,
                  z: point.z
                },
                dataIndex: point.pointIndex
              });
            }
          });

          plotRef.current!.on('plotly_hover', (eventData: any) => {
            if (eventData.points && eventData.points.length > 0) {
              const point = eventData.points[0];
              onInteraction({
                type: 'hover',
                data: {
                  x: point.x,
                  y: point.y,
                  z: point.z
                },
                dataIndex: point.pointIndex
              });
            }
          });
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render contour plot';
      onError?.(new Error(errorMessage));
    }
  }, [processedData, config, dimensions, theme, onInteraction]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <Alert severity="error" sx={{ width: dimensions.width, height: dimensions.height }}>
        Chart Error: {error}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 1
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data available for contour plot
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={plotRef}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        '& .plotly-graph-div': {
          borderRadius: 1
        }
      }}
    />
  );
};

export default ContourPlot;