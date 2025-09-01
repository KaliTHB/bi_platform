import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as echarts from 'echarts';
import { ChartProps, ChartData } from '../../../types/chart.types';

interface RadarChartConfig {
  title?: string;
  subtitle?: string;
  radar?: {
    indicator: Array<{
      name: string;
      max?: number;
      min?: number;
    }>;
    radius?: string | number;
    startAngle?: number;
    splitNumber?: number;
    shape?: 'polygon' | 'circle';
    center?: [string | number, string | number];
  };
  series?: Array<{
    name: string;
    dataFields: string[];
    areaStyle?: {
      opacity?: number;
      color?: string;
    };
    lineStyle?: {
      width?: number;
      color?: string;
    };
    symbol?: string;
    symbolSize?: number;
  }>;
  nameField?: string;
  valueFields?: string[];
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    orient?: 'horizontal' | 'vertical';
  };
  animation?: boolean;
  colors?: string[];
  [key: string]: any;
}

interface RadarChartProps extends ChartProps {
  config: RadarChartConfig;
}

// Utility function to normalize data to array format
const normalizeData = (data: any[] | ChartData): any[] => {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && 'rows' in data) {
    return (data as ChartData).rows || [];
  }
  
  return [];
};

// Utility function to check if data is empty
const isDataEmpty = (data: any[] | ChartData): boolean => {
  const normalizedData = normalizeData(data);
  return normalizedData.length === 0;
};

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  config,
  dimensions = { width: 800, height: 600 },
  theme,
  onInteraction,
  onError,
  isLoading = false,
  error
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [processedData, setProcessedData] = useState<{
    seriesData: any[];
    indicators: any[];
    seriesNames: string[];
  }>({
    seriesData: [],
    indicators: [],
    seriesNames: []
  });

  // Process data for radar chart
  useEffect(() => {
    if (isDataEmpty(data)) {
      setProcessedData({ seriesData: [], indicators: [], seriesNames: [] });
      return;
    }

    try {
      const normalizedData = normalizeData(data);
      let indicators: any[] = [];
      let seriesData: any[] = [];
      let seriesNames: string[] = [];

      if (config.radar?.indicator) {
        // Use predefined indicators
        indicators = config.radar.indicator;
      } else if (config.valueFields) {
        // Auto-generate indicators from valueFields
        indicators = config.valueFields.map(field => {
          const values = normalizedData.map(item => Number(item[field]) || 0);
          const max = Math.max(...values);
          const min = Math.min(...values);
          
          return {
            name: field,
            max: max > 0 ? Math.ceil(max * 1.1) : 100,
            min: min < 0 ? Math.floor(min * 1.1) : 0
          };
        });
      } else {
        // Auto-detect numeric fields
        const firstItem = normalizedData[0] || {};
        const numericFields = Object.keys(firstItem).filter(key => {
          return normalizedData.some(item => typeof item[key] === 'number' && !isNaN(item[key]));
        });

        indicators = numericFields.map(field => {
          const values = normalizedData.map(item => Number(item[field]) || 0);
          const max = Math.max(...values);
          const min = Math.min(...values);
          
          return {
            name: field,
            max: max > 0 ? Math.ceil(max * 1.1) : 100,
            min: min < 0 ? Math.floor(min * 1.1) : 0
          };
        });
      }

      // Process series data
      if (config.series && config.series.length > 0) {
        // Use predefined series configuration
        config.series.forEach((seriesConfig, seriesIndex) => {
          seriesNames.push(seriesConfig.name);
          
          const seriesValues = normalizedData.map(item => {
            return seriesConfig.dataFields.map(field => Number(item[field]) || 0);
          });

          seriesData.push({
            name: seriesConfig.name,
            type: 'radar',
            data: seriesValues.map((values, dataIndex) => ({
              value: values,
              name: config.nameField ? normalizedData[dataIndex][config.nameField] : `Item ${dataIndex + 1}`
            })),
            areaStyle: seriesConfig.areaStyle ? {
              opacity: seriesConfig.areaStyle.opacity || 0.3,
              color: seriesConfig.areaStyle.color || theme?.colors?.[seriesIndex] || '#5470c6'
            } : undefined,
            lineStyle: seriesConfig.lineStyle ? {
              width: seriesConfig.lineStyle.width || 2,
              color: seriesConfig.lineStyle.color || theme?.colors?.[seriesIndex] || '#5470c6'
            } : undefined,
            symbol: seriesConfig.symbol || 'circle',
            symbolSize: seriesConfig.symbolSize || 6
          });
        });
      } else {
        // Auto-generate series from data
        const indicatorFields = indicators.map(ind => ind.name);
        
        if (config.nameField && normalizedData.length > 0) {
          // Each row is a separate series
          normalizedData.forEach((item, index) => {
            const seriesName = item[config.nameField!] || `Series ${index + 1}`;
            seriesNames.push(seriesName);
            
            const values = indicatorFields.map(field => Number(item[field]) || 0);
            
            seriesData.push({
              name: seriesName,
              type: 'radar',
              data: [{
                value: values,
                name: seriesName
              }],
              areaStyle: {
                opacity: 0.3
              },
              lineStyle: {
                width: 2
              },
              symbol: 'circle',
              symbolSize: 6
            });
          });
        } else {
          // Single series with all data points
          seriesNames.push('Data Series');
          const seriesValues = normalizedData.map((item, index) => {
            const values = indicatorFields.map(field => Number(item[field]) || 0);
            return {
              value: values,
              name: config.nameField ? item[config.nameField] : `Item ${index + 1}`
            };
          });

          seriesData.push({
            name: 'Data Series',
            type: 'radar',
            data: seriesValues,
            areaStyle: {
              opacity: 0.3
            },
            lineStyle: {
              width: 2
            },
            symbol: 'circle',
            symbolSize: 6
          });
        }
      }

      setProcessedData({ seriesData, indicators, seriesNames });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process radar chart data';
      onError?.(new Error(errorMessage));
      setProcessedData({ seriesData: [], indicators: [], seriesNames: [] });
    }
  }, [data, config, theme, onError]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || processedData.indicators.length === 0) return;

    let resizeListener: (() => void) | null = null;

    try {
      // Initialize ECharts instance
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const option: echarts.EChartsOption = {
        title: config.title ? {
          text: config.title,
          subtext: config.subtitle,
          left: 'center',
          textStyle: {
            color: theme?.textColor || '#333'
          }
        } : undefined,
        backgroundColor: theme?.backgroundColor || 'transparent',
        tooltip: {
          show: true,
          trigger: 'item',
          formatter: (params: any) => {
            if (params.value && Array.isArray(params.value)) {
              const indicators = processedData.indicators;
              let tooltipText = `<strong>${params.name}</strong><br/>`;
              params.value.forEach((value: number, index: number) => {
                if (indicators[index]) {
                  tooltipText += `${indicators[index].name}: ${value}<br/>`;
                }
              });
              return tooltipText;
            }
            return params.name;
          }
        },
        legend: config.legend?.show !== false && processedData.seriesNames.length > 1 ? {
          data: processedData.seriesNames,
          bottom: config.legend?.position === 'bottom' ? 10 : undefined,
          top: config.legend?.position === 'top' ? 10 : undefined,
          left: config.legend?.position === 'left' ? 10 : undefined,
          right: config.legend?.position === 'right' ? 10 : undefined,
          orient: config.legend?.orient || 'horizontal',
          textStyle: {
            color: theme?.textColor || '#333'
          }
        } : undefined,
        radar: {
          indicator: processedData.indicators,
          radius: config.radar?.radius || '70%',
          startAngle: config.radar?.startAngle || 90,
          splitNumber: config.radar?.splitNumber || 5,
          shape: config.radar?.shape || 'polygon',
          center: config.radar?.center || ['50%', '50%'],
          name: {
            textStyle: {
              color: theme?.textColor || '#333'
            }
          } as any, // Type assertion to bypass strict typing
          splitLine: {
            lineStyle: {
              color: theme?.gridColor || '#e0e6ed'
            }
          },
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
            }
          },
          axisLine: {
            lineStyle: {
              color: theme?.gridColor || '#e0e6ed'
            }
          }
        },
        series: processedData.seriesData.map((series, index) => ({
          ...series,
          itemStyle: {
            color: theme?.colors?.[index % (theme?.colors?.length || 1)] || '#5470c6'
          },
          areaStyle: series.areaStyle ? {
            ...series.areaStyle,
            color: series.areaStyle.color || theme?.colors?.[index % (theme?.colors?.length || 1)] || '#5470c6'
          } : undefined
        })),
        animation: config.animation !== false,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      };

      chartInstance.current.setOption(option, true);

      // Handle interactions
      if (onInteraction) {
        const handleClick = (params: any) => {
          onInteraction({
            type: 'click',
            data: params.data,
            dataIndex: params.dataIndex,
            seriesIndex: params.seriesIndex
          });
        };

        chartInstance.current.off('click');
        chartInstance.current.on('click', handleClick);
      }

      // Handle resize
      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);
      resizeListener = handleResize;
      chartInstance.current.resize();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render radar chart';
      onError?.(new Error(errorMessage));
    }

    // Return cleanup function
    return () => {
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
    };
  }, [processedData, config, theme, onInteraction, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        width={dimensions.width} 
        height={dimensions.height}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box width={dimensions.width} height={dimensions.height}>
        <Alert severity="error">
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  // No data state
  if (isDataEmpty(data)) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        width={dimensions.width} 
        height={dimensions.height}
      >
        <Typography variant="body2" color="textSecondary">
          No data available for radar chart
        </Typography>
      </Box>
    );
  }

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: dimensions.width, 
        height: dimensions.height 
      }} 
    />
  );
};

