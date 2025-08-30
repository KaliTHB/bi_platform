// File: web-application/src/plugins/charts/echarts/BarChart.tsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartProps } from '../interfaces/ChartPlugin';

interface BarChartProps extends ChartProps {
  config: {
    xField: string;
    yField: string;
    colorField?: string;
    showLegend?: boolean;
    orientation?: 'vertical' | 'horizontal';
  };
}

export const EChartsBarChart: React.FC<BarChartProps> = ({
  data,
  config,
  dimensions,
  theme,
  onInteraction,
  isLoading = false
}) => {
  const options = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'center'
        }
      };
    }

    const { xField, yField, colorField, showLegend = true, orientation = 'vertical' } = config;
    
    const xAxisData = data.map(item => item[xField]);
    const yAxisData = data.map(item => item[yField]);
    
    return {
      title: {
        text: 'Bar Chart',
        left: 'left'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        show: showLegend,
        data: ['Data']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: orientation === 'vertical' ? 'category' : 'value',
        data: orientation === 'vertical' ? xAxisData : undefined,
        name: orientation === 'vertical' ? xField : yField
      },
      yAxis: {
        type: orientation === 'vertical' ? 'value' : 'category',
        data: orientation === 'horizontal' ? xAxisData : undefined,
        name: orientation === 'vertical' ? yField : xField
      },
      series: [{
        name: 'Data',
        type: 'bar',
        data: orientation === 'vertical' ? yAxisData : yAxisData,
        itemStyle: colorField ? {
          color: (params: any) => {
            // Simple color mapping based on colorField
            const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];
            return colors[params.dataIndex % colors.length];
          }
        } : undefined
      }]
    };
  }, [data, config]);

  const handleEvents = useMemo(() => ({
    click: (params: any) => {
      onInteraction?.({
        type: 'click',
        data: params.data,
        dataIndex: params.dataIndex
      });
    }
  }), [onInteraction]);

  if (isLoading) {
    return (
      <div style={{ 
        width: dimensions.width, 
        height: dimensions.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <ReactECharts
      option={options}
      style={{ width: dimensions.width, height: dimensions.height }}
      onEvents={handleEvents}
      theme={theme?.name}
    />
  );
};

export default EChartsBarChart;