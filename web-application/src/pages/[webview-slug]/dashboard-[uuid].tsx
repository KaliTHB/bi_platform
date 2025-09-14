// web-application/src/pages/[webview-slug]/[dashboard-uuid].tsx
import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Share as ShareIcon,
  GetApp as ExportIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { WebviewLayout } from '../../components/layout/WebviewLayout';
import { DashboardContainer } from '../../components/dashboard/DashboardContainer';
import { useWebview } from '../../hooks/useWebview';
import { useDashboard } from '../../hooks/useDashboard';

// =============================================================================
// INTERFACES
// =============================================================================

interface DashboardPageProps {
  webviewSlug: string;
  dashboardId: string;
  initialDashboardData?: any;
  error?: string;
}

interface Dashboard {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  config_json: any;
  tabs: any[];
  global_filters: any[];
  theme_config: any;
  layout_config: any;
  is_public: boolean;
  is_featured: boolean;
  view_count: number;
  last_viewed?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const WebviewDashboardPage: React.FC<DashboardPageProps> = ({
  webviewSlug,
  dashboardId,
  initialDashboardData,
  error: initialError
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboardData);
  const [refreshing, setRefreshing] = useState(false);

  // Webview hook to get webview configuration
  const {
    webviewConfig,
    categories,
    navigationState,
    selectDashboard,
    loading: webviewLoading,
    error: webviewError
  } = useWebview(webviewSlug);

  // Dashboard hook for dashboard-specific operations
  const {
    updateDashboard,
    incrementViewCount,
    shareDashboard,
    exportDashboard
  } = useDashboard(dashboardId);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    if (dashboardId && !initialDashboardData && !initialError) {
      loadDashboard();
    }
  }, [dashboardId, initialDashboardData, initialError]);

  useEffect(() => {
    // Select this dashboard in the sidebar
    if (dashboardId) {
      selectDashboard(dashboardId);
    }
  }, [dashboardId, selectDashboard]);

  useEffect(() => {
    // Increment view count when dashboard is loaded
    if (dashboard && webviewConfig) {
      incrementViewCount();
    }
  }, [dashboard, webviewConfig, incrementViewCount]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try public endpoint first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/webviews/${webviewSlug}/dashboards/${dashboardId}`);
      
      if (!response.ok) {
        throw new Error('Dashboard not found or access denied');
      }

      const data = await response.json();
      if (data.success) {
        setDashboard(data.data);
      } else {
        throw new Error(data.message || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleShare = async () => {
    try {
      await shareDashboard();
      
      if (navigator.share) {
        await navigator.share({
          title: dashboard?.display_name || 'Dashboard',
          text: dashboard?.description || '',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // You could show a toast notification here
      }
    } catch (err) {
      console.error('Error sharing dashboard:', err);
    }
  };

  const handleExport = async () => {
    try {
      await exportDashboard('pdf'); // or show export options dialog
    } catch (err) {
      console.error('Error exporting dashboard:', err);
    }
  };

  const handleHomeClick = () => {
    router.replace(`/${webviewSlug}`);
  };

  const handleCategoryClick = () => {
    if (dashboard?.category_name) {
      router.replace(`/${webviewSlug}/category/${dashboard.category_name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  // =============================================================================
  // DERIVED VALUES
  // =============================================================================

  const currentDashboard = dashboard ? {
    id: dashboard.id,
    name: dashboard.name,
    display_name: dashboard.display_name,
    category_name: dashboard.category_name
  } : undefined;

  const isLoading = loading || webviewLoading || refreshing;
  const hasError = error || webviewError;

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  if (hasError && !webviewConfig && !dashboard) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              <RefreshIcon />
            </IconButton>
          }
        >
          <Typography variant="h6" gutterBottom>
            {error || webviewError}
          </Typography>
          <Typography variant="body2">
            Please check the URL and try again, or contact support if the problem persists.
          </Typography>
        </Alert>
      </Container>
    );
  }

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  if (isLoading && !dashboard) {
    return (
      <WebviewLayout webviewName={webviewSlug}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '60vh',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary">
              Loading dashboard...
            </Typography>
          </Box>
        </Container>
      </WebviewLayout>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <WebviewLayout 
      webviewName={webviewSlug}
      showSidebar={true}
      showNavbar={true}
    >
      <Container maxWidth="xl" sx={{ py: 0, height: '100%' }}>
        {/* Dashboard Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Breadcrumbs and Title */}
            <Box sx={{ flexGrow: 1 }}>
              {/* Breadcrumbs */}
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                sx={{ mb: 1 }}
              >
                <Link
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleHomeClick();
                  }}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {webviewConfig?.display_name || 'Home'}
                </Link>
                
                {dashboard?.category_name && (
                  <Link
                    color="inherit"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick();
                    }}
                    sx={{ 
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    {dashboard.category_name}
                  </Link>
                )}
                
                <Typography color="text.primary">
                  {dashboard?.display_name}
                </Typography>
              </Breadcrumbs>

              {/* Dashboard Title and Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  {dashboard?.display_name}
                </Typography>
                
                {dashboard?.is_featured && (
                  <Chip 
                    label="Featured" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                )}
                
                <Chip 
                  label="Live" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                />
              </Box>

              {/* Description */}
              {dashboard?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {dashboard.description}
                </Typography>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Refresh Dashboard">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share Dashboard">
                <IconButton onClick={handleShare}>
                  <ShareIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export Dashboard">
                <IconButton onClick={handleExport}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Fullscreen">
                <IconButton onClick={() => {
                  // Implement fullscreen functionality
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                  }
                }}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Dashboard Content */}
        <Box sx={{ height: 'calc(100% - 120px)' }}>
          {dashboard ? (
            <DashboardContainer
              dashboard={dashboard}
              webviewConfig={webviewConfig}
              isWebview={true}
              showFilters={true}
              allowInteraction={true}
            />
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Dashboard not found or access denied.
            </Alert>
          )}
        </Box>
      </Container>
    </WebviewLayout>
  );
};

// =============================================================================
// SERVER-SIDE PROPS
// =============================================================================

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { 
    'webview-slug': webviewSlug, 
    'dashboard-uuid': dashboardId 
  } = context.params!;

  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dashboardId as string)) {
      return {
        props: {
          webviewSlug: webviewSlug as string,
          dashboardId: dashboardId as string,
          error: 'Invalid dashboard ID format'
        }
      };
    }

    // Try to fetch dashboard data server-side for better SEO and performance
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/webviews/${webviewSlug}/dashboards/${dashboardId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            props: {
              webviewSlug: webviewSlug as string,
              dashboardId: dashboardId as string,
              initialDashboardData: data.data
            }
          };
        }
      }
    } catch (serverError) {
      console.error('Server-side fetch error:', serverError);
      // Continue to return props without initial data
    }

    return {
      props: {
        webviewSlug: webviewSlug as string,
        dashboardId: dashboardId as string
      }
    };

  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    
    return {
      props: {
        webviewSlug: webviewSlug as string,
        dashboardId: dashboardId as string,
        error: 'Failed to load dashboard information'
      }
    };
  }
};

export default WebviewDashboardPage;