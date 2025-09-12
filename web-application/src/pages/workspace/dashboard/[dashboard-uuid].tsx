// web-application/src/pages/workspace/dashboard/[dashboard-uuid].tsx

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

// Import RTK Query hooks instead of dashboardAPI
import { 
  useGetDashboardQuery,
  useUpdateDashboardMutation,
  useRefreshDashboardMutation,
  useApplyGlobalFilterMutation,
  useExportDashboardMutation,
  useToggleDashboardStatusMutation,
  useShareDashboardMutation,
  useToggleDashboardFavoriteMutation,
} from '@/store/api/dashboardApi';

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
      allowed_formats?: string[];
      max_resolution?: number;
    };
    interaction_settings?: {
      allow_drilldown?: boolean;
      show_tooltips?: boolean;
    };
  };
  theme_config?: {
    primary_color?: string;
    background_color?: string;
    font_family?: string;
  };
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
}

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { 'dashboard-uuid': dashboardId } = router.query;
  const { user, workspace, logout } = useAuth();
  const { hasPermission } = usePermissions();

  // Local state
  const [activeTab, setActiveTab] = useState<number>(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // RTK Query hooks
  const { 
    data: dashboardResponse, 
    isLoading, 
    error,
    refetch: refetchDashboard
  } = useGetDashboardQuery(dashboardId as string, {
    skip: !dashboardId,
  });

  const [updateDashboard] = useUpdateDashboardMutation();
  const [refreshDashboard] = useRefreshDashboardMutation();
  const [applyGlobalFilter] = useApplyGlobalFilterMutation();
  const [exportDashboard] = useExportDashboardMutation();
  const [toggleStatus] = useToggleDashboardStatusMutation();
  const [shareDashboard] = useShareDashboardMutation();
  const [toggleFavorite] = useToggleDashboardFavoriteMutation();

  const dashboard = dashboardResponse?.dashboard;

  // Handle navigation back to workspace
  const handleBack = useCallback(() => {
    if (workspace?.slug) {
      router.push(`/workspace/${workspace.slug}`);
    } else {
      router.back();
    }
  }, [router, workspace]);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Handle menu actions
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  // Handle dashboard refresh
  const handleRefresh = useCallback(async () => {
    try {
      if (dashboardId) {
        await refreshDashboard(dashboardId as string).unwrap();
        refetchDashboard();
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, [dashboardId, refreshDashboard, refetchDashboard]);

  // Handle global filter application
  const handleGlobalFilterChange = useCallback(async (filterId: string, filterValue: any) => {
    try {
      if (dashboardId) {
        await applyGlobalFilter({
          id: dashboardId as string,
          filterId,
          filterValue
        }).unwrap();
        
        setGlobalFilters(prev => ({
          ...prev,
          [filterId]: filterValue
        }));
      }
    } catch (error) {
      console.error('Failed to apply global filter:', error);
    }
  }, [dashboardId, applyGlobalFilter]);

  // Handle dashboard export
  const handleExport = useCallback(async (format: 'pdf' | 'png' | 'xlsx') => {
    try {
      if (dashboardId) {
        await exportDashboard({
          id: dashboardId as string,
          options: {
            format,
            include_filters: true,
            page_size: 'A4',
            orientation: 'landscape'
          }
        }).unwrap();
      }
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
    handleMenuClose();
  }, [dashboardId, exportDashboard]);

  // Handle edit navigation
  const handleEdit = useCallback(() => {
    if (workspace?.slug && dashboardId) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder/${dashboardId}`);
    }
    handleMenuClose();
  }, [router, workspace, dashboardId]);

  // Handle share
  const handleShare = useCallback(async () => {
    try {
      if (dashboardId) {
        await shareDashboard({
          id: dashboardId as string,
          shareData: {
            share_type: 'public',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }).unwrap();
      }
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    }
    handleMenuClose();
  }, [dashboardId, shareDashboard]);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async () => {
    try {
      if (dashboardId && dashboard) {
        await toggleFavorite({
          id: dashboardId as string,
          is_featured: !dashboard.is_featured
        }).unwrap();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [dashboardId, dashboard, toggleFavorite]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl">
          <Box sx={{ py: 3 }}>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  // Show error state
  if (error || !dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl">
          <Box sx={{ py: 3 }}>
            <Alert 
              severity="error" 
              action={
                <Button color="inherit" size="small" onClick={handleBack}>
                  Go Back
                </Button>
              }
            >
              {error ? 'Failed to load dashboard' : 'Dashboard not found'}
            </Alert>
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  const currentTab = dashboard.tabs?.[activeTab];

  return (
    <WorkspaceLayout>
      <Container maxWidth={isFullscreen ? false : "xl"} sx={{ 
        py: isFullscreen ? 0 : 3,
        px: isFullscreen ? 0 : undefined,
        height: isFullscreen ? '100vh' : undefined,
        overflow: isFullscreen ? 'hidden' : undefined
      }}>
        {!isFullscreen && (
          <>
            {/* Breadcrumbs */}
            <Breadcrumbs separator="›" sx={{ mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleBack}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <DashboardIcon fontSize="small" />
                Dashboards
              </Link>
              <Typography variant="body2" color="textPrimary">
                {dashboard.display_name}
              </Typography>
            </Breadcrumbs>

            {/* Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton onClick={handleBack} size="small">
                    <BackIcon />
                  </IconButton>
                  
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h4" component="h1">
                        {dashboard.display_name}
                      </Typography>
                      
                      {dashboard.is_featured && (
                        <StarIcon color="warning" />
                      )}
                      
                      <Chip
                        size="small"
                        label={dashboard.status}
                        color={
                          dashboard.status === 'published' ? 'success' :
                          dashboard.status === 'draft' ? 'warning' : 'default'
                        }
                      />
                      
                      <Chip
                        size="small"
                        icon={dashboard.is_public ? <PublicIcon /> : <PrivateIcon />}
                        label={dashboard.is_public ? 'Public' : 'Private'}
                        variant="outlined"
                      />
                    </Box>
                    
                    {dashboard.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                        {dashboard.description}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={dashboard.is_featured ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton onClick={handleToggleFavorite}>
                      {dashboard.is_featured ? <StarIcon color="warning" /> : <StarIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Refresh dashboard">
                    <IconButton onClick={handleRefresh}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Toggle fullscreen">
                    <IconButton onClick={handleToggleFullscreen}>
                      <FullscreenIcon />
                    </IconButton>
                  </Tooltip>

                  <PermissionGate permissions={['dashboard:edit']}>
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={handleEdit}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                  </PermissionGate>

                  <IconButton onClick={handleMenuOpen}>
                    <MoreIcon />
                  </IconButton>

                  <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={handleShare}>
                      <ShareIcon sx={{ mr: 1 }} />
                      Share
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('pdf')}>
                      <DownloadIcon sx={{ mr: 1 }} />
                      Export PDF
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('png')}>
                      <DownloadIcon sx={{ mr: 1 }} />
                      Export PNG
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('xlsx')}>
                      <DownloadIcon sx={{ mr: 1 }} />
                      Export Excel
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>

              {/* Dashboard metadata */}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      Created by {dashboard.owner.name}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChartIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      {dashboard.chart_count} charts
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ViewIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      {dashboard.view_count} views
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      Updated {new Date(dashboard.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Category and tags */}
              {(dashboard.category || dashboard.tags.length > 0) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  {dashboard.category && (
                    <Chip
                      size="small"
                      icon={<CategoryIcon />}
                      label={dashboard.category.name}
                      sx={{ 
                        backgroundColor: dashboard.category.color,
                        color: 'white'
                      }}
                    />
                  )}
                  
                  {dashboard.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Paper>

            {/* Global Filters */}
            {dashboard.global_filters && dashboard.global_filters.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon />
                  Filters
                </Typography>
                
                <Grid container spacing={2}>
                  {dashboard.global_filters.map((filter) => (
                    <Grid item xs={12} sm={6} md={4} key={filter.id}>
                      {/* TODO: Implement actual filter components based on filter.type */}
                      <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          {filter.display_name} ({filter.type})
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Dashboard Tabs */}
            {dashboard.tabs && dashboard.tabs.length > 1 && (
              <Paper sx={{ mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {dashboard.tabs.map((tab, index) => (
                    <Tab
                      key={tab.id}
                      label={
                        <Badge badgeContent={tab.charts.length} color="primary">
                          {tab.display_name}
                        </Badge>
                      }
                    />
                  ))}
                </Tabs>
              </Paper>
            )}
          </>
        )}

        {/* Dashboard Content */}
        <Paper sx={{ 
          p: isFullscreen ? 0 : 3,
          minHeight: isFullscreen ? '100vh' : 400,
          position: 'relative'
        }}>
          {isFullscreen && (
            <IconButton
              onClick={handleToggleFullscreen}
              sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
              }}
            >
              <FullscreenIcon />
            </IconButton>
          )}
          
          {currentTab ? (
            <Box>
              {currentTab.charts && currentTab.charts.length > 0 ? (
                <Grid container spacing={2}>
                  {currentTab.charts.map((chart) => (
                    <Grid 
                      item 
                      xs={12} 
                      md={chart.width || 6} 
                      key={chart.id}
                    >
                      <Card sx={{ height: chart.height || 400 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {chart.display_name}
                          </Typography>
                          {chart.description && (
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {chart.description}
                            </Typography>
                          )}
                          
                          {/* TODO: Render actual chart component based on chart.chart_type */}
                          <Box sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'grey.50',
                            borderRadius: 1,
                            border: '2px dashed',
                            borderColor: 'grey.300'
                          }}>
                            <Typography color="textSecondary">
                              {chart.chart_type} Chart Placeholder
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 8,
                  color: 'text.secondary' 
                }}>
                  <ChartIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No charts in this tab
                  </Typography>
                  <Typography variant="body2">
                    Add charts to see them here
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary' 
            }}>
              <DashboardIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No content available
              </Typography>
              <Typography variant="body2">
                This dashboard doesn't have any tabs or charts yet
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </WorkspaceLayout>
  );
};

export default DashboardPage;