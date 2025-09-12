// /pages/workspace/dashboard/[dashboard-uuid].tsx
// Dashboard page with automatic token refresh handling

import React, { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Button,
  IconButton,
  Toolbar,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Edit as EditIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

// Import existing components from your project
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

// Types
import { 
  Dashboard,
  ChartInteractionEvent 
} from '@/types/dashboard.types';

// =============================================================================
// TOKEN REFRESH UTILITY
// =============================================================================

class TokenManager {
  private static refreshPromise: Promise<string | null> | null = null;

  static async getValidToken(): Promise<string | null> {
    const token = this.getStoredToken();
    
    if (!token) {
      return null;
    }

    // Check if token is expired by making a quick test call
    try {
      const testResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        return token; // Token is valid
      }

      if (testResponse.status === 401) {
        // Token expired, try to refresh
        return await this.refreshToken();
      }
    } catch (error) {
      console.warn('Token validation failed:', error);
    }

    return token; // Return token anyway, let the API calls handle it
  }

  static async refreshToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private static async doRefreshToken(): Promise<string | null> {
    try {
      console.log('🔄 Refreshing access token...');

      const refreshToken = this.getRefreshToken();
      const currentToken = this.getStoredToken();

      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        
        if (data.success && data.token) {
          console.log('✅ Token refreshed successfully');
          
          // Store new token
          localStorage.setItem('token', data.token);
          if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
          }
          
          // Update cookie if used
          document.cookie = `token=${data.token}; path=/; SameSite=lax`;
          
          return data.token;
        }
      }

      console.log('❌ Token refresh failed, redirecting to login');
      this.clearTokens();
      window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      return null;

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      this.clearTokens();
      window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      return null;
    }
  }

  private static getStoredToken(): string | null {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken') ||
      document.cookie.match(/token=([^;]+)/)?.[1] ||
      null
    );
  }

  private static getRefreshToken(): string | null {
    return (
      localStorage.getItem('refreshToken') ||
      localStorage.getItem('refresh_token') ||
      document.cookie.match(/refreshToken=([^;]+)/)?.[1] ||
      null
    );
  }

  private static clearTokens(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refresh_token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
}

