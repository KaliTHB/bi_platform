import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { RootState } from '../store';
import { switchWorkspace } from '../store/slices/authSlice';

export default function WorkspaceSelector() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState('');

  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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
      } else {
        setError(data.message || 'Failed to fetch workspaces');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = async (workspaceSlug: string) => {
    try {
      setSwitching(workspaceSlug);
      setError('');

      const result = await dispatch(switchWorkspace(workspaceSlug) as any);
      
      if (result.meta.requestStatus === 'fulfilled') {
        router.push(`/workspace/${workspaceSlug}`);
      } else {
        setError(result.payload || 'Failed to switch workspace');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to switch workspace');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Select Workspace
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Choose a workspace to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {workspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} key={workspace.id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {workspace.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {workspace.description || 'No description available'}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {workspace.user_count || 0} users • {workspace.dashboard_count || 0} dashboards
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleWorkspaceSelect(workspace.slug)}
                    disabled={switching === workspace.slug}
                    startIcon={switching === workspace.slug ? <CircularProgress size={16} /> : undefined}
                  >
                    {switching === workspace.slug ? 'Switching...' : 'Select'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {workspaces.length === 0 && (
          <Paper sx={{ p: 4, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              No Workspaces Available
            </Typography>
            <Typography variant="body2" color="textSecondary">
              You don't have access to any workspaces. Contact your administrator.
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}