import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as Plotly from 'plotly.js-dist';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';

interface WaterfallChartConfig extends ChartConfiguration {
  title?: string;
  subtitle?: string;
  xField: string;
  yField: string;
  measure?: 'relative' | 'absolute' | 'total';
  measureField?: string; // Field that contains measure type for each data point
  base?: number;
  orientation?: 'v' | 'h';
  connector?: {
    visible?: boolean;
    line?: {
      color?: string;
      width?: number;
      dash?: string;
    };
  };
  increasing?: {
    marker?: {
      color?: string;
    };
  };
  decreasing?: {
    marker?: {
      color?: string;
    };
  };
  totals?: {
    marker?: {
      color?: string;
    };
  };
  textposition?: string;
  texttemplate?: string;
  hovertemplate?: string;
  showlegend?: boolean;
  constraintext?: 'inside' | 'outside' | 'both' | 'none';
}

interface WaterfallChartProps extends ChartProps {
  config: WaterfallChartConfig;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
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
    x: string[];
    y: number[];
    measure: string[];
    text: string[];
  }>({
    x: [],
    y: [],
    measure: [],
    text: []
  });

  // Process data for waterfall chart
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessedData({ x: [], y: [], measure: [], text: [] });
      return;
    }

    try {
      const x: string[] = [];
      const y: number[] = [];
      const measure: string[] = [];
      const text: string[] = [];

      data.forEach((item, index) => {
        const xValue = String(item[config.xField] || `Item ${index + 1}`);
        const yValue = Number(item[config.yField]) || 0;
        
        // Determine measure type
        let measureType = config.measure || 'relative';
        if (config.measureField && item[config.measureField]) {
          measureType = String(item[config.measureField]).toLowerCase();
        }

        // Auto-detect total items (typically last item or items with specific keywords)
        if (!config.measureField && !config.measure) {
          if (index === data.length - 1 || 
              xValue.toLowerCase().includes('total') ||
              xValue.toLowerCase().includes('sum') ||
              xValue.toLowerCase().includes('net')) {
            measureType = 'total';
          }
        }

        x.push(xValue);
        y.push(yValue);
        measure.push(measureType);
        
        // Generate text labels
        const textValue = config.texttemplate 
          ? config.texttemplate.replace('%{y}', yValue.toString()).replace('%{x}', xValue)
          : yValue.toString();
        text.push(textValue);
      });

      setProcessedData({ x, y, measure, text });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process waterfall chart data';
      onError?.(new Error(errorMessage));
      setProcessedData({ x: [], y: [], measure: [], text: [] });
    }
  }, [data, config]);

  // Initialize and update plot
  useEffect(() => {
    if (!plotRef.current || processedData.x.length === 0) return;

    try {
      const plotData: Plotly.Data[] = [{
        type: 'waterfall',
        x: processedData.x,
        y: processedData.y,
        measure: processedData.measure,
        text: processedData.text,
        textposition: config.textposition || 'outside',
        texttemplate: config.texttemplate,
        base: config.base,
        orientation: config.orientation || 'v',
        connector: config.connector ? {
          visible: config.connector.visible !== false,
          line: config.connector.line ? {
            color: config.connector.line.color || theme?.gridColor || '#8c8c8c',
            width: config.connector.line.width || 2,
            dash: config.connector.line.dash || 'solid'
          } : {
            color: theme?.gridColor || '#8c8c8c',
            width: 2
          }
        } : {
          visible: true,
          line: {
            color: theme?.gridColor || '#8c8c8c',
            width: 2
          }
        },
        increasing: {
          marker: {
            color: config.increasing?.marker?.color || theme?.colors?.[0] || '#00cc96'
          }
        },
        decreasing: {
          marker: {
            color: config.decreasing?.marker?.color || theme?.colors?.[1] || '#ff6692'
          }
        },
        totals: {
          marker: {
            color: config.totals?.marker?.color || theme?.colors?.[2] || '#ab63fa'
          }
        },
        hovertemplate: config.hovertemplate || 
          `<b>%{x}</b><br>` +
          `Value: %{y}<br>` +
          `Type: %{measure}<br>` +
          `<extra></extra>`,
        showlegend: config.showlegend !== false,
        constraintext: config.constraintext || 'both',
        textfont: {
          color: theme?.textColor || '#333'
        }
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
          zerolinecolor: theme?.gridColor || '#e0e6ed',
          tickangle: processedData.x.some(label => label.length > 10) ? -45 : 0
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
          l: 80,
          r: 50,
          t: config.title ? 80 : 30,
          b: processedData.x.some(label => label.length > 10) ? 100 : 60
        },
        hoverlabel: {
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: theme?.gridColor || '#ccc',
          font: {
            color: '#333'
          }
        },
        legend: config.showlegend !== false ? {
          orientation: 'h',
          x: 0,
          y: -0.2,
          font: {
            color: theme?.textColor || '#333'
          }
        } : { showlegend: false }
      };

      const plotConfig: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'waterfall-chart',
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
                  measure: processedData.measure[point.pointIndex]
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
                  measure: processedData.measure[point.pointIndex]
                },
                dataIndex: point.pointIndex
              });
            }
          });
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render waterfall chart';
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
          No data available for waterfall chart
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

export default WaterfallChart;