// web-application/src/components/builder/ChartRenderer.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove as FlatIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import * as echarts from 'echarts';
import { Chart, Dataset } from '@/types/auth.types';
import { chartAPI } from '@/services/api';

interface ChartRendererProps {
  chart: Chart;
  dataset?: Dataset;
  interactive?: boolean;
  height?: number | string;
  filters?: any[];
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  dataset,
  interactive = true,
  height = '100%',
  filters = []
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsInstance = useRef<echarts.ECharts | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<Array<{ name: string; type: string }>>([]);

  useEffect(() => {
    loadChartData();
  }, [chart.id, filters]);

  useEffect(() => {
    if (data.length > 0 && !error) {
      renderChart();
    }
    
    return () => {
      if (echartsInstance.current) {
        echartsInstance.current.dispose();
        echartsInstance.current = null;
      }
    };
  }, [data, chart.config, error]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (echartsInstance.current) {
        echartsInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chartAPI.getChartData(chart.id, { filters });
      setData(response.data);
      setColumns(response.columns);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current || data.length === 0) return;

    // Dispose existing instance
    if (echartsInstance.current) {
      echartsInstance.current.dispose();
    }

    // Create new instance
    echartsInstance.current = echarts.init(chartRef.current);

    let option: any = {};

    try {
      switch (chart.type) {
        case 'line-chart':
          option = generateLineChartOption();
          break;
        case 'bar-chart':
          option = generateBarChartOption();
          break;
        case 'pie-chart':
          option = generatePieChartOption();
          break;
        case 'scatter-plot':
          option = generateScatterPlotOption();
          break;
        case 'area-chart':
          option = generateAreaChartOption();
          break;
        case 'donut-chart':
          option = generateDonutChartOption();
          break;
        default:
          throw new Error(`Unsupported chart type: ${chart.type}`);
      }

      echartsInstance.current.setOption(option);

      // Add interactions if enabled
      if (interactive) {
        echartsInstance.current.on('click', (params) => {
          console.log('Chart clicked:', params);
          // Handle chart interactions
        });
      }
    } catch (err) {
      console.error('Failed to render chart:', err);
      setError('Failed to render chart');
    }
  };