// Enhanced fetch function with automatic token refresh
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await TokenManager.getValidToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers
  });

  // If token expired, try refreshing and retry the request
  if (response.status === 401) {
    console.log('🔄 Token expired, attempting refresh...');
    
    const newToken = await TokenManager.refreshToken();
    
    if (newToken) {
      console.log('🔄 Retrying request with new token...');
      headers.Authorization = `Bearer ${newToken}`;
      
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  return response;
}

// =============================================================================
// INTERFACES
// =============================================================================

interface DashboardPageProps {
  dashboardId: string;
  dashboardData?: Dashboard;
  error?: string;
  debugInfo?: any;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DashboardViewPage: React.FC<DashboardPageProps> = ({
  dashboardId,
  dashboardData: initialDashboardData,
  error: initialError,
  debugInfo
}) => {
  const router = useRouter();
  const { user, workspace, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboardData || null);
  const [loading, setLoading] = useState(!initialDashboardData && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);
  const [fullscreen, setFullscreen] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Dashboard Page Debug:');
    console.log('- Dashboard ID:', dashboardId);
    console.log('- User authenticated:', isAuthenticated);
    console.log('- Initial dashboard data:', !!initialDashboardData);
    console.log('- Initial error:', initialError);
    
    if (debugInfo) {
      console.log('- Debug info:', debugInfo);
    }
  }, [dashboardId, isAuthenticated, initialDashboardData, initialError, debugInfo]);

  // Load dashboard data with token refresh handling
  const loadDashboardData = useCallback(async () => {
    if (!dashboardId) {
      setError('Dashboard ID is required');
      return;
    }

    try {
      console.log('📡 Loading dashboard with automatic token refresh...');
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/dashboards/${dashboardId}`);

      console.log('📡 Dashboard API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Still unauthorized after token refresh, redirecting to login');
          router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
          return;
        }
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📡 Dashboard API response:', result);

      if (result.success && result.data) {
        setDashboard(result.data);
      } else {
        setError(result.message || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [dashboardId, router]);

  // Initial load and auth check
  useEffect(() => {
    const initializeDashboard = async () => {
      // If we don't have dashboard data and no error, try to load it
      if (!dashboard && !error && dashboardId) {
        await loadDashboardData();
      }
    };

    initializeDashboard();
  }, [dashboard, error, dashboardId, loadDashboardData]);

  // Event handlers
  const handleBack = () => {
    if (workspace?.slug) {
      router.push(`/workspace/${workspace.slug}/dashboards`);
    } else {
      router.push('/workspace');
    }
  };

  const handleEdit = () => {
    if (workspace?.slug && dashboardId) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder?id=${dashboardId}`);
    } else {
      router.push(`/dashboard-builder?id=${dashboardId}`);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${router.asPath}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      console.log('✅ Dashboard URL copied to clipboard');
      alert('Dashboard URL copied to clipboard!');
    }).catch(() => {
      console.log('❌ Failed to copy to clipboard');
      alert(`Share this URL: ${shareUrl}`);
    });
  };

  const handleExport = () => {
    console.log('📄 Export requested for dashboard:', dashboardId);
    alert('Export functionality will be implemented soon!');
  };

  const handleFullscreenChange = (isFullscreen: boolean) => {
    setFullscreen(isFullscreen);
  };

  const handleChartInteraction = (event: ChartInteractionEvent) => {
    console.log('📊 Chart interaction:', event);
  };

  const handleDashboardError = (errorMessage: string) => {
    console.error('❌ Dashboard error:', errorMessage);
    setError(errorMessage);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading Dashboard...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Dashboard ID: {dashboardId}
            </Typography>
            {tokenRefreshed && (
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                ✅ Authentication refreshed
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    );
  }

  // Render error state
  if (error && !dashboard) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Dashboard Error</Typography>
          <Typography>{error}</Typography>
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            Go Back
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  const displayTitle = dashboard?.display_name || dashboard?.name || `Dashboard ${dashboardId}`;
  const displayDescription = dashboard?.description;

  return (
    <Box sx={{ 
      minHeight: fullscreen ? '100vh' : 'auto', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: fullscreen ? 'background.default' : 'transparent'
    }}>
      {/* Breadcrumbs */}
      {!fullscreen && (
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              color="inherit"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                router.push(`/workspace/${workspace?.slug || 'default'}`);
              }}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Workspace
            </Link>
            <Link
              color="inherit"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                router.push(`/workspace/${workspace?.slug || 'default'}/dashboards`);
              }}
            >
              Dashboards
            </Link>
            <Typography color="text.primary">
              {displayTitle}
            </Typography>
          </Breadcrumbs>
        </Container>
      )}

      {/* Toolbar */}
      {!fullscreen && (
        <Paper elevation={1} sx={{ mb: 2 }}>
          <Container maxWidth="xl">
            <Toolbar sx={{ px: { xs: 1, sm: 0 } }}>
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleBack}
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" component="h1" noWrap>
                  {displayTitle}
                </Typography>
                {displayDescription && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {displayDescription}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip 
                    label={dashboard?.status || 'Unknown'} 
                    size="small" 
                    color={dashboard?.status === 'published' ? 'success' : 'default'}
                  />
                  {tokenRefreshed && (
                    <Chip 
                      label="Token Refreshed" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <IconButton
                  color="inherit"
                  onClick={handleRefresh}
                  title="Refresh Dashboard"
                >
                  <RefreshIcon />
                </IconButton>

                <IconButton
                  color="inherit"
                  onClick={() => handleFullscreenChange(!fullscreen)}
                  title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  <FullscreenIcon />
                </IconButton>

                {user && hasPermission('dashboard.update') && (
                  <IconButton
                    color="inherit"
                    onClick={handleEdit}
                    title="Edit Dashboard"
                  >
                    <EditIcon />
                  </IconButton>
                )}

                <IconButton
                  color="inherit"
                  onClick={handleShare}
                  title="Share Dashboard"
                >
                  <ShareIcon />
                </IconButton>

                <IconButton
                  color="inherit"
                  onClick={handleExport}
                  title="Export Dashboard"
                >
                  <DownloadIcon />
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </Paper>
      )}

      {/* Main Dashboard Content - Using DashboardContainer */}
      <Container maxWidth="xl" sx={{ flex: 1, pb: 3 }}>
        {dashboardId ? (
          <DashboardContainer
            dashboardId={dashboardId}
            workspaceId={workspace?.id}
            fullscreen={fullscreen}
            showFilters={true}
            autoRefresh={dashboard?.config_json?.auto_refresh?.enabled || false}
            refreshInterval={dashboard?.config_json?.auto_refresh?.interval || 300000}
            onFullscreenChange={handleFullscreenChange}
            onChartInteraction={handleChartInteraction}
            onError={handleDashboardError}
            className="dashboard-main-container"
          />
        ) : (
          <Paper elevation={1} sx={{ minHeight: '60vh', p: 4 }}>
            <Alert severity="warning">
              <Typography variant="h6">Dashboard ID Required</Typography>
              <Typography>No dashboard ID provided in the URL.</Typography>
            </Alert>
          </Paper>
        )}

        {/* Success message after token refresh */}
        {tokenRefreshed && !error && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ Authentication token was automatically refreshed. Dashboard loaded successfully.
            </Typography>
          </Alert>
        )}
      </Container>
    </Box>
  );
};

// =============================================================================
// SERVER-SIDE PROPS - SIMPLIFIED FOR CLIENT-SIDE TOKEN HANDLING
// =============================================================================

export const getServerSideProps: GetServerSideProps = async (context) => {
  const dashboardUuid = context.params?.['dashboard-uuid'] as string;
  
  console.log('🔄 getServerSideProps - Dashboard UUID:', dashboardUuid);

  if (!dashboardUuid) {
    return {
      props: {
        dashboardId: '',
        error: 'Dashboard ID parameter is missing from URL'
      }
    };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(dashboardUuid)) {
    return {
      props: {
        dashboardId: dashboardUuid,
        error: 'Invalid dashboard ID format'
      }
    };
  }

  // For now, let client-side handle authentication and data loading
  // This avoids server-side token issues
  return {
    props: {
      dashboardId: dashboardUuid,
      debugInfo: {
        mode: 'client-side-auth-with-refresh',
        timestamp: new Date().toISOString()
      }
    }
  };
};

export default DashboardViewPage;