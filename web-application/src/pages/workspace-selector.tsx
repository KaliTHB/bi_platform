// web-application/src/pages/workspace-selector.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/index';
import { setCurrentWorkspace } from '@/store/slices/workspaceSlice';
import { restoreAuth, clearAuth } from '@/store/slices/authSlice';
import { workspaceService } from '@/api/workspaceAPI';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Skeleton,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Business,
  People,
  Dashboard,
  Refresh,
  ExitToApp,
  Settings,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  role: string;
  member_count: number;
  updated_at: string;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
}

const WorkspaceSelector: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated, token, isLoading: authLoading } = useSelector((state: RootState) => state.auth);
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Auto-restore auth on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    console.log('Workspace selector mounted - Auth status:', {
      isAuthenticated,
      hasToken: !!token,
      hasStoredToken: !!storedToken,
      authLoading
    });
    
    if (!isAuthenticated && storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
      console.log('Restoring auth from localStorage');
      dispatch(restoreAuth());
    }
  }, [dispatch, isAuthenticated, token, authLoading]);

  // Fetch workspaces when authenticated
  useEffect(() => {
    const effectiveToken = token || localStorage.getItem('auth_token');
    
    if (!isAuthenticated && !effectiveToken) {
      console.log('Not authenticated and no token, redirecting to login');
      router.push('/login');
      return;
    }

    if ((isAuthenticated || effectiveToken) && !authLoading) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, token, authLoading, router, retryCount]);

  const fetchWorkspaces = async () => {
    const effectiveToken = token || localStorage.getItem('auth_token');
    
    if (!effectiveToken || effectiveToken === 'undefined' || effectiveToken === 'null') {
      setError('No authentication token found');
      setLoading(false);
      handleAuthError();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching workspaces using workspaceService...');

      // Use the workspaceService to fetch workspaces
      const workspacesData = await workspaceService.getUserWorkspaces();
      
      console.log('Workspaces fetched successfully:', workspacesData);
      setWorkspaces(workspacesData);
      
    } catch (err: any) {
      console.error('Error fetching workspaces:', err);
      
      // Handle specific error types
      if (err.message.includes('Authentication failed') || err.message.includes('401')) {
        console.log('Authentication error, clearing auth');
        handleAuthError();
        return;
      }
      
      if (err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to load workspaces');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = () => {
    dispatch(clearAuth());
    router.push('/login');
  };

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    if (!workspace.is_active) {
      setError('This workspace is currently inactive');
      return;
    }

    setSelectedWorkspace(workspace.id);
    
    try {
      // Store workspace data in Redux
      dispatch(setCurrentWorkspace({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        role: workspace.role,
        member_count: workspace.member_count,
        created_at: new Date().toISOString(), // fallback
        updated_at: workspace.updated_at,
      }));
      
      // Store selected workspace in localStorage for persistence
      localStorage.setItem('selected_workspace_id', workspace.id);
      localStorage.setItem('selected_workspace', JSON.stringify({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }));
      
      console.log('Workspace selected, navigating to dashboard:', workspace);
      
      // Navigate to main application
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('Error selecting workspace:', error);
      setError('Failed to select workspace. Please try again.');
      setSelectedWorkspace(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleLogout = () => {
    setShowLogoutDialog(false);
    dispatch(clearAuth());
    router.push('/login');
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Skeleton variant="text" width={300} height={60} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width={200} height={30} sx={{ mx: 'auto' }} />
        </Box>
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="50%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width="100%" height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Select Workspace
          </Typography>
          {user && (
            <Typography variant="subtitle1" color="text.secondary">
              Welcome back, {user.first_name || user.email}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh workspaces">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton onClick={() => setShowLogoutDialog(true)} color="error">
              <ExitToApp />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          icon={<ErrorIcon />}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Error Loading Workspaces
          </Typography>
          {error}
          <br />
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            If this persists, try refreshing the page or contact support.
          </Typography>
        </Alert>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Debug Information:
          </Typography>
          <Typography variant="caption" component="div">
            • Token present: {token ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="caption" component="div">
            • Authenticated: {isAuthenticated ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="caption" component="div">
            • API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
          </Typography>
          <Typography variant="caption" component="div">
            • Error: {error}
          </Typography>
        </Alert>
      )}

      {/* Empty State */}
      {workspaces.length === 0 && !error && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Workspaces Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You don't have access to any workspaces yet. Contact your administrator for access.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={handleRetry} startIcon={<Refresh />}>
              Refresh
            </Button>
            <Button variant="text" onClick={() => setShowLogoutDialog(true)} startIcon={<ExitToApp />}>
              Sign Out
            </Button>
          </Box>
        </Paper>
      )}

      {/* Workspaces Grid */}
      {workspaces.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Found {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </Typography>
          
          <Grid container spacing={3}>
            {workspaces.map((workspace) => (
              <Grid item xs={12} sm={6} md={4} key={workspace.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: workspace.is_active ? 'pointer' : 'not-allowed',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    opacity: workspace.is_active === false ? 0.6 : 
                             selectedWorkspace === workspace.id ? 0.8 : 1,
                    '&:hover': workspace.is_active ? {
                      transform: 'translateY(-2px)',
                      boxShadow: (theme) => theme.shadows[8],
                    } : {},
                  }}
                  onClick={() => workspace.is_active && handleWorkspaceSelect(workspace)}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {workspace.logo_url ? (
                        <Avatar src={workspace.logo_url} sx={{ mr: 2 }}>
                          <Business />
                        </Avatar>
                      ) : (
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          <Business />
                        </Avatar>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {workspace.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip 
                            label={workspace.role} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                          {workspace.is_active === false && (
                            <Chip 
                              label="Inactive" 
                              size="small" 
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    {workspace.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {workspace.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People fontSize="small" />
                        <Typography variant="caption">
                          {workspace.member_count} {workspace.member_count === 1 ? 'member' : 'members'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Updated {formatLastUpdated(workspace.updated_at)}
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ pt: 0 }}>
                    <Button 
                      size="small" 
                      variant="contained"
                      fullWidth
                      disabled={!workspace.is_active || selectedWorkspace === workspace.id}
                      startIcon={
                        selectedWorkspace === workspace.id 
                          ? <CircularProgress size={16} color="inherit" /> 
                          : <Dashboard />
                      }
                    >
                      {selectedWorkspace === workspace.id 
                        ? 'Opening...' 
                        : workspace.is_active 
                          ? 'Open Workspace' 
                          : 'Inactive'
                      }
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}>
        <DialogTitle>Sign Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out? You'll need to log in again to access your workspaces.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogoutDialog(false)}>Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkspaceSelector;