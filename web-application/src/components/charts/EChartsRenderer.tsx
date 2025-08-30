// web-application/src/components/charts/EChartsRenderer.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { Box, Alert } from '@mui/material';

interface EChartsRendererProps {
  type: string;
  data: any[];
  config: any;
  dimensions: {
    width: number;
    height: number;
  };
  onInteraction?: (event: any) => void;
  theme?: string;
}

const EChartsRenderer: React.FC<EChartsRendererProps> = ({
  type,
  data,
  config,
  dimensions,
  onInteraction,
  theme = 'default'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Generate chart options based on type and config
  const chartOptions = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    try {
      switch (type) {
        case 'echarts-bar':
          return generateBarChartOptions(data, config);
        case 'echarts-line':
          return generateLineChartOptions(data, config);
        case 'echarts-pie':
          return generatePieChartOptions(data, config);
        case 'echarts-scatter':
          return generateScatterChartOptions(data, config);
        case 'echarts-area':
          return generateAreaChartOptions(data, config);
        case 'echarts-donut':
          return generateDonutChartOptions(data, config);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error generating chart options:', error);
      return null;
    }
  }, [type, data, config]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !chartOptions) return;

    // Dispose previous instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // Create new chart instance
    chartInstance.current = echarts.init(chartRef.current, theme);

    // Set options with proper typing
    chartInstance.current.setOption(chartOptions as EChartsOption, true);

    // Add event listeners
    if (onInteraction) {
      chartInstance.current.on('click', (params) => {
        onInteraction({
          type: 'click',
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex
        });
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [chartOptions, theme, onInteraction]);

  // Handle resize
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.resize({
        width: dimensions.width,
        height: dimensions.height
      });
    }
  }, [dimensions]);

  if (!chartOptions) {
    return (
      <Alert severity="warning">
        Unable to render chart. Please check your data and configuration.
      </Alert>
    );
  }

  return (
    <Box
      ref={chartRef}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 200
      }}
    />
  );
};

// Chart option generators with proper typing
function generateBarChartOptions(data: any[], config: any): EChartsOption {
  const { xAxis, yAxis, series = [], orientation = 'vertical', stacked = false } = config;
  
  if (!xAxis?.field || !yAxis?.field) {
    throw new Error('xAxis.field and yAxis.field are required for bar charts');
  }

  // Extract categories and values
  const categories = data.map(item => item[xAxis.field]);
  const values = data.map(item => item[yAxis.field]);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      show: config.showLegend !== false,
      data: series.map((s: any) => s.name || 'Series')
    },
    grid: {
      show: config.showGrid !== false,
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: orientation === 'horizontal' 
      ? {
          type: 'value',
          name: xAxis.title,
          nameLocation: 'middle',
          nameGap: 30
        }
      : {
          type: 'category',
          data: categories,
          name: xAxis.title,
          nameLocation: 'middle',
          nameGap: 30
        },
    yAxis: orientation === 'horizontal'
      ? {
          type: 'category',
          data: categories,
          name: yAxis.title,
          nameLocation: 'middle',
          nameGap: 50
        }
      : {
          type: 'value',
          name: yAxis.title,
          nameLocation: 'middle',
          nameGap: 50
        },
    series: [
      {
        name: series[0]?.name || 'Data',
        type: 'bar',
        data: values,
        stack: stacked ? 'total' : undefined,
        itemStyle: {
          color: series[0]?.color || '#5470c6'
        },
        emphasis: {
          focus: 'series'
        },
        animationDelay: (idx: number) => idx * 10
      }
    ],
    animation: config.animation !== false,
    // Fix: Cast to proper type or use type assertion
    animationEasing: 'elasticOut' as any,
    animationDelayUpdate: (idx: number) => idx * 5
  };
}

function generateLineChartOptions(data: any[], config: any): EChartsOption {
  const { xAxis, yAxis, series = [], smooth = false, showPoints = true, fillArea = false } = config;
  
  if (!xAxis?.field || !yAxis?.field) {
    throw new Error('xAxis.field and yAxis.field are required for line charts');
  }

  const categories = data.map(item => item[xAxis.field]);
  const values = data.map(item => item[yAxis.field]);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      show: config.showLegend !== false,
      data: series.map((s: any) => s.name || 'Series')
    },
    grid: {
      show: config.showGrid !== false,
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      name: xAxis.title,
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: yAxis.title,
      nameLocation: 'middle',
      nameGap: 50
    },
    series: [
      {
        name: series[0]?.name || 'Data',
        type: 'line',
        smooth,
        showSymbol: showPoints,
        areaStyle: fillArea ? {} : undefined,
        data: values,
        lineStyle: {
          color: series[0]?.color || '#5470c6',
          width: series[0]?.lineStyle?.width || 2,
          type: series[0]?.lineStyle?.type || 'solid'
        },
        itemStyle: {
          color: series[0]?.color || '#5470c6'
        }
      }
    ],
    animation: config.animation !== false
  };
}

function generatePieChartOptions(data: any[], config: any): EChartsOption {
  const { labelField, valueField, showLegend = true } = config;
  
  if (!labelField || !valueField) {
    throw new Error('labelField and valueField are required for pie charts');
  }

  const pieData = data.map(item => ({
    name: item[labelField],
    value: item[valueField]
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c} ({d}%)'
    },
    legend: {
      show: showLegend,
      orient: 'vertical',
      left: 'left',
      data: pieData.map(item => item.name)
    },
    series: [
      {
        name: config.title || 'Data',
        type: 'pie',
        radius: '55%',
        center: ['50%', '60%'],
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        animationType: 'scale',
        // Fix: Cast to proper type
        animationEasing: 'elasticOut' as any,
        animationDelay: (idx: number) => Math.random() * 200
      }
    ],
    animation: config.animation !== false
  };
}

function generateScatterChartOptions(data: any[], config: any): EChartsOption {
  const { xAxis, yAxis, series = [] } = config;
  
  if (!xAxis?.field || !yAxis?.field) {
    throw new Error('xAxis.field and yAxis.field are required for scatter plots');
  }

  const scatterData = data.map(item => [item[xAxis.field], item[yAxis.field]]);

  return {
    tooltip: {
      trigger: 'item',
      axisPointer: {
        type: 'cross'
      }
    },
    xAxis: {
      type: 'value',
      name: xAxis.title,
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: {
        show: config.showGrid !== false
      }
    },
    yAxis: {
      type: 'value',
      name: yAxis.title,
      nameLocation: 'middle',
      nameGap: 50,
      splitLine: {
        show: config.showGrid !== false
      }
    },
    series: [
      {
        name: series[0]?.name || 'Data',
        type: 'scatter',
        data: scatterData,
        symbolSize: 8,
        itemStyle: {
          color: series[0]?.color || '#5470c6'
        }
      }
    ],
    animation: config.animation !== false
  };
}

function generateAreaChartOptions(data: any[], config: any): EChartsOption {
  const lineOptions = generateLineChartOptions(data, { ...config, fillArea: true });
  return lineOptions;
}

function generateDonutChartOptions(data: any[], config: any): EChartsOption {
  const pieOptions = generatePieChartOptions(data, config);
  
  // Convert to donut by adding inner radius
  if (pieOptions.series && Array.isArray(pieOptions.series) && pieOptions.series[0]) {
    (pieOptions.series[0] as any).radius = ['40%', '70%'];
  }
  
  return pieOptions;
}

export default EChartsRenderer;