// web-application/src/pages/workspace/dashboard/[dashboard-uuid].tsx
// OPTIMIZED FOR ACTUAL API RESPONSE: { success, data, message }

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
  Download as DownloadIcon,
  Sync as SyncIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

import {
  useGetDashboardQuery,
  useUpdateDashboardMutation,
  useShareDashboardMutation,
  useExportDashboardMutation
} from '@/store/api/dashboardApi';

import { authStorage, workspaceStorage } from '@/utils/storageUtils';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';

// ============================================================================
// TYPE DEFINITIONS MATCHING ACTUAL API RESPONSE
// ============================================================================

interface DashboardApiResponse {
  success: boolean;
  data: Dashboard;
  message?: string;
}

interface Dashboard {
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
  config_json: {
    auto_refresh?: {
      enabled: boolean;
      interval: number;
    };
    layout?: {
      grid_size: number;
      margin: number;
      padding: number;
    };
    theme?: {
      background_color: string;
      text_color: string;
      accent_color: string;
    };
    export_settings?: {
      include_filters: boolean;
      page_size: 'A4' | 'A3' | 'Letter';
      orientation: 'portrait' | 'landscape';
    };
  };
  tabs: DashboardTab[];
  global_filters: GlobalFilter[];
  charts: Chart[];
}

interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  config_json?: Record<string, any>;
}

