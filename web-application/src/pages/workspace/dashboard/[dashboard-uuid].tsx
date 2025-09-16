// web-application/src/pages/workspace/dashboard/[dashboard-uuid].tsx
// Complete Dashboard with Chart Containers and Visualization

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Container,
  AppBar,
  Toolbar,
  Stack,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Switch,
  FormControlLabel
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
  Download as DownloadIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  GridView as GridIcon,
  Sync as SyncIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';

// Import your hooks
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';

// Import dashboard components
import {DashboardContainer} from '../../../components/dashboard/DashboardContainer';
import { authStorage } from '@/utils/storageUtils';

// Types
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
  data?: any; // Chart data will be loaded separately
  loading?: boolean;
  error?: string;
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

const DashboardDetailPage: NextPage = () => {
  const router = useRouter();
  const { user, currentWorkspace, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Get dashboard ID from route
  const { 'dashboard-uuid': dashboardId } = router.query;

  // Local state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [chartsLoading, setChartsLoading] = useState<Record<string, boolean>>({});
  const [chartsData, setChartsData] = useState<Record<string, any>>({});
  const [chartsErrors, setChartsErrors] = useState<Record<string, string>>({});

  const autoRefreshRef = useRef<NodeJS.Timeout>();

  // Helper functions for auth token
  const getAuthToken = (): string | null => {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('token') ||
           sessionStorage.getItem('auth_token') ||
           sessionStorage.getItem('token');
  };

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!dashboardId || typeof dashboardId !== 'string') {
      setError('Invalid dashboard ID');
      setLoading(false);
      return;
    }

    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard:', { dashboardId, workspaceId: currentWorkspace.id });

      //const token = getAuthToken();
      const token = authStorage.getToken()
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/dashboards/${dashboardId}?include_charts=true&include_data=false`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-workspace-id': currentWorkspace.id,
          'x-user-id': user?.id || '',
        }
      });

      console.log('📊 Dashboard API Response:', response.status, response.ok);

      if (response.status === 404) {
        throw new Error('Dashboard not found');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const dashboardData = responseData.data || responseData.dashboard || responseData;
      
      if (!dashboardData) {
        throw new Error('Invalid API response - no dashboard data found');
      }

      // Process dashboard data
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

      // Set auto refresh settings
      if (processedDashboard.config_json.auto_refresh?.enabled) {
        setAutoRefresh(true);
        setRefreshInterval(processedDashboard.config_json.auto_refresh.interval);
      }

      console.log('✅ Dashboard loaded:', {
        name: processedDashboard.display_name,
        tabs: processedDashboard.tabs.length,
        charts: processedDashboard.charts.length,
        filters: processedDashboard.global_filters.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Dashboard loading error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, currentWorkspace?.id, user?.id]);

  // Load individual chart data
  const loadChartData = useCallback(async (chartId: string, forceRefresh = false) => {
    if (!dashboard || !currentWorkspace?.id) return;

    try {
      setChartsLoading(prev => ({ ...prev, [chartId]: true }));
      setChartsErrors(prev => ({ ...prev, [chartId]: '' }));

      //const token = getAuthToken();
      const token = authStorage.getToken()
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${apiUrl}/api/charts/${chartId}/data`;
      
      const queryParams = new URLSearchParams({
        force_refresh: forceRefresh.toString(),
        ...(globalFilters.length > 0 && { filters: JSON.stringify(globalFilters) })
      });

      const response = await fetch(`${endpoint}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-workspace-id': currentWorkspace.id,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load chart data: ${response.status}`);
      }

      const responseData = await response.json();
      const chartData = responseData.data || responseData;

      setChartsData(prev => ({ ...prev, [chartId]: chartData }));
      console.log(`✅ Chart data loaded: ${chartId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ Chart data loading error (${chartId}):`, err);
      setChartsErrors(prev => ({ ...prev, [chartId]: errorMessage }));
    } finally {
      setChartsLoading(prev => ({ ...prev, [chartId]: false }));
    }
  }, [dashboard, currentWorkspace?.id, globalFilters]);

  // Load all charts data
  const loadAllChartsData = useCallback(async (forceRefresh = false) => {
    if (!dashboard?.charts) return;

    console.log('🔄 Loading all charts data...', { count: dashboard.charts.length });
    
    const loadPromises = dashboard.charts.map(chart => 
      loadChartData(chart.id, forceRefresh)
    );

    await Promise.all(loadPromises);
    console.log('✅ All charts data loaded');
  }, [dashboard?.charts, loadChartData]);

  // Auto refresh logic
  useEffect(() => {
    if (autoRefresh && dashboard) {
      console.log(`🔄 Starting auto refresh every ${refreshInterval} seconds`);
      
      autoRefreshRef.current = setInterval(() => {
        console.log('🔄 Auto refresh triggered');
        loadAllChartsData(true);
      }, refreshInterval * 1000);

      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, dashboard, loadAllChartsData]);

  // Load dashboard when ready
  useEffect(() => {
    if (router.isReady && !authLoading && currentWorkspace?.id && dashboardId) {
      loadDashboard();
    }
  }, [router.isReady, authLoading, currentWorkspace?.id, dashboardId, loadDashboard]);

  // Load charts data after dashboard loads
  useEffect(() => {
    if (dashboard && dashboard.charts.length > 0) {
      loadAllChartsData();
    }
  }, [dashboard, loadAllChartsData]);

  // Handle global filter changes
  const handleGlobalFilterChange = (filterId: string, value: any) => {
    setGlobalFilters(prev => 
      prev.map(filter => 
        filter.id === filterId 
          ? { ...filter, current_value: value }
          : filter
      )
    );
    
    // Reload all charts with new filters
    setTimeout(() => {
      loadAllChartsData(true);
    }, 500);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Navigation handlers
  const handleBack = () => {
    router.push(`/workspace/${currentWorkspace?.slug || 'default'}/dashboards`);
  };

  const handleEdit = () => {
    router.push(`/workspace/${currentWorkspace?.slug || 'default'}/dashboard-builder?id=${dashboardId}`);
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadAllChartsData(true);
  };

  const handleAutoRefreshToggle = (enabled: boolean) => {
    setAutoRefresh(enabled);
    if (!enabled && autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
  };

  // Early returns for loading/error states
  if (!router.isReady || authLoading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <CircularProgress />
          <Typography>Initializing...</Typography>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!dashboardId || typeof dashboardId !== 'string') {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="error">
            <AlertTitle>Invalid Dashboard URL</AlertTitle>
            <Button onClick={handleBack}>Back to Dashboards</Button>
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={60} />
            <Typography variant="h6">Loading Dashboard...</Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {dashboardId}
            </Typography>
          </Stack>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (error || !dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="error">
            <AlertTitle>Dashboard Loading Failed</AlertTitle>
            <Typography>{error}</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => loadDashboard()} sx={{ mr: 1 }}>
                Try Again
              </Button>
              <Button variant="outlined" onClick={handleBack}>
                Back to Dashboards
              </Button>
            </Box>
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  // Get current tab data
  const currentTab = dashboard.tabs.find(tab => tab.id === activeTab) || dashboard.tabs[0];
  const currentTabCharts = currentTab?.charts || dashboard.charts;

  return (
    <WorkspaceLayout>
      {/* Dashboard Header */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Container maxWidth="xl">
          <Box sx={{ p: 2 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 1 }}>
              <Link component="button" variant="body2" onClick={handleBack}>
                <WorkspaceIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                {currentWorkspace.name}
              </Link>
              <Link component="button" variant="body2" onClick={handleBack}>
                Dashboards
              </Link>
              <Typography variant="body2" color="text.primary">
                {dashboard.display_name}
              </Typography>
            </Breadcrumbs>

            {/* Title and Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {dashboard.display_name || dashboard.name}
                </Typography>
                {dashboard.description && (
                  <Typography variant="body1" color="text.secondary">
                    {dashboard.description}
                  </Typography>
                )}
              </Box>

              {/* Action Controls */}
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Auto Refresh Toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => handleAutoRefreshToggle(e.target.checked)}
                      size="small"
                    />
                  }
                  label={`Auto (${refreshInterval}s)`}
                />

                {/* Manual Refresh */}
                <Tooltip title="Refresh Dashboard">
                  <IconButton 
                    onClick={handleRefresh}
                    disabled={Object.values(chartsLoading).some(loading => loading)}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                {/* Fullscreen Toggle */}
                <Tooltip title="Toggle Fullscreen">
                  <IconButton onClick={() => setFullscreen(!fullscreen)}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>

                {/* Edit Dashboard */}
                {hasPermission('dashboard.update') && (
                  <Tooltip title="Edit Dashboard">
                    <IconButton onClick={handleEdit}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Back Button */}
                <Button
                  startIcon={<BackIcon />}
                  onClick={handleBack}
                  variant="outlined"
                  size="small"
                >
                  Back
                </Button>
              </Stack>
            </Box>

            {/* Dashboard Meta Info */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={dashboard.status}
                color={dashboard.status === 'published' ? 'success' : 'default'}
                size="small"
              />
              {dashboard.is_featured && (
                <Chip icon={<StarIcon />} label="Featured" color="warning" size="small" />
              )}
              <Typography variant="body2" color="text.secondary">
                Charts: {dashboard.charts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {new Date(dashboard.updated_at).toLocaleDateString()}
              </Typography>
            </Stack>
          </Box>
        </Container>
      </Paper>

      {/* Global Filters - Simple inline implementation */}
      {globalFilters.length > 0 && (
        <Paper elevation={0} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="xl">
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Filters:
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {globalFilters.map((filter) => (
                  <Box key={filter.id} sx={{ minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      {filter.display_name}
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={`Filter by ${filter.display_name}`}
                      value={filter.current_value || ''}
                      onChange={(e) => handleGlobalFilterChange(filter.id, e.target.value)}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Container>
        </Paper>
      )}

      {/* Dashboard Tabs - Simple inline implementation */}
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

      {/* Main Dashboard Container */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <DashboardContainer
          dashboard={dashboard}
          charts={currentTabCharts}
          chartsData={chartsData}
          chartsLoading={chartsLoading}
          chartsErrors={chartsErrors}
          onChartRefresh={(chartId) => loadChartData(chartId, true)}
          fullscreen={fullscreen}
        />
      </Container>
    </WorkspaceLayout>
  );
};

export default DashboardDetailPage;