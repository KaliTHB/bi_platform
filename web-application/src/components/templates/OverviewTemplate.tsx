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
import {WorkspaceStats } from '@/types/workspace.types'

// ✅ ONLY ADDITION: Import cleanup functions
import { cleanExpiredItems, cleanStalePermissions } from '../../utils/storageUtils';


interface OverviewTemplateProps {
  title?: string;
}

const OverviewTemplate: React.FC<OverviewTemplateProps> = ({ 
  title = "Overview"
}) => {
  const router = useRouter();
  const { user, currentWorkspace , getAvailableWorkspaces, switchWorkspace, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  // Local state
  const [stats, setStats] = useState<WorkspaceStats>({
    member_count:0,
    dashboard_count: 0,
    dataset_count: 0,
    data_source_count: 0,
    chart_count: 0,
    webview_count: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ ONLY ADDITION: Initialize essential cleanup only on first mount
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 Overview: Initial essential cleanup...');
      cleanExpiredItems();
      cleanStalePermissions();
    }
  }, [isAuthenticated]); // Only run on auth state change

  // ✅ ONLY ADDITION: Update permissions on workspace changes (not remove)
  useEffect(() => {
    if (currentWorkspace?.id) {
      console.log(`🔄 Overview: Workspace changed to ${currentWorkspace.id}, updating permissions...`);
      // Just clean stale permissions, don't remove all
      cleanStalePermissions();
    }
  }, [currentWorkspace?.id]);

  // Load workspace stats
  useEffect(() => {
    const loadStats = async () => {
      if (!currentWorkspace?.id) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        
        // Replace with actual API calls
        const response = await fetch(`/api/workspaces/${currentWorkspace.id}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats({
            member_count : data.active_members || 12,
            dashboard_count: data.active_dashboards || 12,
            dataset_count : data.active_datasets || 8,
            data_source_count: data.active_datasources || 5,
            chart_count: data.active_charts || 24,
            webview_count: data.active_webviews || 3
          });
        } else {
          // Fallback to mock data
          setStats({
            member_count:2,
            dashboard_count: 12,
            dataset_count: 8,
            data_source_count: 5,
            chart_count: 24,
            webview_count: 3
          });
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
        // Fallback to mock data
        setStats({
            member_count:2,
            dashboard_count: 12,
            dataset_count: 8,
            data_source_count: 5,
            chart_count: 24,
            webview_count: 3
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [currentWorkspace?.id]);

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      setWorkspacesLoading(true);
      await switchWorkspace(workspaceId);
      setShowWorkspaceSelector(false);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleOpenWorkspaceSelector = async () => {
    try {
      setWorkspacesLoading(true);
      const workspaces = await getAvailableWorkspaces();
      setAvailableWorkspaces(workspaces || []);
      setShowWorkspaceSelector(true);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  // Filter workspaces based on search
  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =============================================
  // ALL EXISTING UI/LAYOUT CODE REMAINS EXACTLY THE SAME
  // =============================================

  return (
    <WorkspaceLayout title={title}>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        
        {/* Main Content Grid */}
        <Grid container spacing={3}>
          
          {/* Workspace Header */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      {title}
                    </Typography>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      {currentWorkspace?.display_name || currentWorkspace?.name || 'Loading...'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Welcome back, {user?.display_name || user?.email || 'User'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<SwapHoriz />}
                      onClick={handleOpenWorkspaceSelector}
                      disabled={workspacesLoading}
                    >
                      Switch Workspace
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Workspace Statistics
                </Typography>
                {statsLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={2.4}>
                      <Box textAlign="center" p={1}>
                        <DashboardIcon color="primary" fontSize="large" />
                        <Typography variant="h4">{stats.dashboard_count}</Typography>
                        <Typography variant="caption" color="textSecondary">Dashboards</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box textAlign="center" p={1}>
                        <DataObject color="secondary" fontSize="large" />
                        <Typography variant="h4">{stats.dataset_count}</Typography>
                        <Typography variant="caption" color="textSecondary">Datasets</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box textAlign="center" p={1}>
                        <Storage color="success" fontSize="large" />
                        <Typography variant="h4">{stats.data_source_count}</Typography>
                        <Typography variant="caption" color="textSecondary">Data Sources</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box textAlign="center" p={1}>
                        <TrendingUp color="warning" fontSize="large" />
                        <Typography variant="h4">{stats.chart_count}</Typography>
                        <Typography variant="caption" color="textSecondary">Charts</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Box textAlign="center" p={1}>
                        <WebviewIcon color="info" fontSize="large" />
                        <Typography variant="h4">{stats.webview_count}</Typography>
                        <Typography variant="caption" color="textSecondary">Webviews</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <PermissionGate permissions={['dashboard.create']}>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      fullWidth
                      onClick={() => router.push(`/workspace/${currentWorkspace?.slug}/dashboard-builder`)}
                    >
                      Create Dashboard
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['dataset.create']}>
                    <Button
                      variant="outlined"
                      startIcon={<DataObject />}
                      fullWidth
                      onClick={() => router.push(`/workspace/${currentWorkspace?.slug}/sql-editor`)}
                    >
                      SQL Editor
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['workspace.admin']}>
                    <Button
                      variant="outlined"
                      startIcon={<Settings />}
                      fullWidth
                      onClick={() => router.push(`/workspace/${currentWorkspace?.slug}/admin`)}
                    >
                      Workspace Settings
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permissions={['workspace.admin']}>
                    <Button
                      variant="outlined"
                      startIcon={<People />}
                      fullWidth
                      onClick={() => router.push(`/workspace/${currentWorkspace?.slug}/admin/users`)}
                    >
                      Manage Users
                    </Button>
                  </PermissionGate>
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
            Switch Workspace
            <Typography variant="body2" color="textSecondary">
              Select a workspace to switch to
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            {workspacesLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {filteredWorkspaces.length === 0 ? (
                  <ListItem>
                    <ListItemText 
                      primary="No workspaces found"
                      secondary="Try adjusting your search criteria"
                    />
                  </ListItem>
                ) : (
                  filteredWorkspaces.map((ws) => (
                    <ListItem key={ws.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleWorkspaceSwitch(ws.id)}
                        selected={ws.id === currentWorkspace?.id}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <Business />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={ws.display_name || ws.name}
                          secondary={ws.description || `${ws.users_count || 0} members`}
                        />
                        {ws.id === currentWorkspace?.id && (
                          <CheckCircle color="primary" />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))
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