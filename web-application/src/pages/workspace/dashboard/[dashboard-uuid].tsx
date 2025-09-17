// web-application/src/pages/workspace/dashboard/[dashboard-uuid].tsx
// Updated with consistent imports, complete interfaces, and proper RTK Query integration

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
  Sync as SyncIcon
} from '@mui/icons-material';

// ✅ FIXED: Use consistent absolute imports with @/ alias
import {
  useGetDashboardQuery,
  useUpdateDashboardMutation,
  useShareDashboardMutation,
  useExportDashboardMutation
} from '@/store/api/dashboardApi';

// ✅ FIXED: Use absolute imports for storage utilities
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// ✅ FIXED: Use absolute imports for hooks and components
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';

// ============================================================================
// COMPLETE TYPE DEFINITIONS
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
  
  // ✅ FIXED: Properly extract dashboardId from router query
  const dashboardId = router.query['dashboard-uuid'] as string;
  
  console.log("dashboardId",dashboardId)

  // ✅ FIXED: State management with proper types
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ✅ FIXED: RTK Query hooks with proper error handling
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useGetDashboardQuery(
    { dashboardId },
    { skip: !dashboardId || !isAuthenticated }
  );

  // ✅ FIXED: RTK Query mutations
  const [updateDashboard] = useUpdateDashboardMutation();
  const [shareDashboard] = useShareDashboardMutation();
  const [exportDashboard] = useExportDashboardMutation();

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
      // Handle success (show notification, etc.)
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    }
  }, [dashboardId, canShare, shareDashboard]);

  const handleExport = useCallback(async (format: 'pdf' | 'png' | 'svg') => {
    if (!dashboardId) return;
    
    try {
      await exportDashboard({ dashboardId, format }).unwrap();
      // Handle success (download file, show notification, etc.)
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
  }, [dashboardId, exportDashboard]);

  const handleGlobalFilterChange = useCallback((filterId: string, value: any) => {
    setGlobalFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  }, []);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // ✅ FIXED: Proper authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  // ✅ FIXED: Initialize global filters from dashboard data
  useEffect(() => {
    if (dashboard?.global_filters) {
      const initialFilters: Record<string, any> = {};
      dashboard.global_filters.forEach(filter => {
        if (filter.default_value !== undefined) {
          initialFilters[filter.id] = filter.default_value;
        }
      });
      setGlobalFilters(initialFilters);
    }
  }, [dashboard?.global_filters]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderBreadcrumbs = () => (
    <Breadcrumbs separator="›" sx={{ mb: 2 }}>
      <Link 
        color="inherit" 
        href="/workspace" 
        onClick={(e) => {
          e.preventDefault();
          router.push('/workspace');
        }}
      >
        Workspace
      </Link>
      <Link 
        color="inherit" 
        href="/workspace/dashboards"
        onClick={(e) => {
          e.preventDefault();
          router.push('/workspace/dashboards');
        }}
      >
        Dashboards
      </Link>
      <Typography color="text.primary">
        {dashboard?.display_name || 'Loading...'}
      </Typography>
    </Breadcrumbs>
  );

  const renderHeader = () => (
    <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton onClick={() => router.back()}>
          <BackIcon />
        </IconButton>
        
        <Box>
          <Typography variant="h4" component="h1">
            {dashboard?.display_name}
          </Typography>
          {dashboard?.description && (
            <Typography variant="body2" color="text.secondary">
              {dashboard.description}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {dashboard?.is_public && (
            <Chip
              icon={<PublicIcon />}
              label="Public"
              size="small"
              variant="outlined"
            />
          )}
          {dashboard?.is_featured && (
            <Chip
              icon={<StarIcon />}
              label="Featured"
              size="small"
              color="primary"
            />
          )}
          <Chip
            label={dashboard?.status || 'draft'}
            size="small"
            color={dashboard?.status === 'published' ? 'success' : 'default'}
          />
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Fullscreen">
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
        
        {canShare && (
          <Tooltip title="Share">
            <IconButton onClick={handleShare}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <IconButton onClick={handleMenuClick}>
          <MoreIcon />
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {canEdit && (
            <MenuItem onClick={() => {
              handleMenuClose();
              router.push(`/workspace/dashboard-builder?id=${dashboardId}`);
            }}>
              <EditIcon sx={{ mr: 1 }} />
              Edit Dashboard
            </MenuItem>
          )}
          <MenuItem onClick={() => {
            handleMenuClose();
            handleExport('pdf');
          }}>
            <DownloadIcon sx={{ mr: 1 }} />
            Export as PDF
          </MenuItem>
          <MenuItem onClick={() => {
            handleMenuClose();
            handleExport('png');
          }}>
            <DownloadIcon sx={{ mr: 1 }} />
            Export as Image
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  const renderTabs = () => {
    if (!dashboard?.tabs?.length) return null;

    return (
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
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
    );
  };

  const renderGlobalFilters = () => {
    if (!dashboard?.global_filters?.length) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {dashboard.global_filters.map((filter) => (
            <FormControl key={filter.id} size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{filter.name}</InputLabel>
              <Select
                value={globalFilters[filter.id] || ''}
                onChange={(e) => handleGlobalFilterChange(filter.id, e.target.value)}
                label={filter.name}
              >
                {filter.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Stack>
      </Paper>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Loading state
  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth={false}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Container>
      </WorkspaceLayout>
    );
  }

  // Error state
  if (dashboardError) {
    return (
      <WorkspaceLayout>
        <Container maxWidth={false}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            {dashboardError.toString()}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Try Again
          </Button>
        </Container>
      </WorkspaceLayout>
    );
  }

  // No dashboard found
  if (!dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth={false}>
          <Alert severity="warning">
            Dashboard not found or you don't have permission to view it.
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  // Main content
  return (
    <WorkspaceLayout>
      <Container maxWidth={false} sx={{ py: 2 }}>
        {renderBreadcrumbs()}
        {renderHeader()}
        {renderGlobalFilters()}
        {renderTabs()}
        
        {/* Dashboard Content */}
        <DashboardContainer
          dashboard={dashboard}
          currentTab={currentTabData}
          globalFilters={globalFilters}
          isFullscreen={isFullscreen}
          canEdit={canEdit}
        />
      </Container>
    </WorkspaceLayout>
  );
};

export default DashboardPage;