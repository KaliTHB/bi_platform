// web-application/src/components/templates/WebviewTemplate.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Skeleton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

// Import webview components
import { WebviewLayout } from '../webview/WebviewLayout';
import { useWebview } from '../../hooks/useWebview';
import { useAuth } from '../../hooks/useAuth';

interface WebviewTemplateProps {
  webviewName: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

interface WebviewStats {
  total: number;
  featured: number;
  totalViews: number;
  categories: number;
  recentlyAdded: number;
  popularThisWeek: number;
}

const WebviewTemplate: React.FC<WebviewTemplateProps> = ({
  webviewName,
  title,
  description,
  children
}) => {
  const router = useRouter();
  const { user } = useAuth();
  
  // Webview data
  const {
    webviewConfig,
    categories,
    navigationState,
    loading,
    error
  } = useWebview(webviewName);

  // Local state for dashboard stats
  const [dashboardStats, setDashboardStats] = useState<WebviewStats>({
    total: 0,
    featured: 0,
    totalViews: 0,
    categories: 0,
    recentlyAdded: 0,
    popularThisWeek: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Load webview statistics
  useEffect(() => {
    const loadWebviewStats = async () => {
      if (!webviewConfig?.id) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        
        const response = await fetch(`/api/webviews/${webviewConfig.id}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const stats = await response.json();
          setDashboardStats(stats);
        } else {
          console.error('Failed to load webview stats');
        }
      } catch (error) {
        console.error('Error loading webview stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadWebviewStats();
  }, [webviewConfig?.id]);

  // Calculate derived stats from categories
  useEffect(() => {
    if (categories.length > 0) {
      const totalDashboards = categories.reduce((sum, cat) => sum + cat.dashboard_count, 0);
      const totalViews = categories.reduce((sum, cat) => sum + (cat.total_views || 0), 0);
      
      setDashboardStats(prev => ({
        ...prev,
        total: totalDashboards,
        totalViews: totalViews,
        categories: categories.length
      }));
    }
  }, [categories]);

  if (error) {
    return (
      <WebviewLayout webviewName={webviewName} showSidebar={false}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Webview Error
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </Container>
      </WebviewLayout>
    );
  }

  const displayTitle = title || webviewConfig?.display_name || `${webviewName} Analytics`;
  const displayDescription = description || webviewConfig?.description || 
    'Explore comprehensive analytics dashboards organized by category.';

  return (
    <WebviewLayout webviewName={webviewName}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children ? (
          // If children provided, render them instead of default content
          children
        ) : (
          <>
            {/* Welcome Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom>
                {displayTitle}
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                {displayDescription}
              </Typography>
              {user && (
                <Typography variant="body2" color="text.secondary">
                  Welcome back, {user.name || user.email}
                </Typography>
              )}
            </Box>

            {/* Dashboard Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <DashboardIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
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

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <StarIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
                          ) : (
                            dashboardStats.featured
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Featured
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'info.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <ViewIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
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

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <CategoryIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
                          ) : (
                            dashboardStats.categories
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Categories
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <TrendingUpIcon />
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
                          ) : (
                            dashboardStats.popularThisWeek
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Popular This Week
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'purple',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        🆕
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {statsLoading ? (
                            <Skeleton width={60} height={40} />
                          ) : (
                            dashboardStats.recentlyAdded
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Recently Added
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
                  Use the sidebar to navigate through different dashboard categories. 
                  Each category contains related dashboards that you can explore and interact with.
                </Typography>
                <Typography variant="body1" paragraph>
                  Features available:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Search:</strong> Find dashboards quickly using the search functionality
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Categories:</strong> Browse dashboards organized by business area
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Responsive Design:</strong> Works seamlessly on desktop, tablet, and mobile
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Interactive Charts:</strong> Click and interact with charts for deeper insights
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Quick Links */}
            {categories.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Quick Access
                  </Typography>
                  <Grid container spacing={2}>
                    {categories.slice(0, 6).map((category) => (
                      <Grid item xs={12} sm={6} md={4} key={category.id}>
                        <Button
                          variant="outlined"
                          fullWidth
                          sx={{ py: 2, textAlign: 'left', justifyContent: 'flex-start' }}
                          onClick={() => router.push(`/${webviewName}/category/${category.slug}`)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {category.icon && <span>{category.icon}</span>}
                            <Box>
                              <Typography variant="subtitle2">
                                {category.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {category.dashboard_count} dashboard{category.dashboard_count !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    </WebviewLayout>
  );
};

export default WebviewTemplate;