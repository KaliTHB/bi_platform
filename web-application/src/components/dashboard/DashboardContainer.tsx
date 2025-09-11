// web-application/src/components/dashboard/DashboardContainer.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Skeleton
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Visibility as VisibilityIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Components
import { FilterPanel } from './FilterPanel';
import ChartContainer from './ChartContainer';

// Types
import { 
  Dashboard, 
  DashboardChart, 
  GlobalFilter,
  ChartInteractionEvent 
} from '@/types/dashboard.types';

// ============================================================================
// INTERFACES
// ============================================================================

interface DashboardContainerProps {
  dashboardId: string;
  workspaceId?: string;
  fullscreen?: boolean;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onChartInteraction?: (event: ChartInteractionEvent) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface DashboardContainerState {
  dashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  filters: Record<string, any>;
  lastRefresh: Date | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  dashboardId,
  workspaceId,
  fullscreen = false,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  onFullscreenChange,
  onChartInteraction,
  onError,
  className
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [state, setState] = useState<DashboardContainerState>({
    dashboard: null,
    loading: true,
    error: null,
    refreshing: false,
    filters: {},
    lastRefresh: null
  });

  // ============================================================================
  // DASHBOARD LOADING
  // ============================================================================

  const loadDashboard = useCallback(async () => {
    if (!dashboardId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`Loading dashboard: ${dashboardId}`);
      
      // Mock API call - replace with actual dashboard API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock dashboard data
      const mockDashboard: Dashboard = {
        id: dashboardId,
        name: 'sample-dashboard',
        display_name: 'Sample Dashboard',
        description: 'A sample dashboard for demonstration',
        workspace_id: workspaceId || 'default',
        status: 'published',
        is_public: true,
        is_featured: false,
        view_count: 42,
        chart_count: 3,
        created_at: new Date(),
        updated_at: new Date(),
        owner_id: 'user-1',
        version: 1,
        sort_order: 0,
        tags: ['demo', 'sample'],
        slug: 'sample-dashboard',
        published_at: new Date(),
        
        // Mock charts data
        charts: [
          {
            id: 'chart-1',
            chart_id: 'chart-1',
            dashboard_id: dashboardId,
            position: { x: 0, y: 0, width: 6, height: 4 },
            title: 'Sales Overview',
            order_index: 0,
            is_visible: true,
            chart: {
              id: 'chart-1',
              name: 'sales-chart',
              display_name: 'Sales Overview',
              chart_type: 'bar',
              config_json: {
                library: 'echarts',
                chartType: 'bar',
                title: { text: 'Monthly Sales' }
              },
              dataset_ids: ['dataset-1'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          },
          {
            id: 'chart-2',
            chart_id: 'chart-2', 
            dashboard_id: dashboardId,
            position: { x: 6, y: 0, width: 6, height: 4 },
            title: 'Revenue Trends',
            order_index: 1,
            is_visible: true,
            chart: {
              id: 'chart-2',
              name: 'revenue-chart',
              display_name: 'Revenue Trends',
              chart_type: 'line',
              config_json: {
                library: 'echarts',
                chartType: 'line',
                title: { text: 'Quarterly Revenue' }
              },
              dataset_ids: ['dataset-2'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          },
          {
            id: 'chart-3',
            chart_id: 'chart-3',
            dashboard_id: dashboardId,
            position: { x: 0, y: 4, width: 12, height: 6 },
            title: 'User Analytics',
            order_index: 2,
            is_visible: true,
            chart: {
              id: 'chart-3',
              name: 'users-chart',
              display_name: 'User Analytics',
              chart_type: 'pie',
              config_json: {
                library: 'echarts',
                chartType: 'pie',
                title: { text: 'User Demographics' }
              },
              dataset_ids: ['dataset-3'],
              is_active: true,
              version: 1,
              created_by: 'user-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        ],

        // Mock global filters
        global_filters: [
          {
            id: 'filter-1',
            name: 'date_range',
            display_name: 'Date Range',
            type: 'date_range',
            data_source: {
              type: 'static',
              source: '',
              value_column: 'date',
              label_column: 'date'
            },
            is_required: false,
            is_visible: true,
            position: 0
          }
        ],

        config_json: {
          auto_refresh: {
            enabled: autoRefresh,
            interval: refreshInterval / 1000
          },
          export_settings: {
            include_filters: true,
            page_size: 'A4',
            orientation: 'landscape'
          },
          interaction_settings: {
            enable_cross_filtering: true,
            enable_drill_through: false,
            click_behavior: 'filter'
          },
          performance_settings: {
            lazy_loading: true,
            concurrent_chart_loads: 3,
            cache_duration: 300
          },
          layout: {
            columns: 12,
            gap: 16
          },
          theme: {
            primary_color: '#1976d2',
            background_color: '#ffffff',
            text_color: '#333333'
          }
        }
      };

      setState(prev => ({
        ...prev,
        dashboard: mockDashboard,
        loading: false,
        lastRefresh: new Date()
      }));

      console.log('Dashboard loaded successfully:', mockDashboard);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
      console.error('Error loading dashboard:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      onError?.(errorMessage);
    }
  }, [dashboardId, workspaceId, autoRefresh, refreshInterval, onError]);

  // ============================================================================
  // AUTO REFRESH
  // ============================================================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    
    try {
      await loadDashboard();
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [loadDashboard]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterId]: value
      }
    }));
    
    console.log('Filter changed:', { filterId, value });
  }, []);

  const handleChartInteraction = useCallback((event: ChartInteractionEvent) => {
    console.log('Chart interaction:', event);
    onChartInteraction?.(event);
  }, [onChartInteraction]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const { dashboard, loading, error, refreshing, filters } = state;

  const visibleCharts = useMemo(() => {
    return dashboard?.charts?.filter(chart => chart.is_visible) || [];
  }, [dashboard?.charts]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  // Render loading state
  if (loading && !refreshing) {
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
  if (!dashboard || !visibleCharts.length) {
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
            This dashboard doesn't have any visible charts.
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
    <Box 
      className={className}
      sx={{ 
        height: fullscreen ? '100vh' : 'auto',
        backgroundColor: dashboard.config_json?.theme?.background_color || 'background.default',
        color: dashboard.config_json?.theme?.text_color || 'text.primary'
      }}
    >
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
          {visibleCharts.length > 0 && (
            <Chip 
              label={`${visibleCharts.length} chart${visibleCharts.length !== 1 ? 's' : ''}`} 
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
      <Container maxWidth={fullscreen ? false : "xl"} sx={{ py: 2, height: '100%' }}>
        <Grid container spacing={gridGap / 8}>
          {visibleCharts.map((dashboardChart) => {
            if (!dashboardChart.chart) return null;
            
            const gridSize = {
              xs: 12,
              sm: Math.min(12, Math.max(6, dashboardChart.position.width)),
              md: Math.min(12, Math.max(4, Math.round(dashboardChart.position.width / 12 * 12))),
              lg: Math.max(3, Math.round(dashboardChart.position.width / 12 * 12))
            };

            return (
              <Grid 
                item 
                key={dashboardChart.id}
                xs={gridSize.xs}
                sm={gridSize.sm} 
                md={gridSize.md}
                lg={gridSize.lg}
              >
                <ChartContainer
                  chart={dashboardChart.chart}
                  workspaceId={workspaceId}
                  preview={false}
                  filters={Object.entries(filters).map(([key, value]) => ({
                    field: key,
                    value: value,
                    operator: 'equals'
                  }))}
                  dimensions={{
                    width: '100%',
                    height: Math.max(200, dashboardChart.position.height * 50)
                  }}
                  theme={dashboard.config_json?.theme}
                  onChartClick={(chart) => console.log('Chart clicked:', chart.id)}
                  onChartError={(chartId, error) => console.error('Chart error:', chartId, error)}
                  onChartLoad={(chartId, metadata) => console.log('Chart loaded:', chartId, metadata)}
                  onChartInteraction={handleChartInteraction}
                />
              </Grid>
            );
          })}
        </Grid>

        {/* Refresh indicator */}
        {refreshing && (
          <Box sx={{ 
            position: 'fixed', 
            top: 16, 
            right: 16, 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'background.paper',
            padding: 1,
            borderRadius: 1,
            boxShadow: 2
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Refreshing...</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default DashboardContainer;