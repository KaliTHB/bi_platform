import React, { useMemo } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import { PlotData, Config, Layout } from 'plotly.js';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';
import { getDataArray, isChartDataEmpty } from '../utils/chartDataUtils';

interface WaterfallChartConfig extends ChartConfiguration {
  title?: string;
  subtitle?: string;
  categoryField: string;
  valueField: string;
  measureField?: string; // 'relative', 'absolute', or 'total'
  textposition?: 'inside' | 'outside' | 'auto' | 'none';
  textinfo?: 'label' | 'value' | 'label+value';
  textfont?: {
    size?: number;
    color?: string;
    family?: string;
  };
  connector?: {
    line?: {
      color?: string;
      width?: number;
      dash?: string;
    };
    visible?: boolean;
  };
  increasing?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  decreasing?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  totals?: {
    marker?: {
      color?: string;
      line?: {
        color?: string;
        width?: number;
      };
    };
  };
  hovertemplate?: string;
  showlegend?: boolean;
  orientation?: 'v' | 'h';
}

export const WaterfallChart: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  theme, 
  onInteraction, 
  onError,
  isLoading,
  error
}) => {
  const waterfallConfig = config as WaterfallChartConfig;

  const processedData = useMemo(() => {
    if (isChartDataEmpty(data)) {
      return null;
    }

    try {
      const dataArray = getDataArray(data);
      
      // Validate required fields
      if (!waterfallConfig.categoryField || !waterfallConfig.valueField) {
        throw new Error('categoryField and valueField are required for waterfall chart');
      }

      // Process data and determine measure types
      const processedItems = dataArray.map((item, index) => {
        const category = String(item[waterfallConfig.categoryField] || `Item ${index + 1}`);
        const value = Number(item[waterfallConfig.valueField]) || 0;
        
        // Determine measure type
        let measure = 'relative'; // default
        if (waterfallConfig.measureField && item[waterfallConfig.measureField]) {
          const measureValue = String(item[waterfallConfig.measureField]).toLowerCase();
          if (['relative', 'absolute', 'total'].includes(measureValue)) {
            measure = measureValue;
          }
        } else {
          // Auto-detect totals based on category names
          const categoryLower = category.toLowerCase();
          if (categoryLower.includes('total') || categoryLower.includes('sum') || 
              categoryLower.includes('final') || categoryLower.includes('net')) {
            measure = 'total';
          }
        }

        return {
          category,
          value,
          measure
        };
      });

      if (processedItems.length === 0) {
        throw new Error('No valid data found for waterfall chart');
      }

      return processedItems;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process waterfall chart data';
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [data, waterfallConfig, onError]);

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

  if (!processedData || processedData.length === 0) {
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
        <Typography color="text.secondary">No data available for waterfall chart</Typography>
      </Box>
    );
  }

  // Default colors
  const defaultIncreasingColor = theme?.colors?.[0] || '#2E8B57'; // Sea Green
  const defaultDecreasingColor = theme?.colors?.[1] || '#DC143C'; // Crimson
  const defaultTotalColor = theme?.colors?.[2] || '#4682B4';      // Steel Blue

  const plotData: any[] = [{
    type: 'waterfall',
    x: waterfallConfig.orientation === 'h' ? processedData.map(item => item.value) : processedData.map(item => item.category),
    y: waterfallConfig.orientation === 'h' ? processedData.map(item => item.category) : processedData.map(item => item.value),
    text: processedData.map(item => item.category),
    textposition: waterfallConfig.textposition || 'outside',
    textinfo: waterfallConfig.textinfo || 'label+value',
    textfont: waterfallConfig.textfont ? {
      size: waterfallConfig.textfont.size || 12,
      color: waterfallConfig.textfont.color || theme?.textColor || '#333',
      family: waterfallConfig.textfont.family || theme?.fontFamily || 'Arial, sans-serif'
    } : {
      size: 12,
      color: theme?.textColor || '#333',
      family: theme?.fontFamily || 'Arial, sans-serif'
    },
    measure: processedData.map(item => item.measure),
    connector: waterfallConfig.connector ? {
      line: {
        color: waterfallConfig.connector.line?.color || theme?.gridColor || '#888',
        width: waterfallConfig.connector.line?.width || 2,
        dash: waterfallConfig.connector.line?.dash || 'solid'
      },
      visible: waterfallConfig.connector.visible !== false
    } : {
      line: {
        color: theme?.gridColor || '#888',
        width: 2,
        dash: 'solid'
      },
      visible: true
    },
    increasing: {
      marker: {
        color: waterfallConfig.increasing?.marker?.color || defaultIncreasingColor,
        line: {
          color: waterfallConfig.increasing?.marker?.line?.color || '#fff',
          width: waterfallConfig.increasing?.marker?.line?.width || 1
        }
      }
    },
    decreasing: {
      marker: {
        color: waterfallConfig.decreasing?.marker?.color || defaultDecreasingColor,
        line: {
          color: waterfallConfig.decreasing?.marker?.line?.color || '#fff',
          width: waterfallConfig.decreasing?.marker?.line?.width || 1
        }
      }
    },
    totals: {
      marker: {
        color: waterfallConfig.totals?.marker?.color || defaultTotalColor,
        line: {
          color: waterfallConfig.totals?.marker?.line?.color || '#fff',
          width: waterfallConfig.totals?.marker?.line?.width || 1
        }
      }
    },
    hovertemplate: waterfallConfig.hovertemplate || 
      `<b>%{text}</b><br>` +
      `${waterfallConfig.valueField}: %{y}<br>` +
      `Type: %{measure}<br>` +
      `<extra></extra>`,
    showlegend: waterfallConfig.showlegend !== false
  }];

  const layout: Partial<Layout> = {
    width: dimensions?.width || 400,
    height: dimensions?.height || 300,
    title: {
      text: waterfallConfig.title,
      font: { 
        color: theme?.textColor || '#333',
        size: 16
      }
    },
    xaxis: {
      title: { 
        text: waterfallConfig.orientation === 'h' ? waterfallConfig.valueField : waterfallConfig.categoryField 
      },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0',
      tickangle: waterfallConfig.orientation !== 'h' ? -45 : 0
    },
    yaxis: {
      title: { 
        text: waterfallConfig.orientation === 'h' ? waterfallConfig.categoryField : waterfallConfig.valueField 
      },
      color: theme?.textColor || '#333',
      gridcolor: theme?.gridColor || '#e0e0e0'
    },
    font: {
      color: theme?.textColor || '#333',
      family: theme?.fontFamily || 'Arial, sans-serif'
    },
    plot_bgcolor: theme?.backgroundColor || 'white',
    paper_bgcolor: theme?.backgroundColor || 'white',
    showlegend: waterfallConfig.showlegend !== false,
    legend: {
      orientation: 'v',
      x: 1.02,
      y: 1,
      font: { color: theme?.textColor || '#333' }
    },
    margin: { l: 80, r: 120, t: 80, b: 100 }
  };

  const plotConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'waterfall-chart',
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
            const dataIndex = point.pointNumber;
            const item = processedData[dataIndex];
            
            onInteraction({
              type: 'click',
              data: {
                category: item.category,
                value: item.value,
                measure: item.measure
              },
              dataIndex
            });
          }
        }}
        onHover={(event: any) => {
          if (onInteraction && event.points?.length > 0) {
            const point = event.points[0];
            const dataIndex = point.pointNumber;
            const item = processedData[dataIndex];
            
            onInteraction({
              type: 'hover',
              data: {
                category: item.category,
                value: item.value,
                measure: item.measure
              },
              dataIndex
            });
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default WaterfallChart;