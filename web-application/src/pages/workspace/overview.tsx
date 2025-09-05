// src/pages/workspace/overview.tsx - Updated to use Enhanced Layout
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
  Paper,
  CardActions,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  DataObject,
  Analytics,
  Settings,
  Search,
  Business,
  SwapHoriz,
  Refresh,
  CheckCircle,
  Add,
  TrendingUp,
  People,
  Storage,
  AssignmentTurnedIn
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import EnhancedWorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { Workspace } from '../../types/auth.types';

interface WorkspaceOption extends Workspace {
  // Add any additional properties specific to this component
  is_default?: boolean;
}

interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  role?: string;
  is_default?: boolean;
}

interface WorkspaceStatus {
  hasEndpoint: boolean;
  error?: string;
}

export default function WorkspaceOverview() {
  const router = useRouter();
  const { 
    user, 
    workspace, 
    switchWorkspace, 
    getAvailableWorkspaces,
    getDefaultWorkspace,
    isAuthenticated,
    isLoading: authLoading 
  } = useAuth();

  // Local state
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>({
    hasEndpoint: false
  });

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load workspace status on component mount
  useEffect(() => {
    const checkWorkspaceStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const result = await getDefaultWorkspace();
          setWorkspaceStatus({
            hasEndpoint: result.hasEndpoint,
            error: result.error
          });
        } catch (error) {
          console.error('Failed to check workspace status:', error);
          setWorkspaceStatus({
            hasEndpoint: false,
            error: 'Failed to check workspace status'
          });
        }
      }
    };

    checkWorkspaceStatus();
  }, [isAuthenticated, user, getDefaultWorkspace]);

  const loadAvailableWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const workspaces = await getAvailableWorkspaces();
      setAvailableWorkspaces(workspaces);
      console.log('Available workspaces loaded:', workspaces.length);
    } catch (error) {
      console.error('Failed to load available workspaces:', error);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const openWorkspaceSelector = async () => {
    setShowWorkspaceSelector(true);
    await loadAvailableWorkspaces();
  };

  const handleWorkspaceSwitch = async (workspaceSlug: string) => {
    if (workspaceSlug === workspace?.slug) {
      setShowWorkspaceSelector(false);
      return;
    }

    try {
      const result = await switchWorkspace(workspaceSlug);
      if (result.success) {
        setShowWorkspaceSelector(false);
      } else {
        console.error('Failed to switch workspace:', result.error);
      }
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  const handleCreateDashboard = () => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder`);
    }
  };

  // Filter workspaces based on search
  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading state
  if (authLoading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  // Show authentication error
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          You are not authenticated. Please log in to continue.
        </Alert>
      </Container>
    );
  }

  return (
    <EnhancedWorkspaceLayout
      title="Dashboard"
      showAddButton={!!workspace}
      onAddClick={handleCreateDashboard}
      addButtonText="Add New"
      currentPage="home"
    >
      <Container maxWidth="xl" sx={{ py: 0 }}>
        {/* Welcome Section */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            Welcome back{user.display_name ? `, ${user.display_name}` : ''}!
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
                onClick={openWorkspaceSelector}
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
                  startIcon={<Add />}
                  onClick={openWorkspaceSelector}
                  size="small"
                >
                  Select Workspace
                </Button>
              </Alert>
            </Box>
          )}
        </Box>

        {/* Stats Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {workspace?.dashboard_count || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Dashboards
                    </Typography>
                  </Box>
                  <DashboardIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
                <Box mt={2}>
                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                    }} 
                  />
                  <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                    75% Active
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {workspace?.dataset_count || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Data Sources
                    </Typography>
                  </Box>
                  <Storage sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
                <Box mt={2}>
                  <LinearProgress 
                    variant="determinate" 
                    value={60} 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                    }} 
                  />
                  <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                    60% Connected
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {workspace?.user_count || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Users
                    </Typography>
                  </Box>
                  <People sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
                <Box mt={2}>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      +12% this month
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      24
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Reports Generated
                    </Typography>
                  </Box>
                  <AssignmentTurnedIn sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
                <Box mt={2}>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      +5 this week
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions and Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    fullWidth
                    onClick={() => workspace && router.push(`/workspace/${workspace.slug}/dashboard-builder`)}
                    disabled={!workspace}
                    sx={{ 
                      py: 1.5, 
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 500
                    }}
                  >
                    Create New Dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DataObject />}
                    fullWidth
                    onClick={() => workspace && router.push(`/workspace/${workspace.slug}/datasets`)}
                    disabled={!workspace}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Manage Data Sources
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Analytics />}
                    fullWidth
                    onClick={() => workspace && router.push(`/workspace/${workspace.slug}/sql-editor`)}
                    disabled={!workspace}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Open SQL Editor
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Settings />}
                    fullWidth
                    onClick={() => workspace && router.push(`/workspace/${workspace.slug}/admin`)}
                    disabled={!workspace}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Workspace Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Recent Activity
                </Typography>
                <Box mt={2}>
                  {workspace ? (
                    <Box textAlign="center" py={4}>
                      <Analytics sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary" variant="body1">
                        No recent activity
                      </Typography>
                      <Typography color="text.secondary" variant="body2" mt={1}>
                        Your dashboard views and data updates will appear here
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      Select a workspace to view recent activity
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
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
                      <ListItemButton
                        onClick={() => handleWorkspaceSwitch(ws.slug)}
                        sx={{ 
                          borderRadius: 2, 
                          mb: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <Business />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {ws.display_name || ws.name}
                              </Typography>
                              {workspace?.slug === ws.slug && (
                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {ws.description || 'No description available'}
                              </Typography>
                              {ws.role && (
                                <Typography variant="caption" color="text.secondary">
                                  Role: {ws.role}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary" gutterBottom>
                      {searchQuery ? 'No workspaces found matching your search.' : 'No workspaces available.'}
                    </Typography>
                    {availableWorkspaces.length === 0 && !searchQuery && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          {workspaceStatus.hasEndpoint ? (
                            <>
                              <strong>Workspace endpoints are available</strong> but no workspaces were returned.
                              <br />This might be normal if workspaces haven't been created yet.
                            </>
                          ) : (
                            <>
                              <strong>Workspace endpoints are not implemented yet.</strong>
                              <br />The <code>/api/user/workspaces</code> endpoint will list available workspaces once implemented.
                              <br />Admin users will have access to all workspaces.
                            </>
                          )}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
              </List>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </EnhancedWorkspaceLayout>
  );
}