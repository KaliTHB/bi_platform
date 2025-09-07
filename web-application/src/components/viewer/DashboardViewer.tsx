// web-application/src/components/viewer/DashboardViewer.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Skeleton,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Button
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  FilterList as FilterIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

// Import chart rendering components
import { ChartRenderer } from '../charts/ChartRenderer';
import { FilterPanel } from './FilterPanel';
import { useAuth } from '../../hooks/useAuth';

// Types
interface DashboardViewerProps {
  dashboardId: string;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

interface DashboardData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  config_json?: {
    auto_refresh?: {
      enabled: boolean;
      interval: number;
    };
    layout?: {
      columns: number;
      gap: number;
      padding: number;
    };
    theme?: {
      primary_color: string;
      background_color: string;
      text_color: string;
    };
  };
  global_filters?: any[];
  charts: ChartData[];
}

interface ChartData {
  id: string;
  chart_id: string;
  name: string;
  display_name: string;
  chart_type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config_json: any;
  dataset_ids: string[];
  is_visible: boolean;
  order_index: number;
}

interface ChartResponse {
  success: boolean;
  data: {
    charts: any[];
    metadata: {
      dashboard_id: string;
      chart_count: number;
      last_updated: string;
      is_public?: boolean;
    };
  };
  message?: string;
}

