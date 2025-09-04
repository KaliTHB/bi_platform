// web-application/src/pages/workspace/overview.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  AlertTitle,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  DataObject,
  Analytics,
  Settings,
  Search,
  Business,
  Add,
  People,
  BarChart,
  Storage,
  SwapHoriz,
  MoreVert,
  Visibility,
  Edit,
  Share,
  Delete,
  Refresh,
  TrendingUp,
  Assignment
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useDashboards } from '../../hooks/useDashboards';
import { useDatasets } from '../../hooks/useDatasets';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import PermissionGate from '../../components/shared/PermissionGate';

interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  role?: string;
  is_default?: boolean;
}

interface WorkspaceStats {
  dashboards: number;
  datasets: number;
  users: number;
  charts: number;
}

const WorkspaceOverviewPage: React.FC = () => {
  const router = useRouter();
  const { user, workspace, switchWorkspace } = useAuth();
  const { hasPermission } = usePermissions();
  const { 
    dashboards, 
    loading: dashboardsLoading, 
    error: dashboardsError, 
    refreshDashboards 
  } = useDashboards();
  const { 
    datasets, 
    loading: datasetsLoading, 
    error: datasetsError, 
    refreshDatasets 
  } = useDatasets();
  
  // Workspace switching dialog state
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  
  // Dashboard actions state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  
  // Stats state
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats>({
    dashboards: 0,
    datasets: 0,
    users: 0,
    charts: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Check if user needs to select a workspace on first load
  useEffect(() => {
    if (user && !workspace) {
      // Automatically open workspace selector if no workspace is selected
      setWorkspaceSelectorOpen(true);
      loadAvailableWorkspaces();
    }
  }, [user, workspace]);

  // Load workspace statistics
  const loadWorkspaceStats = useCallback(async () => {
    if (!workspace) return;

    setStatsLoading(true);
    try {
      const response = await fetch(`/api/v1/workspaces/${workspace.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaceStats(data.stats || {
          dashboards: dashboards.length,
          datasets: datasets.length,
          users: workspace.user_count || 0,
          charts: 0
        });
      } else {
        // Fallback to local counts
        setWorkspaceStats({
          dashboards: dashboards.length,
          datasets: datasets.length,
          users: workspace.user_count || 0,
          charts: 0
        });
      }
    } catch (error) {
      console.error('Error loading workspace stats:', error);
      // Fallback to local counts
      setWorkspaceStats({
        dashboards: dashboards.length,
        datasets: datasets.length,
        users: workspace.user_count || 0,
        charts: 0
      });
    } finally {
      setStatsLoading(false);
    }
  }, [workspace, dashboards.length, datasets.length]);

  // Load workspace statistics when data changes
  useEffect(() => {
    loadWorkspaceStats();
  }, [loadWorkspaceStats]);

  const loadAvailableWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const response = await fetch('/api/v1/user/workspaces', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableWorkspaces(data.workspaces || []);
      } else {
        console.error('Failed to load workspaces');
        setAvailableWorkspaces([]);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      setAvailableWorkspaces([]);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleWorkspaceSwitch = async (workspaceSlug: string) => {
    setSwitchingWorkspace(true);
    try {
      const result = await switchWorkspace(workspaceSlug);
      if (result.success) {
        setWorkspaceSelectorOpen(false);
        // Refresh data for new workspace
        await Promise.all([
          refreshDashboards(),
          refreshDatasets(),
          loadWorkspaceStats()
        ]);
      }
    } catch (error) {
      console.error('Error switching workspace:', error);
    } finally {
      setSwitchingWorkspace(false);
    }
  };

  const openWorkspaceSelector = () => {
    loadAvailableWorkspaces();
    setWorkspaceSelectorOpen(true);
  };

  // Dashboard actions
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dashboardId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDashboard(dashboardId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDashboard(null);
  };

  const handleViewDashboard = (dashboard: any) => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/dashboard/${dashboard.id}`);
    }
  };

  const handleEditDashboard = () => {
    if (workspace && selectedDashboard) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder?id=${selectedDashboard}`);
    }
    handleMenuClose();
  };

  const handleAddNew = () => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder`);
    }
  };

  const handleRefreshData = async () => {
    await Promise.all([
      refreshDashboards(),
      refreshDatasets(),
      loadWorkspaceStats()
    ]);
  };

  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickActions = [
    {
      title: 'Dashboard Builder',
      description: 'Create and design interactive dashboards',
      icon: <Analytics sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => router.push(`/workspace/${workspace?.slug}/dashboard-builder`),
      permissions: ['dashboard.create'],
      color: '#1976d2'
    },
    {
      title: 'SQL Editor',
      description: 'Write and execute SQL queries',
      icon: <DataObject sx={{ fontSize: 40, color: 'success.main' }} />,
      action: () => router.push(`/workspace/${workspace?.slug}/sql-editor`),
      permissions: ['sql_editor.access'],
      color: '#2e7d32'
    },
    {
      title: 'Manage Datasets',
      description: 'Create and manage data sources',
      icon: <Storage sx={{ fontSize: 40, color: 'warning.main' }} />,
      action: () => router.push(`/workspace/${workspace?.slug}/datasets`),
      permissions: ['dataset.read'],
      color: '#ed6c02'
    },
    {
      title: 'Administration',
      description: 'Manage users, roles, and workspace settings',
      icon: <Settings sx={{ fontSize: 40, color: 'error.main' }} />,
      action: () => router.push(`/workspace/${workspace?.slug}/admin`),
      permissions: ['workspace.admin'],
      color: '#d32f2f'
    },
  ];

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const isLoading = dashboardsLoading || datasetsLoading || statsLoading;
  const hasError = dashboardsError || datasetsError;

  return (
    <WorkspaceLayout
      title="Overview"
      showAddButton={workspace && hasPermission('dashboard.create')}
      onAddClick={handleAddNew}
      addButtonText="Create Dashboard"
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {workspace ? `${workspace.name} Overview` : 'Business Intelligence Platform'}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {workspace 
                  ? 'Monitor your workspace performance and access key features'
                  : 'Please select a workspace to continue'
                }
              </Typography>
            </Box>
            
            {/* Action Buttons */}
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefreshData}
                disabled={isLoading}
                size="small"
              >
                Refresh
              </Button>
              
              {/* Workspace Switcher Button */}
              <Button
                variant="contained"
                startIcon={<SwapHoriz />}
                onClick={openWorkspaceSelector}
                size="small"
              >
                {workspace ? 'Switch Workspace' : 'Select Workspace'}
              </Button>
            </Box>
          </Box>

          {/* No Workspace Selected */}
          {!workspace && (
            <Alert severity="info" sx={{ mb: 4 }}>
              <AlertTitle>Select a Workspace</AlertTitle>
              You need to select a workspace to access the platform features. Click the "Select Workspace" button to choose your workspace.
            </Alert>
          )}

          {/* Error Messages */}
          {hasError && (
            <Alert severity="error" sx={{ mb: 4 }}>
              <AlertTitle>Error Loading Data</AlertTitle>
              {dashboardsError && <div>Dashboards: {dashboardsError}</div>}
              {datasetsError && <div>Datasets: {datasetsError}</div>}
            </Alert>
          )}
        </Box>

        {/* Workspace Statistics Cards */}
        {workspace && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div" color="primary">
                        {statsLoading ? <CircularProgress size={24} /> : workspaceStats.dashboards}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Dashboards
                      </Typography>
                    </Box>
                    <DashboardIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div" color="success.main">
                        {statsLoading ? <CircularProgress size={24} /> : workspaceStats.datasets}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Datasets
                      </Typography>
                    </Box>
                    <Storage sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div" color="warning.main">
                        {statsLoading ? <CircularProgress size={24} /> : workspaceStats.users}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Users
                      </Typography>
                    </Box>
                    <People sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div" color="error.main">
                        {statsLoading ? <CircularProgress size={24} /> : workspaceStats.charts}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Charts
                      </Typography>
                    </Box>
                    <BarChart sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Quick Actions */}
        {workspace && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Quick Actions
              </Typography>
            </Grid>
            {quickActions.map((action, index) => (
              <PermissionGate key={index} permissions={action.permissions}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        elevation: 4,
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={action.action}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box sx={{ mb: 2 }}>
                        {action.icon}
                      </Box>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {action.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </PermissionGate>
            ))}
          </Grid>
        )}

        {/* Recent Dashboards */}
        {workspace && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Recent Dashboards ({dashboards.length})
              </Typography>
              {hasPermission('dashboard.create') && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddNew}
                  size="small"
                >
                  Create Dashboard
                </Button>
              )}
            </Box>

            {dashboardsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : dashboards.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell width="100">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboards.slice(0, 10).map((dashboard) => (
                      <TableRow 
                        key={dashboard.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleViewDashboard(dashboard)}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {dashboard.display_name || dashboard.name}
                            </Typography>
                            {dashboard.tags && dashboard.tags.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {dashboard.tags.slice(0, 2).map((tag) => (
                                  <Chip 
                                    key={tag} 
                                    label={tag} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ mr: 0.5, fontSize: '0.7rem' }} 
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {dashboard.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={dashboard.status || 'Active'} 
                            size="small" 
                            color={dashboard.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {dashboard.updated_at 
                              ? new Date(dashboard.updated_at).toLocaleDateString()
                              : 'N/A'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, dashboard.id)}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Dashboards Found
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Get started by creating your first dashboard to visualize your data.
                </Typography>
                {hasPermission('dashboard.create') && (
                  <Button
                    variant="contained"
                    startIcon={<Analytics />}
                    onClick={handleAddNew}
                  >
                    Create Your First Dashboard
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        )}
      </Container>

      {/* Workspace Selector Dialog */}
      <Dialog 
        open={workspaceSelectorOpen} 
        onClose={() => !switchingWorkspace && setWorkspaceSelectorOpen(false)}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={!workspace} // Prevent closing if no workspace selected
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {workspace ? 'Switch Workspace' : 'Select Workspace'}
            </Typography>
            {workspace && (
              <Chip 
                label={`Current: ${workspace.name}`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
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
            sx={{ mb: 2 }}
          />

          {loadingWorkspaces ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : filteredWorkspaces.length > 0 ? (
            <List>
              {filteredWorkspaces.map((ws) => (
                <React.Fragment key={ws.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleWorkspaceSwitch(ws.slug)}
                      disabled={switchingWorkspace || ws.slug === workspace?.slug}
                      selected={ws.slug === workspace?.slug}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          {ws.logo_url ? (
                            <img src={ws.logo_url} alt={ws.name} style={{ width: '100%' }} />
                          ) : (
                            <Business />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {ws.name}
                            {ws.is_default && (
                              <Chip label="Default" size="small" color="primary" />
                            )}
                            {ws.slug === workspace?.slug && (
                              <Chip label="Current" size="small" color="success" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {ws.description || 'No description'}
                            </Typography>
                            <Box display="flex" gap={2} mt={0.5}>
                              <Typography variant="caption">
                                Role: {ws.role || 'Member'}
                              </Typography>
                              <Typography variant="caption">
                                Users: {ws.user_count || 0}
                              </Typography>
                              <Typography variant="caption">
                                Dashboards: {ws.dashboard_count || 0}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      {switchingWorkspace && ws.slug !== workspace?.slug && (
                        <CircularProgress size={20} />
                      )}
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="textSecondary">
                {searchQuery ? 'No workspaces found matching your search' : 'No workspaces available'}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Dashboard Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const dashboard = dashboards.find(d => d.id === selectedDashboard);
          if (dashboard) handleViewDashboard(dashboard);
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} />
          View
        </MenuItem>
        {hasPermission('dashboard.update') && (
          <MenuItem onClick={handleEditDashboard}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('dashboard.share') && (
          <MenuItem onClick={handleMenuClose}>
            <Share sx={{ mr: 1 }} />
            Share
          </MenuItem>
        )}
        {hasPermission('dashboard.delete') && (
          <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </WorkspaceLayout>
  );
};

export default WorkspaceOverviewPage;