export default RadarChart;

// Chart Plugin Configuration Export
export const EChartsRadarChartConfig = {
  name: 'echarts-radar',
  displayName: 'ECharts Radar Chart',
  category: 'advanced',
  library: 'echarts',
  version: '1.0.0',
  description: 'Multi-dimensional radar chart for comparing multiple variables across data points',
  tags: ['radar', 'spider', 'multi-dimensional', 'comparison', 'advanced'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Radar Chart'
      },
      subtitle: {
        type: 'string',
        title: 'Chart Subtitle'
      },
      nameField: {
        type: 'string',
        title: 'Name Field',
        description: 'Field used for series names or item labels'
      },
      valueFields: {
        type: 'array',
        title: 'Value Fields',
        description: 'Fields to display as radar indicators',
        items: {
          type: 'string',
          title: 'Field'
        },
        default: []
      },
      radarShape: {
        type: 'select',
        title: 'Radar Shape',
        options: [
          { label: 'Polygon', value: 'polygon' },
          { label: 'Circle', value: 'circle' }
        ],
        default: 'polygon'
      },
      radarRadius: {
        type: 'string',
        title: 'Radar Radius',
        default: '75%'
      },
      startAngle: {
        type: 'number',
        title: 'Start Angle',
        description: 'Starting angle of the radar in degrees',
        default: 90,
        minimum: 0,
        maximum: 360
      },
      splitNumber: {
        type: 'number',
        title: 'Split Number',
        description: 'Number of concentric circles',
        default: 5,
        minimum: 1,
        maximum: 20
      },
      showLegend: {
        type: 'boolean',
        title: 'Show Legend',
        default: true
      },
      legendPosition: {
        type: 'select',
        title: 'Legend Position',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' }
        ],
        default: 'bottom'
      },
      legendOrientation: {
        type: 'select',
        title: 'Legend Orientation',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' }
        ],
        default: 'horizontal'
      },
      fillArea: {
        type: 'boolean',
        title: 'Fill Area',
        description: 'Fill the area under radar lines',
        default: true
      },
      lineWidth: {
        type: 'number',
        title: 'Line Width',
        default: 2,
        minimum: 1,
        maximum: 10
      },
      pointSize: {
        type: 'number',
        title: 'Point Size',
        default: 6,
        minimum: 2,
        maximum: 20
      },
      pointSymbol: {
        type: 'select',
        title: 'Point Symbol',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Rectangle', value: 'rect' },
          { label: 'Round Rectangle', value: 'roundRect' },
          { label: 'Triangle', value: 'triangle' },
          { label: 'Diamond', value: 'diamond' },
          { label: 'Pin', value: 'pin' },
          { label: 'Arrow', value: 'arrow' }
        ],
        default: 'circle'
      },
      animation: {
        type: 'boolean',
        title: 'Enable Animation',
        default: true
      },
      colors: {
        type: 'array',
        title: 'Color Scheme',
        description: 'Custom colors for series',
        items: {
          type: 'color',
          title: 'Color'
        },
        default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
      }
    },
    required: []
  },
  
  dataRequirements: {
    minColumns: 3,
    maxColumns: 50,
    requiredFields: [],
    optionalFields: ['name'],
    supportedTypes: ['string', 'number'],
    aggregationSupport: true,
    pivotSupport: false,
    specialRequirements: [
      'At least 3 numeric fields required for meaningful radar visualization',
      'Name field recommended for series identification'
    ]
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: RadarChart
};