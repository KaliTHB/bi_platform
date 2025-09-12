// web-application/src/pages/workspace/dashboard/[id].tsx

import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Button,
  Divider,
  Avatar,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
  Container
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
  Dashboard as DashboardIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Star as StarIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Group as WorkspaceIcon,
  Settings as SettingsIcon,
  BarChart as ChartIcon,
  FilterAlt as FilterIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

// Import API utilities and hooks
import { apiUtils } from '../../../utils/apiUtils';
import { dashboardAPI } from '@/store/api/dashboardApi';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';

// Types
interface Chart {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  config_json: any;
  data_json?: any;
  x: number;
  y: number;
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  is_visible: boolean;
  dataset_ids: string[];
  created_at: string;
  updated_at: string;
}

interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  charts: Chart[];
  is_visible: boolean;
  sort_order: number;
}

interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  default_value?: any;
  current_value?: any;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'workspace';
  is_featured: boolean;
  is_public: boolean;
  chart_count: number;
  view_count: number;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  thumbnail_url?: string;
  tags: string[];
  tabs: DashboardTab[];
  global_filters: GlobalFilter[];
  owner: {
    id: string;
    name: string;
    email: string;
  };
  config_json: {
    auto_refresh?: {
      enabled: boolean;
      interval: number; // seconds
    };
    export_settings?: {
      include_filters: boolean;
      page_size: string;
      orientation: string;
    };
    interaction_settings?: {
      enable_cross_filtering: boolean;
      enable_drill_through: boolean;
      click_behavior: string;
    };
    performance_settings?: {
      lazy_loading: boolean;
      concurrent_chart_loads: number;
      cache_duration: number;
    };
  };
  theme_config?: {
    primary_color?: string;
    background_color?: string;
    text_color?: string;
    accent_color?: string;
  };
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_viewed_at?: string;
}

// Chart component to render individual charts
const ChartComponent: React.FC<{ 
  chart: Chart; 
  onChartClick?: (chart: Chart) => void;
  filters?: Record<string, any>;
}> = ({ chart, onChartClick, filters }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setChartLoading(true);
        setChartError(null);
        
        // Load chart data with filters
        const response = await apiUtils.post(`/charts/${chart.id}/data`, {
          filters: filters || {}
        });
        
        if (response.success) {
          setChartData(response.data);
        }
      } catch (error) {
        console.error(`Error loading chart ${chart.id}:`, error);
        setChartError(error instanceof Error ? error.message : 'Failed to load chart');
      } finally {
        setChartLoading(false);
      }
    };

    loadChartData();
  }, [chart.id, filters]);

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onChartClick ? 'pointer' : 'default',
        '&:hover': onChartClick ? {
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        } : {}
      }}
      onClick={() => onChartClick?.(chart)}
    >
      <CardContent sx={{ height: '100%', position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h3" noWrap>
            {chart.display_name}
          </Typography>
          <IconButton size="small">
            <MoreIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {chart.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {chart.description}
          </Typography>
        )}

        <Box sx={{ 
          height: 'calc(100% - 80px)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {chartLoading && (
            <CircularProgress />
          )}
          
          {chartError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {chartError}
            </Alert>
          )}
          
          {chartData && !chartLoading && (
            <Box sx={{ width: '100%', height: '100%' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                📊 Chart: {chart.chart_type}
              </Typography>
              <Typography variant="caption" display="block" align="center">
                {JSON.stringify(chartData).length} bytes of data
              </Typography>
              {/* Here you would render the actual chart based on chart.chart_type */}
              {/* For now showing placeholder */}
            </Box>
          )}
        </Box>

        <Chip 
          label={chart.chart_type}
          size="small"
          variant="outlined"
          sx={{ position: 'absolute', top: 8, right: 8 }}
        />
      </CardContent>
    </Card>
  );
};

