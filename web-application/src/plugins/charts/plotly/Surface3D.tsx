import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as Plotly from 'plotly.js-dist';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';

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

interface Surface3DProps extends ChartProps {
  config: Surface3DConfig;
}

export const Surface3D: React.FC<Surface3DProps> = ({
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

  // Process data for 3D surface
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
      
      // Initialize grid with interpolated values
      for (let i = 0; i < yUnique.length; i++) {
        zGrid[i] = new Array(xUnique.length);
        for (let j = 0; j < xUnique.length; j++) {
          // Find exact match first
          const exactMatch = data.find(item => 
            Number(item[config.xField]) === xUnique[j] && 
            Number(item[config.yField]) === yUnique[i]
          );
          
          if (exactMatch) {
            zGrid[i][j] = Number(exactMatch[config.zField]) || 0;
          } else {
            // Simple interpolation: use average of nearest points
            const nearbyPoints = data.filter(item => {
              const x = Number(item[config.xField]);
              const y = Number(item[config.yField]);
              return Math.abs(x - xUnique[j]) <= (xUnique[1] - xUnique[0]) * 2 &&
                     Math.abs(y - yUnique[i]) <= (yUnique[1] - yUnique[0]) * 2;
            });
            
            if (nearbyPoints.length > 0) {
              const avgZ = nearbyPoints.reduce((sum, point) => 
                sum + (Number(point[config.zField]) || 0), 0) / nearbyPoints.length;
              zGrid[i][j] = avgZ;
            } else {
              // Fallback: use overall average
              const allZ = data.map(item => Number(item[config.zField]) || 0);
              zGrid[i][j] = allZ.reduce((a, b) => a + b, 0) / allZ.length;
            }
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to process 3D surface data';
      onError?.(new Error(errorMessage));
      setProcessedData({ x: [], y: [], z: [], xUnique: [], yUnique: [] });
    }
  }, [data, config]);

  // Initialize and update plot
  useEffect(() => {
    if (!plotRef.current || processedData.z.length === 0) return;

    try {
      const plotData: Plotly.Data[] = [{
        type: 'surface',
        x: processedData.xUnique,
        y: processedData.yUnique,
        z: processedData.z,
        colorscale: config.colorscale || 'Viridis',
        showscale: config.showscale !== false,
        reversescale: config.reversescale || false,
        opacity: config.opacity || 1,
        surfacecolor: config.surfacecolor,
        contours: config.contours ? {
          x: config.contours.x ? {
            show: config.contours.x.show !== false,
            start: config.contours.x.start,
            end: config.contours.x.end,
            size: config.contours.x.size,
            color: config.contours.x.color || '#636efa'
          } : { show: false },
          y: config.contours.y ? {
            show: config.contours.y.show !== false,
            start: config.contours.y.start,
            end: config.contours.y.end,
            size: config.contours.y.size,
            color: config.contours.y.color || '#636efa'
          } : { show: false },
          z: config.contours.z ? {
            show: config.contours.z.show !== false,
            start: config.contours.z.start,
            end: config.contours.z.end,
            size: config.contours.z.size,
            color: config.contours.z.color || '#636efa'
          } : { show: false }
        } : undefined,
        lighting: config.lighting ? {
          ambient: config.lighting.ambient || 0.8,
          diffuse: config.lighting.diffuse || 0.8,
          specular: config.lighting.specular || 0.2,
          roughness: config.lighting.roughness || 0.5,
          fresnel: config.lighting.fresnel || 0.2
        } : {
          ambient: 0.8,
          diffuse: 0.8,
          specular: 0.2,
          roughness: 0.5,
          fresnel: 0.2
        },
        lightposition: config.lightposition ? {
          x: config.lightposition.x || 0,
          y: config.lightposition.y || 0,
          z: config.lightposition.z || 1e5
        } : {
          x: 0,
          y: 0,
          z: 1e5
        },
        colorbar: config.colorbar ? {
          title: config.colorbar.title || config.zField,
          titleside: config.colorbar.titleside || 'right',
          len: config.colorbar.len || 1,
          thickness: config.colorbar.thickness || 20,
          x: config.colorbar.x,
          y: config.colorbar.y,
          titlefont: {
            color: theme?.textColor || '#333'
          },
          tickfont: {
            color: theme?.textColor || '#333'
          }
        } : {
          title: config.zField,
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
        scene: {
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
            zerolinecolor: theme?.gridColor || '#e0e6ed',
            showbackground: true,
            backgroundcolor: 'rgba(230, 230, 230, 0.3)'
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
            zerolinecolor: theme?.gridColor || '#e0e6ed',
            showbackground: true,
            backgroundcolor: 'rgba(230, 230, 230, 0.3)'
          },
          zaxis: {
            title: {
              text: config.zField,
              font: {
                color: theme?.textColor || '#333'
              }
            },
            tickfont: {
              color: theme?.textColor || '#333'
            },
            gridcolor: theme?.gridColor || '#e0e6ed',
            zerolinecolor: theme?.gridColor || '#e0e6ed',
            showbackground: true,
            backgroundcolor: 'rgba(230, 230, 230, 0.3)'
          },
          camera: {
            eye: {
              x: 1.2,
              y: 1.2,
              z: 1.2
            }
          },
          aspectmode: 'cube'
        },
        width: dimensions.width,
        height: dimensions.height,
        paper_bgcolor: theme?.backgroundColor || 'transparent',
        font: {
          color: theme?.textColor || '#333'
        },
        margin: {
          l: 20,
          r: 20,
          t: config.title ? 80 : 30,
          b: 20
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
        modeBarButtonsToRemove: [],
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'surface-3d',
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to render 3D surface plot';
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
          No data available for 3D surface plot
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

export default Surface3D;