  const generateLineChartOption = () => {
    const config = chart.config;
    const xAxisColumn = config.x_axis?.column;
    const yAxes = config.y_axes || [];

    if (!xAxisColumn || yAxes.length === 0) {
      throw new Error('Missing axis configuration');
    }

    const xAxisData = data.map(row => row[xAxisColumn]);
    const series = yAxes.map((yAxis: any, index: number) => ({
      name: yAxis.name || yAxis.column,
      type: 'line',
      data: data.map(row => row[yAxis.column]),
      lineStyle: {
        color: yAxis.color || getDefaultColor(index),
        width: yAxis.line_width || 2,
        type: yAxis.line_style || 'solid'
      },
      symbol: yAxis.show_points ? 'circle' : 'none',
      symbolSize: yAxis.point_size || 4,
      areaStyle: yAxis.fill_area ? { opacity: 0.3 } : undefined,
      smooth: config.smooth || false
    }));

    return {
      title: {
        text: config.title?.text || chart.name,
        subtext: config.title?.subtitle,
        left: config.title?.position || 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: config.interaction?.crosshair_enabled ? 'cross' : 'line'
        }
      },
      legend: {
        show: config.legend?.show !== false,
        orient: config.legend?.orientation || 'horizontal',
        [config.legend?.position === 'top' ? 'top' : 'bottom']: config.legend?.position === 'top' ? 10 : 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        show: config.grid?.show_x_grid || config.grid?.show_y_grid
      },
      xAxis: {
        type: config.x_axis?.type || 'category',
        data: xAxisData,
        name: config.x_axis?.title,
        axisLabel: {
          rotate: config.x_axis?.label_rotation || 0
        },
        splitLine: {
          show: config.grid?.show_x_grid || false
        }
      },
      yAxis: {
        type: 'value',
        name: yAxes[0]?.title,
        splitLine: {
          show: config.grid?.show_y_grid !== false
        }
      },
      series,
      dataZoom: config.interaction?.zoom_enabled ? [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ] : undefined
    };
  };

  const generateBarChartOption = () => {
    const config = chart.config;
    const xAxisColumn = config.x_axis?.column;
    const yAxes = config.y_axes || [];

    if (!xAxisColumn || yAxes.length === 0) {
      throw new Error('Missing axis configuration');
    }

    const xAxisData = data.map(row => row[xAxisColumn]);
    const series = yAxes.map((yAxis: any, index: number) => ({
      name: yAxis.name || yAxis.column,
      type: 'bar',
      data: data.map(row => row[yAxis.column]),
      itemStyle: {
        color: yAxis.color || getDefaultColor(index)
      },
      barWidth: config.bar_width,
      stack: config.stacked ? 'stack' : undefined
    }));

    return {
      title: {
        text: config.title?.text || chart.name,
        subtext: config.title?.subtitle,
        left: config.title?.position || 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        show: config.legend?.show !== false,
        orient: config.legend?.orientation || 'horizontal'
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
        name: config.x_axis?.title,
        axisLabel: {
          rotate: config.x_axis?.label_rotation || 0
        }
      },
      yAxis: {
        type: 'value',
        name: yAxes[0]?.title
      },
      series
    };
  };

  const generatePieChartOption = () => {
    const config = chart.config;
    const labelColumn = config.label_column;
    const valueColumn = config.value_column;

    if (!labelColumn || !valueColumn) {
      throw new Error('Missing pie chart configuration');
    }

    const pieData = data.map(row => ({
      name: row[labelColumn],
      value: row[valueColumn]
    }));

    return {
      title: {
        text: config.title?.text || chart.name,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        show: config.legend?.show !== false,
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: chart.name,
          type: 'pie',
          radius: config.donut ? ['40%', '70%'] : '70%',
          center: ['50%', '60%'],
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: config.show_labels !== false
          }
        }
      ]
    };
  };

  const generateScatterPlotOption = () => {
    const config = chart.config;
    const xColumn = config.x_axis?.column;
    const yColumn = config.y_axis?.column;

    if (!xColumn || !yColumn) {
      throw new Error('Missing scatter plot configuration');
    }

    const scatterData = data.map(row => [row[xColumn], row[yColumn]]);

    return {
      title: {
        text: config.title?.text || chart.name
      },
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'cross'
        }
      },
      xAxis: {
        type: 'value',
        name: config.x_axis?.title || xColumn,
        scale: true
      },
      yAxis: {
        type: 'value',
        name: config.y_axis?.title || yColumn,
        scale: true
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: config.point_size || 6
        }
      ]
    };
  };

  const generateAreaChartOption = () => {
    const lineOption = generateLineChartOption();
    
    // Convert line chart to area chart
    if (lineOption.series) {
      lineOption.series = lineOption.series.map((series: any) => ({
        ...series,
        areaStyle: { opacity: 0.6 }
      }));
    }

    return lineOption;
  };

  const generateDonutChartOption = () => {
    const pieOption = generatePieChartOption();
    
    // Convert pie chart to donut
    if (pieOption.series && pieOption.series[0]) {
      pieOption.series[0].radius = ['40%', '70%'];
    }

    return pieOption;
  };

  const getDefaultColor = (index: number) => {
    const colors = [
      '#1976d2', '#dc004e', '#388e3c', '#f57c00',
      '#7b1fa2', '#c62828', '#00796b', '#f9a825'
    ];
    return colors[index % colors.length];
  };

  const renderTableChart = () => {
    if (data.length === 0) return null;

    const displayColumns = chart.config.columns || columns.slice(0, 10);
    const displayRows = data.slice(0, chart.config.max_rows || 100);

    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            {displayColumns.map((col: any) => (
              <TableCell key={col.name || col}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {col.display_name || col.name || col}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayRows.map((row, index) => (
            <TableRow key={index}>
              {displayColumns.map((col: any) => {
                const colName = col.name || col;
                return (
                  <TableCell key={colName}>
                    {formatValue(row[colName], col.type)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMetricCard = () => {
    const config = chart.config;
    const valueColumn = config.value_column;
    const comparisonColumn = config.comparison_column;

    if (!valueColumn || data.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography>No data available</Typography>
        </Box>
      );
    }

    const currentValue = data[0][valueColumn];
    const previousValue = comparisonColumn ? data[0][comparisonColumn] : null;
    const change = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : null;

    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h3" color="primary" gutterBottom>
            {formatValue(currentValue, config.value_format)}
          </Typography>
          <Typography variant="h6" gutterBottom>
            {config.title?.text || chart.name}
          </Typography>
          {change !== null && (
            <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
              {change > 0 ? (
                <TrendingUp color="success" />
              ) : change < 0 ? (
                <TrendingDown color="error" />
              ) : (
                <FlatIcon color="disabled" />
              )}
              <Typography
                variant="body2"
                color={change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'}
                sx={{ ml: 0.5 }}
              >
                {Math.abs(change).toFixed(1)}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'number':
      case 'integer':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      default:
        return value.toString();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={height} p={2}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Tooltip title="Refresh">
          <IconButton onClick={loadChartData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  // Render different chart types
  if (chart.type === 'table-chart') {
    return (
      <Box sx={{ height, overflow: 'auto' }}>
        {renderTableChart()}
      </Box>
    );
  }

  if (chart.type === 'metric-card') {
    return renderMetricCard();
  }

  // Render ECharts-based charts
  return (
    <Box sx={{ height, width: '100%' }}>
      <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};