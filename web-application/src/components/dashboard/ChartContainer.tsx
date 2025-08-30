// web-application/src/components/dashboard/ChartContainer.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Paper
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { chartAPI } from '../../services/api';
import EChartsRenderer from '../charts/EChartsRenderer';
import TableRenderer from '../charts/TableRenderer';
import MetricCardRenderer from '../charts/MetricCardRenderer';

interface ChartContainerProps {
  chart: {
    id: string;
    name: string;
    type: string;
    config: any;
    dataset_id: string;
    dataset?: {
      id: string;
      name: string;
    };
  };
  workspaceId?: string;
  preview?: boolean;
  filters?: any[];
  onChartClick?: (chart: any) => void;
  onChartError?: (chartId: string, error: string) => void;
}

interface ChartData {
  data: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  metadata: {
    totalRows: number;
    queryTime: number;
    lastUpdated: string;
    error?: string;
  };
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  chart,
  workspaceId,
  preview = false,
  filters = [],
  onChartClick,
  onChartError
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Update dimensions when container resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width - 32, // Account for padding
          height: rect.height - 80 // Account for title and padding
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver for container-specific resize events
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Load chart data
  useEffect(() => {
    loadChartData();
  }, [chart.id, workspaceId, filters]);

  const loadChartData = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await chartAPI.getChartData(chart.id, {
        filters: JSON.stringify(filters)
      });

      if (response.success) {
        setChartData(response);
      } else {
        setError(response.message || 'Failed to load chart data');
        onChartError?.(chart.id, response.message || 'Failed to load chart data');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while loading chart data';
      setError(errorMessage);
      onChartError?.(chart.id, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshChart = async () => {
    setRefreshing(true);
    await loadChartData();
    setRefreshing(false);
    setMenuAnchor(null);
  };

  const exportChart = async (format: 'json' | 'csv' | 'excel') => {
    try {
      const response = await chartAPI.exportChart(chart.id, { format });
      
      if (response.success && response.export) {
        // Create download link
        const blob = new Blob([response.export.data], {
          type: format === 'json' ? 'application/json' : 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.export.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Chart export failed:', error);
    }
    setMenuAnchor(null);
  };

  const handleChartInteraction = (event: any) => {
    if (onChartClick) {
      onChartClick({ chart, event });
    }
  };

  const renderChart = () => {
    if (!chartData) return null;

    const commonProps = {
      data: chartData.data,
      config: chart.config,
      dimensions,
      onInteraction: handleChartInteraction
    };

    switch (chart.type) {
      case 'echarts-bar':
      case 'echarts-line':
      case 'echarts-pie':
      case 'echarts-scatter':
      case 'echarts-area':
      case 'echarts-donut':
        return <EChartsRenderer type={chart.type} {...commonProps} />;
      
      case 'table-chart':
        return (
          <TableRenderer
            data={chartData.data}
            columns={chartData.columns}
            config={chart.config}
          />
        );
      
      case 'metric-card':
        return (
          <MetricCardRenderer
            data={chartData.data}
            config={chart.config}
            dimensions={dimensions}
          />
        );
      
      default:
        return (
          <Alert severity="warning">
            Unsupported chart type: {chart.type}
          </Alert>
        );
    }
  };

  const formatQueryTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Chart Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          minHeight: 40
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontSize: '1rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}
        >
          {chart.name}
        </Typography>
        
        {!preview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={refreshChart}
              disabled={refreshing}
              sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              {refreshing ? (
                <CircularProgress size={16} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
            
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Chart Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ height: 'fit-content' }}>
            {error}
          </Alert>
        ) : (
          renderChart()
        )}
      </Box>

      {/* Metadata Footer */}
      {chartData?.metadata && !loading && !error && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1,
            pt: 1,
            borderTop: '1px solid',
            borderTopColor: 'divider',
            fontSize: '0.75rem',
            color: 'text.secondary',
            opacity: 0.8
          }}
        >
          <Typography variant="caption">
            {chartData.metadata.totalRows} rows
          </Typography>
          <Typography variant="caption">
            {formatQueryTime(chartData.metadata.queryTime)}
          </Typography>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={refreshChart} disabled={refreshing}>
          <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
          Refresh
        </MenuItem>
        <MenuItem onClick={() => exportChart('json')}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => exportChart('csv')}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as CSV
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChartContainer;