// web-application/src/pages/workspace/dashboard/[dashboard-uuid].tsx
// Updated to use RTK Query instead of manual fetch calls with authStorage and workspaceStorage utilities

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
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
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  Container,
  Stack,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  TextField
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
  Dashboard as DashboardIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  FilterAlt as FilterIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import Sync from '@mui/icons-material/Sync';

// Import RTK Query hooks
import {
  useGetDashboardQuery,
  useUpdateDashboardMutation,
  useShareDashboardMutation,
  useExportDashboardMutation
} from '@/store/api/dashboardApi';

// Import storage utilities
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// Import hooks and components
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';

// Import DashboardContainer - this will handle all the chart management
import { DashboardContainer } from '../../../components/dashboard/DashboardContainer';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardData {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  is_featured: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  chart_count?: number;
  category_id?: string;
  category_name?: string;
  last_viewed?: string;
  thumbnail_url?: string;
  tags?: string[];
  config_json: DashboardConfig;
  tabs: DashboardTab[];
  global_filters: GlobalFilter[];
  charts: Chart[];
}

interface DashboardConfig {
  auto_refresh: {
    enabled: boolean;
    interval: number; // seconds
  };
  layout: {
    grid_size: number;
    margin: number;
    padding: number;
  };
  theme: {
    background_color: string;
    text_color: string;
    accent_color: string;
  };
  export_settings: {
    include_filters: boolean;
    page_size: 'A4' | 'A3' | 'Letter';
    orientation: 'portrait' | 'landscape';
  };
}

interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_visible: boolean;
  sort_order: number;
  charts: Chart[];
}

interface Chart {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  dataset_ids: string[];
  config_json: any;
  position_json: ChartPosition;
  styling_config: any;
  query_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  tab_id?: string;
}

interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  default_value?: any;
  current_value?: any;
  options?: any[];
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DashboardDetailPage: NextPage = () => {
  const router = useRouter();
  const { user, currentWorkspace, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Get dashboard ID from route
  const { 'dashboard-uuid': dashboardId } = router.query;

  // ============================================================================
  // STATE MANAGEMENT - Simplified (DashboardContainer handles chart management)
  // ============================================================================
  
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // ============================================================================
  // UTILITY FUNCTIONS - Using storage utilities
  // ============================================================================

  const getAuthToken = (): string | null => {
    return authStorage.getToken();
  };

  const getCurrentWorkspace = () => {
    return workspaceStorage.getCurrentWorkspace();
  };

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  const loadDashboard = useCallback(async () => {
    if (!dashboardId || typeof dashboardId !== 'string') {
      setError('Invalid dashboard ID');
      setLoading(false);
      return;
    }

    const workspaceId = getCurrentWorkspace()?.id;
    if (!workspaceId) {
      setError('No workspace selected');
      setLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading dashboard:', dashboardId);
      
      const response = await fetch(`/api/workspaces/${workspaceId}/dashboards/${dashboardId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-ID': workspaceId
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired - clear storage and redirect
          authStorage.clearAuth();
          router.push('/login');
          return;
        } else if (response.status === 403) {
          throw new Error('Access denied to this dashboard');
        } else if (response.status === 404) {
          throw new Error('Dashboard not found');
        }
        
        const errorText = await response.text();
        throw new Error(`Failed to load dashboard: ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load dashboard');
      }

      const dashboardData = result.data;

      // Process dashboard data with defaults
      const processedDashboard: DashboardData = {
        ...dashboardData,
        config_json: dashboardData.config_json || {
          auto_refresh: { enabled: false, interval: 30 },
          layout: { grid_size: 12, margin: 8, padding: 16 },
          theme: { background_color: '#ffffff', text_color: '#000000', accent_color: '#1976d2' },
          export_settings: { include_filters: true, page_size: 'A4', orientation: 'landscape' }
        },
        tabs: dashboardData.tabs || [{ 
          id: 'default', 
          name: 'default', 
          display_name: 'Main', 
          is_visible: true, 
          sort_order: 0,
          charts: dashboardData.charts || []
        }],
        global_filters: dashboardData.global_filters || [],
        charts: dashboardData.charts || []
      };

      setDashboard(processedDashboard);
      setGlobalFilters(processedDashboard.global_filters);
      
      // Set active tab
      if (processedDashboard.tabs.length > 0) {
        setActiveTab(processedDashboard.tabs[0].id);
      }

      console.log('✅ Dashboard loaded:', {
        name: processedDashboard.display_name,
        tabs: processedDashboard.tabs.length,
        charts: processedDashboard.charts.length,
        filters: processedDashboard.global_filters.length,
        autoRefresh: processedDashboard.config_json.auto_refresh.enabled
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Dashboard loading error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, router]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleGlobalFilterChange = (filterId: string, value: any) => {
    setGlobalFilters(prev => 
      prev.map(filter => 
        filter.id === filterId 
          ? { ...filter, current_value: value }
          : filter
      )
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleToggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const handleEditDashboard = () => {
    handleMenuClose();
    router.push(`/workspace/dashboard/${dashboardId}/edit`);
  };

  const handleShareDashboard = () => {
    handleMenuClose();
    // Implement share functionality
    console.log('Share dashboard:', dashboardId);
  };

  const handleExportDashboard = () => {
    handleMenuClose();
    // Implement export functionality
    console.log('Export dashboard:', dashboardId);
  };

  const handleChartInteraction = (event: any) => {
    console.log('📊 Chart interaction:', event);
  };

  const handleDashboardError = (error: string) => {
    console.error('📊 Dashboard error:', error);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentTabCharts = dashboard?.charts?.filter(chart => {
    const chartTabId = chart.position_json?.tab_id || 'default';
    return chartTabId === activeTab && chart.is_active;
  }) || [];

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load dashboard when ready
  useEffect(() => {
    if (router.isReady && !authLoading && dashboardId) {
      loadDashboard();
    }
  }, [router.isReady, authLoading, dashboardId, loadDashboard]);

  // ============================================================================
  // LOADING AND ERROR STATES - Using RTK Query states
  // ============================================================================

  if (authLoading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={400} />
          </Stack>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (loading && !dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={400} />
          </Stack>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (error) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            {error}
          </Alert>
          <Stack direction="row" spacing={2}>
            <Button 
              startIcon={<BackIcon />} 
              onClick={() => router.back()}
              variant="outlined"
            >
              Go Back
            </Button>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={handleRefreshDashboard}
              variant="contained"
            >
              Retry
            </Button>
          </Stack>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="info">
            <AlertTitle>Dashboard Not Found</AlertTitle>
            The requested dashboard could not be found.
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <WorkspaceLayout>
      {/* Dashboard Header */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <Box sx={{ py: 2 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link 
                color="inherit" 
                href="/workspace/dashboards" 
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Dashboards
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                {dashboard.display_name}
              </Typography>
            </Breadcrumbs>

            {/* Header Content */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    {dashboard.display_name}
                  </Typography>
                  
                  {/* Status and Feature Badges */}
                  <Chip
                    label={dashboard.status}
                    color={dashboard.status === 'published' ? 'success' : 'default'}
                    size="small"
                  />
                  {dashboard.is_featured && (
                    <Chip icon={<StarIcon />} label="Featured" color="warning" size="small" />
                  )}
                  {dashboard.is_public ? (
                    <Chip icon={<PublicIcon />} label="Public" color="info" size="small" />
                  ) : (
                    <Chip icon={<PrivateIcon />} label="Private" color="default" size="small" />
                  )}
                </Stack>

                {dashboard.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {dashboard.description}
                  </Typography>
                )}

                {/* Dashboard Stats */}
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Charts: {dashboard.charts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {new Date(dashboard.updated_at).toLocaleDateString()}
                  </Typography>
                  {dashboard.view_count !== undefined && (
                    <Typography variant="body2" color="text.secondary">
                      Views: {dashboard.view_count.toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Dashboard Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Auto Refresh Status */}
                {dashboard.config_json.auto_refresh.enabled && (
                  <Chip
                    icon={<Sync />}
                    label={`Auto: ${dashboard.config_json.auto_refresh.interval}s`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}

                {/* Loading indicator for RTK Query operations */}
                {(isUpdating || isSharing || isExporting) && (
                  <Chip
                    icon={<CircularProgress size={16} />}
                    label="Processing..."
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}

                {/* Manual Refresh Button */}
                <Tooltip title="Refresh dashboard data">
                  <IconButton
                    onClick={handleRefreshDashboard}
                    disabled={loading}
                    color="primary"
                    size="large"
                  >
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <RefreshIcon />
                    )}
                  </IconButton>
                </Tooltip>

                {/* Fullscreen Toggle */}
                <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                  <IconButton onClick={handleToggleFullscreen} size="large">
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>

                {/* Dashboard Menu */}
                <IconButton onClick={handleMenuOpen} size="large">
                  <MoreIcon />
                </IconButton>
              </Box>
            </Stack>
          </Box>
        </Container>
      </Paper>

      {/* Global Filters */}
      {globalFilters.length > 0 && (
        <Paper elevation={0} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="xl">
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterIcon sx={{ mr: 1 }} fontSize="small" />
                Filters
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {globalFilters.map((filter) => (
                  <Box key={filter.id} sx={{ minWidth: 200 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>{filter.display_name}</InputLabel>
                      {filter.type === 'single_select' ? (
                        <Select
                          value={filter.current_value || ''}
                          onChange={(e) => handleGlobalFilterChange(filter.id, e.target.value)}
                          label={filter.display_name}
                        >
                          {filter.options?.map((option: any) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <TextField
                          size="small"
                          fullWidth
                          placeholder={`Filter by ${filter.display_name}`}
                          value={filter.current_value || ''}
                          onChange={(e) => handleGlobalFilterChange(filter.id, e.target.value)}
                        />
                      )}
                    </FormControl>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Container>
        </Paper>
      )}

      {/* Dashboard Tabs */}
      {dashboard.tabs.length > 1 && (
        <Paper elevation={0} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="xl">
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ px: 2 }}>
              {dashboard.tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={tab.display_name}
                  disabled={!tab.is_visible}
                />
              ))}
            </Tabs>
          </Container>
        </Paper>
      )}

      {/* Main Dashboard Content - Using DashboardContainer */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <DashboardContainer
          dashboardId={dashboard.id}
          workspaceId={effectiveWorkspaceId} // Pass effective workspace ID
          fullscreen={fullscreen}
          showFilters={false} // Filters handled at page level
          autoRefresh={dashboard.config_json.auto_refresh.enabled}
          refreshInterval={dashboard.config_json.auto_refresh.interval}
          
          // Loading strategy
          loadingStrategy="immediate"
          showLoadingProgress={true}
          
          // Event handlers
          onFullscreenChange={setFullscreen}
          onChartInteraction={handleChartInteraction}
          onError={handleDashboardError}
          
          className="dashboard-main-content"
        />
      </Container>

      {/* Dashboard Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        {hasPermission('dashboard.edit') && (
          <MenuItem onClick={handleEditDashboard}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit Dashboard
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={handleShareDashboard} 
          disabled={isSharing}
        >
          {isSharing ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : (
            <ShareIcon sx={{ mr: 1 }} fontSize="small" />
          )}
          {isSharing ? 'Sharing...' : 'Share Dashboard'}
        </MenuItem>
        
        <MenuItem 
          onClick={handleExportDashboard}
          disabled={isExporting}
        >
          {isExporting ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : (
            <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
          )}
          {isExporting ? 'Exporting...' : 'Export Dashboard'}
        </MenuItem>
      </Menu>
    </WorkspaceLayout>
  );
};

export default DashboardDetailPage;