interface GlobalFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
  default_value?: any;
  options?: Array<{ label: string; value: any }>;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface Chart {
  id: string;
  name: string;
  display_name: string;
  chart_type: string;
  config_json: Record<string, any>;
  position_json: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  is_visible: boolean;
  sort_order: number;
  tab_id?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  
  // ✅ Safe router parameter extraction
  const dashboardId = useMemo(() => {
    if (!router.isReady) return null;

    const rawId = router.query['dashboard-uuid'];
    
    if (typeof rawId === 'string') {
      return rawId.trim() || null;
    } else if (Array.isArray(rawId)) {
      return rawId[0]?.trim() || null;
    } else {
      return null;
    }
  }, [router.isReady, router.query]);

  const workspaceSlug = useMemo(() => {
    if (!router.isReady) return null;
    const rawSlug = router.query['workspace-slug'];
    return typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : null;
  }, [router.isReady, router.query]);

  // State management
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ✅ RTK Query for actual API response structure: { success, data, message }
  const {
    data: apiResponse,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useGetDashboardQuery(
    dashboardId!,
    { 
      skip: !dashboardId || !isAuthenticated || !router.isReady,
      refetchOnMountOrArgChange: true 
    }
  );

  // Mutations
  const [updateDashboard] = useUpdateDashboardMutation();
  const [shareDashboard] = useShareDashboardMutation();
  const [exportDashboard] = useExportDashboardMutation();

  // ✅ OPTIMIZED: Extract dashboard from actual API response structure
  const dashboard = useMemo((): Dashboard | null => {
    if (!apiResponse) {
      console.log('❌ No API response received');
      return null;
    }

    if (!apiResponse.success) {
      console.log('❌ API response failed:', apiResponse.message);
      return null;
    }

    if (!apiResponse.data) {
      console.log('❌ No data in API response');
      return null;
    }

    console.log('✅ Dashboard data extracted from API response:', {
      id: apiResponse.data.id,
      name: apiResponse.data.name,
      display_name: apiResponse.data.display_name,
      charts: apiResponse.data.charts?.length || 0
    });

    return apiResponse.data;
  }, [apiResponse]);

  // ✅ Enhanced error handling for actual API structure
  const errorMessage = useMemo(() => {
    if (dashboardError) {
      if ('status' in dashboardError) {
        return `HTTP ${dashboardError.status}: ${dashboardError.data || 'API Error'}`;
      }
      return 'Network error occurred';
    }
    
    if (apiResponse && !apiResponse.success) {
      return apiResponse.message || 'Dashboard request failed';
    }
    
    return null;
  }, [dashboardError, apiResponse]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const loading = authLoading || dashboardLoading;
  
  const canEdit = useMemo(() => {
    return hasPermission('DASHBOARD_UPDATE') && 
           dashboard?.owner_id === user?.id;
  }, [hasPermission, dashboard?.owner_id, user?.id]);

  const canShare = useMemo(() => {
    return hasPermission('DASHBOARD_SHARE');
  }, [hasPermission]);

  const currentTabData = useMemo(() => {
    if (!dashboard?.tabs?.length) return null;
    return dashboard.tabs[currentTab] || dashboard.tabs[0];
  }, [dashboard?.tabs, currentTab]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refetchDashboard();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, [refetchDashboard]);

  const handleShare = useCallback(async () => {
    if (!dashboardId || !canShare) return;
    
    try {
      await shareDashboard({ dashboardId }).unwrap();
      // Handle success
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    }
  }, [dashboardId, canShare, shareDashboard]);

  const handleEdit = useCallback(() => {
    if (!dashboardId || !canEdit) return;
    
    router.push(`/workspace/${workspaceSlug}/dashboard/${dashboardId}/edit`);
  }, [dashboardId, canEdit, router, workspaceSlug]);

  const handleExport = useCallback(async () => {
    if (!dashboardId) return;
    
    try {
      await exportDashboard({ 
        dashboardId, 
        format: 'pdf',
        options: { include_filters: true }
      }).unwrap();
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
  }, [dashboardId, exportDashboard]);

  const handleBack = useCallback(() => {
    router.push(`/workspace/${workspaceSlug}/dashboards`);
  }, [router, workspaceSlug]);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // ============================================================================
  // EARLY RETURNS
  // ============================================================================

  if (!router.isReady) {
    return (
      <WorkspaceLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Initializing...
          </Typography>
        </Box>
      </WorkspaceLayout>
    );
  }

  if (!dashboardId) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="warning">
            <AlertTitle>Invalid Dashboard URL</AlertTitle>
            Please check the dashboard ID in the URL.
          </Alert>
          <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
            Back to Dashboards
          </Button>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={400} />
            <Stack direction="row" spacing={2}>
              <Skeleton variant="rectangular" width={200} height={300} />
              <Skeleton variant="rectangular" width={200} height={300} />
              <Skeleton variant="rectangular" width={200} height={300} />
            </Stack>
          </Stack>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (errorMessage) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="error">
            <AlertTitle>Dashboard Error</AlertTitle>
            {errorMessage}
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleRefresh} sx={{ mr: 2 }}>
              Retry
            </Button>
            <Button variant="outlined" onClick={handleBack}>
              Back to Dashboards
            </Button>
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="warning">
            <AlertTitle>Dashboard Not Found</AlertTitle>
            The dashboard could not be loaded.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleRefresh} sx={{ mr: 2 }}>
              Retry
            </Button>
            <Button variant="outlined" onClick={handleBack}>
              Back to Dashboards
            </Button>
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <WorkspaceLayout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          aria-label="breadcrumb" 
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2 }}
        >
          <Link 
            underline="hover" 
            color="inherit" 
            onClick={handleBack}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboards
          </Link>
          <Typography color="text.primary">
            {dashboard.display_name}
          </Typography>
        </Breadcrumbs>

        {/* Dashboard Header */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box flex={1}>
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton onClick={handleBack}>
                  <BackIcon />
                </IconButton>
                
                <Box>
                  <Typography variant="h5" component="h1">
                    {dashboard.display_name}
                  </Typography>
                  {dashboard.description && (
                    <Typography variant="body2" color="text.secondary">
                      {dashboard.description}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip
                    label={dashboard.status}
                    color={dashboard.status === 'published' ? 'success' : 'default'}
                    size="small"
                  />
                  {dashboard.is_public && (
                    <Chip
                      icon={<PublicIcon />}
                      label="Public"
                      color="info"
                      size="small"
                    />
                  )}
                  {dashboard.is_featured && (
                    <Chip
                      icon={<StarIcon />}
                      label="Featured"
                      color="warning"
                      size="small"
                    />
                  )}
                </Stack>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {canShare && (
                <Tooltip title="Share">
                  <IconButton onClick={handleShare}>
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Export">
                <IconButton onClick={handleExport}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              {canEdit && (
                <Tooltip title="Edit">
                  <IconButton onClick={handleEdit}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Fullscreen">
                <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>

              <IconButton onClick={handleMenuClick}>
                <MoreIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Dashboard Tabs */}
          {dashboard.tabs && dashboard.tabs.length > 1 && (
            <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                {dashboard.tabs.map((tab, index) => (
                  <Tab 
                    key={tab.id}
                    label={tab.display_name} 
                    id={`dashboard-tab-${index}`}
                    aria-controls={`dashboard-tabpanel-${index}`}
                  />
                ))}
              </Tabs>
            </Box>
          )}
        </Paper>

        {/* Dashboard Content */}
        <DashboardContainer
          dashboardId={dashboardId}
          workspaceId={dashboard.workspace_id}
          fullscreen={isFullscreen}
          showFilters={true}
          autoRefresh={dashboard.config_json?.auto_refresh?.enabled || false}
          refreshInterval={dashboard.config_json?.auto_refresh?.interval || 30}
          onFullscreenChange={setIsFullscreen}
          onError={(error) => console.error('Dashboard error:', error)}
        />

        {/* More Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleMenuClose}>
            <ViewIcon sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <SyncIcon sx={{ mr: 1 }} />
            Refresh All
          </MenuItem>
          {canEdit && (
            <MenuItem onClick={handleEdit}>
              <EditIcon sx={{ mr: 1 }} />
              Edit Dashboard
            </MenuItem>
          )}
        </Menu>
      </Container>
    </WorkspaceLayout>
  );
};

export default DashboardPage;