const DashboardViewer: React.FC<DashboardViewerProps> = ({
  dashboardId,
  fullscreen = false,
  onFullscreenChange,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 300
}) => {
  const { user } = useAuth();
  
  // State management
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<any[]>([]);
  const [chartsData, setChartsData] = useState<Map<string, any>>(new Map());
  const [chartLoadingStates, setChartLoadingStates] = useState<Map<string, boolean>>(new Map());

  // Auto-refresh timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading dashboard:', dashboardId);
      
      // Fetch dashboard info - try public endpoint first, then authenticated
      let response;
      try {
        response = await fetch(`/api/v1/public/dashboards/${dashboardId}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (publicError) {
        console.log('Public endpoint failed, trying authenticated...');
        // Fallback to authenticated endpoint
        const token = localStorage.getItem('token');
        response = await fetch(`/api/v1/dashboards/${dashboardId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to load dashboard: ${response.status} ${response.statusText}`);
      }

      const dashboardData = await response.json();
      
      if (!dashboardData.success) {
        throw new Error(dashboardData.message || 'Failed to load dashboard data');
      }

      // Load charts for the dashboard
      await loadDashboardCharts(dashboardId);
      
    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  // Load dashboard charts
  const loadDashboardCharts = async (dashboardId: string) => {
    try {
      console.log('📊 Loading dashboard charts:', dashboardId);
      
      // Try public charts endpoint first
      let response;
      try {
        response = await fetch(`/api/v1/public/dashboards/${dashboardId}/charts`);
      } catch (publicError) {
        // Fallback to authenticated endpoint
        const token = localStorage.getItem('token');
        response = await fetch(`/api/v1/dashboards/${dashboardId}/charts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to load charts: ${response.status}`);
      }

      const chartsResponse: ChartResponse = await response.json();
      
      if (!chartsResponse.success) {
        throw new Error(chartsResponse.message || 'Failed to load charts');
      }

      // Transform the data into our expected format
      const dashboardData: DashboardData = {
        id: dashboardId,
        name: 'Dashboard',
        display_name: 'Dashboard',
        charts: chartsResponse.data.charts.map((chart: any, index: number) => ({
          id: chart.id,
          chart_id: chart.id,
          name: chart.name,
          display_name: chart.display_name || chart.name,
          chart_type: chart.chart_type,
          position: chart.position_json || {
            x: (index % 3) * 4,
            y: Math.floor(index / 3) * 3,
            width: 4,
            height: 3
          },
          config_json: chart.config_json || {},
          dataset_ids: chart.dataset_ids || [],
          is_visible: chart.is_visible !== false,
          order_index: index
        }))
      };

      setDashboard(dashboardData);
      
      // Load data for each chart
      await loadChartsData(dashboardData.charts);
      
    } catch (err) {
      console.error('❌ Error loading charts:', err);
      throw err;
    }
  };

  // Load data for all charts
  const loadChartsData = async (charts: ChartData[]) => {
    const newChartsData = new Map();
    const newLoadingStates = new Map();
    
    // Set initial loading states
    charts.forEach(chart => {
      newLoadingStates.set(chart.chart_id, true);
    });
    setChartLoadingStates(newLoadingStates);

    // Load data for each chart
    for (const chart of charts) {
      try {
        console.log('📈 Loading chart data:', chart.chart_id);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/charts/${chart.chart_id}/data`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const chartDataResponse = await response.json();
          
          if (chartDataResponse.success) {
            newChartsData.set(chart.chart_id, {
              data: chartDataResponse.data.data || [],
              metadata: chartDataResponse.data.metadata || {},
              chart: chart
            });
          } else {
            console.warn(`Chart ${chart.chart_id} data load failed:`, chartDataResponse.message);
            newChartsData.set(chart.chart_id, {
              error: chartDataResponse.message || 'Failed to load chart data',
              chart: chart
            });
          }
        } else {
          console.warn(`Chart ${chart.chart_id} request failed:`, response.status);
          newChartsData.set(chart.chart_id, {
            error: `HTTP ${response.status}: ${response.statusText}`,
            chart: chart
          });
        }
      } catch (err) {
        console.error(`Error loading chart ${chart.chart_id}:`, err);
        newChartsData.set(chart.chart_id, {
          error: err instanceof Error ? err.message : 'Unknown error',
          chart: chart
        });
      } finally {
        // Update loading state for this chart
        setChartLoadingStates(prev => {
          const updated = new Map(prev);
          updated.set(chart.chart_id, false);
          return updated;
        });
      }
    }
    
    setChartsData(newChartsData);
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard, refreshing]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: any[]) => {
    setFilters(newFilters);
    // Re-load charts with new filters
    if (dashboard) {
      loadChartsData(dashboard.charts);
    }
  }, [dashboard]);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Render loading state
  if (loading) {
    return (
      <Container maxWidth={fullscreen ? false : "xl"} sx={{ py: 2, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading Dashboard...
            </Typography>
          </Box>
        </Box>
        
        {/* Loading skeleton */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxWidth={fullscreen ? false : "xl"} sx={{ py: 2 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={loadDashboard}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Failed to Load Dashboard
          </Typography>
          {error}
        </Alert>
      </Container>
    );
  }

  // Render empty state
  if (!dashboard || !dashboard.charts || dashboard.charts.length === 0) {
    return (
      <Container maxWidth={fullscreen ? false : "xl"} sx={{ py: 2 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 400,
            textAlign: 'center' 
          }}
        >
          <VisibilityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Charts Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This dashboard doesn't have any charts yet.
          </Typography>
          <Button 
            variant="outlined" 
            sx={{ mt: 2 }}
            onClick={loadDashboard}
            startIcon={<RefreshIcon />}
          >
            Refresh Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  // Calculate grid layout
  const gridColumns = dashboard.config_json?.layout?.columns || 12;
  const gridGap = dashboard.config_json?.layout?.gap || 16;

  return (
    <Box sx={{ 
      height: fullscreen ? '100vh' : 'auto',
      backgroundColor: dashboard.config_json?.theme?.background_color || 'background.default',
      color: dashboard.config_json?.theme?.text_color || 'text.primary'
    }}>
      {/* Toolbar */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Box>
          <Typography variant="h6">
            {dashboard.display_name || dashboard.name}
          </Typography>
          {dashboard.description && (
            <Typography variant="body2" color="text.secondary">
              {dashboard.description}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {dashboard.charts.length > 0 && (
            <Chip 
              label={`${dashboard.charts.length} chart${dashboard.charts.length !== 1 ? 's' : ''}`} 
              size="small"
              variant="outlined"
            />
          )}
          
          <Tooltip title={refreshing ? 'Refreshing...' : 'Refresh Dashboard'}>
            <span>
              <IconButton 
                onClick={handleRefresh}
                disabled={refreshing}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          {onFullscreenChange && (
            <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton 
                onClick={() => onFullscreenChange(!fullscreen)}
                size="small"
              >
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Filters Panel */}
      {showFilters && dashboard.global_filters && dashboard.global_filters.length > 0 && (
        <FilterPanel
          filters={dashboard.global_filters}
          values={filters}
          onChange={handleFilterChange}
        />
      )}

      {/* Charts Grid */}
      <Container maxWidth={fullscreen ? false : "xl"} sx={{ py: 2 }}>
        <Grid container spacing={gridGap / 8}>
          {dashboard.charts
            .filter(chart => chart.is_visible)
            .sort((a, b) => a.order_index - b.order_index)
            .map((chart) => {
              const chartData = chartsData.get(chart.chart_id);
              const isLoading = chartLoadingStates.get(chart.chart_id) || false;
              
              return (
                <Grid 
                  item 
                  xs={12} 
                  md={Math.max(1, Math.min(12, chart.position.width))}
                  key={chart.chart_id}
                >
                  <Paper 
                    elevation={2}
                    sx={{ 
                      height: `${chart.position.height * 80}px`,
                      minHeight: 200,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Chart Header */}
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        backgroundColor: 'grey.50'
                      }}
                    >
                      <Typography variant="h6" noWrap>
                        {chart.display_name || chart.name}
                      </Typography>
                    </Box>
                    
                    {/* Chart Content */}
                    <Box 
                      sx={{ 
                        height: 'calc(100% - 64px)',
                        position: 'relative'
                      }}
                    >
                      {isLoading ? (
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
                      ) : chartData?.error ? (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            p: 2,
                            textAlign: 'center'
                          }}
                        >
                          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 1 }} />
                          <Typography variant="body2" color="error">
                            {chartData.error}
                          </Typography>
                        </Box>
                      ) : chartData?.data ? (
                        <ChartRenderer
                          chart={{
                            id: chart.chart_id,
                            name: chart.name,
                            type: chart.chart_type,
                            config: chart.config_json
                          }}
                          data={chartData.data}
                          height={chart.position.height * 80 - 64}
                          filters={filters}
                        />
                      ) : (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%' 
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            No data available
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
        </Grid>
      </Container>
    </Box>
  );
};

export { DashboardViewer };