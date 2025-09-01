// src/plugins/charts/plotly/ViolinPlot.tsx
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
  getPlotlyTitleFont,
  getChartColors
} from '@/utils/themeHelpers';

interface ViolinPlotConfig extends ChartPluginConfig {
  title?: string;
  subtitle?: string;
  yField: string;
  groupField?: string;
  orientation?: 'v' | 'h';
  side?: 'both' | 'positive' | 'negative';
  bandwidth?: number;
  scalegroup?: string;
  scalemode?: 'width' | 'count';
  spanmode?: 'soft' | 'hard';
  line?: {
    color?: string;
    width?: number;
  };
  fillcolor?: string;
  opacity?: number;
  meanline?: {
    visible?: boolean;
    color?: string;
    width?: number;
  };
  box?: {
    visible?: boolean;
    width?: number;
    fillcolor?: string;
    line?: {
      color?: string;
      width?: number;
    };
  };
  points?: 'all' | 'outliers' | 'suspectedoutliers' | 'none';
  pointpos?: number;
  jitter?: number;
  hovertemplate?: string;
  showlegend?: boolean;
}

export interface ViolinPlotProps extends ChartProps {
  config: ViolinPlotConfig;
}

const ViolinPlot: React.FC<ViolinPlotProps> = ({ 
  data, 
  config: violinConfig, 
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
      if (!violinConfig.yField) {
        throw new Error('yField is required for violin plot');
      }

      // Extract numeric values for y-axis
      const yValues = dataArray.map(item => Number(item[violinConfig.yField])).filter(val => !isNaN(val));

      if (yValues.length === 0) {
        throw new Error('No valid numeric data found for violin plot');
      }

      // Group data if groupField is specified
      if (violinConfig.groupField) {
        const groups: { [key: string]: number[] } = {};
        const groupFieldName = violinConfig.groupField; // Store in variable to avoid undefined issues
        
        dataArray.forEach(item => {
          const group = String(item[groupFieldName] || 'Default');
          const value = Number(item[violinConfig.yField]);
          
          if (!isNaN(value)) {
            if (!groups[group]) {
              groups[group] = [];
            }
            groups[group].push(value);
          }
        });

        return { groups, ungrouped: null };
      } else {
        return { groups: null, ungrouped: yValues };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process violin plot data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, violinConfig, onError]);

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
        <Typography color="text.secondary">No data available for violin plot</Typography>
      </Box>
    );
  }

  // Create plot data
  const plotData: any[] = [];
  
  if (processedData.groups) {
    // Multiple violins for grouped data
    // FIXED: Use theme helper to get colors array properly
    const chartColors = getChartColors(theme, Object.keys(processedData.groups).length);
    
    Object.entries(processedData.groups).forEach(([groupName, values], index) => {
      // FIXED: Safe color access using helper function
      const color = chartColors[index % chartColors.length];

      plotData.push({
        type: 'violin',
        y: violinConfig.orientation === 'h' ? undefined : values,
        x: violinConfig.orientation === 'h' ? values : undefined,
        name: groupName,
        orientation: violinConfig.orientation || 'v',
        side: violinConfig.side || 'both',
        bandwidth: violinConfig.bandwidth,
        scalegroup: violinConfig.scalegroup,
        scalemode: violinConfig.scalemode || 'width',
        spanmode: violinConfig.spanmode || 'soft',
        line: {
          color: violinConfig.line?.color || color,
          width: violinConfig.line?.width || 2
        },
        fillcolor: violinConfig.fillcolor || color,
        opacity: violinConfig.opacity || 0.6,
        meanline: violinConfig.meanline ? {
          visible: violinConfig.meanline.visible !== false,
          color: violinConfig.meanline.color || color,
          width: violinConfig.meanline.width || 2
        } : { visible: true },
        box: violinConfig.box ? {
          visible: violinConfig.box.visible !== false,
          width: violinConfig.box.width || 0.3,
          fillcolor: violinConfig.box.fillcolor || 'rgba(255,255,255,0.8)',
          line: {
            color: violinConfig.box.line?.color || color,
            width: violinConfig.box.line?.width || 1
          }
        } : { visible: true },
        points: violinConfig.points || 'outliers',
        pointpos: violinConfig.pointpos || 0,
        jitter: violinConfig.jitter || 0.3,
        hovertemplate: violinConfig.hovertemplate || 
          `${groupName}<br>${violinConfig.yField}: %{y}<extra></extra>`,
        showlegend: violinConfig.showlegend !== false
      });
    });
  } else if (processedData.ungrouped) {
    // Single violin for ungrouped data
    // FIXED: Use theme helper for safe color access
    const chartColors = getChartColors(theme, 1);
    const color = chartColors[0];
    
    plotData.push({
      type: 'violin',
      y: violinConfig.orientation === 'h' ? undefined : processedData.ungrouped,
      x: violinConfig.orientation === 'h' ? processedData.ungrouped : undefined,
      name: violinConfig.yField,
      orientation: violinConfig.orientation || 'v',
      side: violinConfig.side || 'both',
      bandwidth: violinConfig.bandwidth,
      scalegroup: violinConfig.scalegroup,
      scalemode: violinConfig.scalemode || 'width',
      spanmode: violinConfig.spanmode || 'soft',
      line: {
        color: violinConfig.line?.color || color,
        width: violinConfig.line?.width || 2
      },
      fillcolor: violinConfig.fillcolor || color,
      opacity: violinConfig.opacity || 0.6,
      meanline: violinConfig.meanline ? {
        visible: violinConfig.meanline.visible !== false,
        color: violinConfig.meanline.color || color,
        width: violinConfig.meanline.width || 2
      } : { visible: true },
      box: violinConfig.box ? {
        visible: violinConfig.box.visible !== false,
        width: violinConfig.box.width || 0.3,
        fillcolor: violinConfig.box.fillcolor || 'rgba(255,255,255,0.8)',
        line: {
          color: violinConfig.box.line?.color || color,
          width: violinConfig.box.line?.width || 1
        }
      } : { visible: true },
      points: violinConfig.points || 'outliers',
      pointpos: violinConfig.pointpos || 0,
      jitter: violinConfig.jitter || 0.3,
      hovertemplate: violinConfig.hovertemplate || 
        `${violinConfig.yField}: %{y}<extra></extra>`,
      showlegend: violinConfig.showlegend !== false
    });
  }

  // FIXED: Use double type assertion for PlotData
  const typedPlotData: PlotData[] = plotData as unknown as PlotData[];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: violinConfig.title,
      // FIXED: Use theme helper
      font: getPlotlyTitleFont(theme)
    },
    xaxis: {
      title: { 
        text: violinConfig.orientation === 'h' ? violinConfig.yField : (violinConfig.groupField || '') 
      },
      // FIXED: Use theme helpers
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme)
    },
    yaxis: {
      title: { 
        text: violinConfig.orientation === 'h' ? (violinConfig.groupField || '') : violinConfig.yField 
      },
      // FIXED: Use theme helpers
      color: getThemeTextColor(theme),
      gridcolor: getThemeGridColor(theme)
    },
    font: getPlotlyTextFont(theme),
    // FIXED: Use theme helpers
    plot_bgcolor: getThemeBackgroundColor(theme),
    paper_bgcolor: getThemeBackgroundColor(theme),
    showlegend: plotData.length > 1 && violinConfig.showlegend !== false,
    legend: {
      font: { color: getThemeTextColor(theme) }
    },
    margin: { l: 80, r: 60, t: 80, b: 60 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'violin-plot',
      height: dimensions?.height || 300,
      width: dimensions?.width || 400,
      scale: 1
    }
  };

  return (
    <Box sx={{ width: dimensions?.width, height: dimensions?.height }}>
      <Plot
        data={typedPlotData}
        layout={layout}
        config={plotConfig}
        onClick={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'click',
              chartId: '',
              data: { 
                group: point.data.name,
                value: violinConfig.orientation === 'h' ? point.x : point.y
              },
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
              data: { 
                group: point.data.name,
                value: violinConfig.orientation === 'h' ? point.x : point.y
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

export default ViolinPlot;