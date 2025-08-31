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
  execution_time: number;
  metadata?: {
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

      // The API service already unwraps the response, so use it directly
      if (response && response.data) {
        // Create metadata from available fields
        const metadata = {
          totalRows: response.data.length,
          queryTime: response.execution_time || 0,
          lastUpdated: new Date().toISOString(),
          error: undefined
        };

        setChartData({
          ...response,
          metadata
        });
      } else {
        throw new Error('Invalid response format');
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
      
      if (response && response.export) {
        // Create download link
        const blob = new Blob([response.export.data], {
          type: format === 'json' ? 'application/json' :
                format === 'csv' ? 'text/csv' : 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.export.filename || `chart_${chart.id}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      // Could show a toast notification here
    }
    setMenuAnchor(null);
  };

  // Fix for ChartContainer.tsx renderChart method
const renderChart = () => {
  if (!chartData) return null;

  switch (chart.type.toLowerCase()) {
    case 'bar':
    case 'line':
    case 'pie':
    case 'scatter':
    case 'area':
      // EChartsRenderer expects: type, data, config, dimensions
      return (
        <EChartsRenderer 
          type={chart.type}
          data={chartData.data}
          config={chart.config}
          dimensions={dimensions}
        />
      );
    
    case 'table':
      // TableRenderer expects: data, columns, config (no dimensions)
      return (
        <TableRenderer 
          data={chartData.data}
          columns={chartData.columns}
          config={chart.config}
        />
      );
      
    case 'metric':
    case 'kpi':
      // MetricCardRenderer expects: data, config, dimensions (no columns)
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

  const formatQueryTime = (milliseconds: number) => {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        border: preview ? 'none' : '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Chart Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          backgroundColor: 'background.default'
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 600,
              cursor: onChartClick ? 'pointer' : 'default',
              '&:hover': onChartClick ? { color: 'primary.main' } : {}
            }}
            onClick={() => onChartClick?.(chart)}
          >
            {chart.name}
          </Typography>
          {chart.dataset && (
            <Typography variant="caption" color="text.secondary">
              {chart.dataset.name}
            </Typography>
          )}
        </Box>

        {!preview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={refreshChart}
              disabled={loading || refreshing}
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