const DashboardViewPage: NextPage = () => {
  const router = useRouter();
  const { id: dashboardId } = router.query as { id: string };
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!dashboardId) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading dashboard: ${dashboardId}`);
      
      // Use the new API utils - automatically includes workspace ID and auth token
      const response = await dashboardAPI.getById(dashboardId);
      
      if (response.success && response.data) {
        console.log('✅ Dashboard loaded successfully:', response.data);
        setDashboard(response.data);
        
        // Initialize global filters with default values
        const initialFilters: Record<string, any> = {};
        response.data.global_filters?.forEach(filter => {
          if (filter.default_value !== undefined) {
            initialFilters[filter.id] = filter.default_value;
          }
        });
        setGlobalFilters(initialFilters);
        
        // Set up auto-refresh if enabled
        if (response.data.config_json?.auto_refresh?.enabled) {
          const interval = response.data.config_json.auto_refresh.interval * 1000; // Convert to ms
          const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing dashboard...');
            refreshDashboard();
          }, interval);
          setAutoRefreshInterval(refreshInterval);
        }
      } else {
        setError('Dashboard not found');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      
      if (error instanceof AuthenticationError) {
        setError('Please log in to access this dashboard');
      } else if (error instanceof WorkspaceError) {
        setError('Please select a workspace to access this dashboard');
      } else if (error instanceof ApiError) {
        if (error.status === 403) {
          setError('You don\'t have permission to access this dashboard');
        } else if (error.status === 404) {
          setError('Dashboard not found');
        } else {
          setError(`Failed to load dashboard: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred while loading the dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!dashboardId) return;

    try {
      setRefreshing(true);
      console.log('🔄 Refreshing dashboard...');
      
      const response = await dashboardAPI.getById(dashboardId);
      if (response.success && response.data) {
        setDashboard(response.data);
        console.log('✅ Dashboard refreshed');
      }
    } catch (error) {
      console.error('❌ Error refreshing dashboard:', error);
      // Don't show error for refresh failures, just log them
    } finally {
      setRefreshing(false);
    }
  }, [dashboardId]);

  // Load dashboard on mount and when ID changes
  useEffect(() => {
    loadDashboard();
    
    // Cleanup auto-refresh on unmount
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [loadDashboard]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle global filter change
  const handleFilterChange = (filterId: string, value: any) => {
    setGlobalFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  // Handle menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditDashboard = () => {
    router.push(`/workspace/dashboard-builder?id=${dashboardId}`);
    handleMenuClose();
  };

  const handleShareDashboard = () => {
    // Implement share functionality
    console.log('Share dashboard:', dashboardId);
    handleMenuClose();
  };

  const handleExportDashboard = () => {
    // Implement export functionality
    console.log('Export dashboard:', dashboardId);
    handleMenuClose();
  };

  const handleChartClick = (chart: Chart) => {
    // Handle chart interaction
    console.log('Chart clicked:', chart.id);
  };

  // Render loading state
  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="text" width={200} height={24} />
          </Box>
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton variant="rectangular" height={300} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </WorkspaceLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={loadDashboard}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<BackIcon />}
              onClick={() => router.push('/workspace/dashboards')}
            >
              Back to Dashboards
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadDashboard}
            >
              Try Again
            </Button>
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Alert severity="warning">
            Dashboard not found
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  const currentTab = dashboard.tabs?.[activeTab];
  const visibleTabs = dashboard.tabs?.filter(tab => tab.is_visible) || [];

  return (
    <WorkspaceLayout>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link 
              color="inherit" 
              href="/workspace"
              onClick={(e) => { e.preventDefault(); router.push('/workspace'); }}
              sx={{ cursor: 'pointer' }}
            >
              Workspace
            </Link>
            <Link 
              color="inherit" 
              href="/workspace/dashboards"
              onClick={(e) => { e.preventDefault(); router.push('/workspace/dashboards'); }}
              sx={{ cursor: 'pointer' }}
            >
              Dashboards
            </Link>
            <Typography color="text.primary">
              {dashboard.display_name}
            </Typography>
          </Breadcrumbs>

          {/* Dashboard Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DashboardIcon color="primary" />
                <Typography variant="h4" component="h1">
                  {dashboard.display_name}
                </Typography>
                
                {/* Status chips */}
                <Chip 
                  label={dashboard.status}
                  color={dashboard.status === 'published' ? 'success' : 'default'}
                  size="small"
                />
                
                {dashboard.is_featured && (
                  <Chip 
                    icon={<StarIcon />}
                    label="Featured"
                    color="warning"
                    size="small"
                  />
                )}

                {/* Visibility indicator */}
                {dashboard.visibility === 'public' && <PublicIcon color="success" />}
                {dashboard.visibility === 'private' && <PrivateIcon color="action" />}
                {dashboard.visibility === 'workspace' && <WorkspaceIcon color="info" />}
              </Box>

              {dashboard.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {dashboard.description}
                </Typography>
              )}

              {/* Metadata */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {dashboard.owner.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChartIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {dashboard.chart_count} charts
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ViewIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {dashboard.view_count} views
                  </Typography>
                </Box>

                {dashboard.last_viewed_at && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Last viewed {new Date(dashboard.last_viewed_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Category and Tags */}
              <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {dashboard.category && (
                  <Chip
                    icon={<CategoryIcon />}
                    label={dashboard.category.name}
                    size="small"
                    sx={{ bgcolor: dashboard.category.color + '20', color: dashboard.category.color }}
                  />
                )}
                
                {dashboard.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Dashboard">
                <IconButton
                  onClick={refreshDashboard}
                  disabled={refreshing}
                  color="primary"
                >
                  <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>

              <PermissionGate permissions={['dashboard.share']}>
                <Tooltip title="Share Dashboard">
                  <IconButton onClick={handleShareDashboard} color="primary">
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
              </PermissionGate>

              <PermissionGate permissions={['dashboard.update']}>
                <Tooltip title="Edit Dashboard">
                  <IconButton onClick={handleEditDashboard} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </PermissionGate>

              <Tooltip title="More Actions">
                <IconButton onClick={handleMenuOpen}>
                  <MoreIcon />
                </IconButton>
              </Tooltip>

              {/* Actions Menu */}
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
              >
                <PermissionGate permissions={['dashboard.update']}>
                  <MenuItem onClick={handleEditDashboard}>
                    <EditIcon sx={{ mr: 1 }} />
                    Edit Dashboard
                  </MenuItem>
                </PermissionGate>
                
                <MenuItem onClick={handleExportDashboard}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Export Dashboard
                </MenuItem>
                
                <MenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                  <FullscreenIcon sx={{ mr: 1 }} />
                  {isFullscreen ? 'Exit' : 'Enter'} Fullscreen
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={handleShareDashboard}>
                  <ShareIcon sx={{ mr: 1 }} />
                  Share Dashboard
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Box>

        {/* Global Filters */}
        {dashboard.global_filters && dashboard.global_filters.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterIcon color="primary" />
              <Typography variant="h6">Filters</Typography>
            </Box>
            
            <Grid container spacing={2}>
              {dashboard.global_filters
                .filter(filter => filter.is_visible)
                .sort((a, b) => a.position - b.position)
                .map((filter) => (
                  <Grid item xs={12} sm={6} md={3} key={filter.id}>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {filter.display_name}
                        {filter.is_required && <span style={{ color: 'red' }}>*</span>}
                      </Typography>
                      
                      {/* Render filter controls based on type */}
                      {filter.type === 'text' && (
                        <input
                          type="text"
                          placeholder={`Enter ${filter.display_name.toLowerCase()}`}
                          value={globalFilters[filter.id] || ''}
                          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                      )}
                      
                      {/* Add other filter types as needed */}
                    </Box>
                  </Grid>
                ))}
            </Grid>
          </Paper>
        )}

        {/* Tabs */}
        {visibleTabs.length > 1 && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              {visibleTabs.map((tab, index) => (
                <Tab 
                  key={tab.id} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.display_name}
                      <Badge badgeContent={tab.charts.length} color="primary" />
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Dashboard Content */}
        {currentTab && (
          <Box>
            {/* Tab description */}
            {currentTab.description && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {currentTab.description}
              </Alert>
            )}

            {/* Charts Grid */}
            {currentTab.charts.length > 0 ? (
              <Grid container spacing={3}>
                {currentTab.charts
                  .filter(chart => chart.is_visible)
                  .sort((a, b) => (a.y - b.y) || (a.x - b.x)) // Sort by position
                  .map((chart) => (
                    <Grid 
                      item 
                      xs={12} 
                      sm={Math.max(6, Math.min(12, chart.width))} 
                      md={Math.max(4, Math.min(12, chart.width))}
                      key={chart.id}
                    >
                      <ChartComponent
                        chart={chart}
                        onChartClick={handleChartClick}
                        filters={globalFilters}
                      />
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <ChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No charts in this tab
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add some charts to make this dashboard come alive!
                </Typography>
                
                <PermissionGate permissions={['dashboard.update']}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditDashboard}
                    sx={{ mt: 2 }}
                  >
                    Edit Dashboard
                  </Button>
                </PermissionGate>
              </Paper>
            )}
          </Box>
        )}

        {/* Auto-refresh indicator */}
        {dashboard.config_json?.auto_refresh?.enabled && (
          <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
            <Chip
              icon={<ScheduleIcon />}
              label={`Auto-refresh: ${dashboard.config_json.auto_refresh.interval}s`}
              color="info"
              variant="outlined"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Box>
        )}
      </Container>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </WorkspaceLayout>
  );
};

export default DashboardViewPage;