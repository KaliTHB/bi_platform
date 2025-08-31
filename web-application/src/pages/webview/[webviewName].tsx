// web-application/src/pages/webview/[webviewName].tsx
import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { WebviewLayout } from '../../components/webview/WebviewLayout';
import { WebviewConfig } from '../../types/webview.types';

interface WebviewPageProps {
  webviewConfig: WebviewConfig | null;
  error?: string;
}

export default function WebviewPage({ webviewConfig, error }: WebviewPageProps) {
  const [pageLoading, setPageLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    featured: 0,
    totalViews: 0
  });

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    if (!webviewConfig) return;

    setPageLoading(true);
    try {
      const response = await fetch(`/api/webviews/${webviewConfig.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (webviewConfig) {
      fetchDashboardStats();
    }
  }, [webviewConfig]);

  // Error state
  if (error || !webviewConfig) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Webview Not Found
          </Typography>
          <Typography variant="body2">
            {error || 'The requested webview could not be found or you do not have access to it.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <WebviewLayout webviewName={webviewConfig?.webview_name || ''}>
      <Box>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to {webviewConfig.display_name}
          </Typography>
          {webviewConfig.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {webviewConfig.description}
            </Typography>
          )}
        </Box>

        {/* Dashboard Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DashboardIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {pageLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        dashboardStats.total
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Dashboards
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {pageLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        dashboardStats.featured
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Featured Dashboards
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18,
                      fontWeight: 'bold'
                    }}
                  >
                    👁️
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {pageLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        dashboardStats.totalViews.toLocaleString()
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Views
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Getting Started Instructions */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Getting Started
            </Typography>
            <Typography variant="body1" paragraph>
              Use the sidebar to navigate through different dashboard categories. You can:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body2" paragraph>
                Browse dashboards organized by category
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Use the search bar to quickly find specific dashboards
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Click on any dashboard to view its content
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Look for ⭐ icons to find featured dashboards
              </Typography>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchDashboardStats}
                disabled={pageLoading}
              >
                {pageLoading ? 'Refreshing...' : 'Refresh Statistics'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Custom branding footer */}
        {webviewConfig.branding_config.footer_text && (
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {webviewConfig.branding_config.footer_text}
            </Typography>
            {webviewConfig.branding_config.show_powered_by && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Powered by Your BI Platform
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </WebviewLayout>
  );
}

// Server-side props to fetch webview configuration
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { webviewName } = context.params!;

  try {
    // In a real implementation, this would fetch from your API
    // For now, this is a placeholder
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/webviews/by-name/${webviewName}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        props: {
          webviewConfig: null,
          error: `Webview "${webviewName}" not found`
        }
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        props: {
          webviewConfig: null,
          error: data.message || 'Failed to load webview configuration'
        }
      };
    }

    return {
      props: {
        webviewConfig: data.webview_config
      }
    };
  } catch (error) {
    console.error('Error fetching webview config:', error);
    return {
      props: {
        webviewConfig: null,
        error: 'Failed to load webview configuration'
      }
    };
  }
};