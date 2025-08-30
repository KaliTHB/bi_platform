// File: web-application/src/components/charts/echarts/BarChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { ChartProps, ChartPluginConfig } from '../interfaces';

const EChartsBarChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError,
  theme
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartRef.current || !data.rows.length) return;

    try {
      // Initialize chart
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, theme ? 'dark' : undefined);
      }

      // Prepare data
      const xAxisData = data.rows.map(row => {
        const xColumn = config.xAxis?.dataKey || data.columns[0]?.name;
        return row[xColumn];
      });

      const seriesData = config.series?.map(series => ({
        name: series.name,
        type: 'bar',
        data: data.rows.map(row => row[series.dataKey]),
        itemStyle: {
          color: series.color
        },
        stack: series.stack
      })) || [{
        name: 'Value',
        type: 'bar',
        data: data.rows.map(row => {
          const yColumn = config.yAxis?.dataKey || data.columns[1]?.name;
          return row[yColumn];
        })
      }];

      const option: echarts.EChartsOption = {
        title: {
          text: config.title,
          subtext: config.subtitle,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          show: config.legend?.show !== false,
          orient: 'horizontal',
          left: config.legend?.align || 'center',
          top: config.legend?.position === 'top' ? 'top' : 'auto',
          bottom: config.legend?.position === 'bottom' ? 'bottom' : 'auto'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          name: config.xAxis?.title,
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: {
            rotate: config.xAxis?.rotate || 0
          }
        },
        yAxis: {
          type: 'value',
          name: config.yAxis?.title,
          nameLocation: 'middle',
          nameGap: 50,
          min: config.yAxis?.min,
          max: config.yAxis?.max
        },
        series: seriesData,
        color: config.colors || ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
        animation: config.animation?.enabled !== false,
        animationDuration: config.animation?.duration || 1000
      };

      chartInstance.current.setOption(option, true);

      // Handle interactions
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params) => {
        if (onInteraction) {
          onInteraction({
            type: 'click',
            data: params,
            event: params.event?.event
          });
        }
      });

      setLoading(false);
    } catch (error) {
      console.error('Error rendering bar chart:', error);
      onError?.(error as Error);
      setLoading(false);
    }
  }, [data, config, width, height, theme, onInteraction, onError]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.resize({ width, height });
    }
  }, [width, height]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        Loading chart...
      </div>
    );
  }

  return <div ref={chartRef} style={{ width, height }} />;
};

export const EChartsBarChartConfig: ChartPluginConfig = {
  name: 'echarts-bar',
  displayName: 'Bar Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  component: EChartsBarChart,
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredColumnTypes: ['string', 'number'],
    supportedAggregations: ['sum', 'avg', 'count', 'min', 'max']
  },
  exportFormats: ['png', 'svg', 'pdf'],
  configSchema: {
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        description: 'The main title of the chart'
      },
      subtitle: {
        type: 'string',
        title: 'Chart Subtitle',
        description: 'The subtitle of the chart'
      },
      xAxis: {
        type: 'object',
        title: 'X-Axis Configuration',
        properties: {
          title: {
            type: 'string',
            title: 'X-Axis Title'
          },
          dataKey: {
            type: 'string',
            title: 'Data Column'
          },
          rotate: {
            type: 'number',
            title: 'Label Rotation',
            minimum: -90,
            maximum: 90,
            default: 0
          }
        }
      },
      yAxis: {
        type: 'object',
        title: 'Y-Axis Configuration',
        properties: {
          title: {
            type: 'string',
            title: 'Y-Axis Title'
          },
          min: {
            type: 'number',
            title: 'Minimum Value'
          },
          max: {
            type: 'number',
            title: 'Maximum Value'
          }
        }
      },
      series: {
        type: 'array',
        title: 'Data Series',
        properties: {
          name: {
            type: 'string',
            title: 'Series Name'
          },
          dataKey: {
            type: 'string',
            title: 'Data Column'
          },
          color: {
            type: 'string',
            title: 'Color',
            format: 'color'
          },
          stack: {
            type: 'string',
            title: 'Stack Group'
          }
        }
      },
      colors: {
        type: 'array',
        title: 'Color Palette',
        description: 'Array of colors for the chart'
      },
      legend: {
        type: 'object',
        title: 'Legend Configuration',
        properties: {
          show: {
            type: 'boolean',
            title: 'Show Legend',
            default: true
          },
          position: {
            type: 'string',
            title: 'Position',
            enum: ['top', 'bottom', 'left', 'right'],
            default: 'top'
          },
          align: {
            type: 'string',
            title: 'Alignment',
            enum: ['left', 'center', 'right'],
            default: 'center'
          }
        }
      },
      animation: {
        type: 'object',
        title: 'Animation Settings',
        properties: {
          enabled: {
            type: 'boolean',
            title: 'Enable Animation',
            default: true
          },
          duration: {
            type: 'number',
            title: 'Animation Duration (ms)',
            minimum: 0,
            maximum: 5000,
            default: 1000
          }
        }
      }
    },
    groups: [
      {
        title: 'Basic Settings',
        properties: ['title', 'subtitle']
      },
      {
        title: 'Axes',
        properties: ['xAxis', 'yAxis']
      },
      {
        title: 'Data Series',
        properties: ['series', 'colors']
      },
      {
        title: 'Display Options',
        properties: ['legend', 'animation']
      }
    ]
  }
};