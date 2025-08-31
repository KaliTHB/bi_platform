import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as echarts from 'echarts';
import { ChartProps, ChartConfiguration } from '../../../types/chart.types';

interface RadarChartConfig extends ChartConfiguration {
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
}

interface RadarChartProps extends ChartProps {
  config: RadarChartConfig;
}

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
    if (!data || data.length === 0) {
      setProcessedData({ seriesData: [], indicators: [], seriesNames: [] });
      return;
    }

    try {
      let indicators: any[] = [];
      let seriesData: any[] = [];
      let seriesNames: string[] = [];

      if (config.radar?.indicator) {
        // Use predefined indicators
        indicators = config.radar.indicator;
      } else if (config.valueFields) {
        // Auto-generate indicators from valueFields
        indicators = config.valueFields.map(field => {
          const values = data.map(item => Number(item[field]) || 0);
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
        const numericFields = Object.keys(data[0] || {}).filter(key => {
          return data.some(item => typeof item[key] === 'number' && !isNaN(item[key]));
        });

        indicators = numericFields.map(field => {
          const values = data.map(item => Number(item[field]) || 0);
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
          
          const seriesValues = data.map(item => {
            return seriesConfig.dataFields.map(field => Number(item[field]) || 0);
          });

          seriesData.push({
            name: seriesConfig.name,
            type: 'radar',
            data: seriesValues.map((values, dataIndex) => ({
              value: values,
              name: config.nameField ? data[dataIndex][config.nameField] : `Item ${dataIndex + 1}`
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
        
        if (config.nameField && data.length > 0) {
          // Each row is a separate series
          data.forEach((item, index) => {
            const seriesName = item[config.nameField] || `Series ${index + 1}`;
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
          const seriesValues = data.map((item, index) => {
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
  }, [data, config, theme]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || processedData.indicators.length === 0) return;

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
          },
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
      chartInstance.current.resize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render radar chart';
      onError?.(new Error(errorMessage));
    }
  }, [processedData, config, dimensions, theme, onInteraction]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = undefined;
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
          No data available for radar chart
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={chartRef}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        '& canvas': {
          borderRadius: 1
        }
      }}
    />
  );
};

export default RadarChart;