import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';
import { ChartProps,ChartPluginConfig,ChartConfiguration } from '@/types/chart.types';

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

export const ViolinPlot: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const violinConfig = config as ViolinPlotConfig;

  const processedData = useMemo(() => {
    if (isChartDataEmpty(data)) {
      return null;
    }

    try {
      const dataArray = getDataArray(data);
      
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
    Object.entries(processedData.groups).forEach(([groupName, values], index) => {
      const colors = theme?.colors || ['#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a'];
      const color = colors[index % colors.length];

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
    const color = theme?.colors?.[0] || '#636efa';
    
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

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: violinConfig.title,
      font: { color: theme?.textColor || '#333' }
    },
    xaxis: {
      title: { 
        text: violinConfig.orientation === 'h' ? violinConfig.yField : (violinConfig.groupField || '') 
      },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0'
    },
    yaxis: {
      title: { 
        text: violinConfig.orientation === 'h' ? (violinConfig.groupField || '') : violinConfig.yField 
      },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0'
    },
    plot_bgcolor: theme?.backgroundColor || 'white',
    paper_bgcolor: theme?.backgroundColor || 'white',
    showlegend: plotData.length > 1 && violinConfig.showlegend !== false,
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
        data={plotData}
        layout={layout}
        config={plotConfig}
        onClick={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'click',
              data: { 
                group: point.data.name,
                value: violinConfig.orientation === 'h' ? point.x : point.y
              },
              dataIndex: point.pointIndex
            });
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            onInteraction({
              type: 'hover',
              data: { 
                group: point.data.name,
                value: violinConfig.orientation === 'h' ? point.x : point.y
              },
              dataIndex: point.pointIndex
            });
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default ViolinPlot;