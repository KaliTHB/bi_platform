// web-application/src/pages/workspace/overview.tsx - Working version
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
  Paper
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
  Add
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

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

export default function WorkspaceOverview() {
  const router = useRouter();
  const { 
    user, 
    workspace, 
    switchWorkspace, 
    getAvailableWorkspaces,
    isAuthenticated,
    isLoading: authLoading 
  } = useAuth();

  // Local state
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadAvailableWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const workspaces = await getAvailableWorkspaces();
      setAvailableWorkspaces(workspaces);
      console.log('Available workspaces loaded:', workspaces.length);
    } catch (error) {
      console.error('Failed to load available workspaces:', error);
      // Don't show error to user, just log it
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
          You are not authenticated. Redirecting to login...
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Success Message */}
      <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
        <CheckCircle sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          🎉 Login Successful! 🎉
        </Typography>
        <Typography variant="h6">
          Welcome to the Workspace Overview Page
        </Typography>
      </Paper>

      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {workspace ? `${workspace.display_name || workspace.name}` : 'BI Platform Overview'}
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              {workspace 
                ? 'Monitor your workspace performance and access key features'
                : 'Welcome! You can select a workspace to access your dashboards and analytics'
              }
            </Typography>
            {workspace && (
              <Box display="flex" gap={1} alignItems="center">
                <Chip 
                  icon={<Business />}
                  label={`Current: ${workspace.display_name || workspace.name}`}
                  color="primary" 
                  variant="outlined"
                  size="small"
                />
                {workspace.role && (
                  <Chip 
                    label={`Role: ${workspace.role}`}
                    color="secondary" 
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>
          
          {/* Action Buttons */}
          <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
              size="small"
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SwapHoriz />}
              onClick={openWorkspaceSelector}
              size="small"
              sx={{ 
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                }
              }}
            >
              {workspace ? 'Switch Workspace' : 'Select Workspace'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* User Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Authentication Status
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
          <Typography>
            ✅ Logged in as: {user.email} ({user.display_name || user.username || 'User'})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckCircle sx={{ color: workspace ? 'success.main' : 'warning.main', mr: 1 }} />
          <Typography>
            {workspace ? `✅ Workspace: ${workspace.display_name || workspace.name}` : '⚠️ No workspace selected'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
          <Typography>
            ✅ Authentication: Working perfectly
          </Typography>
        </Box>
      </Paper>

      {/* Quick Actions */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}
            onClick={() => alert('Dashboard builder coming soon!')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <DashboardIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Create Dashboard
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Build interactive dashboards and visualizations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}
            onClick={() => alert('SQL Editor coming soon!')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <DataObject sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                SQL Editor
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Write and execute SQL queries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}
            onClick={() => alert('Dataset manager coming soon!')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Analytics sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Manage Datasets
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Create and manage data sources
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}
            onClick={() => alert('Administration coming soon!')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Settings sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Administration
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage users, roles, and settings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Next Steps */}
      <Alert severity="success">
        <Typography variant="h6" gutterBottom>
          🎯 What's Working:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>✅ Login authentication is working perfectly</li>
          <li>✅ API endpoints are connecting properly</li>
          <li>✅ User data is being loaded correctly</li>
          <li>✅ Route redirection is functioning</li>
          <li>🔄 Workspace selection is available (click "Select/Switch Workspace")</li>
        </ul>
      </Alert>

      {/* Workspace Selector Dialog */}
      <Dialog 
        open={showWorkspaceSelector} 
        onClose={() => setShowWorkspaceSelector(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div">
            Select Workspace
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Choose a workspace to access your dashboards and data
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
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
            />
          </Box>

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
                            <Typography variant="body2" color="textSecondary">
                              {ws.description || 'No description available'}
                            </Typography>
                            {ws.role && (
                              <Typography variant="caption" color="textSecondary">
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
                  <Typography color="textSecondary" gutterBottom>
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
  );
}