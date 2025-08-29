// File: web-application/src/components/charts/echarts/chartConfig.ts

import { ChartPluginConfig } from '../interfaces/ChartPlugin';
import EChartsBarChart from './BarChart';

export const echartsBarChartConfig: ChartPluginConfig = {
  name: 'echarts-bar',
  displayName: 'Bar Chart',
  category: 'Basic Charts',
  library: 'echarts',
  version: '1.0.0',
  description: 'Column and bar charts with support for stacking and gradients',
  icon: 'bar_chart',
  configSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Chart Title' },
      subtitle: { type: 'string', title: 'Subtitle' },
      type: {
        type: 'string',
        enum: ['bar', 'column'],
        default: 'column',
        title: 'Chart Orientation'
      },
      stacked: {
        type: 'boolean',
        default: false,
        title: 'Stack Series'
      },
      gradient: {
        type: 'boolean',
        default: false,
        title: 'Enable Gradient'
      },
      xAxis: {
        type: 'object',
        properties: {
          label: { type: 'string', title: 'X-Axis Label' },
          rotation: { type: 'number', default: 0, title: 'Label Rotation' }
        }
      },
      yAxis: {
        type: 'object',
        properties: {
          label: { type: 'string', title: 'Y-Axis Label' }
        }
      },
      colors: {
        type: 'array',
        items: { type: 'string' },
        title: 'Color Palette'
      },
      legend: {
        type: 'object',
        properties: {
          show: { type: 'boolean', default: true, title: 'Show Legend' },
          position: {
            type: 'string',
            enum: ['top', 'bottom', 'left', 'right'],
            default: 'top',
            title: 'Legend Position'
          }
        }
      },
      animation: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true, title: 'Enable Animation' },
          duration: { type: 'number', default: 1000, title: 'Duration (ms)' }
        }
      }
    }
  },
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredColumnTypes: ['string', 'number'],
    supportedAggregations: ['sum', 'count', 'avg', 'min', 'max'],
    supportsDrilldown: true,
    supportsFiltering: true
  },
  exportFormats: ['png', 'svg', 'pdf', 'csv'],
  component: EChartsBarChart,
  tags: ['basic', 'comparison', 'categorical'],
  difficulty: 'basic'
};