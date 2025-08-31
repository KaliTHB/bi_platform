import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Business, Add, Group } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { switchWorkspace } from '../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../hooks/redux';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  member_count?: number;
  role?: string;
  logo_url?: string;
  is_default?: boolean;
}

export default function WorkspaceSelectorPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const auth = useAppSelector(state => state.auth);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user's workspaces on component mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/workspaces', {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setWorkspaces(data.data.workspaces || []);
          
          // If user has only one workspace, auto-select it
          if (data.data.workspaces?.length === 1) {
            handleWorkspaceSelect(data.data.workspaces[0]);
          }
        } else {
          setError(data.message || 'Failed to load workspaces');
        }
      } catch (err: any) {
        setError(err.message || 'Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && auth.token) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, auth.token]);

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    try {
      setSwitchingTo(workspace.id);
      
      // Use the switch workspace thunk
      const result = await dispatch(switchWorkspace(workspace.slug)).unwrap();
      
      // Redirect to the selected workspace
      router.push(`/workspace/${workspace.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to switch workspace');
      setSwitchingTo(null);
    }
  };

  const handleCreateWorkspace = () => {
    router.push('/workspace/create');
  };

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (loading) {
    return (
      <Container component="main" maxWidth="md">
        <Box sx={{ 
          marginTop: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}>
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading your workspaces...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              Select Workspace
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Choose a workspace to continue, {user?.first_name || user?.username}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {workspaces.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Workspaces Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You don't have access to any workspaces yet. Create one or ask an admin to invite you.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateWorkspace}
              >
                Create New Workspace
              </Button>
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                {workspaces.map((workspace) => (
                  <Grid item xs={12} sm={6} md={4} key={workspace.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 4,
                        },
                        ...(workspace.is_default && {
                          border: 2,
                          borderColor: 'primary.main',
                        })
                      }}
                    >
                      <CardActionArea
                        onClick={() => handleWorkspaceSelect(workspace)}
                        disabled={switchingTo === workspace.id}
                        sx={{ height: '100%' }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            {workspace.logo_url ? (
                              <Avatar src={workspace.logo_url} sx={{ mr: 2 }} />
                            ) : (
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                {workspace.name.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="h6" component="h3" noWrap>
                                {workspace.name}
                              </Typography>
                              {workspace.is_default && (
                                <Chip
                                  label="Default"
                                  size="small"
                                  color="primary"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                            {switchingTo === workspace.id && (
                              <CircularProgress size={24} />
                            )}
                          </Box>
                          
                          {workspace.description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ mb: 2 }}
                              noWrap
                            >
                              {workspace.description}
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {workspace.role && (
                              <Chip
                                label={workspace.role}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {workspace.member_count && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Group fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {workspace.member_count} members
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleCreateWorkspace}
                >
                  Create New Workspace
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}