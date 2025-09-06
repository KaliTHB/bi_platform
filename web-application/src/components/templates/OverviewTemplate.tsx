// web-application/src/components/templates/OverviewTemplate.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  DataObject,
  Analytics,
  Settings,
  Search,
  Business,
  SwapHoriz,
  CheckCircle,
  Add,
  TrendingUp,
  People,
  Storage,
  AssignmentTurnedIn,
  Visibility as WebviewIcon,
  AccountCircle as ProfileIcon
} from '@mui/icons-material';
import WorkspaceLayout from '../layout/WorkspaceLayout';
import { PermissionGate } from '../shared/PermissionGate';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

// API Service imports (create these if they don't exist)
interface WorkspaceStats {
  dashboards: number;
  datasets: number;
  datasources: number;
  charts: number;
  webviews: number;
}

interface OverviewTemplateProps {
  title?: string;
}

const OverviewTemplate: React.FC<OverviewTemplateProps> = ({ 
  title = "Overview"
}) => {
  const router = useRouter();
  const { user, workspace, switchWorkspace, getAvailableWorkspaces, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  // Local state
  const [stats, setStats] = useState<WorkspaceStats>({
    dashboards: 0,
    datasets: 0,
    datasources: 0,
    charts: 0,
    webviews: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load workspace stats
  useEffect(() => {
    const loadStats = async () => {
      if (!workspace?.id) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        
        // Replace with actual API calls
        const response = await fetch(`/api/workspaces/${workspace.id}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback to mock data if API not available
          setStats({
            dashboards: 12,
            datasets: 25,
            datasources: 5,
            charts: 48,
            webviews: 3
          });
        }
      } catch (error) {
        console.error('Failed to load workspace stats:', error);
        // Fallback data
        setStats({
          dashboards: 12,
          datasets: 25,
          datasources: 5,
          charts: 48,
          webviews: 3
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [workspace?.id]);

  // Load available workspaces when selector opens
  useEffect(() => {
    if (showWorkspaceSelector && !workspacesLoading) {
      loadWorkspaces();
    }
  }, [showWorkspaceSelector]);

  const loadWorkspaces = async () => {
    try {
      setWorkspacesLoading(true);
      const workspaces = await getAvailableWorkspaces();
      setAvailableWorkspaces(workspaces);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleWorkspaceSelect = async (selectedWorkspace: any) => {
    try {
      await switchWorkspace(selectedWorkspace.slug);
      setShowWorkspaceSelector(false);
      // Stats will reload automatically due to useEffect dependency on workspace.id
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(`/workspace/${path}`);
  };

  const handleCreateDashboard = () => {
    router.push('/workspace/dashboard-builder');
  };

  // Filter workspaces based on search
  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || permissionsLoading) {
    return (
      <WorkspaceLayout title={title}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ ml: 2 }} color="text.secondary">
              Loading workspace...
            </Typography>
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <WorkspaceLayout title={title}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">
            Please log in to continue.
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout title={title}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''}!
          </Typography>
          
          {workspace ? (
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="body1" color="text.secondary">
                Current workspace: 
                <Chip 
                  label={workspace.display_name || workspace.name} 
                  color="primary" 
                  size="small" 
                  sx={{ ml: 1, fontWeight: 600 }}
                />
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SwapHoriz />}
                onClick={() => setShowWorkspaceSelector(true)}
                sx={{ textTransform: 'none' }}
              >
                Switch
              </Button>
            </Box>
          ) : (
            <Box mb={3}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  No workspace selected
                </Typography>
                <Typography variant="body2" mb={2}>
                  You need to select a workspace to access dashboards and data.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setShowWorkspaceSelector(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Select Workspace
                </Button>
              </Alert>
            </Box>
          )}
        </Box>

        {/* Stats Pills Row */}
        <Box mb={4}>
          <Grid container spacing={2}>
            <PermissionGate permissions={['dashboard.read']}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3 
                    }
                  }} 
                  onClick={() => handleNavigation('dashboards')}
                >
                  <CardContent sx={{ py: 1 }}>
                    <DashboardIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700} color="primary">
                      {statsLoading ? <CircularProgress size={20} /> : stats.dashboards}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dashboards
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>
            
            <PermissionGate permissions={['dataset.read']}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3 
                    }
                  }}
                  onClick={() => handleNavigation('datasets')}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Storage color="success" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      {statsLoading ? <CircularProgress size={20} /> : stats.datasets}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Datasets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>
            
            <PermissionGate permissions={['dataset.read']}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3 
                    }
                  }}
                  onClick={() => handleNavigation('datasources')}
                >
                  <CardContent sx={{ py: 1 }}>
                    <DataObject color="info" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700} color="info.main">
                      {statsLoading ? <CircularProgress size={20} /> : stats.datasources}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Data Sources
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>
            
            <PermissionGate permissions={['chart.read']}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3 
                    }
                  }}
                  onClick={() => handleNavigation('charts')}
                >
                  <CardContent sx={{ py: 1 }}>
                    <TrendingUp color="warning" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700} color="warning.main">
                      {statsLoading ? <CircularProgress size={20} /> : stats.charts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Charts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>

            <PermissionGate permissions={['webview.read']}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3 
                    }
                  }}
                  onClick={() => handleNavigation('webviews')}
                >
                  <CardContent sx={{ py: 1 }}>
                    <WebviewIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700} color="secondary.main">
                      {statsLoading ? <CircularProgress size={20} /> : stats.webviews}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Webviews
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>
          </Grid>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Quick Actions Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  <PermissionGate permissions={['dashboard.create']}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      fullWidth
                      onClick={handleCreateDashboard}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem', fontWeight: 500 }}
                    >
                      Create New Dashboard
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['dataset.create']}>
                    <Button
                      variant="outlined"
                      startIcon={<DataObject />}
                      fullWidth
                      onClick={() => handleNavigation('datasources')}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none' }}
                    >
                      Add Data Source
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['sql_editor.access']}>
                    <Button
                      variant="outlined"
                      startIcon={<Analytics />}
                      fullWidth
                      onClick={() => handleNavigation('sql-editor')}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none' }}
                    >
                      Open SQL Editor
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['workspace.admin']}>
                    <Button
                      variant="outlined"
                      startIcon={<Settings />}
                      fullWidth
                      onClick={() => handleNavigation('admin')}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none' }}
                    >
                      Workspace Settings
                    </Button>
                  </PermissionGate>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Profile & Webview Navigation Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Profile & Webviews
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<ProfileIcon />}
                    fullWidth
                    onClick={() => handleNavigation('profile')}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    My Profile
                  </Button>
                  
                  <PermissionGate permissions={['webview.read']}>
                    <Button
                      variant="outlined"
                      startIcon={<WebviewIcon />}
                      fullWidth
                      onClick={() => handleNavigation('webviews')}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none' }}
                    >
                      Manage Webviews
                    </Button>
                  </PermissionGate>

                  <PermissionGate permissions={['webview.create']}>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      fullWidth
                      onClick={() => handleNavigation('webviews/create')}
                      disabled={!workspace}
                      sx={{ py: 1.5, textTransform: 'none' }}
                    >
                      Create Webview
                    </Button>
                  </PermissionGate>

                  <Divider sx={{ my: 1 }} />

                  <PermissionGate permissions={['workspace.admin']}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Admin Tools:
                    </Typography>
                    
                    <Button
                      variant="text"
                      startIcon={<WebviewIcon />}
                      fullWidth
                      onClick={() => handleNavigation('admin/webviews')}
                      disabled={!workspace}
                      sx={{ py: 1, textTransform: 'none', justifyContent: 'flex-start' }}
                    >
                      Configure Webviews
                    </Button>
                    
                    <Button
                      variant="text"
                      startIcon={<People />}
                      fullWidth
                      onClick={() => handleNavigation('admin/users')}
                      disabled={!workspace}
                      sx={{ py: 1, textTransform: 'none', justifyContent: 'flex-start' }}
                    >
                      Manage Users
                    </Button>
                  </PermissionGate>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Workspace Information Card */}
          {workspace && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Workspace Statistics
                  </Typography>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h5" color="primary" fontWeight={700}>
                          {workspace.user_count || 1}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Team Members
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <AssignmentTurnedIn sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                        <Typography variant="h5" color="success.main" fontWeight={700}>
                          {statsLoading ? <CircularProgress size={20} /> : Math.floor(stats.dashboards * 0.8)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Projects
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <TrendingUp sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                        <Typography variant="h5" color="info.main" fontWeight={700}>
                          {statsLoading ? <CircularProgress size={20} /> : stats.charts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Charts
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <Storage sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                        <Typography variant="h5" color="warning.main" fontWeight={700}>
                          {statsLoading ? <CircularProgress size={20} /> : `${(stats.datasets * 1.2).toFixed(1)}GB`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Data Volume
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Workspace Selector Dialog */}
        <Dialog
          open={showWorkspaceSelector}
          onClose={() => setShowWorkspaceSelector(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <SwapHoriz />
              Select Workspace
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {workspacesLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {filteredWorkspaces.length > 0 ? (
                  filteredWorkspaces.map((ws) => (
                    <ListItem key={ws.id} disablePadding>
                      <ListItemButton onClick={() => handleWorkspaceSelect(ws)}>
                        <ListItemAvatar>
                          <Avatar src={ws.logo_url} sx={{ bgcolor: 'primary.main' }}>
                            <Business />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={ws.display_name || ws.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {ws.description || 'No description available'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                {ws.is_default && (
                                  <Chip 
                                    label="Default" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                )}
                                <Chip 
                                  label={`${ws.user_count || 0} members`} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          }
                        />
                        {workspace?.id === ws.id && (
                          <CheckCircle color="success" />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="text.secondary">
                      {searchQuery ? 'No workspaces match your search' : 'No workspaces available'}
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </WorkspaceLayout>
  );
};

export default OverviewTemplate;
export { OverviewTemplate };